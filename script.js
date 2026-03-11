import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x08101f, 0.012);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 9000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xbad1ff, 0x1b2238, 1.45);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(8, 12, 6);
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

let running = false;
let totalMass = 0;
let dimension = 1;
let stageIndex = 0;
let currentMessage = 'Eat to grow forever.';
const stageNames = ['World', 'Planetary', 'Stellar', 'Cosmic', 'Multiverse'];
const unlocks = [1.8, 4.5, 9, 16, 26, 42, 68, 98, 132];
const unlockText = [
  'You can now swallow street objects.',
  'You can now swallow vehicles.',
  'You can now swallow houses.',
  'You can now swallow towers.',
  'You can now swallow city blocks.',
  'You can now swallow planets.',
  'You can now swallow stars.',
  'You can now swallow galaxies.',
  'Reality is starting to bend.'
];
let unlockIndex = 0;

const world = {
  radius: 80,
  targets: [],
  particles: []
};

const floorGeo = new THREE.CircleGeometry(160, 100);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x18243d, roughness: 0.96, metalness: 0.05 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const stars = new THREE.Group();
scene.add(stars);
const starGeo = new THREE.SphereGeometry(0.18, 6, 6);
const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
for (let i = 0; i < 200; i++) {
  const s = new THREE.Mesh(starGeo, starMat.clone());
  s.position.set((Math.random() - 0.5) * 2000, 120 + Math.random() * 500, (Math.random() - 0.5) * 2000);
  s.scale.setScalar(Math.random() * 3 + 0.5);
  stars.add(s);
}

const holeGroup = new THREE.Group();
scene.add(holeGroup);
const holeDisc = new THREE.Mesh(
  new THREE.CylinderGeometry(1.6, 1.9, 0.25, 36),
  new THREE.MeshStandardMaterial({ color: 0x030409, roughness: 0.35, metalness: 0.65 })
);
holeDisc.position.y = 0.14;
holeGroup.add(holeDisc);
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(2.05, 0.18, 16, 42),
  new THREE.MeshStandardMaterial({ color: 0x5f86ff, emissive: 0x243b88, emissiveIntensity: 1.2, roughness: 0.25 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.16;
holeGroup.add(ring);

const player = {
  pos: new THREE.Vector3(0, 0, 0),
  vel: new THREE.Vector3(0, 0, 0),
  size: 1,
  speed: 8
};

function randomRange(min, max) { return min + Math.random() * (max - min); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function stagePalette(idx) {
  return [
    { bg: 0x08101f, floor: 0x18243d, ring: 0x5f86ff },
    { bg: 0x101225, floor: 0x2b2237, ring: 0x8e6bff },
    { bg: 0x130e18, floor: 0x3a2230, ring: 0xff6bb0 },
    { bg: 0x0b1320, floor: 0x17344f, ring: 0x59e0ff },
    { bg: 0x100f0c, floor: 0x3d311d, ring: 0xffcb5c }
  ][idx % 5];
}

function getTierProgress() {
  return Math.max(0, player.size - 1);
}

function getTargetVisualScale(baseSize) {
  const scale = baseSize / Math.pow(player.size, 0.72);
  return Math.max(0.04, scale);
}

function respawnTarget(target, scaleTier = 0) {
  const baseSize = Math.pow(randomRange(0.42, 1.3) + scaleTier * 0.11, 1.5);
  const geoType = Math.floor(Math.random() * 3);
  let geo;
  if (geoType === 0) geo = new THREE.BoxGeometry(1, 1, 1);
  else if (geoType === 1) geo = new THREE.SphereGeometry(0.55, 16, 16);
  else geo = new THREE.CylinderGeometry(0.45, 0.65, 1.1, 14);

  if (!target.mesh) {
    const hue = (0.55 + stageIndex * 0.12 + Math.random() * 0.1) % 1;
    const color = new THREE.Color().setHSL(hue, 0.55, 0.55 + Math.random() * 0.1);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.15 });
    target.mesh = new THREE.Mesh(geo, mat);
    scene.add(target.mesh);
  } else {
    target.mesh.geometry.dispose();
    target.mesh.geometry = geo;
  }

  const angle = Math.random() * Math.PI * 2;
  const dist = randomRange(player.size * 10 + 10, world.radius + player.size * 9);
  target.mesh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
  target.mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
  target.baseSize = baseSize;
  target.size = getTargetVisualScale(baseSize);
  target.mass = Math.max(1, Math.round(Math.pow(baseSize, 2.45) * 1.15));
  target.beingEaten = false;
  target.wobble = Math.random() * Math.PI * 2;
  target.mesh.scale.setScalar(target.size);
  target.mesh.position.y = target.size * 0.5;
  target.originalColor = target.mesh.material.color.clone();
  return target;
}

function makeTarget(scaleTier = 0) {
  const target = { mesh: null, baseSize: 1, size: 1, mass: 1, beingEaten: false, wobble: 0, originalColor: null };
  respawnTarget(target, scaleTier);
  world.targets.push(target);
}

function populate(count = 180) {
  while (world.targets.length < count) {
    makeTarget(stageIndex + getTierProgress() * 0.05);
  }
}

function makeParticle(pos, color, size = 0.16) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 8, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
  );
  mesh.position.copy(pos);
  scene.add(mesh);
  world.particles.push({ mesh, life: 0.55, vel: new THREE.Vector3(randomRange(-2,2), randomRange(0.6,2.8), randomRange(-2,2)) });
}

function eatTarget(target) {
  totalMass += target.mass;
  player.size += Math.max(0.01, Math.pow(target.baseSize, 0.82) * 0.0045);

  const idx = world.targets.indexOf(target);
  if (idx >= 0) world.targets.splice(idx, 1);
  for (let i = 0; i < 7; i++) makeParticle(target.mesh.position, target.mesh.material.color, 0.08 + Math.min(0.4, target.size * 0.08));
  scene.remove(target.mesh);
  target.mesh.geometry.dispose();
  target.mesh.material.dispose();

  while (unlockIndex < unlocks.length && player.size >= unlocks[unlockIndex]) {
    currentMessage = unlockText[unlockIndex];
    milestoneEl.textContent = currentMessage;
    unlockIndex++;
  }

  if (player.size > 18 && stageIndex < 1) setStage(1, 'You left the ground behind.');
  if (player.size > 42 && stageIndex < 2) setStage(2, 'Now you are swallowing worlds and stars.');
  if (player.size > 82 && stageIndex < 3) setStage(3, 'Reality is tearing open.');
  if (player.size > 126 && stageIndex < 4) setStage(4, 'The multiverse is edible now.');
  if (player.size > 180) collapseReality();
}

function setStage(idx, message) {
  stageIndex = idx;
  const pal = stagePalette(idx);
  scene.background = new THREE.Color(pal.bg);
  scene.fog.color = new THREE.Color(pal.bg);
  floor.material.color.setHex(pal.floor);
  ring.material.color.setHex(pal.ring);
  ring.material.emissive.setHex(pal.ring);
  stageEl.textContent = stageNames[idx];
  milestoneEl.textContent = message;
}
setStage(0, currentMessage);

let collapsing = false;
let collapseT = 0;
function collapseReality() {
  if (collapsing) return;
  collapsing = true;
  collapseT = 0;
  milestoneEl.textContent = 'Reality collapsed. Entering alternate dimension...';
}

function resetDimension() {
  dimension += 1;
  dimensionEl.textContent = String(dimension);
  player.size = 1;
  player.pos.set(0, 0, 0);
  player.vel.set(0, 0, 0);
  unlockIndex = 0;
  stageIndex = 0;
  world.targets.forEach(t => {
    if (t.mesh) {
      scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
    }
  });
  world.targets = [];
  setStage(0, 'A new alternate dimension begins.');
  populate(180);
  collapsing = false;
}

const joy = {
  active: false,
  id: null,
  origin: { x: 0, y: 0 },
  move: { x: 0, y: 0 },
  max: 54
};

function updateJoystickVisual() {
  joystick.style.left = `${joy.origin.x}px`;
  joystick.style.top = `${joy.origin.y}px`;
  joystickKnob.style.transform = `translate(calc(-50% + ${joy.move.x}px), calc(-50% + ${joy.move.y}px))`;
  const mag = Math.hypot(joy.move.x, joy.move.y);
  const size = 92 + mag * 0.72;
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

camera.position.set(0, 18, 22);
camera.lookAt(0, 0, 0);
populate(180);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  if (running) {
    if (collapsing) {
      collapseT += dt;
      const pull = Math.min(1, collapseT / 2.9);
      world.targets.forEach(t => {
        t.mesh.position.lerp(player.pos, pull * 0.07);
        t.mesh.scale.multiplyScalar(1 - dt * 0.55);
      });
      ring.scale.setScalar(1 + pull * 2.8);
      camera.position.lerp(new THREE.Vector3(player.pos.x, 14 + pull * 90, player.pos.z + 18 + pull * 95), 0.03);
      if (collapseT > 3) {
        ring.scale.setScalar(1);
        resetDimension();
      }
    } else {
      const input = new THREE.Vector3(joy.move.x / joy.max, 0, joy.move.y / joy.max);
      const desired = input.lengthSq() > 0 ? input.normalize().multiplyScalar(player.speed / Math.pow(player.size, 0.14)) : new THREE.Vector3();
      player.vel.lerp(desired, 0.12);
      player.pos.addScaledVector(player.vel, dt);
      const boundary = world.radius + player.size * 12;
      player.pos.x = clamp(player.pos.x, -boundary, boundary);
      player.pos.z = clamp(player.pos.z, -boundary, boundary);

      world.targets.forEach((t) => {
        t.wobble += dt * (0.6 + 0.2 / Math.max(t.baseSize, 0.2));
        if (!t.beingEaten) t.mesh.rotation.y += dt * 0.4;

        const idealScale = getTargetVisualScale(t.baseSize);
        t.size += (idealScale - t.size) * Math.min(1, dt * 4.6);
        t.mesh.scale.setScalar(t.size);
        t.mesh.position.y = t.size * 0.5 + Math.sin(t.wobble) * Math.min(0.04, t.size * 0.06);

        const d = t.mesh.position.distanceTo(player.pos);
        const eatRadius = player.size * 1.9;
        const canEat = t.baseSize < player.size * 0.92;

        if (canEat && d < eatRadius * 2.5) {
          t.beingEaten = true;
          const suction = clamp((eatRadius * 2.5 - d) / (eatRadius * 2.5), 0, 1);
          t.mesh.position.lerp(player.pos, suction * dt * (2.4 + player.size * 0.015));
          t.mesh.scale.multiplyScalar(1 - dt * suction * 1.9);
          t.mesh.material.emissive.copy(ring.material.color).multiplyScalar(suction * 0.35);
        } else {
          t.beingEaten = false;
          t.mesh.material.emissive.setRGB(0, 0, 0);
        }
        if (canEat && d < eatRadius * 0.7) {
          eatTarget(t);
        }
      });

      world.targets = world.targets.filter(t => t.mesh && t.mesh.parent);
      populate(180 + Math.floor(Math.pow(player.size, 0.85) * 12));
    }

    holeGroup.position.copy(player.pos);
    holeGroup.scale.setScalar(Math.max(1, player.size));
    ring.rotation.z += dt * 0.55;

    world.particles.forEach((p, idx) => {
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = Math.max(0, p.life * 2);
      p.mesh.scale.multiplyScalar(0.99);
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        world.particles.splice(idx, 1);
      }
    });

    const camDist = 18 + Math.pow(player.size, 1.08) * 2.6;
    const camHeight = 13 + Math.pow(player.size, 1.1) * 1.55;
    const lookAhead = Math.min(12, player.size * 0.14);
    const camTarget = new THREE.Vector3(player.pos.x, camHeight, player.pos.z + camDist);
    camera.position.lerp(camTarget, 0.07);
    camera.lookAt(player.pos.x, 0, player.pos.z - lookAhead);
    camera.fov = clamp(60 + Math.pow(player.size, 0.52) * 1.2, 60, 95);
    camera.updateProjectionMatrix();

    floor.scale.setScalar(Math.max(1, 1 + player.size * 0.1));
    stars.visible = player.size > 20;
    stars.position.set(player.pos.x * 0.1, 0, player.pos.z * 0.1);

    sizeEl.textContent = player.size.toFixed(2);
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
