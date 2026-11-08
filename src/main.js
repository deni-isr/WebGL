import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, controls;
let snowman;

init();

function init() {
  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a2b4c);

  // Camera setup
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
  camera.position.set(5, 4, 7);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.5, 0);

  // Axis helper
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // Lights
  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x0f0e0d, 0.6);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const pointLight = new THREE.PointLight(0xffaa00, 4, 10);
  pointLight.position.set(-2, 2, 2);
  pointLight.castShadow = true;
  scene.add(pointLight);

  // Materials (all react to light)
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8,
  });
  const coalMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.5,
  });
  const carrotMat = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    roughness: 0.6,
  });
  const hatMat = new THREE.MeshPhongMaterial({
    color: 0x333333,
    shininess: 30,
  });
  const boxMat = new THREE.MeshPhongMaterial({
    color: 0xd9383a,
    shininess: 60,
  });

  // Ground
  const groundGeo = new THREE.CylinderGeometry(8, 8, 0.4, 32);
  const ground = new THREE.Mesh(groundGeo, snowMat);
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Snowman group
  snowman = new THREE.Group();
  scene.add(snowman);

  // Body parts
  const bottomGeo = new THREE.SphereGeometry(1.2, 32, 32);
  const bottom = new THREE.Mesh(bottomGeo, snowMat);
  bottom.position.y = 1.0;
  bottom.castShadow = true;
  bottom.receiveShadow = true;
  snowman.add(bottom);

  const middleGeo = new THREE.SphereGeometry(0.85, 32, 32);
  const middle = new THREE.Mesh(middleGeo, snowMat);
  middle.position.y = 2.5;
  middle.castShadow = true;
  middle.receiveShadow = true;
  snowman.add(middle);

  const headGeo = new THREE.SphereGeometry(0.55, 32, 32);
  const head = new THREE.Mesh(headGeo, snowMat);
  head.position.y = 3.6;
  head.castShadow = true;
  head.receiveShadow = true;
  snowman.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.07, 16, 16);
  const leftEye = new THREE.Mesh(eyeGeo, coalMat);
  leftEye.position.set(-0.2, 3.75, 0.48);
  snowman.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, coalMat);
  rightEye.position.set(0.2, 3.75, 0.48);
  snowman.add(rightEye);

  // Carrot nose
  const noseGeo = new THREE.ConeGeometry(0.1, 0.5, 16);
  const nose = new THREE.Mesh(noseGeo, carrotMat);
  nose.position.set(0, 3.6, 0.75);
  nose.rotation.x = Math.PI / 2;
  nose.castShadow = true;
  snowman.add(nose);

  // Hat
  const brimGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.08, 32);
  const hatBrim = new THREE.Mesh(brimGeo, hatMat);
  hatBrim.position.y = 4.05;
  hatBrim.castShadow = true;
  snowman.add(hatBrim);

  const topGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.6, 32);
  const hatTop = new THREE.Mesh(topGeo, hatMat);
  hatTop.position.y = 4.35;
  hatTop.castShadow = true;
  snowman.add(hatTop);

  // Gift box
  const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const giftBox = new THREE.Mesh(boxGeo, boxMat);
  giftBox.position.set(-2, 0.4, 1.2);
  giftBox.rotation.y = 0.4;
  giftBox.castShadow = true;
  giftBox.receiveShadow = true;
  scene.add(giftBox);

  // Window resize listener
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  // Gentle rotation animation
  const time = performance.now() * 0.001;
  snowman.rotation.y = Math.sin(time) * 0.15;

  controls.update();
  renderer.render(scene, camera);
}
