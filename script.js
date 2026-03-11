import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050813, 0.01);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 30000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xc0d7ff, 0x121724, 1.5);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(10, 16, 8);
scene.add(dir);

const stageEl = document.getElementById('stage');
const dimensionEl = document.getElementById('dimension');
const sizeEl = document.getElementById('size');
const scoreEl = document.getElementById('score');
const milestoneEl = document.getElementById('milestone');
const intro = document.getElementById('intro');
const startBtn = document.getElementById('startBtn');
const joystick = document.getElementById('joystick');
const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');

const STAGES = [
  { threshold: 0.4, name: 'Microscopic', bg: 0x060914, floor: 0x11192a, ring: 0x6ea0ff },
  { threshold: 1.4, name: 'Ground', bg: 0x08101f, floor: 0x18243d, ring: 0x62b1ff },
  { threshold: 8, name: 'City', bg: 0x0b1223, floor: 0x252244, ring: 0x8d78ff },
  { threshold: 40, name: 'Planetary', bg: 0x100f1c, floor: 0x312138, ring: 0xff6cb2 },
  { threshold: 120, name: 'Stellar', bg: 0x0d1320, floor: 0x16364d, ring: 0x67e6ff },
  { threshold: 300, name: 'Cosmic', bg: 0x120f0d, floor: 0x3d2e1a, ring: 0xffcc66 },
  { threshold: 650, name: 'Multiverse', bg: 0x120a16, floor: 0x382043, ring: 0xb98cff }
];

const TIERS = [
  { name: 'dust', min: 0.02, max: 0.05, mass: 1, color: 0xc7d5ff, shape: 'sphere' },
  { name: 'germs', min: 0.045, max: 0.08, mass: 1.4, color: 0x91ffc3, shape: 'blob' },
  { name: 'grains', min: 0.08, max: 0.14, mass: 2, color: 0xffed9b, shape: 'box' },
  { name: 'pebbles', min: 0.14, max: 0.28, mass: 3.5, color: 0xc2b4ff, shape: 'sphere' },
  { name: 'fruit', min: 0.28, max: 0.55, mass: 6, color: 0xff9f94, shape: 'sphere' },
  { name: 'furniture', min: 0.55, max: 1.1, mass: 10, color: 0xa7d2ff, shape: 'box' },
  { name: 'cars', min: 1.1, max: 2.2, mass: 18, color: 0x79b4ff, shape: 'box' },
  { name: 'houses', min: 2.2, max: 4.5, mass: 30, color: 0xffb37d, shape: 'tower' },
  { name: 'buildings', min: 4.5, max: 9, mass: 55, color: 0xe4c5ff, shape: 'tower' },
  { name: 'city blocks', min: 9, max: 18, mass: 95, color: 0x98ffeb, shape: 'slab' },
  { name: 'continents', min: 18, max: 36, mass: 165, color: 0xa9e693, shape: 'sphere' },
  { name: 'planets', min: 36, max: 72, mass: 280, color: 0x84b1ff, shape: 'planet' },
  { name: 'stars', min: 72, max: 140, mass: 480, color: 0xffd27b, shape: 'star' },
  { name: 'galaxies', min: 140, max: 280, mass: 820, color: 0xe4a6ff, shape: 'galaxy' },
  { name: 'universes', min: 280, max: 560, mass: 1380, color: 0x7df6ff, shape: 'universe' },
  { name: 'other universes', min: 560, max: 980, mass: 2200, color: 0xff84dd, shape: 'universe' }
];

let running = false;
let totalMass = 0;
let dimension = 1;
let stageIndex = 0;
let lastUnlockTier = -1;
let collapseT = 0;
let collapsing = false;

const world = {
  radius: 240,
  targets: [],
  particles: []
};

const floorGeo = new THREE.CircleGeometry(260, 120);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x18243d, roughness: 0.96, metalness: 0.04 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const stars = new THREE.Group();
scene.add(stars);
for (let i = 0; i < 340; i++) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  m.position.set((Math.random() - 0.5) * 5000, 120 + Math.random() * 1000, (Math.random() - 0.5) * 5000);
  m.scale.setScalar(Math.random() * 2.8 + 0.5);
  stars.add(m);
}

const holeGroup = new THREE.Group();
scene.add(holeGroup);
const holeDisc = new THREE.Mesh(
  new THREE.CylinderGeometry(1.5, 1.85, 0.22, 40),
  new THREE.MeshStandardMaterial({ color: 0x010207, roughness: 0.28, metalness: 0.78 })
);
holeDisc.position.y = 0.12;
holeGroup.add(holeDisc);
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(2.0, 0.18, 18, 48),
  new THREE.MeshStandardMaterial({ color: 0x62b1ff, emissive: 0x2f5aa0, emissiveIntensity: 1.25, roughness: 0.24 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.14;
holeGroup.add(ring);

const player = {
  pos: new THREE.Vector3(0, 0, 0),
  vel: new THREE.Vector3(0, 0, 0),
  size: 0.24,
  speed: 7.2
};

const joy = {
  active: false,
  id: null,
  origin: { x: 0, y: 0 },
  move: { x: 0, y: 0 },
  max: 56
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function randomRange(a, b) { return a + Math.random() * (b - a); }
function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function currentStageIndex() {
  let idx = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (player.size >= STAGES[i].threshold) idx = i;
  }
  return idx;
}

function applyStage(force = false) {
  const idx = currentStageIndex();
  if (!force && idx === stageIndex) return;
  stageIndex = idx;
  const stage = STAGES[idx];
  scene.background = new THREE.Color(stage.bg);
  scene.fog.color = new THREE.Color(stage.bg);
  floor.material.color.setHex(stage.floor);
  ring.material.color.setHex(stage.ring);
  ring.material.emissive.setHex(stage.ring);
  stageEl.textContent = stage.name;
}

function tierForScale(scale) {
  return TIERS.findIndex(t => scale >= t.min && scale < t.max);
}

function maybeAnnounceUnlock() {
  const edibleMax = player.size * 0.92;
  let idx = -1;
  for (let i = 0; i < TIERS.length; i++) if (edibleMax >= TIERS[i].min) idx = i;
  if (idx > lastUnlockTier) {
    lastUnlockTier = idx;
    const label = idx >= 0 ? TIERS[idx].name : 'dust';
    milestoneEl.textContent = `You can now swallow ${label}.`;
  }
}

function visualScaleFor(baseSize) {
  const shrink = Math.pow(Math.max(player.size, 0.24), 0.97);
  return clamp((baseSize / shrink) * 5.4, 0.02, 14);
}

function geometryForTier(tier) {
  switch (tier.shape) {
    case 'blob': return new THREE.IcosahedronGeometry(0.55, 0);
    case 'box': return new THREE.BoxGeometry(1, 1, 1);
    case 'tower': return new THREE.BoxGeometry(0.85, 1.7, 0.85);
    case 'slab': return new THREE.BoxGeometry(1.8, 0.65, 1.8);
    case 'planet': return new THREE.SphereGeometry(0.7, 18, 18);
    case 'star': return new THREE.IcosahedronGeometry(0.75, 0);
    case 'galaxy': return new THREE.TorusGeometry(0.7, 0.24, 10, 18);
    case 'universe': return new THREE.OctahedronGeometry(0.8, 0);
    default: return new THREE.SphereGeometry(0.55, 14, 14);
  }
}

function materialForTier(tier) {
  return new THREE.MeshStandardMaterial({
    color: tier.color,
    emissive: 0x000000,
    roughness: tier.shape === 'planet' ? 0.55 : 0.72,
    metalness: tier.shape === 'galaxy' || tier.shape === 'star' ? 0.3 : 0.12
  });
}

function spawnDistance(baseSize) {
  const zoom = 26 + player.size * 9.5;
  const near = Math.max(6, zoom * 0.35 + baseSize * 0.25);
  const far = zoom * 1.15 + baseSize * 0.6;
  return randomRange(near, far);
}

function chooseTier() {
  const edibleMax = player.size * 0.92;
  const visibleMax = player.size * 2.25;
  const candidates = [];
  const weights = [];

  TIERS.forEach((tier, i) => {
    if (tier.min <= visibleMax) {
      candidates.push({ tier, index: i });
      const midpoint = (tier.min + tier.max) * 0.5;
      const diff = Math.abs(Math.log(midpoint / Math.max(player.size, 0.02)));
      let w = 1 / (0.4 + diff * 1.25);
      if (tier.max <= edibleMax) w *= 1.9;
      if (midpoint < player.size * 0.18) w *= 0.4;
      if (midpoint > player.size * 1.25) w *= 0.55;
      weights.push(w);
    }
  });

  if (!candidates.length) return { tier: TIERS[0], index: 0 };
  return weightedPick(candidates, weights);
}

function respawnTarget(target) {
  const choice = chooseTier();
  const tier = choice.tier;
  const baseSize = randomRange(tier.min, tier.max);
  const geo = geometryForTier(tier);

  if (!target.mesh) {
    target.mesh = new THREE.Mesh(geo, materialForTier(tier));
    scene.add(target.mesh);
  } else {
    target.mesh.geometry.dispose();
    target.mesh.material.dispose();
    target.mesh.geometry = geo;
    target.mesh.material = materialForTier(tier);
  }

  const angle = Math.random() * Math.PI * 2;
  const dist = spawnDistance(baseSize);
  target.mesh.position.set(player.pos.x + Math.cos(angle) * dist, 0, player.pos.z + Math.sin(angle) * dist);
  target.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

  target.tierIndex = choice.index;
  target.label = tier.name;
  target.baseSize = baseSize;
  target.size = visualScaleFor(baseSize);
  target.mass = Math.pow(baseSize, 1.28) * tier.mass;
  target.beingEaten = false;
  target.wobble = Math.random() * Math.PI * 2;
  target.mesh.scale.setScalar(target.size);
  target.mesh.position.y = target.size * 0.5;
}

function makeTarget() {
  const t = { mesh: null, baseSize: 0.1, size: 0.1, mass: 1, beingEaten: false, wobble: 0, tierIndex: 0, label: 'dust' };
  respawnTarget(t);
  world.targets.push(t);
}

function populate() {
  const desired = 170 + Math.min(140, Math.floor(player.size * 0.36));
  while (world.targets.length < desired) makeTarget();
}

function makeParticle(pos, color, scale = 0.1) {
  const p = new THREE.Mesh(
    new THREE.SphereGeometry(scale, 8, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
  );
  p.position.copy(pos);
  scene.add(p);
  world.particles.push({
    mesh: p,
    life: randomRange(0.36, 0.68),
    vel: new THREE.Vector3(randomRange(-2.4, 2.4), randomRange(0.4, 2.8), randomRange(-2.4, 2.4))
  });
}

function growthFrom(baseSize) {
  return 0.00018 + Math.pow(baseSize, 0.92) * 0.00011;
}

function eatTarget(target) {
  totalMass += target.mass;
  player.size += growthFrom(target.baseSize);

  const idx = world.targets.indexOf(target);
  if (idx >= 0) world.targets.splice(idx, 1);
  for (let i = 0; i < 8; i++) makeParticle(target.mesh.position, target.mesh.material.color, clamp(target.size * 0.1, 0.04, 0.35));
  scene.remove(target.mesh);
  target.mesh.geometry.dispose();
  target.mesh.material.dispose();

  applyStage();
  maybeAnnounceUnlock();
  if (player.size > 850) collapseReality();
}

function collapseReality() {
  if (collapsing) return;
  collapsing = true;
  collapseT = 0;
  milestoneEl.textContent = 'Reality collapsed. Black hole transit to an alternate dimension...';
}

function clearTargets() {
  world.targets.forEach(t => {
    if (!t.mesh) return;
    scene.remove(t.mesh);
    t.mesh.geometry.dispose();
    t.mesh.material.dispose();
  });
  world.targets = [];
}

function resetDimension() {
  dimension += 1;
  dimensionEl.textContent = String(dimension);
  player.size = 0.24;
  player.pos.set(0, 0, 0);
  player.vel.set(0, 0, 0);
  lastUnlockTier = -1;
  clearTargets();
  applyStage(true);
  maybeAnnounceUnlock();
  populate();
  collapsing = false;
  ring.scale.setScalar(1);
}

function updateJoystickVisual() {
  joystick.style.left = `${joy.origin.x}px`;
  joystick.style.top = `${joy.origin.y}px`;
  joystickKnob.style.transform = `translate(calc(-50% + ${joy.move.x}px), calc(-50% + ${joy.move.y}px))`;
  const mag = Math.hypot(joy.move.x, joy.move.y);
  const size = 94 + mag * 0.78;
  joystickBase.style.width = `${size}px`;
  joystickBase.style.height = `${size}px`;
}

function pointerStart(e) {
  if (!running || joy.active) return;
  joy.active = true;
  joy.id = e.pointerId;
  joy.origin.x = e.clientX;
  joy.origin.y = e.clientY;
  joy.move.x = 0;
  joy.move.y = 0;
  joystick.classList.remove('hidden');
  updateJoystickVisual();
}
function pointerMove(e) {
  if (!joy.active || e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.origin.x;
  let dy = e.clientY - joy.origin.y;
  const mag = Math.hypot(dx, dy);
  if (mag > joy.max) {
    dx = (dx / mag) * joy.max;
    dy = (dy / mag) * joy.max;
  }
  joy.move.x = dx;
  joy.move.y = dy;
  updateJoystickVisual();
}
function pointerEnd(e) {
  if (e.pointerId !== joy.id) return;
  joy.active = false;
  joy.id = null;
  joy.move.x = 0;
  joy.move.y = 0;
  joystick.classList.add('hidden');
  updateJoystickVisual();
}
window.addEventListener('pointerdown', pointerStart);
window.addEventListener('pointermove', pointerMove);
window.addEventListener('pointerup', pointerEnd);
window.addEventListener('pointercancel', pointerEnd);

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') joy.move.y = -joy.max;
  if (k === 's' || k === 'arrowdown') joy.move.y = joy.max;
  if (k === 'a' || k === 'arrowleft') joy.move.x = -joy.max;
  if (k === 'd' || k === 'arrowright') joy.move.x = joy.max;
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (['w','arrowup','s','arrowdown'].includes(k)) joy.move.y = 0;
  if (['a','arrowleft','d','arrowright'].includes(k)) joy.move.x = 0;
});

startBtn.addEventListener('click', () => {
  running = true;
  intro.style.display = 'none';
});

camera.position.set(0, 10, 18);
camera.lookAt(0, 0, 0);
applyStage(true);
maybeAnnounceUnlock();
populate();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  if (running) {
    if (collapsing) {
      collapseT += dt;
      const pull = Math.min(1, collapseT / 3);
      world.targets.forEach(t => {
        t.mesh.position.lerp(player.pos, dt * (0.75 + pull * 5.8));
        t.mesh.scale.multiplyScalar(1 - dt * (0.5 + pull * 1.5));
      });
      ring.scale.setScalar(1 + pull * 3.2);
      const collapseCam = new THREE.Vector3(player.pos.x, 12 + player.size * 10 + pull * 170, player.pos.z + 18 + player.size * 16 + pull * 170);
      camera.position.lerp(collapseCam, 0.045);
      camera.lookAt(player.pos);
      if (collapseT > 3.1) resetDimension();
    } else {
      const input = new THREE.Vector3(joy.move.x / joy.max, 0, joy.move.y / joy.max);
      const targetSpeed = player.speed / Math.pow(player.size + 0.15, 0.1);
      const desired = input.lengthSq() ? input.normalize().multiplyScalar(targetSpeed) : new THREE.Vector3();
      player.vel.lerp(desired, 0.1);
      player.pos.addScaledVector(player.vel, dt);

      const bounds = world.radius + player.size * 18;
      player.pos.x = clamp(player.pos.x, -bounds, bounds);
      player.pos.z = clamp(player.pos.z, -bounds, bounds);

      for (let i = world.targets.length - 1; i >= 0; i--) {
        const t = world.targets[i];
        t.wobble += dt * (0.8 + 0.2 / Math.max(t.baseSize, 0.03));
        if (!t.beingEaten) t.mesh.rotation.y += dt * 0.35;
        if (t.tierIndex >= 12) t.mesh.rotation.z += dt * 0.18;

        const idealScale = visualScaleFor(t.baseSize);
        t.size += (idealScale - t.size) * Math.min(1, dt * 4.3);
        t.mesh.scale.setScalar(t.size);
        t.mesh.position.y = t.size * 0.5 + Math.sin(t.wobble) * Math.min(0.05, t.size * 0.05);

        const d = t.mesh.position.distanceTo(player.pos);
        const eatRadius = Math.max(1.25, player.size * 2.0);
        const canEat = t.baseSize <= player.size * 0.92;

        if (canEat && d < eatRadius * 2.5) {
          t.beingEaten = true;
          const suction = clamp((eatRadius * 2.5 - d) / (eatRadius * 2.5), 0, 1);
          t.mesh.position.lerp(player.pos, dt * (1.8 + suction * 5.6 + player.size * 0.012));
          t.mesh.scale.multiplyScalar(1 - dt * (0.8 + suction * 2.8));
          t.mesh.material.emissive.copy(ring.material.color).multiplyScalar(suction * 0.4);
        } else {
          t.beingEaten = false;
          t.mesh.material.emissive.setRGB(0, 0, 0);
        }

        if (canEat && d < eatRadius * 0.62) eatTarget(t);

        const off = Math.abs(t.mesh.position.x - player.pos.x) > bounds * 1.25 || Math.abs(t.mesh.position.z - player.pos.z) > bounds * 1.25;
        if (off && !t.beingEaten) respawnTarget(t);
      }

      populate();
    }

    holeGroup.position.copy(player.pos);
    holeGroup.scale.setScalar(Math.max(0.9, player.size * 6.5));
    ring.rotation.z += dt * 0.5;

    for (let i = world.particles.length - 1; i >= 0; i--) {
      const p = world.particles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = Math.max(0, p.life * 2);
      p.mesh.scale.multiplyScalar(0.992);
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        world.particles.splice(i, 1);
      }
    }

    const zoom = 12 + player.size * 17;
    const camHeight = 7 + player.size * 10;
    const lookAhead = Math.min(zoom * 0.12, 20);
    const camTarget = new THREE.Vector3(player.pos.x, camHeight, player.pos.z + zoom);
    camera.position.lerp(camTarget, 0.08);
    camera.lookAt(player.pos.x, 0, player.pos.z - lookAhead);
    camera.fov = clamp(58 + player.size * 0.018, 58, 82);
    camera.updateProjectionMatrix();

    floor.scale.setScalar(Math.max(1, 1 + player.size * 0.16));
    stars.visible = player.size > 24;
    stars.position.set(player.pos.x * 0.08, 0, player.pos.z * 0.08);

    sizeEl.textContent = player.size.toFixed(3);
    scoreEl.textContent = Math.floor(totalMass).toLocaleString();
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
