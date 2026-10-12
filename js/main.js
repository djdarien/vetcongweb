import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6bb3e0);
scene.fog = new THREE.FogExp2(0x6bb3e0, 0.008);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.addEventListener('click', () => controls.lock());

// Lighting (shadows only on directional)
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5f0b, 0.55);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(60, 120, 40);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.near = 10;
dir.shadow.camera.far = 200;
dir.shadow.camera.left = -80;
dir.shadow.camera.right = 80;
dir.shadow.camera.top = 80;
dir.shadow.camera.bottom = -80;
scene.add(dir);

// Ground — lower segments
const groundGeo = new THREE.PlaneGeometry(400, 400, 32, 32);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d5a1b });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Instanced trees
const TREE_COUNT = 40;
const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 6, 5);
const leafGeo = new THREE.ConeGeometry(2.5, 4, 5);
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
const leafMat = new THREE.MeshLambertMaterial({ color: 0x1a6b1a });
const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_COUNT);
const leaves = new THREE.InstancedMesh(leafGeo, leafMat, TREE_COUNT);
trunks.castShadow = true;
leaves.castShadow = true;
const dummy = new THREE.Object3D();
const raycastTargets = [ground];
for (let i = 0; i < TREE_COUNT; i++) {
  const x = (Math.random() - 0.5) * 180;
  const z = (Math.random() - 0.5) * 180;
  dummy.position.set(x, 3, z);
  dummy.updateMatrix();
  trunks.setMatrixAt(i, dummy.matrix);
  dummy.position.set(x, 7.5, z);
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
}
trunks.instanceMatrix.needsUpdate = true;
leaves.instanceMatrix.needsUpdate = true;
scene.add(trunks, leaves);
raycastTargets.push(trunks);

// Instanced boxes
const BOX_COUNT = 15;
const boxGeo = new THREE.BoxGeometry(3, 3, 3);
const boxMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
const boxes = new THREE.InstancedMesh(boxGeo, boxMat, BOX_COUNT);
boxes.castShadow = true;
boxes.receiveShadow = true;
for (let i = 0; i < BOX_COUNT; i++) {
  dummy.position.set(
    (Math.random() - 0.5) * 120,
    1.5,
    (Math.random() - 0.5) * 120
  );
  dummy.updateMatrix();
  boxes.setMatrixAt(i, dummy.matrix);
}
boxes.instanceMatrix.needsUpdate = true;
scene.add(boxes);
raycastTargets.push(boxes);

// Player state
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keys = { w: false, a: false, s: false, d: false, space: false };
let onGround = true;
let health = 100;
let ammo = 30;
let score = 0;

const healthEl = document.getElementById('health');
const ammoEl = document.getElementById('ammo');
const scoreEl = document.getElementById('score');
let hudDirty = false;

function updateHUD() {
  if (healthEl) healthEl.textContent = health;
  if (ammoEl) ammoEl.textContent = ammo;
  if (scoreEl) scoreEl.textContent = score;
  hudDirty = false;
}
updateHUD();

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW') keys.w = true;
  if (e.code === 'KeyA') keys.a = true;
  if (e.code === 'KeyS') keys.s = true;
  if (e.code === 'KeyD') keys.d = true;
  if (e.code === 'Space') keys.space = true;
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') keys.w = false;
  if (e.code === 'KeyA') keys.a = false;
  if (e.code === 'KeyS') keys.s = false;
  if (e.code === 'KeyD') keys.d = false;
  if (e.code === 'Space') keys.space = false;
});

// Pooled particles
const MAX_PARTICLES = 32;
const particleGeo = new THREE.SphereGeometry(0.08, 4, 4);
const particleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
const particlePool = [];
for (let i = 0; i < MAX_PARTICLES; i++) {
  const mesh = new THREE.Mesh(particleGeo, particleMat);
  mesh.visible = false;
  scene.add(mesh);
  particlePool.push({ mesh, life: 0 });
}
let particleIndex = 0;

function spawnHit(point) {
  const p = particlePool[particleIndex];
  particleIndex = (particleIndex + 1) % MAX_PARTICLES;
  p.mesh.position.copy(point);
  p.mesh.scale.set(1, 1, 1);
  p.mesh.visible = true;
  p.life = 1.2;
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0);

document.addEventListener('mousedown', () => {
  if (!controls.isLocked || ammo <= 0) return;
  ammo--;
  hudDirty = true;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(raycastTargets, false);
  if (intersects.length > 0) {
    const hit = intersects[0];
    spawnHit(hit.point);
    if (hit.object !== ground && Math.random() > 0.65) {
      score += 10;
      hudDirty = true;
    }
  }
});

const clock = new THREE.Clock();
const playerObj = controls.getObject();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.033);

  // Particles
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particlePool[i];
    if (p.life > 0) {
      p.life -= delta;
      p.mesh.scale.multiplyScalar(0.96);
      if (p.life <= 0) p.mesh.visible = false;
    }
  }

  if (controls.isLocked) {
    if (onGround && keys.space) {
      velocity.y = 8;
      onGround = false;
    }
    velocity.y -= 25 * delta;
    if (playerObj.position.y <= 1.6) {
      velocity.y = 0;
      playerObj.position.y = 1.6;
      onGround = true;
    }

    velocity.x *= 1 - 8 * delta;
    velocity.z *= 1 - 8 * delta;

    direction.z = Number(keys.w) - Number(keys.s);
    direction.x = Number(keys.d) - Number(keys.a);
    if (direction.lengthSq() > 0) direction.normalize();

    if (keys.w || keys.s) velocity.z -= direction.z * 35 * delta;
    if (keys.a || keys.d) velocity.x -= direction.x * 35 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    playerObj.position.y += velocity.y * delta;
  }

  if (hudDirty) updateHUD();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
