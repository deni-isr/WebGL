import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {
  XRControllerModelFactory,
} from 'three/addons/webxr/XRControllerModelFactory.js';

// Global variables
let camera, scene, renderer, controls;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let raycaster;
let group;

const intersected = [];
const tempMatrix = new THREE.Matrix4();

// Names of Blender objects that should NOT be grabbed or highlighted
const excludedObjects = ['Grid', 'Plane'];

init();

function init() {
  // Scene setup
  scene = new THREE.Scene();

  // Group for interactive objects
  group = new THREE.Group();
  scene.add(group);

  // Camera setup (metric scale: 1 unit = 1 meter)
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
  camera.position.set(0, 3.5, 22);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.5, 0);

  // Axis helper (5 meters)
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // Directional light angled for shadows
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
  dirLight.position.set(25, 30, 15);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(4096, 4096);
  dirLight.shadow.normalBias = 0.05;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 100;
  dirLight.shadow.camera.left = -30;
  dirLight.shadow.camera.right = 30;
  dirLight.shadow.camera.top = 30;
  dirLight.shadow.camera.bottom = -30;
  scene.add(dirLight);

  // Optional shadow camera helper for debugging
  // const shadowHelper = new THREE.CameraHelper(dirLight.shadow.camera);
  // scene.add(shadowHelper);

  // Load HDR environment map
  const hdrLoader = new HDRLoader();
  hdrLoader.load('./textures/env.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
  });

  // Load landscape GLB into interactive group
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    './models/landscape.glb',
    (gltf) => {
      const landscape = gltf.scene;

      landscape.traverse((node) => {
        if (node.isMesh && node.material) {
          // Clone material so highlighting one object does not affect clones
          node.material = node.material.clone();
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      group.add(landscape);
    },
    undefined,
    (error) => {
      console.error('Error loading landscape:', error);
    },
  );

  // Initialize VR and controllers
  initVR();

  // Window resize listener
  window.addEventListener('resize', onWindowResize);
}

function initVR() {
  document.body.appendChild(VRButton.createButton(renderer));
  renderer.xr.enabled = true;

  // Controllers
  controller1 = renderer.xr.getController(0);
  controller1.addEventListener('selectstart', onSelectStart);
  controller1.addEventListener('selectend', onSelectEnd);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener('selectstart', onSelectStart);
  controller2.addEventListener('selectend', onSelectEnd);
  scene.add(controller2);

  // Default model for controller 1
  const controllerModelFactory = new XRControllerModelFactory();
  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1),
  );
  scene.add(controllerGrip1);

  // Custom GLB model for controller 2
  controllerGrip2 = renderer.xr.getControllerGrip(1);
  const gunLoader = new GLTFLoader();
  gunLoader.load(
    './models/controller.glb',
    (gltf) => {
      const model = gltf.scene;
      // 1. Scale down to hand size
      model.scale.setScalar(0.12);

      // 2. Point blade forward along the laser (-Z) and fix sideways tilt
      model.rotation.set(
        THREE.MathUtils.degToRad(0),
        THREE.MathUtils.degToRad(0),
        THREE.MathUtils.degToRad(90),
      );

      // 3. Shift sword forward (-Z) so the handle sits at the controller origin
      model.position.set(0, 0, -0.10);

      controllerGrip2.add(model);
    },
    undefined,
    (error) => {
      console.error('Error loading controller model:', error);
    },
  );
  scene.add(controllerGrip2);

  // Laser pointer lines
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const line = new THREE.Line(lineGeo);
  line.name = 'line';
  line.scale.z = 5;

  controller1.add(line.clone());
  controller2.add(line.clone());

  // Raycaster for grabbing
  raycaster = new THREE.Raycaster();
}

function getGrabTarget(object) {
  let target = object;
  while (
    target.parent &&
    target.parent !== group &&
    target.parent !== scene &&
    target.parent.name !== 'Scene' &&
    target.parent !== controller1 &&
    target.parent !== controller2
  ) {
    target = target.parent;
  }
  return target;
}

function setEmissive(object, channel, value) {
  object.traverse((child) => {
    if (child.isMesh && child.material && child.material.emissive) {
      child.material.emissive[channel] = value;
    }
  });
}

function onSelectStart(event) {
  const controller = event.target;
  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const object = intersections[0].object;

    if (!excludedObjects.includes(object.name)) {
      const target = getGrabTarget(object);
      setEmissive(target, 'b', 1);
      controller.attach(target);
      controller.userData.selected = target;
    }
  }
}

function onSelectEnd(event) {
  const controller = event.target;

  if (controller.userData.selected !== undefined) {
    const object = controller.userData.selected;
    setEmissive(object, 'b', 0);
    group.attach(object);
    controller.userData.selected = undefined;
  }
}

function getIntersections(controller) {
  controller.updateMatrixWorld();
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  return raycaster.intersectObjects(group.children, true);
}

function intersectObjects(controller) {
  // Do not highlight if an object is already held
  if (controller.userData.selected !== undefined) return;

  const line = controller.getObjectByName('line');
  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];
    const object = intersection.object;

    if (!excludedObjects.includes(object.name)) {
      const target = getGrabTarget(object);
      setEmissive(target, 'r', 1);
      intersected.push(target);
    }

    line.scale.z = intersection.distance;
  } else {
    line.scale.z = 5;
  }
}

function cleanIntersected() {
  while (intersected.length) {
    const object = intersected.pop();
    setEmissive(object, 'r', 0);
  }
}

function onWindowResize() {
  if (renderer.xr.isPresenting) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  cleanIntersected();
  intersectObjects(controller1);
  intersectObjects(controller2);

  controls.update();
  renderer.render(scene, camera);
}