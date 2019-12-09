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
  score: 0,
  highScore: 0,
  gameOver: false,
  difficulty: 5,
  live: 100,
  pause: false,
  backgroundMusic: null
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
  enemy3: null,
  asteroid: null,
  enemyBullet: {
    object: null,
    id: 0,
    bullets: [],
    end: 100,
    velocity: 0.10
  },
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
    velocity: 0.20
  },
  asteroid: null
}
var id = 0;

// Loaders

function initControls() {
  $("#play").click(() => startGame());
}

var currentTime = Date.now();

function loadMTL(mtl, objPath, scale) {
  var loadingManager = new THREE.LoadingManager();
  var mtlLoader = new THREE.MTLLoader(loadingManager);
  var objLoader = new THREE.OBJLoader(loadingManager);
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

function loadObj(objPath, scale) {
  var loadingManager = new THREE.LoadingManager();
  var objLoader = new THREE.OBJLoader(loadingManager);
  return new Promise((resolve, reject) => {
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

function loadEnemyBullet() {
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
      gameObjects.enemyBullet.object = object;
      resolve("done")
    })
  }, null, error => reject(error));
}

function loadAsteroid() {
  return new Promise((resolve, reject) => {
    var loader = new THREE.FBXLoader();
    loader.load('models/Asteroid.fbx', object => {
      object.scale.set(2, 2, 2);

      object.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      gameObjects.asteroid = object;
      resolve("done")
    })
  }, null, error => reject(error));
}

function loadBackgroundMusic() {
  var listener = new THREE.AudioListener();
  camera.add( listener );

  // create a global audio source
  var sound = new THREE.Audio( listener );

  // load a sound and set it as the Audio object's buffer
  var audioLoader = new THREE.AudioLoader();
  audioLoader.load( 'sounds/background.mp3', function( buffer ) {
    sound.setBuffer( buffer );
    sound.setLoop( true );
    sound.setVolume( 0.5 );
    sound.play();

    gameSettings.backgroundMusic = sound
  });
}

function resetGame() {
  $("#container").hide();
  $(".cover").fadeIn();
  //save high score
  if (gameSettings.score > gameSettings.highScore) {
    gameSettings.highScore = gameSettings.score;
    window.localStorage.setItem('high_score', JSON.stringify(gameSettings.highScore));
    document.getElementById("high_score").innerHTML = `High score: ${gameSettings.score.toString()}`;
    alert("New high score!")
  }

  gameSettings.score = 0;
  gameSettings.live = 100;
  // clear interval for gameclock and roboto maker
  window.clearInterval(gameObjects.enemyMaker);
}

// funtion to start the game
function startGame() {
  $("#container").show();
  $(".cover").hide();
  // remove objects from scene if any
  gameObjects.objects.forEach(enemy => scene.remove(enemy));
  gameObjects.objects = [];
  gameObjects.bullet.bullets.forEach(b => scene.remove(b));
  gameObjects.bullet.bullets = [];
  gameObjects.enemyBullet.bullets.forEach(b => scene.remove(b));
  gameObjects.enemyBullet.bullets = [];
  // reset score time and lives in html
  document.getElementById("score").innerText = `Score: ${gameSettings.score.toString()}`;
  // document.getElementById("live").innerHTML = `Live: ${gameSettings.live}`;
  $('#live .percentage .alive').width(`${gameSettings.live}%`);
  // start game - 
  gameSettings.gameOver = false;
  makeObjects();
}

// main function to animate and update game
function animate() {
  // if player lost
  var now = Date.now();
  var deltat = now - currentTime;
  currentTime = now;

  // Collider to player
  playerCollider = new THREE.Box3().setFromObject(gameObjects.player);
  // we update  each object in the array
  updateObject(deltat);
  // animate bullets
  updateBullets(deltat);
  // animate enemy bullets
  updateEnemyBullets(deltat);
  // Stars
  updateStars();
  // Playerr look at mouse
  target.x = (gameObjects.player.position.x / 100) - mouse.x;
  target.y = (gameObjects.player.position.y / 100) - mouse.y;

  var rotationPlayer = atan(-target.y, -target.x) + Math.PI / 2;

  // Get angle
  gameObjects.player.rotation.y = rotationPlayer;
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
          obj.position.z += deltat * obj.velocity;
          obj.rotation.x += Math.random() * 0.01 - 0.005;
          obj.rotation.y += Math.random() * 0.01 - 0.005;
          obj.rotation.z += Math.random() * 0.01 - 0.005;
          
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
        
        if (!obj.dead) {

          // Animate always moving towards player
          obj.lookAt(gameObjects.player.position)
          
          obj.position.z += Math.cos(obj.rotation.y) * deltat * obj.velocity;
          obj.position.x += Math.sin(obj.rotation.y) * deltat * obj.velocity;
        } else {
          obj.position.y -= deltat * 0.06;
          obj.rotation.x += Math.random() * 0.02;
          obj.rotation.y += Math.random() * 0.02;
          obj.rotation.z += Math.random() * 0.02;
        }
        checkRemove(obj, index);
        checkCollition(obj);
        break;

        case 'enemy3':
          // Check if enemy got hit
          checkBulletHit(obj)

          if (!obj.dead) {
            obj.position.z += deltat * obj.velocity;
            // Animate always zigzagging 
            if(obj.zigZagDirection == 1){
              if (obj.position.x < (obj.startX + obj.zigZagMax)){
                obj.zigZagDirection = 1
              }else{
                obj.zigZagDirection = -1
              }
            }else{
              if (obj.position.x > (obj.startX - obj.zigZagMax)){
                obj.zigZagDirection = -1
              }else{
                obj.zigZagDirection = 1
              }
            }

            obj.position.x += (obj.zigZagDirection * (obj.zigZagVelocity * deltat) * obj.velocity);
            
            
            // Watching towards player
            obj.lookAt(gameObjects.player.position)

            // Fire if number is 0 out of 20
            // if (!Math.floor(Math.random() * 20)) enemyFire(obj);
            if (Math.floor(obj.position.z) % 50 == 0) enemyFire(obj);

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
        checkCollition(obj, index);
        break;
      
      case 'ring':
        // Collider to enemy
        obj.position.z += deltat * 0.04;
        checkRemove(obj, index);
        checkCollition(obj);
        break;

      case 'asteroid':
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

    if (obj.type == "enemy3") {
      // window.clearInterval(obj.fireInterval)
    }
  }
}

// function to check if player collition with object
function checkCollition(obj, index = 0) {
  if (playerCollider.intersectsBox(obj.collider)) {
    if (!obj.dead) {
      obj.dead = true;
      switch (obj.type) {
        case 'enemy1':
        case 'enemy2':
        case 'enemy3':
          gameSettings.live -= 20;
          spotLight.color.setHex(0xFFA500);
          setTimeout(function(){ spotLight.color.setHex(0xffffff); }, 200);
          break;
        case 'enemyBullet':
          gameSettings.live -= 2;
          // remove bullet
          var index = gameObjects.enemyBullet.bullets.indexOf(obj);
          if (index > -1) {
            gameObjects.enemyBullet.bullets.splice(index, 1);
          }
          scene.remove(obj);
          spotLight.color.setHex(0xFFA500);
          setTimeout(function(){ spotLight.color.setHex(0xffffff); }, 200);
          break;
        case 'powerUp':
          gameSettings.live += 10;

          spotLight.color.setHex(0x458915);

          setTimeout(function(){ spotLight.color.setHex(0xffffff); }, 200);

          scene.remove(obj);
          gameObjects.objects.splice(index, 1);

          break;
        case 'ring':
          updateScore(10)

          obj.scale.set(8, 8, 8);
          break;
        case 'asteroid':
          gameSettings.live -= 10;
          spotLight.color.setHex(0xFFA500);
          setTimeout(function(){ spotLight.color.setHex(0xffffff); }, 200);

          scene.remove(obj);
          gameObjects.objects.splice(index, 1);

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
        if (obj.lives > 1){
          // remove bullet
          obj.lives--;
        }else{
          enemyKilled(obj, b, i);
        }
        // remove bullet
        scene.remove(b);
        gameObjects.bullet.bullets.splice(i, 1);
        
      }
    }
  });
}

// function to kill enemy remove and add points
function enemyKilled(obj, b, i) {
  obj.dead = true;
  updateScore(obj.type == "enemy1" ? 2 : obj.type == "enemy2" ? 5 : 10)
}

// Enemy fire bullet towards player
function enemyFire(obj) {
  if (!gameSettings.gameOver && !gameSettings.pause) {
    var clone = cloneFbx(gameObjects.enemyBullet.object);
    clone.position.set(obj.position.x, obj.position.y, obj.position.z);
    clone.angle = obj.rotation.y;
    clone.type = 'enemyBullet';
    scene.add(clone);
    clone.id = gameObjects.enemyBullet.id++;
    gameObjects.enemyBullet.bullets.push(clone);
  }
}

// UPDATE Game state functions
function updateScore(points){
  gameSettings.score += points;
  document.getElementById("score").innerHTML = 'Score: ' + gameSettings.score;
}

function updateLive() {
  // document.getElementById("live").innerHTML = `Live: ${gameSettings.live}`
  $('#live .percentage .alive').width(`${gameSettings.live}%`);
  if (gameSettings.live <= 0) {
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

function updateEnemyBullets(deltat) {
  gameObjects.enemyBullet.bullets.forEach((b, index) => {
    b.collider = new THREE.Box3().setFromObject(b);
    b.position.z += Math.cos(b.angle) * deltat * gameObjects.enemyBullet.velocity;
    b.position.x += Math.sin(b.angle) * deltat * gameObjects.enemyBullet.velocity;

    if (b.position.z >= gameObjects.enemyBullet.end) {
      scene.remove(b);
      gameObjects.enemyBullet.bullets.splice(index, 1);
    }

    checkCollition(b);
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
    if (!gameSettings.gameOver && !gameSettings.pause) {
      // we dice a random number if its 0 we add to scene
      if (!Math.floor(Math.random() * 4)) cloneObj(gameObjects.enemy1)
      if (!Math.floor(Math.random() * 6)) cloneObj(gameObjects.enemy2)
      if (!Math.floor(Math.random() * 12)) cloneObj(gameObjects.enemy3)
      if (!Math.floor(Math.random() * 10)) cloneObj(gameObjects.powerUp)
      if (!Math.floor(Math.random() * 6)) cloneObj(gameObjects.ring)
      if (!Math.floor(Math.random() * 2)) cloneObj(gameObjects.asteroid)
    }
  }, 5000 / gameSettings.difficulty);
}

// function to clone object 
function cloneObj(obj) {
  var clone = obj.clone();
  // we set randomly in x by its right and left max, and in the z start line
  clone.startX = Math.floor(Math.random() * (gameObjects.right - gameObjects.left + 1)) + gameObjects.left
  clone.position.set(clone.startX, -5, gameObjects.start);
  scene.add(clone);
  clone.id = id++;
  clone.type = obj.type
  if(clone.type == 'enemy3'){
    clone.zigZagVelocity = obj.zigZagVelocity
    clone.zigZagDirection = obj.zigZagDirection
    clone.zigZagMax = Math.random() * 10 + 15;

    // Enemy fire bullet certain time interval
    // clone.fireInterval = setInterval(() => { enemyFire(obj) }, 500);
  }
  clone.lives = obj.lives
  clone.velocity = obj.velocity
  gameObjects.objects.push(clone);
}

function cloneAsteroid(obj) {
  var clone = cloneFbx(gameObjects.asteroid);
  // we set randomly in x by its right and left max, and in the z start line
  clone.startX = Math.floor(Math.random() * (gameObjects.right - gameObjects.left + 1)) + gameObjects.left
  clone.position.set(clone.startX, -5, gameObjects.start);
  scene.add(clone);
  clone.id = id++;
  gameObjects.objects.push(clone);
}

// functions for moving player
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick(event) {

  if (!gameSettings.gameOver && !gameSettings.pause) {
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

  if (!gameSettings.gameOver && !gameSettings.pause) {
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

  //restart game R key
  if (keyCode == 82){
    resetGame();
  }

  // pause onpause game P key
  if (keyCode == 80){
    gameSettings.pause = !gameSettings.pause;
  }

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
  if (!gameSettings.gameOver && !gameSettings.pause) {
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

  // load Background music
  loadBackgroundMusic()

  // load Objects
  let promises = []
  // Player
  promises.push(loadMTL('models/Arwing.mtl', 'models/Arwing.obj', 6))
  // Enemy1
  promises.push(loadMTL('models/Catspaw/Catspaw.mtl', 'models/Catspaw/Catspaw.obj', 5))
  // Enemy2
  promises.push(loadMTL('models/WolfenII/WolfenII.mtl', 'models/WolfenII/WolfenII.obj', 5))
  // Enemy3
  promises.push(loadMTL('models/InvaderII/InvaderII.mtl', 'models/InvaderII/InvaderII.obj', 7))
  // PowerUp
  promises.push(loadMTL('models/PowerUp/PowerUp.mtl', 'models/PowerUp/PowerUp.obj', 3))
  // Health
  promises.push(loadMTL('models/Rings/Gold/Gold.mtl', 'models/Rings/Gold/Gold.obj', 3))
  // Asteroid
  promises.push(loadObj('models/Asteroid.obj', 0.1));

  promises.push(loadBullet());
  promises.push(loadEnemyBullet());


  Promise.all(promises).then((objects) => {

    gameObjects.player = objects[0];
    gameObjects.player.rotation.y = Math.PI
    gameObjects.player.position.y = -10
    gameObjects.player.position.z = 50
    gameObjects.player.type = "player";

    gameObjects.enemy1 = objects[1];
    gameObjects.enemy1.type = "enemy1";
    gameObjects.enemy1.lives = 2;
    gameObjects.enemy1.velocity = 0.04;

    gameObjects.enemy2 = objects[2];
    gameObjects.enemy2.type = "enemy2";
    gameObjects.enemy2.lives = 1;
    gameObjects.enemy2.velocity = 0.08;

    gameObjects.enemy3 = objects[3];
    gameObjects.enemy3.type = "enemy3";
    gameObjects.enemy3.lives = 1;
    gameObjects.enemy3.zigZagVelocity = 1.5;
    gameObjects.enemy3.zigZagDirection = 1;
    gameObjects.enemy3.velocity = 0.06;

    gameObjects.powerUp = objects[4];
    gameObjects.powerUp.type = "powerUp";

    gameObjects.ring = objects[5];
    gameObjects.ring.type = "ring";

    gameObjects.asteroid = objects[6];
    gameObjects.asteroid.type = "asteroid";

    scene.add(gameObjects.player)
    run();
  })
}


function removeSplash(milisec){
  window.setTimeout(() => {
    $('.splash').fadeOut();
    $('.menu').fadeIn();
  }, milisec)
}