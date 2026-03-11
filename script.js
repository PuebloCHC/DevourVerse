import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('gameCanvas');
const sizeEl = document.getElementById('sizeValue');
const scoreEl = document.getElementById('scoreValue');
const dimensionEl = document.getElementById('dimensionValue');
const stageEl = document.getElementById('stageValue');
const milestoneEl = document.getElementById('milestone');
const joystickEl = document.getElementById('joystick');
const joystickBaseEl = document.getElementById('joystickBase');
const joystickKnobEl = document.getElementById('joystickKnob');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02060d);
scene.fog = new THREE.FogExp2(0x02060d, 0.018);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 16, 18);

const ambient = new THREE.HemisphereLight(0xb6ffe2, 0x0d1620, 1.25);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xe9fff1, 1.2);
sun.position.set(25, 32, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
scene.add(sun);

const glowLight = new THREE.PointLight(0x3eff85, 2.2, 45, 2);
glowLight.position.set(0, 2, 0);
scene.add(glowLight);

const groundMat = new THREE.MeshStandardMaterial({
  color: 0x152330,
  roughness: 0.96,
  metalness: 0.03,
  emissive: 0x081019,
  emissiveIntensity: 0.12,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000, 100, 100), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(5000, 280, 0x173327, 0x0b1b13);
grid.material.transparent = true;
grid.material.opacity = 0.24;
scene.add(grid);

const starGeo = new THREE.BufferGeometry();
const starCount = 1500;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 900 + Math.random() * 1600;
  const a = Math.random() * Math.PI * 2;
  const y = 120 + Math.random() * 900;
  starPos[i * 3] = Math.cos(a) * r;
  starPos[i * 3 + 1] = y;
  starPos[i * 3 + 2] = Math.sin(a) * r;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xdffff0, size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0.9 });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

const playerGroup = new THREE.Group();
scene.add(playerGroup);

const playerRadiusBase = 1.15;
const sphereGeo = new THREE.SphereGeometry(1, 48, 48);
const sphereMat = new THREE.MeshStandardMaterial({
  color: 0x030405,
  roughness: 0.32,
  metalness: 0.22,
  emissive: 0x07120a,
  emissiveIntensity: 0.65,
});
const playerSphere = new THREE.Mesh(sphereGeo, sphereMat);
playerSphere.castShadow = true;
playerSphere.receiveShadow = true;
playerGroup.add(playerSphere);

const shellGeo = new THREE.SphereGeometry(1.12, 48, 48);
const shellMat = new THREE.MeshBasicMaterial({
  color: 0x56ff9b,
  transparent: true,
  opacity: 0.17,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
});
const playerGlow = new THREE.Mesh(shellGeo, shellMat);
playerGroup.add(playerGlow);

const ringGeo = new THREE.RingGeometry(1.22, 1.42, 64);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0x59ffa2,
  transparent: true,
  opacity: 0.62,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
});
const outlineRing = new THREE.Mesh(ringGeo, ringMat);
outlineRing.rotation.x = -Math.PI / 2;
outlineRing.position.y = -0.98;
playerGroup.add(outlineRing);

const trailGeo = new THREE.RingGeometry(0.6, 1.15, 40);
const trailMat = new THREE.MeshBasicMaterial({
  color: 0x47ff87,
  transparent: true,
  opacity: 0.25,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
});
const trail = new THREE.Mesh(trailGeo, trailMat);
trail.rotation.x = -Math.PI / 2;
trail.position.y = -1.05;
playerGroup.add(trail);

let dimension = 1;
let totalScore = 0;
let playerMass = 0;
let playerScale = 1;
let targetCameraDistance = 22;
const player = {
  pos: new THREE.Vector3(0, 0, 0),
  vel: new THREE.Vector3(),
  dir: new THREE.Vector2(0, 0),
  speed: 8,
  rollAngle: 0,
};

const stages = [
  { name: 'Micro', min: 1, max: 4, items: [
    { name: 'Germ', size: 0.14, color: 0x79f2d0, value: 1, shape: 'spike' },
    { name: 'Dust', size: 0.1, color: 0xbaa983, value: 1, shape: 'rock' },
    { name: 'Mote', size: 0.11, color: 0xe8efe3, value: 1, shape: 'crystal' },
  ]},
  { name: 'Tiny', min: 3, max: 9, items: [
    { name: 'Seed', size: 0.24, color: 0x9d6f3d, value: 3, shape: 'capsule' },
    { name: 'Pebble', size: 0.28, color: 0x757b84, value: 3, shape: 'rock' },
    { name: 'Berry', size: 0.22, color: 0xff4f72, value: 4, shape: 'sphere' },
  ]},
  { name: 'Street', min: 8, max: 28, items: [
    { name: 'Cone', size: 0.65, color: 0xff9747, value: 8, shape: 'cone' },
    { name: 'Crate', size: 0.92, color: 0x9a6a43, value: 10, shape: 'box' },
    { name: 'Mailbox', size: 1.15, color: 0x597ce8, value: 12, shape: 'capsuleTall' },
  ]},
  { name: 'City', min: 24, max: 80, items: [
    { name: 'Car', size: 1.8, color: 0xe8a13c, value: 28, shape: 'car' },
    { name: 'Truck', size: 2.25, color: 0x72bde8, value: 34, shape: 'truck' },
    { name: 'House', size: 3.0, color: 0xd6b98a, value: 40, shape: 'house' },
  ]},
  { name: 'Massive', min: 70, max: 200, items: [
    { name: 'Tower', size: 5.2, color: 0x8da0c9, value: 80, shape: 'tower' },
    { name: 'Block', size: 6.0, color: 0x8894a6, value: 95, shape: 'building' },
    { name: 'Stadium', size: 7.2, color: 0x7e9377, value: 110, shape: 'stadium' },
  ]},
  { name: 'Cosmic', min: 180, max: 99999, items: [
    { name: 'Asteroid', size: 10.5, color: 0x786d6a, value: 220, shape: 'asteroid' },
    { name: 'Moon', size: 13.5, color: 0xbfc7cf, value: 320, shape: 'moon' },
    { name: 'Planet', size: 18, color: 0x4e7eff, value: 550, shape: 'planet' },
  ]},
];

const items = [];
const itemGroup = new THREE.Group();
scene.add(itemGroup);

const tempVec3 = new THREE.Vector3();
const milestoneThresholds = [
  { size: 2.5, text: 'You can now pull in seeds and pebbles.' },
  { size: 6, text: 'You can now swallow street props.' },
  { size: 18, text: 'You can now consume cars and houses.' },
  { size: 42, text: 'You can now devour towers and districts.' },
  { size: 120, text: 'You are entering the colossal scale.' },
  { size: 220, text: 'Planets are finally within reach.' },
];
let nextMilestoneIndex = 0;

function setMilestone(text) {
  milestoneEl.textContent = text;
}

function getStageName() {
  const s = stages.find(st => playerScale >= st.min && playerScale < st.max);
  return s ? s.name : 'Cosmic';
}

function makeMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.76,
    metalness: 0.12,
    emissive: new THREE.Color(color).multiplyScalar(0.08),
    emissiveIntensity: 0.75,
  });
}

function createItemMesh(def) {
  let mesh;
  const mat = makeMaterial(def.color);

  switch (def.shape) {
    case 'sphere':
    case 'moon':
    case 'planet': {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 24), mat);
      break;
    }
    case 'asteroid': {
      mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat);
      break;
    }
    case 'rock': {
      mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat);
      break;
    }
    case 'crystal': {
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat);
      break;
    }
    case 'spike': {
      mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat);
      break;
    }
    case 'capsule': {
      mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.65, 6, 12), mat);
      break;
    }
    case 'capsuleTall': {
      mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.3, 6, 12), mat);
      break;
    }
    case 'cone': {
      mesh = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.8, 18), mat);
      break;
    }
    case 'box': {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.2, 1.3), mat);
      break;
    }
    case 'car': {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.3), mat);
      body.position.y = 0.55;
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), mat);
      top.position.set(0.15, 1.1, 0);
      group.add(body, top);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.05 });
      for (const x of [-0.8, 0.8]) {
        for (const z of [-0.65, 0.65]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.28, 18), wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(x, 0.28, z);
          group.add(wheel);
        }
      }
      return group;
    }
    case 'truck': {
      const group = new THREE.Group();
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 1.45), mat);
      back.position.y = 0.65;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.1, 1.35), mat);
      cab.position.set(1.35, 0.75, 0);
      group.add(back, cab);
      return group;
    }
    case 'house': {
      const group = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 2.2), mat);
      base.position.y = 0.9;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.95, 1.45, 4), new THREE.MeshStandardMaterial({ color: 0x8a4439, roughness: 0.9 }));
      roof.position.y = 2.2;
      roof.rotation.y = Math.PI / 4;
      group.add(base, roof);
      return group;
    }
    case 'tower': {
      const group = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 6, 1.8), mat);
      base.position.y = 3;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 2.2), new THREE.MeshStandardMaterial({ color: 0xd7f1ff, roughness: 0.4 }));
      cap.position.y = 6.1;
      group.add(base, cap);
      return group;
    }
    case 'building': {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 7.5, 3.2), mat);
      body.position.y = 3.75;
      group.add(body);
      return group;
    }
    case 'stadium': {
      const group = new THREE.Group();
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.1, 2.4, 24), mat);
      bowl.position.y = 1.2;
      group.add(bowl);
      return group;
    }
    default:
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  }

  return mesh;
}

function addGroundDetail(x, z, size) {
  const stone = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 0),
    new THREE.MeshStandardMaterial({ color: 0x1d2a36, roughness: 1, metalness: 0 })
  );
  stone.position.set(x, size * 0.65, z);
  stone.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
  stone.receiveShadow = true;
  itemGroup.add(stone);
}

for (let i = 0; i < 400; i++) {
  addGroundDetail((Math.random() - 0.5) * 1800, (Math.random() - 0.5) * 1800, 0.35 + Math.random() * 1.1);
}

function spawnItem(def, radiusBand = 55) {
  const holder = new THREE.Group();
  const mesh = createItemMesh(def);
  holder.add(mesh);
  holder.userData.mesh = mesh;
  const angle = Math.random() * Math.PI * 2;
  const dist = 15 + Math.random() * radiusBand + playerScale * 1.2;
  holder.position.set(player.pos.x + Math.cos(angle) * dist, 0, player.pos.z + Math.sin(angle) * dist);
  holder.rotation.y = Math.random() * Math.PI * 2;
  holder.scale.setScalar(def.size);
  holder.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  itemGroup.add(holder);
  items.push({ def, mesh: holder, size: def.size, value: def.value, eaten: false, spin: (Math.random() - 0.5) * 0.8 });
}

function getSpawnDefs() {
  return stages.filter(s => playerScale >= s.min * 0.8).flatMap(s => s.items);
}

function maintainItems() {
  const targetCount = Math.min(240, 110 + Math.floor(playerScale * 0.65));
  const defs = getSpawnDefs();
  while (items.length < targetCount) {
    const def = defs[Math.floor(Math.random() * defs.length)];
    spawnItem(def, Math.max(60, playerScale * 4));
  }
}

function consume(item) {
  item.eaten = true;
  playerMass += item.value;
  totalScore += item.value;
  const growth = Math.max(0.0045, item.value * 0.0013) / (0.85 + playerScale * 0.16);
  playerScale += growth;
  glowPulse = 1;
  item.mesh.removeFromParent();
  const idx = items.indexOf(item);
  if (idx >= 0) items.splice(idx, 1);
}

let glowPulse = 0;

function updateItems(dt) {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.mesh.rotation.y += item.spin * dt;

    const dx = player.pos.x - item.mesh.position.x;
    const dz = player.pos.z - item.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    const eatRadius = playerScale * 0.92;
    const suctionRadius = playerScale * 4.8;

    if (dist < suctionRadius) {
      const pull = THREE.MathUtils.clamp((suctionRadius - dist) / suctionRadius, 0, 1);
      item.mesh.position.x += (dx / Math.max(dist, 0.001)) * dt * pull * playerScale * 3.4;
      item.mesh.position.z += (dz / Math.max(dist, 0.001)) * dt * pull * playerScale * 3.4;
      item.mesh.scale.lerp(new THREE.Vector3(item.size * (1 - pull * 0.25), item.size * (1 - pull * 0.25), item.size * (1 - pull * 0.25)), 0.2);
    }

    if (!item.eaten && dist < eatRadius && item.size <= playerScale * 0.95) {
      consume(item);
      continue;
    }

    if (dist > Math.max(160, playerScale * 12)) {
      item.mesh.removeFromParent();
      items.splice(i, 1);
      const defs = getSpawnDefs();
      spawnItem(defs[Math.floor(Math.random() * defs.length)], Math.max(60, playerScale * 4));
    }
  }
}

function updateHUD() {
  sizeEl.textContent = playerScale.toFixed(2);
  scoreEl.textContent = Math.floor(totalScore).toLocaleString();
  dimensionEl.textContent = dimension;
  stageEl.textContent = getStageName();

  if (nextMilestoneIndex < milestoneThresholds.length && playerScale >= milestoneThresholds[nextMilestoneIndex].size) {
    setMilestone(milestoneThresholds[nextMilestoneIndex].text);
    nextMilestoneIndex += 1;
  }
}

function resetDimension() {
  dimension += 1;
  playerScale = 1;
  playerMass = 0;
  player.pos.set(0, 0, 0);
  player.vel.set(0, 0, 0);
  nextMilestoneIndex = 0;
  setMilestone(`Reality collapsed. Welcome to dimension ${dimension}.`);
  for (const item of items) item.mesh.removeFromParent();
  items.length = 0;
}

const pointer = {
  active: false,
  id: null,
  startX: 0,
  startY: 0,
  dx: 0,
  dy: 0,
};

function updateJoystickVisual() {
  if (!pointer.active) {
    joystickEl.style.opacity = '0';
    return;
  }
  joystickEl.style.opacity = '1';
  joystickBaseEl.style.left = `${pointer.startX}px`;
  joystickBaseEl.style.top = `${pointer.startY}px`;
  const mag = Math.min(1, Math.hypot(pointer.dx, pointer.dy) / 68);
  const knobX = pointer.startX + pointer.dx * Math.min(1, 48 / Math.max(1, Math.hypot(pointer.dx, pointer.dy)));
  const knobY = pointer.startY + pointer.dy * Math.min(1, 48 / Math.max(1, Math.hypot(pointer.dx, pointer.dy)));
  joystickKnobEl.style.left = `${knobX}px`;
  joystickKnobEl.style.top = `${knobY}px`;
  const bubble = 1 + mag * 0.35;
  joystickBaseEl.style.transform = `translate(-50%, -50%) scale(${bubble})`;
  joystickKnobEl.style.transform = `translate(-50%, -50%) scale(${1 + mag * 0.15})`;
}

function setPointerMove(clientX, clientY) {
  pointer.dx = clientX - pointer.startX;
  pointer.dy = clientY - pointer.startY;
  const len = Math.hypot(pointer.dx, pointer.dy);
  const clamp = 68;
  if (len > clamp) {
    pointer.dx = (pointer.dx / len) * clamp;
    pointer.dy = (pointer.dy / len) * clamp;
  }
  player.dir.set(pointer.dx / clamp, pointer.dy / clamp);
  updateJoystickVisual();
}

window.addEventListener('pointerdown', (e) => {
  pointer.active = true;
  pointer.id = e.pointerId;
  pointer.startX = e.clientX;
  pointer.startY = e.clientY;
  pointer.dx = 0;
  pointer.dy = 0;
  updateJoystickVisual();
});

window.addEventListener('pointermove', (e) => {
  if (!pointer.active || e.pointerId !== pointer.id) return;
  setPointerMove(e.clientX, e.clientY);
});

function endPointer(e) {
  if (!pointer.active || (e && e.pointerId !== pointer.id)) return;
  pointer.active = false;
  pointer.id = null;
  pointer.dx = 0;
  pointer.dy = 0;
  player.dir.set(0, 0);
  updateJoystickVisual();
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

window.addEventListener('keydown', (e) => {
  if (e.key === 'w' || e.key === 'ArrowUp') player.dir.y = -1;
  if (e.key === 's' || e.key === 'ArrowDown') player.dir.y = 1;
  if (e.key === 'a' || e.key === 'ArrowLeft') player.dir.x = -1;
  if (e.key === 'd' || e.key === 'ArrowRight') player.dir.x = 1;
});
window.addEventListener('keyup', (e) => {
  if (['w','ArrowUp','s','ArrowDown'].includes(e.key)) player.dir.y = 0;
  if (['a','ArrowLeft','d','ArrowRight'].includes(e.key)) player.dir.x = 0;
});

function updatePlayer(dt) {
  const input = new THREE.Vector3(player.dir.x, 0, player.dir.y);
  if (input.lengthSq() > 1) input.normalize();
  const maxSpeed = Math.max(5, 12 - Math.log10(1 + playerScale) * 2.2);
  player.vel.lerp(input.multiplyScalar(maxSpeed), 0.12);
  player.pos.addScaledVector(player.vel, dt * 4.2);

  playerGroup.position.copy(player.pos);
  const radius = playerRadiusBase * playerScale;
  playerGroup.position.y = radius;
  playerGroup.scale.setScalar(radius);

  glowLight.position.set(player.pos.x, radius * 1.3, player.pos.z);
  glowLight.distance = 22 + playerScale * 0.45;
  glowLight.intensity = 1.4 + playerScale * 0.006 + glowPulse * 1.2;

  const speed = player.vel.length();
  if (speed > 0.01) {
    const rollAmount = speed * dt * 1.75;
    const axis = new THREE.Vector3(player.vel.z, 0, -player.vel.x).normalize();
    playerSphere.rotateOnWorldAxis(axis, rollAmount);
    playerGlow.rotateOnWorldAxis(axis, rollAmount * 0.8);
    trail.rotation.z += dt * speed * 0.25;
  }

  const pulse = 0.08 + Math.sin(performance.now() * 0.0045) * 0.02 + glowPulse * 0.12;
  playerGlow.scale.setScalar(1.04 + pulse);
  outlineRing.scale.setScalar(1 + pulse * 0.25);
  ringMat.opacity = 0.48 + pulse * 0.8;
  shellMat.opacity = 0.12 + pulse * 0.55;
  glowPulse = Math.max(0, glowPulse - dt * 1.5);

  const camLift = 10 + playerScale * 0.55;
  targetCameraDistance = 16 + playerScale * 1.22;
  camera.position.lerp(new THREE.Vector3(player.pos.x, camLift, player.pos.z + targetCameraDistance), 0.08);
  camera.lookAt(player.pos.x, radius * 0.5, player.pos.z);

  grid.position.set(player.pos.x, 0.02, player.pos.z);

  const cosmic = Math.min(1, Math.max(0, (playerScale - 120) / 140));
  scene.fog.density = 0.018 - cosmic * 0.012;
  scene.background.lerpColors(new THREE.Color(0x02060d), new THREE.Color(0x000000), cosmic);
  groundMat.color.lerpColors(new THREE.Color(0x152330), new THREE.Color(0x020205), cosmic);
  starMat.opacity = 0.45 + cosmic * 0.65;
  starMat.size = 2.2 + cosmic * 2.1;

  if (playerScale >= 300) {
    resetDimension();
  }
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.033, (now - (animate.last || now)) / 1000);
  animate.last = now;

  updatePlayer(dt);
  updateItems(dt);
  maintainItems();
  updateHUD();
  renderer.render(scene, camera);
}

maintainItems();
updateHUD();
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
