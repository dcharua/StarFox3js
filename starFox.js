function loadPlayer() {
  var mtlLoader = new THREE.MTLLoader();
  mtlLoader.load( "models/Arwing.mtl", function( materials ) {
      var objLoader = new THREE.OBJLoader();
      objLoader.setMaterials( materials );
      objLoader.load( 'models/Arwing/Arwing.obj', function ( object ) {
        object.scale.set(0.01, 0.01, 0.01);
        object.position.set(0, 35, 120);
        object.rotation.y = Math.PI;
        object.traverse(function(child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
    
        plane_idle = object;
        scene.add(plane_idle);
    
        planeBox = new THREE.BoxHelper(plane_idle, 0x00ff00);
        planeBox.update();
        planeBox.visible = displayPlaneBoxHelper;
    
        scene.add(planeBox);
      }, onProgress, onError );

  });
}
