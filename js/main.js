import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5a9ec8);
scene.fog = new THREE.FogExp2(0x5a9ec8, 0.007);

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

// Lights
scene.add(new THREE.HemisphereLight(0x87ceeb, 0x2d5a1b, 0.5));
const dir = new THREE.DirectionalLight(0xffffff, 1.05);
dir.position.set(50, 100, 30);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
scene.add(dir);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500, 24, 24),
  new THREE.MeshLambertMaterial({ color: 0x2a5218 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Instanced vegetation
const TREE_COUNT = 50;
const dummy = new THREE.Object3D();
const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 5, 5);
const leafGeo = new THREE.ConeGeometry(2.2, 3.5, 5);
const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x3d2b1f }), TREE_COUNT);
const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0x166616 }), TREE_COUNT);
trunks.castShadow = leaves.castShadow = true;
for (let i = 0; i < TREE_COUNT; i++) {
  const x = (Math.random() - 0.5) * 200;
  const z = (Math.random() - 0.5) * 200;
  dummy.position.set(x, 2.5, z);
  dummy.updateMatrix();
  trunks.setMatrixAt(i, dummy.matrix);
  dummy.position.y = 6.2;
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
}
trunks.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true;
scene.add(trunks, leaves);

// Cover crates
const BOX_COUNT = 12;
const boxes = new THREE.InstancedMesh(
  new THREE.BoxGeometry(2.5, 2.5, 2.5),
  new THREE.MeshLambertMaterial({ color: 0x4a3c28 }),
  BOX_COUNT
);
boxes.castShadow = boxes.receiveShadow = true;
for (let i = 0; i < BOX_COUNT; i++) {
  dummy.position.set((Math.random() - 0.5) * 100, 1.25, (Math.random() - 0.5) * 100);
  dummy.updateMatrix();
  boxes.setMatrixAt(i, dummy.matrix);
}
boxes.instanceMatrix.needsUpdate = true;
scene.add(boxes);

// Enemies
const ENEMY_COUNT = 6;
const enemyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
const enemyMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
const enemies = [];
for (let i = 0; i < ENEMY_COUNT; i++) {
  const mesh = new THREE.Mesh(enemyGeo, enemyMat);
  mesh.position.set((Math.random() - 0.5) * 80, 1.1, (Math.random() - 0.5) * 80);
  mesh.castShadow = true;
  mesh.userData = { health: 50, speed: 2 + Math.random() * 2, state: 'patrol', timer: 0 };
  scene.add(mesh);
  enemies.push(mesh);
}

// Player
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keys = { w: false, a: false, s: false, d: false, space: false, r: false };
let onGround = true;
let health = 100;
let ammo = 30;
let mag = 90;
let score = 0;
let reloading = false;

const healthEl = document.getElementById('health');
const ammoEl = document.getElementById('ammo');
const scoreEl = document.getElementById('score');
let hudDirty = true;

function updateHUD() {
  if (healthEl) healthEl.textContent = Math.max(0, health);
  if (ammoEl) ammoEl.textContent = ammo + '/' + mag;
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
  if (e.code === 'KeyR') keys.r = true;
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') keys.w = false;
  if (e.code === 'KeyA') keys.a = false;
  if (e.code === 'KeyS') keys.s = false;
  if (e.code === 'KeyD') keys.d = false;
  if (e.code === 'Space') keys.space = false;
  if (e.code === 'KeyR') keys.r = false;
});

// Particles
const MAX_PARTICLES = 24;
const particlePool = [];
const pGeo = new THREE.SphereGeometry(0.07, 4, 4);
const pMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
for (let i = 0; i < MAX_PARTICLES; i++) {
  const m = new THREE.Mesh(pGeo, pMat);
  m.visible = false;
  scene.add(m);
  particlePool.push({ mesh: m, life: 0 });
}
let pIdx = 0;
function spawnHit(pt, color = 0xff8800) {
  const p = particlePool[pIdx];
  pIdx = (pIdx + 1) % MAX_PARTICLES;
  p.mesh.position.copy(pt);
  p.mesh.scale.set(1, 1, 1);
  p.mesh.material.color.setHex(color);
  p.mesh.visible = true;
  p.life = 0.8;
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0);
const playerObj = controls.getObject();

function shoot() {
  if (!controls.isLocked || ammo <= 0 || reloading || health <= 0) return;
  ammo--;
  hudDirty = true;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(enemies, false);
  if (hits.length > 0) {
    const e = hits[0].object;
    e.userData.health -= 25;
    spawnHit(hits[0].point, 0xff0000);
    if (e.userData.health <= 0) {
      scene.remove(e);
      enemies.splice(enemies.indexOf(e), 1);
      score += 50;
      hudDirty = true;
    }
  } else {
    const worldHits = raycaster.intersectObjects([ground, boxes, trunks], false);
    if (worldHits.length) spawnHit(worldHits[0].point);
  }
}

document.addEventListener('mousedown', shoot);

let reloadTimer = 0;
function tryReload() {
  if (reloading || ammo >= 30 || mag <= 0) return;
  reloading = true;
  reloadTimer = 1.8;
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.033);

  // Particles
  for (const p of particlePool) {
    if (p.life > 0) {
      p.life -= delta;
      p.mesh.scale.multiplyScalar(0.95);
      if (p.life <= 0) p.mesh.visible = false;
    }
  }

  // Enemies
  for (const e of enemies) {
    const ud = e.userData;
    const toPlayer = new THREE.Vector3().subVectors(playerObj.position, e.position);
    const dist = toPlayer.length();
    if (dist < 25) {
      ud.state = 'chase';
      toPlayer.y = 0;
      toPlayer.normalize();
      e.position.addScaledVector(toPlayer, ud.speed * delta);
      e.lookAt(playerObj.position);
      if (dist < 12 && Math.random() < 0.02) {
        health -= 5;
        hudDirty = true;
        spawnHit(playerObj.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xff0000);
      }
    } else {
      ud.timer += delta;
      if (ud.timer > 3) {
        ud.timer = 0;
        e.position.x += (Math.random() - 0.5) * 4;
        e.position.z += (Math.random() - 0.5) * 4;
      }
    }
    e.position.y = 1.1;
  }

  // Reload
  if (keys.r) tryReload();
  if (reloading) {
    reloadTimer -= delta;
    if (reloadTimer <= 0) {
      const need = 30 - ammo;
      const take = Math.min(need, mag);
      ammo += take;
      mag -= take;
      reloading = false;
      hudDirty = true;
    }
  }

  // Player movement
  if (controls.isLocked && health > 0) {
    if (onGround && keys.space) {
      velocity.y = 7.5;
      onGround = false;
    }
    velocity.y -= 22 * delta;
    if (playerObj.position.y <= 1.6) {
      velocity.y = 0;
      playerObj.position.y = 1.6;
      onGround = true;
    }

    velocity.x *= 1 - 7 * delta;
    velocity.z *= 1 - 7 * delta;
    direction.z = Number(keys.w) - Number(keys.s);
    direction.x = Number(keys.d) - Number(keys.a);
    if (direction.lengthSq() > 0) direction.normalize();
    if (keys.w || keys.s) velocity.z -= direction.z * 32 * delta;
    if (keys.a || keys.d) velocity.x -= direction.x * 32 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    playerObj.position.y += velocity.y * delta;
  }

  if (health <= 0 && healthEl) healthEl.textContent = 'DEAD';
  if (hudDirty) updateHUD();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
