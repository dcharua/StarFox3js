// SCENE VARIABLES
var renderer = null,
  scene = null,
  camera = null,
  root = null,
  group = null,
  starGeo = null,
  playerCollider = null,
  stars = null;

// VARIABLES FOR THE GAME TIME
var gameSettings = {
  playTime: 60,
  time: 0,
  score: 0,
  highScore: 0,
  gameOver: false,
  difficulty: 5,
  live: 100,
  gameClock: null
}

var target = new THREE.Vector3();

var mouse = new THREE.Vector2();

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

// Robot settings object
var gameObjects = {
  player: null,
  ring: null,
  powerUp: null,
  enemy1: null,
  enemy2: null,
  objects: [],
  left: -150,
  right: 150,
  start: -200,
  end: -20,
  enemyMaker: null,
  bullet: {
    object: null,
    id: 0,
    bullets: [],
    end: -200,
    velocity: 0.12
  }
}
var id = 0;

// Loaders


var currentTime = Date.now();

function loadMTL(mtl, objPath, scale) {
  var mtlLoader = new THREE.MTLLoader();
  var objLoader = new THREE.OBJLoader();
  return new Promise((resolve, reject) => {
    mtlLoader.load(mtl, (materials) => {
      console.log(materials)
      materials.preload();
      objLoader.setMaterials(materials);
      objLoader.load(objPath, (object) => {
        object.scale.set(scale, scale, scale);
        object.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve(object)
      }, null, error => reject(error));
    })
  }, null, error => reject(error));
}

function loadBullet() {
  return new Promise((resolve, reject) => {
    var loader = new THREE.FBXLoader();
    loader.load('models/Bullet.fbx', object => {
      object.scale.set(2, 2, 2);
      object.rotation.x = -Math.PI / 2;
      object.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      gameObjects.bullet.object = object;
      resolve("done")
    })
  }, null, error => reject(error));
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
  gameSettings.live = 100;
  gameSettings.time = 0;
  document.getElementById("play").value = "Play";

  // clear interval for gameclock and roboto maker
  window.clearInterval(gameSettings.gameClock);
  window.clearInterval(gameObjects.enemyMaker);
}

// funtion to start the game
function startGame() {
  resetGame();
  // remove objects from scene if any
  gameObjects.objects.forEach(enemy => scene.remove(enemy));
  gameObjects.objects = [];
  // reset score time and lives in html
  document.getElementById("score").innerText = `Score: ${gameSettings.score.toString()}`;
  document.getElementById("time").innerText = `Time: ${gameSettings.playTime} seconds`;
  document.getElementById("live").innerHTML = `Live: ${gameSettings.live}`;
  document.getElementById("play").innerText = "Restart";
  // start game - 
  gameSettings.gameOver = false;
  clock();
  makeObjects();
}

// main function to animate and update game
function animate() {
  // if player lost
  if (!gameSettings.gameOver) {
    var now = Date.now();
    var deltat = now - currentTime;
    currentTime = now;

    // Collider to player
    playerCollider = new THREE.Box3().setFromObject(gameObjects.player);
    // we update  each object in the array
    updateObject(deltat);
    // animate bullets
    updateBullets(deltat);
    // Stars
    updateStars();
    // Playerr look at mouse
    target.x = (gameObjects.player.position.x / 100) - mouse.x;
    target.y = (gameObjects.player.position.y / 100) - mouse.y;

    // var hipotenuse = Math.sqrt(Math.pow(target.y, 2) + Math.pow(target.x, 2));

    // var oa = (target.y)/(target.x)
    // var oh = target.y / hipotenuse;
    // var ah = target.x / hipotenuse;

    var rotationPlayer = atan(-target.y, -target.x) + Math.PI / 2;
    // var rotationPlayer = Math.asin(oh) + Math.PI;
    // var rotationPlayer = Math.acos(ah);

    // Get angle
    gameObjects.player.rotation.y = rotationPlayer;
  }
}

function updateObject(deltat) {
  gameObjects.objects.forEach((obj, index) => {
    // Collider to enemy 
    obj.collider = new THREE.Box3().setFromObject(obj);
    switch (obj.type) {
      case 'enemy1':
        // Check if enemy got hit
        checkBulletHit(obj);
        // update the z position forward if not dead
        if (!obj.dead) {
          obj.position.z += deltat * 0.05;
          obj.rotation.x += Math.random() * 0.01 - 0.005;
          obj.rotation.y += Math.random() * 0.01 - 0.005;
          obj.rotation.z += Math.random() * 0.01 - 0.005;
          // TODO enemy fire bullet
          enemyFire(obj);
        } else {
          obj.position.y -= deltat * 0.05;
          obj.rotation.x += Math.random() * 0.02;
          obj.rotation.y += Math.random() * 0.02;
          obj.rotation.z += Math.random() * 0.02;
        }
        checkRemove(obj, index);
        checkCollition(obj);
        break;

      case 'enemy2':
        // Check if enemy got hit
        checkBulletHit(obj)
        // TODO animate different movement and dead
        if (!obj.dead) {
          obj.position.z += deltat * 0.06;
          // TODO enemy fire bullet
          enemyFire(obj);
        } else {
          obj.position.y -= deltat * 0.06;
          obj.rotation.x += Math.random() * 0.02;
          obj.rotation.y += Math.random() * 0.02;
          obj.rotation.z += Math.random() * 0.02;
        }
        checkRemove(obj, index);
        checkCollition(obj);
        break;


      case 'powerUp':
        // Collider to enemy
        obj.position.z += deltat * 0.03;
        checkRemove(obj, index);
        checkCollition(obj);
        break;
      
      case 'ring':
        // Collider to enemy
        obj.position.z += deltat * 0.04;
        checkRemove(obj, index);
        checkCollition(obj);
        break;
    }
  })
}

function checkRemove(obj, index) {
  // enemy gets to the end line
  if (obj.position.y <= -50 || obj.position.z >= 100) {
    scene.remove(obj);
    gameObjects.objects.splice(index, 1);
  }
}

// function to check if player collition with object
function checkCollition(obj) {
  if (playerCollider.intersectsBox(obj.collider)) {
    if (!obj.dead) {
      obj.dead = true;
      switch (obj.type) {
        case 'enemy1':
          gameSettings.live -= 5;
          break;
        case 'powerUp':
          gameSettings.live += 5;
          break;
        case 'ring':
          updateScore(10)
          break;
      }
      updateLive();
    }
  }
}


function checkBulletHit(obj) {
  // Check if enemy got hit
  gameObjects.bullet.bullets.forEach((b, i) => {
    b.collider = new THREE.Box3().setFromObject(b);
    if (obj.collider.intersectsBox(b.collider)) {
      if (!obj.dead) {
        enemyKilled(obj, b, i);
      }
    }
  });
}

// function to kill enemy remove and add points
function enemyKilled(obj, b, i) {
  obj.dead = true;
  updateScore(obj.type == "enemy1" ? 2 : 5)
  // remove bullet
  scene.remove(b);
  gameObjects.bullet.bullets.splice(i, 1);
}

//TODO
function enemyFire(obj) {

}

// UPDATE Game state functions
function updateScore(points){
  gameSettings.score += points;
  document.getElementById("score").innerHTML = 'Score: ' + gameSettings.score;
}

function updateLive() {
  document.getElementById("live").innerHTML = `Live: ${gameSettings.live}`
  if (gameSettings.live == 0) {
    alert("You have lost")
    gameSettings.gameOver = true;
    resetGame();
  }
}

function updateBullets(deltat) {
  gameObjects.bullet.bullets.forEach((b, index) => {
    b.position.z -= Math.cos(b.angle) * deltat * gameObjects.bullet.velocity;
    b.position.x -= Math.sin(b.angle) * deltat * gameObjects.bullet.velocity;

    if (b.position.z <= gameObjects.bullet.end) {
      scene.remove(b);
      gameObjects.bullet.bullets.splice(index, 1);
    }
  })
}

function updateStars() {
  starGeo.vertices.forEach(p => {
    p.velocity += p.acceleration;
    p.z += p.velocity;
    if (p.z > 200) {
      p.z = -200;
      p.velocity = 0;
    }
  });
  starGeo.verticesNeedUpdate = true;
  stars.rotation.z -= 0.002;
}

// function to make new objects every n second
function makeObjects() {
  gameObjects.enemyMaker = window.setInterval(function () {
    if (!gameSettings.gameOver) {
      // we dice a random number if its 0 we add to scene
      if (!Math.floor(Math.random() * 4)) cloneObj(gameObjects.enemy1)
      if (!Math.floor(Math.random() * 6)) cloneObj(gameObjects.enemy2)
      if (!Math.floor(Math.random() * 10)) cloneObj(gameObjects.powerUp)
      if (!Math.floor(Math.random() * 1)) cloneObj(gameObjects.ring)
    }
  }, 5000 / gameSettings.difficulty);
}

// function to clone object 
function cloneObj(obj) {
  var clone = obj.clone();
  // we set randomly in x by its right and left max, and in the z start line
  clone.position.set(Math.floor(Math.random() * (gameObjects.right - gameObjects.left + 1)) + gameObjects.left, -5, gameObjects.start);
  scene.add(clone);
  clone.id = id++;
  clone.type = obj.type
  gameObjects.objects.push(clone);
}

// functions for moving player
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick(event) {

  if (!gameSettings.gameOver) {
    event.preventDefault()
    shoot();
  }
}

// function for calculating atan
function atan(y, x) {
  if (x > 0) {
    v = Math.atan(y / x);
  }
  if (y >= 0 && x < 0) {
    v = Math.PI + Math.atan(y / x);
  }
  if (y < 0 & x < 0) {
    v = -Math.PI + Math.atan(y / x);
  }
  if (y > 0 & x == 0) {
    v = Math.PI / 2;
  }
  if (y < 0 && x == 0) {
    v = -Math.PI / 2;
  }
  if (v < 0) {
    v = v + 2 * Math.PI;
  }
  return v
}


// function to player shoot a bullet
function shoot() {

  if (!gameSettings.gameOver) {
    var clone = cloneFbx(gameObjects.bullet.object);
    clone.position.set(gameObjects.player.position.x, gameObjects.player.position.y, gameObjects.player.position.z);
    clone.angle = gameObjects.player.rotation.y + Math.PI;
    scene.add(clone);
    clone.id = gameObjects.bullet.id++;
    gameObjects.bullet.bullets.push(clone);
  }
}

function onDocumentKeyDown(event) {
  var keyCode = event.which;

  // BOTON IZQUIERDA
  if (keyCode == 37 && gameObjects.player.position.x > -100) {
    gameObjects.player.position.x -= 3;
    // player.object.rotation.z = -Math.PI / 5;
    // playerAnimator[2].start();
  }

  // BOTON DERECHA
  else if (keyCode == 39 && gameObjects.player.position.x < 100) {
    gameObjects.player.position.x += 3;
    // player.object.rotation.z = Math.PI / 5;
    // playerAnimator[3].start();

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

// function to change game difficulty
function setDifficulty() {
  gameSettings.difficulty = document.getElementById("difficulty").value;
}

// functon to start game
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

// functions for scene creation
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

  // loadEnemy();
  // Create a group to hold the objects
  group = new THREE.Object3D;
  root.add(group);

  // Now add the group to our scene
  scene.add(root);

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener("click", onMouseClick);
  document.addEventListener("keydown", onDocumentKeyDown, false);

  // document.addEventListener("keyup", onDocumentKeyUp, false);

  // get high score
  let high_score = JSON.parse(window.localStorage.getItem('high_score'));
  if (high_score) {
    gameSettings.highScore = high_score;
    document.getElementById("high_score").innerHTML = `High score: ${high_score.toString()}`;
  }

  // Stars
  starGeo = new THREE.Geometry();
  for (let i = 0; i < 6000; i++) {
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

  // load Objects
  let promises = []
  promises.push(loadMTL('models/Arwing.mtl', 'models/Arwing.obj', 6))
  promises.push(loadMTL('models/Catspaw/Catspaw.mtl', 'models/Catspaw/Catspaw.obj', 5))
  promises.push(loadMTL('models/Cornerian/Cornerian.mtl', 'models/Cornerian/Cornerian.obj', 3))
  promises.push(loadMTL('models/PowerUp/PowerUp.mtl', 'models/PowerUp/PowerUp.obj', 3))
  promises.push(loadMTL('models/Rings/Gold/Gold.mtl', 'models/Rings/Gold/Gold.obj', 3))
  promises.push(loadBullet());
  Promise.all(promises).then((objects) => {

    gameObjects.player = objects[0];
    gameObjects.player.rotation.y = Math.PI
    gameObjects.player.position.y = -10
    gameObjects.player.position.z = 50
    gameObjects.player.type = "player";

    gameObjects.enemy1 = objects[1];
    gameObjects.enemy1.type = "enemy1";

    gameObjects.enemy2 = objects[2];
    gameObjects.enemy2.type = "enemy2";

    gameObjects.powerUp = objects[3];
    gameObjects.powerUp.type = "powerUp";

    gameObjects.ring = objects[4];
    gameObjects.ring.type = "ring";
    scene.add(gameObjects.player)
    run();
  })
}