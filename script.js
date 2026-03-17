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
    scene.background = new THREE.Color(0xe9f5ed);
    scene.fog = new THREE.FogExp2(0xe9f5ed, 0.014);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 18000);
    camera.position.set(0, 12, 18);

    const hemi = new THREE.HemisphereLight(0xb2ffda, 0x091018, 1.25);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xf4fff8, 1.6);
    sun.position.set(30, 42, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -140;
    sun.shadow.camera.right = 140;
    sun.shadow.camera.top = 140;
    sun.shadow.camera.bottom = -140;
    scene.add(sun);

    const glowLight = new THREE.PointLight(0x38ff83, 2.5, 80, 2);
    scene.add(glowLight);

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xdfeee3,
      roughness: 0.98,
      metalness: 0.01,
      emissive: 0xeff8f1,
      emissiveIntensity: 0.05,
      dithering: true,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(16000, 520, 0xcfe6d6, 0xd9ebde);
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    grid.material.depthWrite = false;
    scene.add(grid);

    const starsGeo = new THREE.BufferGeometry();
    const starCount = 2200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 1200 + Math.random() * 3000;
      const angle = Math.random() * Math.PI * 2;
      const y = 100 + Math.random() * 1700;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xdeffee, size: 2.1, sizeAttenuation: true, transparent: true, opacity: 0.0, depthWrite: false });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    const playerRoot = new THREE.Group();
    scene.add(playerRoot);

    const holeCoreMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -8,
      polygonOffsetUnits: -8,
      depthWrite: false,
    });
    const playerHole = new THREE.Mesh(new THREE.CircleGeometry(1.0, 64), holeCoreMat);
    playerHole.rotation.x = -Math.PI / 2;
    playerHole.position.y = 0.018;
    playerHole.renderOrder = 20;
    playerRoot.add(playerHole);

    const holeInner = new THREE.Mesh(
      new THREE.RingGeometry(0.76, 1.02, 64),
      new THREE.MeshBasicMaterial({
        color: 0x061109,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
        blending: THREE.NormalBlending,
        polygonOffset: true,
        polygonOffsetFactor: -7,
        polygonOffsetUnits: -7,
        depthWrite: false,
      })
    );
    holeInner.rotation.x = -Math.PI / 2;
    holeInner.position.y = 0.02;
    holeInner.renderOrder = 21;
    playerRoot.add(holeInner);

    const auraRing = new THREE.Mesh(
      new THREE.RingGeometry(1.12, 1.45, 64),
      new THREE.MeshBasicMaterial({
        color: 0x77ffb0,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.024;
    auraRing.renderOrder = 22;
    playerRoot.add(auraRing);

    const glowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 48),
      new THREE.MeshBasicMaterial({
        color: 0x5eff9b,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glowDisc.rotation.x = -Math.PI / 2;
    glowDisc.position.y = 0.015;
    glowDisc.renderOrder = 19;
    playerRoot.add(glowDisc);

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
    let visualScale = 1;
    let glowPulse = 0;
    let nextMilestoneIndex = 0;
    let microSpawnTimer = 0;

    const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), dir: new THREE.Vector2() };

    const stageDefs = [
      { name: 'Micro', min: 1, unlock: 1, items: [
        { name: 'Dust', size: 0.08, value: 0.22, type: 'dust', color: 0xbca57b },
        { name: 'Germ', size: 0.12, value: 0.34, type: 'germ', color: 0x0f5d4f },
        { name: 'Mote', size: 0.09, value: 0.24, type: 'crystal', color: 0xeef6e8 },
      ]},
      { name: 'Tiny', min: 2.6, unlock: 2.05, items: [
        { name: 'Seed', size: 0.18, value: 0.55, type: 'seed', color: 0x8f643a },
        { name: 'Pebble', size: 0.24, value: 0.7, type: 'rock', color: 0x76808c },
        { name: 'Berry', size: 0.2, value: 0.8, type: 'berry', color: 0xff4e72 },
      ]},
      { name: 'Street', min: 7, unlock: 5.7, items: [
        { name: 'Cone', size: 0.5, value: 1.9, type: 'cone', color: 0xff9642 },
        { name: 'Crate', size: 0.72, value: 2.6, type: 'crate', color: 0x916540 },
        { name: 'Mailbox', size: 0.9, value: 3.3, type: 'mailbox', color: 0x5f8ceb },
      ]},
      { name: 'City', min: 22, unlock: 15.5, items: [
        { name: 'Car', size: 1.3, value: 7, type: 'car', color: 0xe7a13d },
        { name: 'Truck', size: 1.7, value: 9, type: 'truck', color: 0x77c3eb },
        { name: 'House', size: 2.4, value: 12, type: 'house', color: 0xd3b68d },
      ]},
      { name: 'Massive', min: 70, unlock: 50, items: [
        { name: 'Tower', size: 4.2, value: 28, type: 'tower', color: 0x8da1cc },
        { name: 'Block', size: 5.5, value: 34, type: 'building', color: 0x8996ab },
        { name: 'Stadium', size: 6.5, value: 42, type: 'stadium', color: 0x849878 },
      ]},
      { name: 'Cosmic', min: 180, unlock: 122, items: [
        { name: 'Asteroid', size: 9.2, value: 90, type: 'asteroid', color: 0x786f68 },
        { name: 'Moon', size: 12.5, value: 135, type: 'moon', color: 0xc7d0d6 },
        { name: 'Planet', size: 16.5, value: 200, type: 'planet', color: 0x4a7aff },
      ]},
    ];

    const milestones = [
      { size: 2.4, text: 'Tiny matter yields. Seeds and pebbles are edible.' },
      { size: 6.5, text: 'Street debris now bends into your pull.' },
      { size: 16, text: 'Cars and homes are now in your feeding range.' },
      { size: 50, text: 'District-scale hunger awakened.' },
      { size: 130, text: 'Reality is shrinking beneath you.' },
      { size: 210, text: 'Planets have entered the food chain.' },
    ];

    const items = [];

    function setMilestone(text) { milestoneEl.textContent = text; }

    function getStageName() {
      let current = stageDefs[0].name;
      for (const s of stageDefs) if (playerScale >= s.min) current = s.name;
      return current;
    }

    function simpleMaterial(color, emissiveStrength = 0.05) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.72,
        metalness: 0.1,
        emissive: tmpColorA.set(color).multiplyScalar(emissiveStrength),
        emissiveIntensity: 0.85,
        dithering: true,
      });
    }

    function addWindows(group, width, height, depth) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xcff7ff, transparent: true, opacity: 0.8, depthWrite: false });
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
        case 'dust': return new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), simpleMaterial(def.color, 0.03));
        case 'germ': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), simpleMaterial(def.color, 0.18));
          const spikes = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: 0x2fb89a, emissive: 0x115e51, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.65 }));
          g.add(body, spikes);
          return g;
        }
        case 'crystal': return new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), simpleMaterial(def.color, 0.08));
        case 'seed': {
          const g = new THREE.Group();
          const core = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 16), mat);
          core.scale.set(0.8, 1.2, 0.7);
          g.add(core);
          return g;
        }
        case 'rock': return new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat);
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
          [-0.82, 0.82].forEach(x => [-0.6, 0.6].forEach(z => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.24, 14), wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.22, z);
            g.add(wheel);
          }));
          return g;
        }
        case 'truck': {
          const g = new THREE.Group();
          const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 1.35), mat); trailer.position.set(-0.25, 0.65, 0);
          const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 1.25), simpleMaterial(0xb7f4ff, 0.03)); cab.position.set(1.35, 0.68, 0);
          g.add(trailer, cab);
          return g;
        }
        case 'house': {
          const g = new THREE.Group();
          const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 2), mat); base.position.y = 0.85;
          const roof = new THREE.Mesh(new THREE.ConeGeometry(1.72, 1.28, 4), simpleMaterial(0x883f34, 0.02)); roof.rotation.y = Math.PI / 4; roof.position.y = 2.08;
          const door = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.72), simpleMaterial(0x6e4222, 0)); door.position.set(0, 0.45, 1.01);
          g.add(base, roof, door);
          return g;
        }
        case 'tower': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 6.4, 1.8), mat); body.position.y = 3.2;
          g.add(body); addWindows(g, 1.8, 6.4, 1.8); return g;
        }
        case 'building': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 7.4, 3.1), mat); body.position.y = 3.7;
          g.add(body); addWindows(g, 3.1, 7.4, 3.1); return g;
        }
        case 'stadium': {
          const g = new THREE.Group();
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5.1, 2.2, 22), mat); bowl.position.y = 1.1;
          const field = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.22, 20), simpleMaterial(0x3ca84d, 0.02)); field.position.y = 1.2;
          g.add(bowl, field); return g;
        }
        case 'asteroid': return new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat);
        case 'moon': {
          const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 24), mat);
          const crater = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 12), simpleMaterial(0xaeb7bd, 0));
          crater.position.set(0.32, 0.2, 0.82); crater.scale.set(1, 0.35, 1); moon.add(crater);
          return moon;
        }
        case 'planet': {
          const g = new THREE.Group();
          const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 26), mat);
          const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.72, 36), new THREE.MeshBasicMaterial({ color: 0x9dd8ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
          ring.rotation.x = Math.PI / 2.8;
          g.add(planet, ring);
          return g;
        }
        default: return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
      }
    }

    function addGroundDecor() {
      for (let i = 0; i < 380; i++) {
        const s = 0.18 + Math.random() * 0.8;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), simpleMaterial(0xcfd8d2, 0.0));
        rock.position.set((Math.random() - 0.5) * 3200, s * 0.65, (Math.random() - 0.5) * 3200);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.receiveShadow = true;
        decorGroup.add(rock);
      }
      for (let i = 0; i < 220; i++) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.8 + Math.random() * 1.6, 6), simpleMaterial(0xa9d6b5, 0.0));
        stalk.position.set((Math.random() - 0.5) * 2000, 0.5, (Math.random() - 0.5) * 2000);
        decorGroup.add(stalk);
      }
    }
    addGroundDecor();

    function getSpawnDefs() { return stageDefs.filter(s => playerScale >= s.unlock).flatMap(s => s.items); }

    function spawnItem(def, radiusBand = 90) {
      const holder = new THREE.Group();
      const mesh = createItemMesh(def);
      holder.add(mesh);
      const cue = new THREE.Mesh(
        new THREE.RingGeometry(0.95, 1.04, 24),
        new THREE.MeshBasicMaterial({ color: 0x63ff9a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      cue.rotation.x = -Math.PI / 2;
      cue.position.y = 0.04;
      cue.renderOrder = 10;
      holder.add(cue);
      holder.userData.cue = cue;
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * radiusBand + playerScale * 1.35;
      holder.position.set(player.pos.x + Math.cos(angle) * dist, 0, player.pos.z + Math.sin(angle) * dist);
      holder.rotation.y = Math.random() * Math.PI * 2;
      holder.scale.setScalar(def.size);
      holder.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
      itemGroup.add(holder);
      items.push({ mesh: holder, size: def.size, value: def.value, eaten: false, spin: (Math.random() - 0.5) * 0.8 });
    }

    function maintainItems(dt) {
      microSpawnTimer += dt;
      const defs = getSpawnDefs();
      if (!defs.length) return;
      const targetCount = Math.min(540, 180 + Math.floor(playerScale * 1.05));
      while (items.length < targetCount) {
        const def = defs[Math.floor(Math.random() * defs.length)];
        spawnItem(def, Math.max(90, playerScale * 4.5));
      }
      if (microSpawnTimer > 0.16) {
        microSpawnTimer = 0;
        const micro = stageDefs[0].items;
        for (let i = 0; i < 6; i++) {
          const def = micro[Math.floor(Math.random() * micro.length)];
          spawnItem(def, Math.max(28, playerScale * 1.6));
        }
      }
    }

    function consume(item) {
      item.eaten = true;
      totalScore += item.value;
      const growth = (item.value * 0.0052 + item.size * 0.0021) / (1 + playerScale * 0.23);
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
        const edible = item.size <= playerScale * 0.92;
        const eatRadius = playerScale * 0.9;
        const suctionRadius = playerScale * 5.8;

        if (dist < suctionRadius) {
          const pull = THREE.MathUtils.clamp((suctionRadius - dist) / suctionRadius, 0, 1);
          const pullSpeed = edible ? Math.max(5, playerScale * 1.75) : Math.max(2.8, playerScale * 0.72);
          item.mesh.position.x += (dx / dist) * dt * pull * pullSpeed;
          item.mesh.position.z += (dz / dist) * dt * pull * pullSpeed;
          const shrink = edible ? 1 - pull * 0.36 : 1 - pull * 0.06;
          item.mesh.scale.lerp(tmpVec.setScalar(item.size * shrink), edible ? 0.18 : 0.07);
        } else {
          item.mesh.scale.lerp(tmpVec.setScalar(item.size), 0.07);
        }

        const cue = item.mesh.userData.cue;
        if (cue) {
          const near = THREE.MathUtils.clamp(1 - dist / (suctionRadius * 0.8), 0, 1);
          cue.material.color.setHex(edible ? 0x63ff9a : 0xff7a7a);
          cue.material.opacity = near * (edible ? 0.42 : 0.22);
          cue.scale.setScalar(1 + near * 0.24);
        }

        if (!item.eaten && edible && dist < eatRadius) {
          consume(item);
          continue;
        }

        if (dist > Math.max(240, playerScale * 12)) {
          item.mesh.removeFromParent();
          items.splice(i, 1);
          if (defs.length) {
            const def = defs[Math.floor(Math.random() * defs.length)];
            spawnItem(def, Math.max(90, playerScale * 4.5));
          }
        }
      }
    }

    function resetDimension() {
      dimension += 1;
      playerScale = 1;
      visualScale = 1;
      player.pos.set(0, 0, 0);
      player.vel.set(0, 0, 0);
      nextMilestoneIndex = 0;
      setMilestone(`Reality collapsed. Welcome to dimension ${dimension}.`);
      while (items.length) items.pop().mesh.removeFromParent();
      const hue = (dimension * 0.13) % 1;
      scene.background.setHSL(0.33 + hue * 0.08, 0.22, 0.9);
      scene.fog.color.copy(scene.background);
      groundMat.color.setHSL(0.3 + hue * 0.08, 0.2, 0.86);
    }

    function updateHUD() {
      sizeEl.textContent = visualScale.toFixed(2);
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

    function updatePlayer(dt, nowMs) {
      const input = new THREE.Vector3(player.dir.x, 0, player.dir.y);
      if (input.lengthSq() > 1) input.normalize();
      const maxSpeed = Math.max(2.2, 5.4 - Math.log10(1 + playerScale) * 1.05);
      player.vel.lerp(input.multiplyScalar(maxSpeed), 0.1);
      player.pos.addScaledVector(player.vel, dt * 2.85);

      visualScale = THREE.MathUtils.lerp(visualScale, playerScale, 0.09);
      const radius = 1.15 * visualScale;
      playerRoot.position.copy(player.pos);
      playerRoot.position.y = 0;
      playerRoot.scale.setScalar(radius);

      glowLight.position.set(player.pos.x, 2.6 + visualScale * 0.2, player.pos.z);
      glowLight.distance = 18 + visualScale * 0.42;
      glowLight.intensity = 0.9 + visualScale * 0.004 + glowPulse * 0.85;

      const pulse = 0.045 + Math.sin(nowMs * 0.0038) * 0.012 + glowPulse * 0.06;
      auraRing.scale.setScalar(1 + pulse * 0.24);
      auraRing.material.opacity = 0.24 + pulse * 0.52;
      glowDisc.scale.setScalar(1.04 + pulse * 0.62);
      glowDisc.material.opacity = 0.05 + pulse * 0.2;
      glowPulse = Math.max(0, glowPulse - dt * 1.2);

      const shrinkFeel = THREE.MathUtils.clamp(Math.log2(1 + visualScale) / 8, 0, 1);
      const camLift = 8 + Math.pow(visualScale, 0.86) * (0.8 + shrinkFeel * 0.9);
      const camDistance = 12 + Math.pow(visualScale, 0.84) * (1.1 + shrinkFeel * 1.1);
      const camLookY = 0.12 + visualScale * 0.02;
      camera.fov = THREE.MathUtils.lerp(60, 68, shrinkFeel);
      camera.updateProjectionMatrix();
      camera.position.lerp(tmpVec.set(player.pos.x, camLift, player.pos.z + camDistance), 0.085);
      camera.lookAt(player.pos.x, camLookY, player.pos.z);
      grid.position.set(player.pos.x, 0.02, player.pos.z);

      const cosmic = THREE.MathUtils.clamp((visualScale - 115) / 145, 0, 1);
      scene.fog.density = 0.012 - cosmic * 0.007;
      const bgColor = tmpColorA.set(0xe9f5ed).lerp(tmpColorB.set(0x0a1015), cosmic);
      scene.background.copy(bgColor);
      scene.fog.color.copy(bgColor);
      groundMat.color.copy(tmpColorA.set(0xdfeee3).lerp(tmpColorB.set(0x2a3238), cosmic));
      groundMat.emissive.copy(tmpColorA.set(0xeef7f0).lerp(tmpColorB.set(0x11181d), cosmic));
      starsMat.size = 2.1 + cosmic * 1.9;
      starsMat.opacity = cosmic * 0.86;
      sun.intensity = 1.6 - cosmic * 0.65;
      hemi.intensity = 1.25 - cosmic * 0.4;

      if (playerScale >= 300) resetDimension();
    }

    function animate(now = 0) {
      requestAnimationFrame(animate);
      const dt = Math.min(0.033, (now - (animate.last || now)) / 1000);
      animate.last = now;
      updatePlayer(dt, now);
      updateItems(dt);
      maintainItems(dt);
      updateHUD();
      renderer.render(scene, camera);
    }

    maintainItems(0.2);
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
