import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { setupMobile } from './mobile.js';

let scene, camera, renderer, controls, playerObj;
let enemies = [];
let remotePlayers = new Map();
let trunks, leaves, boxes, water;
const dummy = new THREE.Object3D();
let currentMap = 'stream';
let ws = null;
let myId = null;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keys = { w: false, a: false, s: false, d: false, space: false, r: false };
let onGround = true;
let health = 100;
let ammo = 30;
let mag = 90;
let score = 0;
let reloading = false;
let hudDirty = true;
let reloadTimer = 0;
let lookYaw = 0;
let lookPitch = 0;

const healthEl = document.getElementById('health');
const ammoEl = document.getElementById('ammo');
const scoreEl = document.getElementById('score');
const mpEl = document.getElementById('mp');
const mapEl = document.getElementById('map');

function updateHUD() {
  if (healthEl) healthEl.textContent = Math.max(0, health);
  if (ammoEl) ammoEl.textContent = ammo + '/' + mag;
  if (scoreEl) scoreEl.textContent = score;
  if (mpEl) mpEl.textContent = ws && ws.readyState === 1 ? 'ONLINE' : 'OFFLINE';
  if (mapEl) mapEl.textContent = currentMap.toUpperCase();
  hudDirty = false;
}

function clearScene() {
  while (scene.children.length) scene.remove(scene.children[0]);
  enemies = [];
  remotePlayers.clear();
}

function buildStream() {
  scene.background = new THREE.Color(0x3d7a4a);
  scene.fog = new THREE.FogExp2(0x3d7a4a, 0.011);
  scene.add(new THREE.HemisphereLight(0x6aa86a, 0x1a3010, 0.5));
  const dir = new THREE.DirectionalLight(0xffeecc, 0.8);
  dir.position.set(40, 80, 20);
  dir.castShadow = true;
  scene.add(dir);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 12, 12), new THREE.MeshLambertMaterial({ color: 0x1e3d12 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  water = new THREE.Mesh(new THREE.PlaneGeometry(12, 180), new THREE.MeshLambertMaterial({ color: 0x2a5a7a, transparent: true, opacity: 0.7 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.1;
  scene.add(water);

  const TREE_COUNT = 70;
  trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.3, 4.5, 5), new THREE.MeshLambertMaterial({ color: 0x2e2014 }), TREE_COUNT);
  leaves = new THREE.InstancedMesh(new THREE.ConeGeometry(1.7, 2.8, 5), new THREE.MeshLambertMaterial({ color: 0x0f3d0f }), TREE_COUNT);
  trunks.castShadow = leaves.castShadow = true;
  for (let i = 0; i < TREE_COUNT; i++) {
    let x = (Math.random() - 0.5) * 200;
    let z = (Math.random() - 0.5) * 180;
    if (Math.abs(x) < 8) x += x > 0 ? 10 : -10;
    const h = 0.7 + Math.random() * 0.6;
    dummy.position.set(x, 2.2 * h, z);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 5 * h;
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true;
  scene.add(trunks, leaves);

  boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshLambertMaterial({ color: 0x4a3820 }), 6);
  boxes.castShadow = boxes.receiveShadow = true;
  for (let i = 0; i < 6; i++) {
    dummy.position.set((Math.random() - 0.5) * 80, 1, (Math.random() - 0.5) * 80);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    boxes.setMatrixAt(i, dummy.matrix);
  }
  boxes.instanceMatrix.needsUpdate = true;
  scene.add(boxes);

  const enemyGeo = new THREE.CapsuleGeometry(0.35, 1, 4, 6);
  const enemyMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1a });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(enemyGeo, enemyMat);
    m.position.set((Math.random() - 0.5) * 50, 1, (Math.random() - 0.5) * 50);
    m.castShadow = true;
    m.userData = { health: 40, speed: 1.5 + Math.random(), timer: 0 };
    scene.add(m);
    enemies.push(m);
  }
}

function buildHalong() {
  scene.background = new THREE.Color(0x4a7a9a);
  scene.fog = new THREE.FogExp2(0x4a7a9a, 0.008);
  scene.add(new THREE.HemisphereLight(0x7ab0c0, 0x2a3a20, 0.5));
  const dir = new THREE.DirectionalLight(0xfff0d0, 0.9);
  dir.position.set(50, 90, 30);
  dir.castShadow = true;
  scene.add(dir);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 200, 8, 8), new THREE.MeshLambertMaterial({ color: 0x3a4a28 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  water = new THREE.Mesh(new THREE.PlaneGeometry(300, 80), new THREE.MeshLambertMaterial({ color: 0x1a4a6a, transparent: true, opacity: 0.75 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, -60);
  scene.add(water);

  const dockMat = new THREE.MeshLambertMaterial({ color: 0x5a4a30 });
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x6a5a40 });
  for (let i = 0; i < 4; i++) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 25), dockMat);
    pier.position.set(-40 + i * 25, 0.3, -30);
    pier.receiveShadow = true;
    scene.add(pier);
    const warehouse = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 10), wallMat);
    warehouse.position.set(-40 + i * 25, 3, 10);
    warehouse.castShadow = warehouse.receiveShadow = true;
    scene.add(warehouse);
  }

  const TREE_COUNT = 20;
  trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 5, 5), new THREE.MeshLambertMaterial({ color: 0x3a2818 }), TREE_COUNT);
  leaves = new THREE.InstancedMesh(new THREE.ConeGeometry(2, 3, 5), new THREE.MeshLambertMaterial({ color: 0x1a4a1a }), TREE_COUNT);
  for (let i = 0; i < TREE_COUNT; i++) {
    dummy.position.set((Math.random() - 0.5) * 140, 2.5, 20 + Math.random() * 40);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 6;
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true;
  scene.add(trunks, leaves);

  boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshLambertMaterial({ color: 0x4a3820 }), 8);
  for (let i = 0; i < 8; i++) {
    dummy.position.set((Math.random() - 0.5) * 100, 0.75, (Math.random() - 0.5) * 40);
    dummy.updateMatrix();
    boxes.setMatrixAt(i, dummy.matrix);
  }
  boxes.instanceMatrix.needsUpdate = true;
  scene.add(boxes);

  const enemyGeo = new THREE.CapsuleGeometry(0.35, 1, 4, 6);
  const enemyMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1a });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(enemyGeo, enemyMat);
    m.position.set((Math.random() - 0.5) * 80, 1, (Math.random() - 0.5) * 30);
    m.castShadow = true;
    m.userData = { health: 45, speed: 1.4 + Math.random() * 0.8, timer: 0 };
    scene.add(m);
    enemies.push(m);
  }
}

function initMap(name) {
  currentMap = name;
  clearScene();
  if (name === 'halong') buildHalong();
  else buildStream();
  scene.add(controls.getObject());
  playerObj.position.set(0, 1.6, 10);
  updateHUD();
}

function tryReload() {
  if (reloading || ammo >= 30 || mag <= 0) return;
  reloading = true;
  reloadTimer = 1.6;
}

function shoot() {
  if (ammo <= 0 || reloading || health <= 0) return;
  ammo--;
  hudDirty = true;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(enemies, false);
  if (hits.length > 0) {
    const e = hits[0].object;
    e.userData.health -= 25;
    if (e.userData.health <= 0) {
      scene.remove(e);
      enemies.splice(enemies.indexOf(e), 1);
      score += 50;
      hudDirty = true;
    }
  }
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'shoot', pos: playerObj.position.toArray() }));
  }
}

function connectMP() {
  const SERVER = 'ws://localhost:8080';
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
            if (!remotePlayers.has(p.id)) {
              const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1, 4, 6), new THREE.MeshLambertMaterial({ color: 0x2a6a8a }));
              m.castShadow = true;
              scene.add(m);
              remotePlayers.set(p.id, m);
            }
            const m = remotePlayers.get(p.id);
            m.position.fromArray(p.pos);
            if (typeof p.rot === 'number') m.rotation.y = p.rot;
          }
          for (const id of [...remotePlayers.keys()]) {
            if (!seen.has(id)) {
              scene.remove(remotePlayers.get(id));
              remotePlayers.delete(id);
            }
          }
        } else if (msg.type === 'leave') {
          const m = remotePlayers.get(msg.id);
          if (m) { scene.remove(m); remotePlayers.delete(msg.id); }
        }
      } catch (_) {}
    };
    ws.onclose = ws.onerror = () => { hudDirty = true; };
  } catch (_) {}
}

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, document.body);
  playerObj = controls.getObject();
  scene.add(playerObj);

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isMobile) {
    document.addEventListener('click', () => controls.lock());
  }

  initMap('stream');

  document.getElementById('mapSelect').addEventListener('change', (e) => {
    initMap(e.target.value);
  });

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

  document.addEventListener('mousedown', () => {
    if (!isMobile && controls.isLocked) shoot();
  });

  // Mobile look via mousemove events dispatched from touch
  document.addEventListener('mousemove', (e) => {
    if (isMobile && e.movementX !== undefined) {
      lookYaw -= e.movementX * 0.002;
      lookPitch -= e.movementY * 0.002;
      lookPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lookPitch));
      playerObj.rotation.y = lookYaw;
      camera.rotation.x = lookPitch;
    }
  });

  setupMobile(keys, shoot, tryReload);
  connectMP();

  let netTimer = 0;
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.033);

    for (const e of enemies) {
      const ud = e.userData;
      const toPlayer = new THREE.Vector3().subVectors(playerObj.position, e.position);
      const dist = toPlayer.length();
      if (dist < 18) {
        toPlayer.y = 0;
        toPlayer.normalize();
        e.position.addScaledVector(toPlayer, ud.speed * delta);
        e.lookAt(playerObj.position);
        if (dist < 8 && Math.random() < 0.01) {
          health -= 4;
          hudDirty = true;
        }
      } else {
        ud.timer += delta;
        if (ud.timer > 2.5) {
          ud.timer = 0;
          e.position.x += (Math.random() - 0.5) * 2;
          e.position.z += (Math.random() - 0.5) * 2;
        }
      }
      e.position.y = 1;
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

    const canMove = isMobile || controls.isLocked;
    if (canMove && health > 0) {
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
      velocity.x *= 1 - 6 * delta;
      velocity.z *= 1 - 6 * delta;
      direction.z = Number(keys.w) - Number(keys.s);
      direction.x = Number(keys.d) - Number(keys.a);
      if (direction.lengthSq() > 0) direction.normalize();
      if (keys.w || keys.s) velocity.z -= direction.z * 26 * delta;
      if (keys.a || keys.d) velocity.x -= direction.x * 26 * delta;
      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);
      playerObj.position.y += velocity.y * delta;
    }

    netTimer += delta;
    if (ws && ws.readyState === 1 && netTimer > 0.05 && myId) {
      netTimer = 0;
      ws.send(JSON.stringify({
        type: 'update',
        id: myId,
        pos: playerObj.position.toArray(),
        rot: playerObj.rotation.y
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
}

init();
