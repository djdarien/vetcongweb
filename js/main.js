import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.addEventListener('click', () => controls.lock());

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50, 100, 50);
light.castShadow = true;
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// Ground
const groundGeo = new THREE.PlaneGeometry(500, 500);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a5f0b });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Simple boxes as cover / jungle stubs
const boxGeo = new THREE.BoxGeometry(2, 4, 2);
const boxMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
for (let i = 0; i < 20; i++) {
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(
    (Math.random() - 0.5) * 100,
    2,
    (Math.random() - 0.5) * 100
  );
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);
}

// Player velocity
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keys = { w: false, a: false, s: false, d: false };

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW') keys.w = true;
  if (e.code === 'KeyA') keys.a = true;
  if (e.code === 'KeyS') keys.s = true;
  if (e.code === 'KeyD') keys.d = true;
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') keys.w = false;
  if (e.code === 'KeyA') keys.a = false;
  if (e.code === 'KeyS') keys.s = false;
  if (e.code === 'KeyD') keys.d = false;
});

// Simple raycast shoot
const raycaster = new THREE.Raycaster();
const bulletHits = [];
document.addEventListener('mousedown', () => {
  if (!controls.isLocked) return;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects.length > 0) {
    const hit = intersects[0];
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    marker.position.copy(hit.point);
    scene.add(marker);
    bulletHits.push(marker);
    setTimeout(() => {
      scene.remove(marker);
    }, 2000);
  }
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (controls.isLocked) {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(keys.w) - Number(keys.s);
    direction.x = Number(keys.d) - Number(keys.a);
    direction.normalize();

    if (keys.w || keys.s) velocity.z -= direction.z * 40.0 * delta;
    if (keys.a || keys.d) velocity.x -= direction.x * 40.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
