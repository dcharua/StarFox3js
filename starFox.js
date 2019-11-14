// SCENE VARIABLES
var renderer = null,
  scene = null,
  camera = null,
  root = null,
  group = null,
  starGeo = null,
  stars = null;

// VARIABLES FOR THE GAME TIME
var gameSettings = {
  playTime: 60,
  time: 0,
  score: 0,
  highScore: 0,
  gameOver: false,
  difficulty: 5,
  lives: 3,
  gameClock: null
}

player = {
  object: null
}

// Robot settings object
var enemy = {
  object: null,
  enemies: [],
  left: -150,
  right: 150,
  start: -200,
  end: 100,
  enemyMaker: null
}

// Loaders
var mtlLoader = new THREE.MTLLoader();
var objLoader = new THREE.OBJLoader();

var currentTime = Date.now();

function loadPlayer() {
  mtlLoader.load("models/Arwing.mtl", function (materials) {
    materials.preload();
    objLoader.setMaterials(materials);
    objLoader.load("models/Arwing.obj".replace('.mtl', '.obj'), function (object) {
      object.scale.set(6, 6, 6);
      object.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      player.object = object
      scene.add(player.object);
       console.log(player.object)
    }, loadEnemy, null);
  });
}

function loadEnemy() {
  mtlLoader.load("models/Catspaw/Catspaw.mtl", function (materials) {
    materials.preload();
    objLoader.setMaterials(materials);
    objLoader.load("models/Catspaw/Catspaw.obj", function (object) {
      object.scale.set(6, 6, 6);
      object.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      enemy.object = object
    }, null, null);
  });
}


function loadMTL(obj, mtl, objPath, scale) {
  mtlLoader.load(mtl, function (materials) {
    materials.preload();
    objLoader.setMaterials(materials);
    objLoader.load(objPath, function (object) {
      object.scale.set(scale, scale, scale);
      object.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      obj.object = object
      scene.add(obj.object);
    }, null, null);
  });
}


// funtion to for gametime
function clock() {
  gameSettings.gameClock = window.setInterval(function () {
    document.getElementById("time").innerHTML = `Time:  ${(gameSettings.playTime - gameSettings.time).toString()} seconds`;
    gameSettings.time++;
    if (gameSettings.time === gameSettings.playTime) {
      alert("Time is up")
      gameSettings.gameOver = true;
      resetGame();
      return;
    }
  }, 1000);
}


function resetGame() {
  //save high score
  if (gameSettings.score > gameSettings.highScore) {
    gameSettings.highScore = gameSettings.score;
    window.localStorage.setItem('high_score', JSON.stringify(gameSettings.highScore));
    document.getElementById("high_score").innerHTML = `High score: ${gameSettings.score.toString()}`;
    alert("New high score!")
  }

  gameSettings.score = 0;
  gameSettings.lives = 3;
  gameSettings.time = 0;
  document.getElementById("play").value = "Play";

  // clear interval for gameclock and roboto maker
  window.clearInterval(gameSettings.gameClock);
  window.clearInterval(enemy.enemyMaker);
}

// funtion to start the game
function startGame() {
  resetGame();
  // remove robots from scene if any
  enemy.enemies.forEach(enemy => scene.remove(enemy));
  enemy.enemies = [];
  // reset score time and lives in html
  document.getElementById("score").innerText = `Score: ${gameSettings.score.toString()}`;
  document.getElementById("time").innerText = `Time: ${gameSettings.playTime} seconds`;
  document.getElementById("lives").innerHTML = 'Lives: ';
  Array.from({
    length: gameSettings.lives
  }, () => document.getElementById("lives").innerHTML += ' &#9829;');
  document.getElementById("play").innerText = "Restart";
  // start game - clock and robot making
  gameSettings.gameOver = false;
  clock();
  makeEnemies();
}

// animation function to move robots foward
function animate() {
  // if player lost
  if (!gameSettings.gameOver) {
    var now = Date.now();
    var deltat = now - currentTime;
    currentTime = now;

    // for each robot in the array
    enemy.enemies.forEach((enemy, index) => {
      // update the z position forward if not dead
      if (!enemy.dead) {
        enemy.position.z += deltat * 0.01;
        enemy.rotation.x += Math.random() * 0.01  - 0.005;
        enemy.rotation.y += Math.random() * 0.01  - 0.005;
        enemy.rotation.z += Math.random() * 0.01  - 0.005;
      }
      // enemy gets to the end line
      if (enemy.position.z >= enemy.end) {
        scene.remove(enemy);
        enemy.enemies.splice(index, 1);
        gameSettings.lives -= 1;
        document.getElementById("lives").innerHTML = 'Lives: ';
        Array.from({
          length: gameSettings.lives
        }, () => document.getElementById("lives").innerHTML += ' &#9829;');
        if (gameSettings.lives == 0) {
          alert("You have lost")
          gameSettings.gameOver = true;
          resetGame();
          return;
        }
      }
    })

    // Stars
    starGeo.vertices.forEach(p => {
      p.velocity += p.acceleration;
      p.z += p.velocity;
      if(p.z > 200){
        p.z = -200;
        p.velocity = 0;
      }
    });
    starGeo.verticesNeedUpdate = true;
    stars.rotation.z -= 0.002;
  }
}

// function to make new robots every n second
function makeEnemies() {
  var id = 0;
  enemy.enemyMaker = window.setInterval(function () {
    if (!gameSettings.gameOver) {
      var clone = enemy.object.clone();
      // we set randomly in x by its right and left max, and in the z start line
      clone.position.set(Math.floor(Math.random() * (enemy.right - enemy.left + 1)) + enemy.left, -5, enemy.start);
      scene.add(clone);
      clone.id = id++;
      enemy.enemies.push(clone);
    }
  }, 5000 / gameSettings.difficulty);
}

// function to change game difficulty
function setDifficulty() {
  gameSettings.difficulty = document.getElementById("difficulty").value;
}

function onDocumentKeyDown(event) {
  var keyCode = event.which;

  // BOTON ARRIBA
  if (keyCode == 38) {
      player.object.position.y += 1;
      player.object.rotation.x = Math.PI / 30;
  }

  // BOTON ABAJO
  else if (keyCode == 40) {
      player.object.position.y -= 1;
      player.object.rotation.x = -Math.PI / 5;
  }

  // BOTON IZQUIERDA
  else if (keyCode == 37) {
      player.object.position.x -= 1;
      player.object.rotation.z = -Math.PI / 5;

  }

  // BOTON DERECHA
  else if (keyCode == 39) {
      player.object.position.x += 1;
      player.object.rotation.z = Math.PI / 5;

  }
}

function onDocumentKeyUp(event) {
  player.object.rotation.z = 0;
  player.object.rotation.x = 0;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function run() {
  requestAnimationFrame(function () {
    run();
  });

  // Render the scene
  renderer.render(scene, camera);

  // If the game is on
  if (!gameSettings.gameOver) {
    animate();
  }
}


function setLightColor(light, r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  light.color.setRGB(r, g, b);
}

var directionalLight = null;
var spotLight = null;
var ambientLight = null;

var SHADOW_MAP_WIDTH = 2048,
  SHADOW_MAP_HEIGHT = 2048;

function createScene(canvas) {

  // Create the Three.js renderer and attach it to our canvas
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });

  // Set the viewport size
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Turn on shadows
  renderer.shadowMap.enabled = true;

  // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Create a new Three.js scene
  scene = new THREE.Scene();

  // Add  a camera so we can view the scene
  camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 1, 4000);
  camera.position.set(0, 50, 150);
  camera.rotation.set(-44.4, 0, 0);
  scene.add(camera);

  // Create a group to hold all the objects
  root = new THREE.Object3D;

  // Create a group to hold all the objects
  root = new THREE.Object3D;

  spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(30, 80, 100);
  spotLight.target.position.set(0, 0, 0);
  root.add(spotLight);

  spotLight.castShadow = true;

  spotLight.shadow.camera.near = 1;
  spotLight.shadow.camera.far = 200;
  spotLight.shadow.camera.fov = 45;

  spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
  spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

  ambientLight = new THREE.AmbientLight(0x888888);
  root.add(ambientLight);

  // Create the objects
  loadPlayer();
  // loadEnemy();
  // Create a group to hold the objects
  group = new THREE.Object3D;
  root.add(group);

  // Now add the group to our scene
  scene.add(root);

  window.addEventListener('resize', onWindowResize);
  document.addEventListener("keydown", onDocumentKeyDown, false);
  document.addEventListener("keyup", onDocumentKeyUp, false);

  // get high score
  let high_score = JSON.parse(window.localStorage.getItem('high_score'));
  if (high_score) {
    gameSettings.highScore = high_score;
    document.getElementById("high_score").innerHTML = `High score: ${high_score.toString()}`;
  }

  // Stars
  starGeo = new THREE.Geometry();
  for(let i = 0; i < 6000; i++){
    star = new THREE.Vector3(
      Math.random() * 600 - 300,
      Math.random() * 600 - 300,
      Math.random() * 600 - 300
    );
    star.velocity = 0;
    star.acceleration = 0.02;
    starGeo.vertices.push(star);
  }
  let sprite = new THREE.TextureLoader().load('images/star.png');
  let starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.7,
    map: sprite
  });

  stars = new THREE.Points(starGeo, starMaterial);
  scene.add(stars);
}