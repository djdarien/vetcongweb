import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4a8bb0);
scene.fog = new THREE.FogExp2(0x4a8bb0, 0.0065);

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

scene.add(new THREE.HemisphereLight(0x7ec8e3, 0x1e3a0f, 0.45));
const dir = new THREE.DirectionalLight(0xfff5e6, 1.0);
dir.position.set(40, 90, 20);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
scene.add(dir);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500, 20, 20),
  new THREE.MeshLambertMaterial({ color: 0x245016 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const TREE_COUNT = 60;
const dummy = new THREE.Object3D();
const trunks = new THREE.InstancedMesh(
  new THREE.CylinderGeometry(0.22, 0.32, 5, 5),
  new THREE.MeshLambertMaterial({ color: 0x3a2818 }),
  TREE_COUNT
);
const leaves = new THREE.InstancedMesh(
  new THREE.ConeGeometry(2.0, 3.2, 5),
  new THREE.MeshLambertMaterial({ color: 0x145214 }),
  TREE_COUNT
);
trunks.castShadow = leaves.castShadow = true;
for (let i = 0; i < TREE_COUNT; i++) {
  const x = (Math.random() - 0.5) * 220;
  const z = (Math.random() - 0.5) * 220;
  dummy.position.set(x, 2.5, z);
  dummy.updateMatrix();
  trunks.setMatrixAt(i, dummy.matrix);
  dummy.position.y = 6;
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
}
trunks.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true;
scene.add(trunks, leaves);

const boxes = new THREE.InstancedMesh(
  new THREE.BoxGeometry(2.2, 2.2, 2.2),
  new THREE.MeshLambertMaterial({ color: 0x4a3820 }),
  10
);
boxes.castShadow = boxes.receiveShadow = true;
for (let i = 0; i < 10; i++) {
  dummy.position.set((Math.random() - 0.5) * 90, 1.1, (Math.random() - 0.5) * 90);
  dummy.updateMatrix();
  boxes.setMatrixAt(i, dummy.matrix);
}
boxes.instanceMatrix.needsUpdate = true;
scene.add(boxes);

const enemies = [];
const enemyGeo = new THREE.CapsuleGeometry(0.38, 1.1, 4, 6);
const enemyMat = new THREE.MeshLambertMaterial({ color: 0x6b3e1a });
for (let i = 0; i < 5; i++) {
  const mesh = new THREE.Mesh(enemyGeo, enemyMat);
  mesh.position.set((Math.random() - 0.5) * 70, 1.05, (Math.random() - 0.5) * 70);
  mesh.castShadow = true;
  mesh.userData = { health: 40, speed: 1.8 + Math.random() * 1.5, timer: 0 };
  scene.add(mesh);
  enemies.push(mesh);
}

// Remote players
const remotePlayers = new Map();
const remoteMat = new THREE.MeshLambertMaterial({ color: 0x2288aa });
function getRemote(id) {
  if (!remotePlayers.has(id)) {
    const m = new THREE.Mesh(enemyGeo, remoteMat);
    m.castShadow = true;
    scene.add(m);
    remotePlayers.set(id, m);
  }
  return remotePlayers.get(id);
}
function removeRemote(id) {
  const m = remotePlayers.get(id);
  if (m) {
    scene.remove(m);
    remotePlayers.delete(id);
  }
}

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
const mpEl = document.getElementById('mp');
let hudDirty = true;

function updateHUD() {
  if (healthEl) healthEl.textContent = Math.max(0, health);
  if (ammoEl) ammoEl.textContent = ammo + '/' + mag;
  if (scoreEl) scoreEl.textContent = score;
  if (mpEl) mpEl.textContent = ws && ws.readyState === 1 ? 'ONLINE' : 'OFFLINE';
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

const MAX_PARTICLES = 20;
const particlePool = [];
const pGeo = new THREE.SphereGeometry(0.06, 4, 4);
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
  p.life = 0.7;
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
    spawnHit(hits[0].point, 0xff2222);
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
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'shoot', pos: playerObj.position.toArray() }));
  }
}
document.addEventListener('mousedown', shoot);

let reloadTimer = 0;
function tryReload() {
  if (reloading || ammo >= 30 || mag <= 0) return;
  reloading = true;
  reloadTimer = 1.6;
}

// Multiplayer
let ws = null;
let myId = null;
const SERVER = 'ws://localhost:8080'; // change to your self-hosted server

function connectMP() {
  try {
    ws = new WebSocket(SERVER);
    ws.onopen = () => {
      myId = Math.random().toString(36).slice(2, 10);
      ws.send(JSON.stringify({ type: 'join', id: myId }));
      hudDirty = true;
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'players') {
          const seen = new Set();
          for (const p of msg.players || []) {
            if (p.id === myId) continue;
            seen.add(p.id);
            const m = getRemote(p.id);
            m.position.fromArray(p.pos);
            if (p.rot) m.rotation.y = p.rot;
          }
          for (const id of remotePlayers.keys()) {
            if (!seen.has(id)) removeRemote(id);
          }
        } else if (msg.type === 'leave') {
          removeRemote(msg.id);
        }
      } catch (_) {}
    };
    ws.onclose = () => { hudDirty = true; };
  } catch (_) {}
}
connectMP();

let netTimer = 0;
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.033);

  for (const p of particlePool) {
    if (p.life > 0) {
      p.life -= delta;
      p.mesh.scale.multiplyScalar(0.94);
      if (p.life <= 0) p.mesh.visible = false;
    }
  }

  for (const e of enemies) {
    const ud = e.userData;
    const toPlayer = new THREE.Vector3().subVectors(playerObj.position, e.position);
    const dist = toPlayer.length();
    if (dist < 22) {
      toPlayer.y = 0;
      toPlayer.normalize();
      e.position.addScaledVector(toPlayer, ud.speed * delta);
      e.lookAt(playerObj.position);
      if (dist < 10 && Math.random() < 0.015) {
        health -= 4;
        hudDirty = true;
        spawnHit(playerObj.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xff0000);
      }
    } else {
      ud.timer += delta;
      if (ud.timer > 2.5) {
        ud.timer = 0;
        e.position.x += (Math.random() - 0.5) * 3;
        e.position.z += (Math.random() - 0.5) * 3;
      }
    }
    e.position.y = 1.05;
  }

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

  if (controls.isLocked && health > 0) {
    if (onGround && keys.space) {
      velocity.y = 7;
      onGround = false;
    }
    velocity.y -= 20 * delta;
    if (playerObj.position.y <= 1.6) {
      velocity.y = 0;
      playerObj.position.y = 1.6;
      onGround = true;
    }
    velocity.x *= 1 - 6.5 * delta;
    velocity.z *= 1 - 6.5 * delta;
    direction.z = Number(keys.w) - Number(keys.s);
    direction.x = Number(keys.d) - Number(keys.a);
    if (direction.lengthSq() > 0) direction.normalize();
    if (keys.w || keys.s) velocity.z -= direction.z * 30 * delta;
    if (keys.a || keys.d) velocity.x -= direction.x * 30 * delta;
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    playerObj.position.y += velocity.y * delta;
  }

  netTimer += delta;
  if (ws && ws.readyState === 1 && netTimer > 0.05) {
    netTimer = 0;
    ws.send(JSON.stringify({
      type: 'update',
      id: myId,
      pos: playerObj.position.toArray(),
      rot: controls.getObject().rotation.y
    }));
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
