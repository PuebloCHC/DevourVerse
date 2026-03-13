(() => {
  const canvas = document.getElementById('gameCanvas');
  const sizeEl = document.getElementById('sizeValue');
  const scoreEl = document.getElementById('scoreValue');
  const dimensionEl = document.getElementById('dimensionValue');
  const stageEl = document.getElementById('stageValue');
  const milestoneEl = document.getElementById('milestone');
  const joystickEl = document.getElementById('joystick');
  const joystickBaseEl = document.getElementById('joystickBase');
  const joystickKnobEl = document.getElementById('joystickKnob');
  const errorBanner = document.getElementById('errorBanner');

  function showError(message) {
    errorBanner.hidden = false;
    errorBanner.textContent = message;
  }

  try {
    if (!window.THREE) {
      throw new Error('Three.js did not load. Refresh the page and make sure internet access is available in the preview.');
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03070b);
    scene.fog = new THREE.FogExp2(0x03070b, 0.02);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 12000);
    camera.position.set(0, 12, 18);

    const hemi = new THREE.HemisphereLight(0x99ffcc, 0x081018, 1.18);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xf4fff8, 1.55);
    sun.position.set(30, 42, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    scene.add(sun);

    const glowLight = new THREE.PointLight(0x38ff83, 2.5, 80, 2);
    scene.add(glowLight);

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x10212b,
      roughness: 0.95,
      metalness: 0.04,
      emissive: 0x061017,
      emissiveIntensity: 0.12,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(12000, 420, 0x15442d, 0x0c1d16);
    grid.material.transparent = true;
    grid.material.opacity = 0.18;
    scene.add(grid);

    const starsGeo = new THREE.BufferGeometry();
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 1000 + Math.random() * 2600;
      const angle = Math.random() * Math.PI * 2;
      const y = 120 + Math.random() * 1600;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xdeffee, size: 2.1, sizeAttenuation: true, transparent: true, opacity: 0.82 });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    const playerRoot = new THREE.Group();
    scene.add(playerRoot);

    const holeCore = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 1.28, 0.42, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x040404, roughness: 0.4, metalness: 0.06, emissive: 0x020705, emissiveIntensity: 0.35, side: THREE.DoubleSide })
    );
    holeCore.castShadow = true;
    holeCore.receiveShadow = true;
    playerRoot.add(holeCore);

    const holeCap = new THREE.Mesh(
      new THREE.CircleGeometry(1.02, 48),
      new THREE.MeshBasicMaterial({ color: 0x010101, transparent: true, opacity: 0.98 })
    );
    holeCap.rotation.x = -Math.PI / 2;
    holeCap.position.y = 0.2;
    playerRoot.add(holeCap);

    const innerVoid = new THREE.Mesh(
      new THREE.CircleGeometry(0.74, 40),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1 })
    );
    innerVoid.rotation.x = -Math.PI / 2;
    innerVoid.position.y = 0.205;
    playerRoot.add(innerVoid);

    const glowShell = new THREE.Mesh(
      new THREE.CylinderGeometry(1.14, 1.42, 0.18, 48, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4cff8a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    glowShell.position.y = 0.02;
    playerRoot.add(glowShell);

    const auraRing = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.55, 56),
      new THREE.MeshBasicMaterial({ color: 0x60ff9f, transparent: true, opacity: 0.65, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.22;
    playerRoot.add(auraRing);

    const shadowTrail = new THREE.Mesh(
      new THREE.CircleGeometry(1.28, 40),
      new THREE.MeshBasicMaterial({ color: 0x38ff83, transparent: true, opacity: 0.08 })
    );
    shadowTrail.rotation.x = -Math.PI / 2;
    shadowTrail.position.y = -0.2;
    playerRoot.add(shadowTrail);

    const itemGroup = new THREE.Group();
    scene.add(itemGroup);
    const decorGroup = new THREE.Group();
    scene.add(decorGroup);

    const tmpColorA = new THREE.Color();
    const tmpColorB = new THREE.Color();
    const tmpVec = new THREE.Vector3();

    let dimension = 1;
    let totalScore = 0;
    let playerScale = 1;
    let glowPulse = 0;
    let nextMilestoneIndex = 0;

    const player = {
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      dir: new THREE.Vector2(),
    };

    const stageDefs = [
      { name: 'Micro', min: 1, unlock: 1, items: [
        { name: 'Dust', size: 0.08, value: 0.2, type: 'dust', color: 0xc7b38a },
        { name: 'Germ', size: 0.11, value: 0.28, type: 'germ', color: 0x6cffe1 },
        { name: 'Mote', size: 0.09, value: 0.22, type: 'crystal', color: 0xeef6e8 },
      ]},
      { name: 'Tiny', min: 2.6, unlock: 2.1, items: [
        { name: 'Seed', size: 0.18, value: 0.55, type: 'seed', color: 0x8f643a },
        { name: 'Pebble', size: 0.24, value: 0.7, type: 'rock', color: 0x76808c },
        { name: 'Berry', size: 0.2, value: 0.8, type: 'berry', color: 0xff4e72 },
      ]},
      { name: 'Street', min: 7, unlock: 5.8, items: [
        { name: 'Cone', size: 0.5, value: 1.9, type: 'cone', color: 0xff9642 },
        { name: 'Crate', size: 0.72, value: 2.6, type: 'crate', color: 0x916540 },
        { name: 'Mailbox', size: 0.9, value: 3.3, type: 'mailbox', color: 0x5f8ceb },
      ]},
      { name: 'City', min: 22, unlock: 16, items: [
        { name: 'Car', size: 1.3, value: 7, type: 'car', color: 0xe7a13d },
        { name: 'Truck', size: 1.7, value: 9, type: 'truck', color: 0x77c3eb },
        { name: 'House', size: 2.4, value: 12, type: 'house', color: 0xd3b68d },
      ]},
      { name: 'Massive', min: 70, unlock: 52, items: [
        { name: 'Tower', size: 4.2, value: 28, type: 'tower', color: 0x8da1cc },
        { name: 'Block', size: 5.5, value: 34, type: 'building', color: 0x8996ab },
        { name: 'Stadium', size: 6.5, value: 42, type: 'stadium', color: 0x849878 },
      ]},
      { name: 'Cosmic', min: 180, unlock: 130, items: [
        { name: 'Asteroid', size: 9.2, value: 90, type: 'asteroid', color: 0x786f68 },
        { name: 'Moon', size: 12.5, value: 135, type: 'moon', color: 0xc7d0d6 },
        { name: 'Planet', size: 16.5, value: 200, type: 'planet', color: 0x4a7aff },
      ]},
    ];

    const milestones = [
      { size: 2.4, text: 'You can now pull in seeds and pebbles.' },
      { size: 6.5, text: 'Street objects are becoming reachable.' },
      { size: 16, text: 'Cars and houses are finally in view.' },
      { size: 50, text: 'Your scale is becoming district-sized.' },
      { size: 130, text: 'The world is shrinking beneath you.' },
      { size: 210, text: 'Planets are beginning to matter.' },
    ];

    const items = [];

    function setMilestone(text) {
      milestoneEl.textContent = text;
    }

    function getStageName() {
      let current = stageDefs[0].name;
      for (const s of stageDefs) {
        if (playerScale >= s.min) current = s.name;
      }
      return current;
    }

    function simpleMaterial(color, emissiveStrength = 0.05) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.72,
        metalness: 0.1,
        emissive: tmpColorA.set(color).multiplyScalar(emissiveStrength),
        emissiveIntensity: 0.8,
      });
    }

    function addWindows(group, width, height, depth) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xcff7ff, transparent: true, opacity: 0.8 });
      const wx = Math.max(2, Math.floor(width * 2));
      const wy = Math.max(2, Math.floor(height * 1.2));
      for (let y = 0; y < wy; y++) {
        for (let x = 0; x < wx; x++) {
          const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.28), mat);
          pane.position.set(-width * 0.34 + x * (width * 0.68 / Math.max(1, wx - 1)), 0.7 + y * (height * 0.7 / wy), depth / 2 + 0.02);
          group.add(pane);
        }
      }
    }

    function createItemMesh(def) {
      const mat = simpleMaterial(def.color);
      switch (def.type) {
        case 'dust':
          return new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), simpleMaterial(def.color, 0.02));
        case 'germ':
          return new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), simpleMaterial(def.color, 0.09));
        case 'crystal':
          return new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), simpleMaterial(def.color, 0.07));
        case 'seed': {
          const g = new THREE.Group();
          const core = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 16), mat);
          core.scale.set(0.8, 1.2, 0.7);
          g.add(core);
          return g;
        }
        case 'rock':
          return new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat);
        case 'berry': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), mat);
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), simpleMaterial(0x4fa54e));
          stem.position.y = 1;
          g.add(body, stem);
          return g;
        }
        case 'cone': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.6, 16), mat);
          body.position.y = 0.8;
          const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.08, 10, 16), simpleMaterial(0xffffff, 0));
          stripe.rotation.x = Math.PI / 2;
          stripe.position.y = 0.8;
          g.add(body, stripe);
          return g;
        }
        case 'crate': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.3), mat);
          const trim = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 1.42), simpleMaterial(0x6f4a2e, 0.02));
          trim.position.y = 0.52;
          g.add(body, trim);
          return g;
        }
        case 'mailbox': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.78, 1.35), mat);
          body.position.y = 1.38;
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 1.6, 10), simpleMaterial(0x6b717a, 0.02));
          pole.position.y = 0.8;
          g.add(body, pole);
          return g;
        }
        case 'car': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.72, 1.28), mat);
          body.position.y = 0.5;
          const top = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.52, 1.05), simpleMaterial(0xa8e8ff, 0.03));
          top.position.set(0.12, 1.02, 0);
          g.add(body, top);
          const wheelMat = simpleMaterial(0x151515, 0);
          [-0.82, 0.82].forEach(x => {
            [-0.6, 0.6].forEach(z => {
              const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.24, 14), wheelMat);
              wheel.rotation.z = Math.PI / 2;
              wheel.position.set(x, 0.22, z);
              g.add(wheel);
            });
          });
          return g;
        }
        case 'truck': {
          const g = new THREE.Group();
          const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 1.35), mat);
          trailer.position.set(-0.25, 0.65, 0);
          const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 1.25), simpleMaterial(0xb7f4ff, 0.03));
          cab.position.set(1.35, 0.68, 0);
          g.add(trailer, cab);
          return g;
        }
        case 'house': {
          const g = new THREE.Group();
          const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 2), mat);
          base.position.y = 0.85;
          const roof = new THREE.Mesh(new THREE.ConeGeometry(1.72, 1.28, 4), simpleMaterial(0x883f34, 0.02));
          roof.rotation.y = Math.PI / 4;
          roof.position.y = 2.08;
          const door = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.72), simpleMaterial(0x6e4222, 0));
          door.position.set(0, 0.45, 1.01);
          g.add(base, roof, door);
          return g;
        }
        case 'tower': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 6.4, 1.8), mat);
          body.position.y = 3.2;
          g.add(body);
          addWindows(g, 1.8, 6.4, 1.8);
          return g;
        }
        case 'building': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 7.4, 3.1), mat);
          body.position.y = 3.7;
          g.add(body);
          addWindows(g, 3.1, 7.4, 3.1);
          return g;
        }
        case 'stadium': {
          const g = new THREE.Group();
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5.1, 2.2, 22), mat);
          bowl.position.y = 1.1;
          const field = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.22, 20), simpleMaterial(0x3ca84d, 0.02));
          field.position.y = 1.2;
          g.add(bowl, field);
          return g;
        }
        case 'asteroid':
          return new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat);
        case 'moon': {
          const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 24), mat);
          const crater = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 12), simpleMaterial(0xaeb7bd, 0));
          crater.position.set(0.32, 0.2, 0.82);
          crater.scale.set(1, 0.35, 1);
          moon.add(crater);
          return moon;
        }
        case 'planet': {
          const g = new THREE.Group();
          const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 26), mat);
          const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.72, 36), new THREE.MeshBasicMaterial({ color: 0x9dd8ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
          ring.rotation.x = Math.PI / 2.8;
          g.add(planet, ring);
          return g;
        }
        default:
          return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
      }
    }

    function addGroundDecor() {
      for (let i = 0; i < 350; i++) {
        const s = 0.18 + Math.random() * 0.8;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), simpleMaterial(0x162734, 0.01));
        rock.position.set((Math.random() - 0.5) * 2800, s * 0.65, (Math.random() - 0.5) * 2800);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.receiveShadow = true;
        decorGroup.add(rock);
      }
      for (let i = 0; i < 180; i++) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.8 + Math.random() * 1.6, 6), simpleMaterial(0x2e7140, 0.02));
        stalk.position.set((Math.random() - 0.5) * 1800, 0.5, (Math.random() - 0.5) * 1800);
        decorGroup.add(stalk);
      }
    }
    addGroundDecor();

    function getSpawnDefs() {
      return stageDefs.filter(s => playerScale >= s.unlock).flatMap(s => s.items);
    }

    function spawnItem(def, radiusBand = 80) {
      const holder = new THREE.Group();
      const mesh = createItemMesh(def);
      holder.add(mesh);
      holder.userData.baseSize = def.size;
      holder.userData.def = def;
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * radiusBand + playerScale * 1.8;
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
      items.push({ mesh: holder, size: def.size, value: def.value, eaten: false, spin: (Math.random() - 0.5) * 0.7 });
    }

    function maintainItems() {
      const defs = getSpawnDefs();
      if (!defs.length) return;
      const targetCount = Math.min(260, 120 + Math.floor(playerScale * 0.55));
      while (items.length < targetCount) {
        const def = defs[Math.floor(Math.random() * defs.length)];
        spawnItem(def, Math.max(80, playerScale * 4.8));
      }
    }

    function consume(item) {
      item.eaten = true;
      totalScore += item.value;
      const growth = (item.value * 0.0016 + item.size * 0.0005) / (1 + playerScale * 0.28);
      playerScale += growth;
      glowPulse = 1;
      item.mesh.removeFromParent();
      const idx = items.indexOf(item);
      if (idx >= 0) items.splice(idx, 1);
    }

    function updateItems(dt) {
      const defs = getSpawnDefs();
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.mesh.rotation.y += item.spin * dt;
        const dx = player.pos.x - item.mesh.position.x;
        const dz = player.pos.z - item.mesh.position.z;
        const dist = Math.hypot(dx, dz) || 0.0001;
        const eatRadius = playerScale * 0.9;
        const suctionRadius = playerScale * 5.5;

        if (dist < suctionRadius) {
          const pull = THREE.MathUtils.clamp((suctionRadius - dist) / suctionRadius, 0, 1);
          item.mesh.position.x += (dx / dist) * dt * pull * Math.max(4, playerScale * 1.55);
          item.mesh.position.z += (dz / dist) * dt * pull * Math.max(4, playerScale * 1.55);
          const shrink = 1 - pull * 0.32;
          item.mesh.scale.lerp(tmpVec.setScalar(item.size * shrink), 0.16);
        } else {
          item.mesh.scale.lerp(tmpVec.setScalar(item.size), 0.08);
        }

        if (!item.eaten && dist < eatRadius && item.size <= playerScale * 0.92) {
          consume(item);
          continue;
        }

        if (dist > Math.max(220, playerScale * 14)) {
          item.mesh.removeFromParent();
          items.splice(i, 1);
          if (defs.length) {
            const def = defs[Math.floor(Math.random() * defs.length)];
            spawnItem(def, Math.max(80, playerScale * 4.8));
          }
        }
      }
    }

    function resetDimension() {
      dimension += 1;
      playerScale = 1;
      player.pos.set(0, 0, 0);
      player.vel.set(0, 0, 0);
      nextMilestoneIndex = 0;
      setMilestone(`Reality collapsed. Welcome to dimension ${dimension}.`);
      while (items.length) {
        const item = items.pop();
        item.mesh.removeFromParent();
      }
      const hue = (dimension * 0.13) % 1;
      scene.background.setHSL(hue * 0.25, 0.5, 0.04);
      groundMat.color.setHSL(hue * 0.25 + 0.08, 0.36, 0.12);
    }

    function updateHUD() {
      sizeEl.textContent = playerScale.toFixed(2);
      scoreEl.textContent = Math.floor(totalScore).toLocaleString();
      dimensionEl.textContent = String(dimension);
      stageEl.textContent = getStageName();
      if (nextMilestoneIndex < milestones.length && playerScale >= milestones[nextMilestoneIndex].size) {
        setMilestone(milestones[nextMilestoneIndex].text);
        nextMilestoneIndex += 1;
      }
    }

    const pointer = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0 };

    function updateJoystickVisual() {
      if (!pointer.active) {
        joystickEl.style.opacity = '0';
        return;
      }
      joystickEl.style.opacity = '1';
      joystickBaseEl.style.left = `${pointer.startX}px`;
      joystickBaseEl.style.top = `${pointer.startY}px`;
      const len = Math.hypot(pointer.dx, pointer.dy);
      const mag = Math.min(1, len / 70);
      const clampFactor = Math.min(1, 50 / Math.max(1, len));
      joystickKnobEl.style.left = `${pointer.startX + pointer.dx * clampFactor}px`;
      joystickKnobEl.style.top = `${pointer.startY + pointer.dy * clampFactor}px`;
      joystickBaseEl.style.transform = `translate(-50%, -50%) scale(${1 + mag * 0.35})`;
      joystickKnobEl.style.transform = `translate(-50%, -50%) scale(${1 + mag * 0.18})`;
    }

    function setPointerMove(clientX, clientY) {
      pointer.dx = clientX - pointer.startX;
      pointer.dy = clientY - pointer.startY;
      const len = Math.hypot(pointer.dx, pointer.dy);
      const clamp = 70;
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
    }, { passive: true });

    window.addEventListener('pointermove', (e) => {
      if (!pointer.active || e.pointerId !== pointer.id) return;
      setPointerMove(e.clientX, e.clientY);
    }, { passive: true });

    function endPointer(e) {
      if (!pointer.active || (e && e.pointerId !== pointer.id)) return;
      pointer.active = false;
      pointer.id = null;
      pointer.dx = 0;
      pointer.dy = 0;
      player.dir.set(0, 0);
      updateJoystickVisual();
    }
    window.addEventListener('pointerup', endPointer, { passive: true });
    window.addEventListener('pointercancel', endPointer, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'w' || e.key === 'ArrowUp') player.dir.y = -1;
      if (e.key === 's' || e.key === 'ArrowDown') player.dir.y = 1;
      if (e.key === 'a' || e.key === 'ArrowLeft') player.dir.x = -1;
      if (e.key === 'd' || e.key === 'ArrowRight') player.dir.x = 1;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 's' || e.key === 'ArrowDown') player.dir.y = 0;
      if (e.key === 'a' || e.key === 'ArrowLeft' || e.key === 'd' || e.key === 'ArrowRight') player.dir.x = 0;
    });

    function updatePlayer(dt) {
      const input = new THREE.Vector3(player.dir.x, 0, player.dir.y);
      if (input.lengthSq() > 1) input.normalize();
      const maxSpeed = Math.max(2.2, 6.4 - Math.log10(1 + playerScale) * 1.55);
      player.vel.lerp(input.multiplyScalar(maxSpeed), 0.08);
      player.pos.addScaledVector(player.vel, dt * 2.5);

      const radius = 1.15 * playerScale;
      playerRoot.position.copy(player.pos);
      playerRoot.position.y = Math.max(0.1, radius * 0.12);
      playerRoot.scale.setScalar(radius);

      glowLight.position.set(player.pos.x, radius * 1.3, player.pos.z);
      glowLight.distance = 24 + playerScale * 0.55;
      glowLight.intensity = 1.6 + playerScale * 0.005 + glowPulse * 1.3;

      const speed = player.vel.length();
      if (speed > 0.001) {
        holeCore.rotation.y += dt * speed * 0.8;
        holeCap.rotation.z += dt * speed * 0.18;
        innerVoid.rotation.z -= dt * speed * 0.22;
        glowShell.rotation.y -= dt * speed * 0.45;
        shadowTrail.rotation.z += dt * speed * 0.14;
      }

      const pulse = 0.07 + Math.sin(performance.now() * 0.0043) * 0.02 + glowPulse * 0.11;
      glowShell.scale.setScalar(1.04 + pulse);
      auraRing.scale.setScalar(1 + pulse * 0.24);
      auraRing.material.opacity = 0.48 + pulse * 0.9;
      glowShell.material.opacity = 0.12 + pulse * 0.52;
      glowPulse = Math.max(0, glowPulse - dt * 1.4);

      const camLift = 8 + playerScale * 0.95;
      const camDistance = 12 + playerScale * 1.15;
      camera.position.lerp(tmpVec.set(player.pos.x, camLift, player.pos.z + camDistance), 0.08);
      camera.lookAt(player.pos.x, radius * 0.5, player.pos.z);
      grid.position.set(player.pos.x, 0.02, player.pos.z);

      const cosmic = THREE.MathUtils.clamp((playerScale - 120) / 140, 0, 1);
      scene.fog.density = 0.02 - cosmic * 0.013;
      scene.background.lerp(tmpColorB.set(0x000000), 0.02);
      tmpColorA.set(0x10212b).lerp(tmpColorB.set(0x030304), cosmic);
      groundMat.color.copy(tmpColorA);
      starsMat.size = 2.1 + cosmic * 1.8;
      starsMat.opacity = 0.45 + cosmic * 0.5;

      if (playerScale >= 300) resetDimension();
    }

    function animate(now = 0) {
      requestAnimationFrame(animate);
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
  } catch (err) {
    console.error(err);
    showError(err && err.message ? err.message : 'The game failed to load.');
  }
})();
