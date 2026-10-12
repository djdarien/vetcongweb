import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6bb3e0);
scene.fog = new THREE.FogExp2(0x6bb3e0, 0.008);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.addEventListener('click', () => controls.lock());

// Lighting
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5f0b, 0.6);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(60, 120, 40);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
scene.add(dir);

// Ground with variation
const groundGeo = new THREE.PlaneGeometry(400, 400, 64, 64);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d5a1b });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Procedural trees / cover
const trunks = [];
const leaves = [];
const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 6, 6);
const leafGeo = new THREE.ConeGeometry(2.5, 4, 6);
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
const leafMat = new THREE.MeshLambertMaterial({ color: 0x1a6b1a });
for (let i = 0; i < 40; i++) {
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  const x = (Math.random() - 0.5) * 180;
  const z = (Math.random() - 0.5) * 180;
  trunk.position.set(x, 3, z);
  trunk.castShadow = true;
  scene.add(trunk);
  trunks.push(trunk);

  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.set(x, 7.5, z);
  leaf.castShadow = true;
  scene.add(leaf);
  leaves.push(leaf);
}

// Boxes for cover
const boxes = [];
const boxGeo = new THREE.BoxGeometry(3, 3, 3);
const boxMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
for (let i = 0; i < 15; i++) {
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(
    (Math.random() - 0.5) * 120,
    1.5,
    (Math.random() - 0.5) * 120
  );
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);
  boxes.push(box);
}

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

function updateHUD() {
  if (healthEl) healthEl.textContent = health;
  if (ammoEl) ammoEl.textContent = ammo;
  if (scoreEl) scoreEl.textContent = score;
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

// Shooting + muzzle flash particles
const raycaster = new THREE.Raycaster();
const particles = [];

function spawnHit(point) {
  const geo = new THREE.SphereGeometry(0.08);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const p = new THREE.Mesh(geo, mat);
  p.position.copy(point);
  scene.add(p);
  particles.push({ mesh: p, life: 1.5 });
}

document.addEventListener('mousedown', () => {
  if (!controls.isLocked || ammo <= 0) return;
  ammo--;
  updateHUD();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects([...boxes, ...trunks, ground], false);
  if (intersects.length > 0) {
    const hit = intersects[0];
    spawnHit(hit.point);
    if (hit.object !== ground && Math.random() > 0.6) {
      score += 10;
      updateHUD();
    }
  }
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].life -= delta;
    particles[i].mesh.scale.multiplyScalar(0.95);
    if (particles[i].life <= 0) {
      scene.remove(particles[i].mesh);
      particles.splice(i, 1);
    }
  }

  if (controls.isLocked) {
    // Gravity / jump
    if (onGround && keys.space) {
      velocity.y = 8;
      onGround = false;
    }
    velocity.y -= 25 * delta;
    if (controls.getObject().position.y <= 1.6) {
      velocity.y = 0;
      controls.getObject().position.y = 1.6;
      onGround = true;
    }

    velocity.x -= velocity.x * 8.0 * delta;
    velocity.z -= velocity.z * 8.0 * delta;

    direction.z = Number(keys.w) - Number(keys.s);
    direction.x = Number(keys.d) - Number(keys.a);
    direction.normalize();

    if (keys.w || keys.s) velocity.z -= direction.z * 35 * delta;
    if (keys.a || keys.d) velocity.x -= direction.x * 35 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.getObject().position.y += velocity.y * delta;
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
