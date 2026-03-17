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
    if (!window.THREE) throw new Error('Three.js failed to load.');

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9f5ed);
    scene.fog = new THREE.FogExp2(0xe9f5ed, 0.012);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120000);

    const hemi = new THREE.HemisphereLight(0xb8ffd8, 0x13222b, 1.25);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xf4fff8, 1.55);
    sun.position.set(60, 80, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -180;
    sun.shadow.camera.right = 180;
    sun.shadow.camera.top = 180;
    sun.shadow.camera.bottom = -180;
    scene.add(sun);

    const playerLight = new THREE.PointLight(0x53ff96, 2.4, 140, 2);
    scene.add(playerLight);

    const worldGroup = new THREE.Group();
    const itemGroup = new THREE.Group();
    const layerGroup = new THREE.Group();
    scene.add(worldGroup);
    worldGroup.add(layerGroup, itemGroup);

    const tmpColorA = new THREE.Color();
    const tmpColorB = new THREE.Color();
    const tmpVec = new THREE.Vector3();

    const playerRoot = new THREE.Group();
    worldGroup.add(playerRoot);

    const holeCore = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 })
    );
    holeCore.rotation.x = -Math.PI / 2;
    holeCore.position.y = 0.02;
    holeCore.renderOrder = 20;
    playerRoot.add(holeCore);

    const holeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.78, 1.06, 64),
      new THREE.MeshBasicMaterial({ color: 0x0b1710, side: THREE.DoubleSide, transparent: true, opacity: 0.76, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -7, polygonOffsetUnits: -7 })
    );
    holeRing.rotation.x = -Math.PI / 2;
    holeRing.position.y = 0.024;
    holeRing.renderOrder = 21;
    playerRoot.add(holeRing);

    const aura = new THREE.Mesh(
      new THREE.RingGeometry(1.08, 1.45, 64),
      new THREE.MeshBasicMaterial({ color: 0x79ffb3, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.026;
    aura.renderOrder = 22;
    playerRoot.add(aura);

    const glowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 36),
      new THREE.MeshBasicMaterial({ color: 0x68ff9f, transparent: true, opacity: 0.08, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glowDisc.rotation.x = -Math.PI / 2;
    glowDisc.position.y = 0.016;
    glowDisc.renderOrder = 19;
    playerRoot.add(glowDisc);

    function simpleMat(color, emissiveStrength = 0.05, roughness = 0.65, metalness = 0.1) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        emissive: tmpColorA.set(color).multiplyScalar(emissiveStrength),
        emissiveIntensity: 0.85,
        dithering: true,
      });
    }

    const layers = [
      {
        key: 'petri',
        name: 'Petri Dish',
        minScale: 1,
        revealStart: 1,
        revealEnd: 6,
        consumeScale: 5.3,
        radius: 65,
        sky: 0xe6f5ec,
        message: 'Inside the dish: feed on germs, dust and tiny crystals.',
        items: [
          { name: 'Dust', type: 'dust', size: 0.07, value: 0.2, color: 0xc9ad82 },
          { name: 'Germ', type: 'germ', size: 0.12, value: 0.34, color: 0x1f7f67 },
          { name: 'Mote', type: 'crystal', size: 0.09, value: 0.24, color: 0xeef7ef },
        ],
      },
      {
        key: 'table',
        name: 'Table',
        minScale: 4,
        revealStart: 4,
        revealEnd: 16,
        consumeScale: 12,
        radius: 150,
        sky: 0xe4f1e6,
        message: 'The dish sits on a table. Crumbs and screws are now prey.',
        items: [
          { name: 'Crumb', type: 'seed', size: 0.18, value: 0.55, color: 0x9a6f3f },
          { name: 'Bolt', type: 'rock', size: 0.24, value: 0.72, color: 0x7b8a95 },
          { name: 'Berry', type: 'berry', size: 0.22, value: 0.82, color: 0xff5275 },
        ],
      },
      {
        key: 'room',
        name: 'Room',
        minScale: 10,
        revealStart: 10,
        revealEnd: 35,
        consumeScale: 28,
        radius: 290,
        sky: 0xdfebe2,
        message: 'Walls appear around you. Furniture begins to shrink.',
        items: [
          { name: 'Lamp', type: 'cone', size: 0.5, value: 1.9, color: 0xff9b42 },
          { name: 'Drawer', type: 'crate', size: 0.75, value: 2.7, color: 0x8e6544 },
          { name: 'Chair', type: 'mailbox', size: 0.95, value: 3.3, color: 0x648ee6 },
        ],
      },
      {
        key: 'building',
        name: 'Building',
        minScale: 24,
        revealStart: 24,
        revealEnd: 80,
        consumeScale: 62,
        radius: 520,
        sky: 0xd7e2dd,
        message: 'The room is just one cell in a larger building.',
        items: [
          { name: 'Car', type: 'car', size: 1.3, value: 7, color: 0xe7a23e },
          { name: 'Truck', type: 'truck', size: 1.7, value: 9, color: 0x78c2eb },
          { name: 'House', type: 'house', size: 2.4, value: 12, color: 0xd2b48f },
        ],
      },
      {
        key: 'city',
        name: 'City',
        minScale: 50,
        revealStart: 50,
        revealEnd: 180,
        consumeScale: 140,
        radius: 1100,
        sky: 0xc6d8d2,
        message: 'Blocks, towers and districts collapse into bite-sized matter.',
        items: [
          { name: 'Tower', type: 'tower', size: 4.1, value: 28, color: 0x8ea3cc },
          { name: 'Block', type: 'building', size: 5.4, value: 34, color: 0x8a98ad },
          { name: 'Stadium', type: 'stadium', size: 6.6, value: 42, color: 0x849878 },
        ],
      },
      {
        key: 'country',
        name: 'Country',
        minScale: 120,
        revealStart: 120,
        revealEnd: 420,
        consumeScale: 330,
        radius: 2300,
        sky: 0x94a8ae,
        message: 'You now devour entire regions. Cities are pebbles.',
        items: [
          { name: 'Range', type: 'asteroid', size: 9, value: 92, color: 0x786f68 },
          { name: 'Basin', type: 'moon', size: 12.2, value: 138, color: 0xc3ccd3 },
          { name: 'Nation Core', type: 'planet', size: 16.2, value: 200, color: 0x4a7aff },
        ],
      },
      {
        key: 'ocean',
        name: 'Oceans',
        minScale: 260,
        revealStart: 260,
        revealEnd: 940,
        consumeScale: 760,
        radius: 4200,
        sky: 0x50657c,
        message: 'Oceans and continents rotate beneath your pull.',
        items: [
          { name: 'Trench Chunk', type: 'asteroid', size: 18, value: 290, color: 0x4c6270 },
          { name: 'Continental Shelf', type: 'moon', size: 23, value: 360, color: 0x6d8499 },
          { name: 'Oceanic Plate', type: 'planet', size: 31, value: 480, color: 0x2a66b8 },
        ],
      },
      {
        key: 'planet',
        name: 'Planet',
        minScale: 600,
        revealStart: 600,
        revealEnd: 1900,
        consumeScale: 1550,
        radius: 7000,
        sky: 0x172640,
        message: 'Planets are no longer distant. They are food.',
        items: [
          { name: 'Moonlet', type: 'moon', size: 40, value: 670, color: 0xaeb7bd },
          { name: 'Planet Core', type: 'planet', size: 58, value: 920, color: 0x4d85ff },
          { name: 'Storm Giant', type: 'planet', size: 78, value: 1250, color: 0x8aaeff },
        ],
      },
      {
        key: 'solar',
        name: 'Solar System',
        minScale: 1300,
        revealStart: 1300,
        revealEnd: 4200,
        consumeScale: 3400,
        radius: 12000,
        sky: 0x0d1222,
        message: 'Orbits turn to debris as your event horizon grows.',
        items: [
          { name: 'Asteroid Swarm', type: 'asteroid', size: 110, value: 1700, color: 0x85796f },
          { name: 'Gas Giant', type: 'planet', size: 150, value: 2300, color: 0x7aa6ff },
          { name: 'Dwarf Star', type: 'sunShard', size: 190, value: 3100, color: 0xffcc7d },
        ],
      },
      {
        key: 'galaxy',
        name: 'Galaxy',
        minScale: 2800,
        revealStart: 2800,
        revealEnd: 8200,
        consumeScale: 6800,
        radius: 21000,
        sky: 0x070a14,
        message: 'Spiral arms bend around you. Systems collapse into sparks.',
        items: [
          { name: 'Cluster', type: 'asteroid', size: 240, value: 4600, color: 0x7f7b92 },
          { name: 'Nebula Knot', type: 'moon', size: 320, value: 6100, color: 0xc3a2ff },
          { name: 'Galactic Core', type: 'planet', size: 430, value: 8200, color: 0x8ab5ff },
        ],
      },
      {
        key: 'universe',
        name: 'Universe',
        minScale: 5500,
        revealStart: 5500,
        revealEnd: 16000,
        consumeScale: 13200,
        radius: 36000,
        sky: 0x03050b,
        message: 'You taste the fabric of reality itself.',
        items: [
          { name: 'Void Pearl', type: 'moon', size: 500, value: 9000, color: 0xbad4ff },
          { name: 'Reality Shard', type: 'sunShard', size: 720, value: 13200, color: 0xffd488 },
          { name: 'Cosmic Membrane', type: 'planet', size: 980, value: 18800, color: 0x95b6ff },
        ],
      },
    ];

    function createLayerMesh(layer) {
      if (layer.key === 'petri') {
        const g = new THREE.Group();
        const floor = new THREE.Mesh(new THREE.CircleGeometry(layer.radius, 64), simpleMat(0xf1f8f2, 0.03, 0.95, 0));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.04;
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(layer.radius * 1.02, layer.radius * 1.02, 7, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0xdff2e8, transparent: true, opacity: 0.4, roughness: 0.15, metalness: 0.25 }));
        wall.position.y = 3.5;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(layer.radius * 1.02, 1.7, 20, 80), simpleMat(0xe8fff3, 0.2, 0.2, 0.25));
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 7;
        g.add(floor, wall, rim);
        return g;
      }
      if (layer.key === 'table') {
        const g = new THREE.Group();
        const top = new THREE.Mesh(new THREE.BoxGeometry(layer.radius * 2.2, 6, layer.radius * 2.2), simpleMat(0x8c6340, 0.02, 0.8, 0.05));
        top.position.y = -3;
        g.add(top);
        return g;
      }
      if (layer.key === 'room') {
        const room = new THREE.Mesh(new THREE.BoxGeometry(layer.radius * 2, layer.radius * 0.9, layer.radius * 2), new THREE.MeshStandardMaterial({ color: 0xd7dfd9, roughness: 0.95, metalness: 0.02, side: THREE.BackSide }));
        room.position.y = layer.radius * 0.45 - 8;
        return room;
      }
      if (layer.key === 'building') {
        const b = new THREE.Mesh(new THREE.BoxGeometry(layer.radius * 1.8, layer.radius * 1.2, layer.radius * 1.8), new THREE.MeshStandardMaterial({ color: 0xc4ced5, roughness: 0.82, metalness: 0.08, side: THREE.BackSide }));
        b.position.y = layer.radius * 0.6 - 14;
        return b;
      }
      if (layer.key === 'city') {
        const cityPlate = new THREE.Mesh(new THREE.CylinderGeometry(layer.radius, layer.radius * 1.03, 36, 56), simpleMat(0x8f9fa8, 0.02, 0.95, 0));
        cityPlate.position.y = -18;
        return cityPlate;
      }
      if (layer.key === 'country') {
        const terrain = new THREE.Mesh(new THREE.SphereGeometry(layer.radius, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2.2), simpleMat(0x6e8662, 0.02, 0.9, 0));
        terrain.position.y = -layer.radius * 0.94;
        return terrain;
      }
      if (layer.key === 'ocean') {
        const ocean = new THREE.Mesh(new THREE.SphereGeometry(layer.radius, 64, 40), new THREE.MeshStandardMaterial({ color: 0x2d5f8e, transparent: true, opacity: 0.48, roughness: 0.25, metalness: 0.2, side: THREE.BackSide }));
        ocean.position.y = 50;
        return ocean;
      }
      if (layer.key === 'planet') {
        const p = new THREE.Mesh(new THREE.SphereGeometry(layer.radius, 64, 36), new THREE.MeshStandardMaterial({ color: 0x3f5e95, roughness: 0.85, metalness: 0.02, side: THREE.BackSide }));
        p.position.y = 120;
        return p;
      }
      if (layer.key === 'solar') {
        const ring = new THREE.Mesh(new THREE.RingGeometry(layer.radius * 0.45, layer.radius * 0.95, 128), new THREE.MeshBasicMaterial({ color: 0x8db8ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 180;
        return ring;
      }
      if (layer.key === 'galaxy') {
        const ring = new THREE.Mesh(new THREE.RingGeometry(layer.radius * 0.35, layer.radius, 140), new THREE.MeshBasicMaterial({ color: 0xb29dff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 220;
        return ring;
      }
      const universeSphere = new THREE.Mesh(new THREE.SphereGeometry(layer.radius, 72, 42), new THREE.MeshBasicMaterial({ color: 0x90a9ff, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }));
      universeSphere.position.y = 340;
      return universeSphere;
    }

    function createItemMesh(def) {
      const mat = simpleMat(def.color, 0.07);
      switch (def.type) {
        case 'dust': return new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), simpleMat(def.color, 0.03));
        case 'germ': {
          const g = new THREE.Group();
          g.add(
            new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), simpleMat(def.color, 0.16)),
            new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: 0x2cb499, emissive: 0x115f53, emissiveIntensity: 0.58, roughness: 0.28, metalness: 0.1, transparent: true, opacity: 0.62 }))
          );
          return g;
        }
        case 'crystal': return new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), simpleMat(def.color, 0.08));
        case 'seed': {
          const s = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), mat);
          s.scale.set(0.8, 1.2, 0.7);
          return s;
        }
        case 'rock': return new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat);
        case 'berry': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), mat);
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.4, 8), simpleMat(0x4fa74f));
          stem.position.y = 1;
          g.add(body, stem);
          return g;
        }
        case 'cone': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.ConeGeometry(0.66, 1.6, 14), mat);
          body.position.y = 0.8;
          const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 10, 16), simpleMat(0xffffff, 0, 0.5, 0));
          stripe.rotation.x = Math.PI / 2;
          stripe.position.y = 0.8;
          g.add(body, stripe);
          return g;
        }
        case 'crate': {
          const g = new THREE.Group();
          g.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.3), mat));
          const trim = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 1.42), simpleMat(0x6f4a2e, 0.02));
          trim.position.y = 0.52;
          g.add(trim);
          return g;
        }
        case 'mailbox': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.78, 1.35), mat);
          body.position.y = 1.38;
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 1.6, 10), simpleMat(0x6b717a, 0.02));
          pole.position.y = 0.8;
          g.add(body, pole);
          return g;
        }
        case 'car': {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.72, 1.28), mat);
          body.position.y = 0.5;
          const top = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.52, 1.05), simpleMat(0xa8e8ff, 0.03));
          top.position.set(0.12, 1.02, 0);
          g.add(body, top);
          return g;
        }
        case 'truck': {
          const g = new THREE.Group();
          const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 1.35), mat);
          trailer.position.set(-0.25, 0.65, 0);
          const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 1.25), simpleMat(0xb7f4ff, 0.03));
          cab.position.set(1.35, 0.68, 0);
          g.add(trailer, cab);
          return g;
        }
        case 'house': {
          const g = new THREE.Group();
          const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 2), mat);
          base.position.y = 0.85;
          const roof = new THREE.Mesh(new THREE.ConeGeometry(1.72, 1.28, 4), simpleMat(0x883f34, 0.02));
          roof.rotation.y = Math.PI / 4;
          roof.position.y = 2.08;
          g.add(base, roof);
          return g;
        }
        case 'tower': {
          const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 6.4, 1.9), mat);
          body.position.y = 3.2;
          return body;
        }
        case 'building': {
          const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 7.4, 3.1), mat);
          body.position.y = 3.7;
          return body;
        }
        case 'stadium': {
          const g = new THREE.Group();
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 5.1, 2.2, 22), mat);
          bowl.position.y = 1.1;
          const field = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.2, 20), simpleMat(0x3ca84d, 0.02));
          field.position.y = 1.2;
          g.add(bowl, field);
          return g;
        }
        case 'sunShard': return new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.65, roughness: 0.25, metalness: 0.15 }));
        case 'asteroid': return new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat);
        case 'moon': return new THREE.Mesh(new THREE.SphereGeometry(1, 20, 20), mat);
        case 'planet': {
          const g = new THREE.Group();
          const p = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 20), mat);
          const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.75, 30), new THREE.MeshBasicMaterial({ color: 0x9dd8ff, transparent: true, opacity: 0.36, side: THREE.DoubleSide, depthWrite: false }));
          ring.rotation.x = Math.PI / 2.8;
          g.add(p, ring);
          return g;
        }
        default: return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
      }
    }

    const layerStates = layers.map((layer, index) => {
      const shell = createLayerMesh(layer);
      shell.visible = false;
      shell.renderOrder = index;
      layerGroup.add(shell);

      const core = new THREE.Mesh(new THREE.SphereGeometry(Math.max(2.2, layer.radius * 0.03), 16, 16), simpleMat(0x8ef9bf, 0.5, 0.2, 0.2));
      core.visible = false;
      core.position.y = 0.45;
      layerGroup.add(core);

      return { layer, shell, core, consumed: false, announced: false };
    });

    const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), dir: new THREE.Vector2() };
    let size = 1;
    let visualSize = 1;
    let totalScore = 0;
    let dimension = 1;
    let dimensionMultiplier = 1;
    let pulse = 0;
    let spawnTimer = 0;
    const items = [];

    function setMilestone(text) { milestoneEl.textContent = text; }
    setMilestone('Microverse active: consume germs and dust inside the Petri dish.');

    function absoluteScale() {
      return size * dimensionMultiplier;
    }

    function stageName() {
      const abs = absoluteScale();
      let current = layers[0].name;
      for (const l of layers) if (abs >= l.minScale) current = l.name;
      return current;
    }

    function revealProgress(layer, abs) {
      return THREE.MathUtils.clamp((abs - layer.revealStart) / Math.max(0.001, layer.revealEnd - layer.revealStart), 0, 1);
    }

    function activeWeights() {
      const abs = absoluteScale();
      const weighted = [];
      let sum = 0;
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        const next = layers[i + 1];
        const center = next ? (l.minScale + next.minScale) * 0.5 : l.minScale * 1.45;
        const spread = Math.max(2, center * 0.58);
        const w = Math.exp(-Math.pow((abs - l.minScale) / spread, 2));
        if (w > 0.02) {
          weighted.push({ layer: l, weight: w });
          sum += w;
        }
      }
      if (!sum) return [{ layer: layers[0], weight: 1 }];
      weighted.forEach(entry => { entry.weight /= sum; });
      return weighted;
    }

    function weightedPick(entries) {
      let r = Math.random();
      for (const e of entries) {
        r -= e.weight;
        if (r <= 0) return e.layer;
      }
      return entries[entries.length - 1].layer;
    }

    function spawnItem(def, radiusBand = 120) {
      const holder = new THREE.Group();
      const mesh = createItemMesh(def);
      holder.add(mesh);

      const cue = new THREE.Mesh(
        new THREE.RingGeometry(0.95, 1.05, 22),
        new THREE.MeshBasicMaterial({ color: 0x63ff9a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      cue.rotation.x = -Math.PI / 2;
      cue.position.y = 0.04;
      cue.renderOrder = 10;
      holder.add(cue);

      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * radiusBand;
      holder.position.set(player.pos.x + Math.cos(angle) * dist, 0, player.pos.z + Math.sin(angle) * dist);
      holder.rotation.y = Math.random() * Math.PI * 2;
      holder.scale.setScalar(def.size);
      holder.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      itemGroup.add(holder);

      items.push({ mesh: holder, cue, size: def.size, value: def.value, spin: (Math.random() - 0.5) * 0.7, eaten: false });
    }

    function maintainItems(dt) {
      spawnTimer += dt;
      const abs = absoluteScale();
      const target = Math.min(520, 160 + Math.floor(Math.log10(1 + abs) * 120));
      const weights = activeWeights();

      while (items.length < target) {
        const layer = weightedPick(weights);
        const def = layer.items[Math.floor(Math.random() * layer.items.length)];
        spawnItem(def, Math.max(60, Math.min(layer.radius * 0.65, abs * 2.4 + 80)));
      }

      if (spawnTimer > 0.2) {
        spawnTimer = 0;
        const petri = layers[0].items;
        for (let i = 0; i < 4; i++) {
          const def = petri[Math.floor(Math.random() * petri.length)];
          spawnItem(def, Math.max(20, abs * 0.3 + 30));
        }
      }
    }

    function consumeItem(item) {
      item.eaten = true;
      totalScore += item.value;
      size += (item.value * 0.0049 + item.size * 0.0018) / (1 + Math.log10(1 + size) * 0.9);
      pulse = 1;
      item.mesh.removeFromParent();
      const i = items.indexOf(item);
      if (i >= 0) items.splice(i, 1);
    }

    function tryConsumeLayerCore(state, dist) {
      if (state.consumed) return;
      const abs = absoluteScale();
      const canEat = abs >= state.layer.consumeScale;
      if (!canEat) return;

      const coreSize = Math.max(2.2, state.layer.radius * 0.03);
      if (dist < visualSize * 1.02 + coreSize * 0.9) {
        state.consumed = true;
        state.shell.visible = false;
        state.core.visible = false;
        const gain = Math.max(4, Math.log2(state.layer.consumeScale + 2) * 3.8);
        totalScore += gain * 20;
        size += gain / (1 + Math.log10(1 + size));
        pulse = 1;
        setMilestone(`You consumed the ${state.layer.name} shell. Next layer exposed.`);
      }
    }

    function updateLayerVisuals(now) {
      const abs = absoluteScale();
      for (const state of layerStates) {
        const p = revealProgress(state.layer, abs);
        const alpha = state.consumed ? 0 : p;

        state.shell.visible = alpha > 0.01;
        if (state.shell.material && 'opacity' in state.shell.material) {
          state.shell.material.transparent = true;
          state.shell.material.opacity = THREE.MathUtils.lerp(0.02, 0.62, alpha);
        }

        const ringScale = 1 + Math.sin(now * 0.001 + state.layer.radius * 0.002) * 0.02;
        state.shell.scale.setScalar(ringScale);

        const coreSize = Math.max(2.2, state.layer.radius * 0.03);
        state.core.visible = !state.consumed && p > 0.08;
        state.core.scale.setScalar(coreSize * (1 + Math.sin(now * 0.002 + coreSize) * 0.08));
        state.core.position.set(player.pos.x, 0.5, player.pos.z + state.layer.radius * 0.35);

        const dx = player.pos.x - state.core.position.x;
        const dz = player.pos.z - state.core.position.z;
        const dist = Math.hypot(dx, dz);
        tryConsumeLayerCore(state, dist);

        if (!state.announced && abs >= state.layer.revealStart) {
          state.announced = true;
          setMilestone(state.layer.message);
        }
      }

      const cosmic = THREE.MathUtils.clamp((Math.log10(1 + abs) - 2.2) / 2.4, 0, 1);
      scene.fog.density = THREE.MathUtils.lerp(0.013, 0.0018, cosmic);
      let activeSky = 0xe9f5ed;
      for (const s of layerStates) if (abs >= s.layer.minScale) activeSky = s.layer.sky;
      const targetSky = tmpColorA.set(0xe9f5ed).lerp(tmpColorB.set(activeSky), 0.8);
      scene.background.lerp(targetSky, 0.05);
      scene.fog.color.copy(scene.background);
      hemi.intensity = THREE.MathUtils.lerp(1.25, 0.75, cosmic);
      sun.intensity = THREE.MathUtils.lerp(1.55, 0.9, cosmic);
    }

    function updateItems(dt) {
      const abs = absoluteScale();
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.mesh.rotation.y += item.spin * dt;

        const dx = player.pos.x - item.mesh.position.x;
        const dz = player.pos.z - item.mesh.position.z;
        const dist = Math.hypot(dx, dz) || 0.0001;

        const edible = item.size <= visualSize * 0.93;
        const eatRadius = visualSize * 0.92;
        const suction = visualSize * 6.2;

        if (dist < suction) {
          const pull = THREE.MathUtils.clamp((suction - dist) / suction, 0, 1);
          const speed = edible ? Math.max(4.5, visualSize * 1.65) : Math.max(2.3, visualSize * 0.65);
          item.mesh.position.x += (dx / dist) * dt * pull * speed;
          item.mesh.position.z += (dz / dist) * dt * pull * speed;
          const shrink = edible ? 1 - pull * 0.38 : 1 - pull * 0.08;
          item.mesh.scale.lerp(tmpVec.setScalar(item.size * shrink), edible ? 0.2 : 0.08);
        } else {
          item.mesh.scale.lerp(tmpVec.setScalar(item.size), 0.06);
        }

        const cueStrength = THREE.MathUtils.clamp(1 - dist / (suction * 0.8), 0, 1);
        item.cue.material.color.setHex(edible ? 0x63ff9a : 0xff7a7a);
        item.cue.material.opacity = cueStrength * (edible ? 0.42 : 0.22);

        if (!item.eaten && edible && dist < eatRadius) {
          consumeItem(item);
          continue;
        }

        if (dist > Math.max(260, abs * 2.8 + 180)) {
          item.mesh.removeFromParent();
          items.splice(i, 1);
        }
      }
    }

    function maybeAdvanceDimension() {
      const universe = layerStates[layerStates.length - 1];
      if (!universe.consumed) return;

      dimension += 1;
      dimensionMultiplier *= 10;
      universe.consumed = false;
      universe.announced = true;

      for (const state of layerStates) {
        if (state.layer.key !== 'universe') {
          state.consumed = false;
          state.announced = absoluteScale() >= state.layer.revealStart;
        }
      }

      size *= 1.08;
      setMilestone(`Dimensional breach: entering dimension ${dimension}. Absolute scale x${dimensionMultiplier.toLocaleString()}. Progress preserved.`);
    }

    function updateHUD() {
      sizeEl.textContent = absoluteScale().toLocaleString(undefined, { maximumFractionDigits: 2 });
      scoreEl.textContent = Math.floor(totalScore).toLocaleString();
      dimensionEl.textContent = String(dimension);
      stageEl.textContent = stageName();
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
      if (len > 70) {
        pointer.dx = (pointer.dx / len) * 70;
        pointer.dy = (pointer.dy / len) * 70;
      }
      player.dir.set(pointer.dx / 70, pointer.dy / 70);
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

    function updatePlayer(dt, now) {
      const abs = absoluteScale();
      const input = new THREE.Vector3(player.dir.x, 0, player.dir.y);
      if (input.lengthSq() > 1) input.normalize();

      const speed = Math.max(1.8, 5.4 - Math.log10(1 + abs) * 0.85);
      player.vel.lerp(input.multiplyScalar(speed), 0.1);
      player.pos.addScaledVector(player.vel, dt * 3);

      visualSize = THREE.MathUtils.lerp(visualSize, size, 0.085);
      const radius = 1.14 * visualSize;
      playerRoot.position.copy(player.pos);
      playerRoot.scale.setScalar(radius);

      playerLight.position.set(player.pos.x, 2.4 + visualSize * 0.22, player.pos.z);
      playerLight.distance = 16 + visualSize * 0.46;
      playerLight.intensity = 0.92 + visualSize * 0.004 + pulse * 0.88;

      const wave = 0.046 + Math.sin(now * 0.0038) * 0.012 + pulse * 0.06;
      aura.scale.setScalar(1 + wave * 0.24);
      aura.material.opacity = 0.22 + wave * 0.52;
      glowDisc.scale.setScalar(1.03 + wave * 0.62);
      glowDisc.material.opacity = 0.05 + wave * 0.2;
      pulse = Math.max(0, pulse - dt * 1.2);

      const feel = THREE.MathUtils.clamp(Math.log10(1 + abs) / 4.4, 0, 1);
      const camLift = 8 + Math.pow(abs, 0.36) * (2.6 + feel * 2.8);
      const camDistance = 12 + Math.pow(abs, 0.37) * (3 + feel * 3.4);
      const lookY = 0.12 + visualSize * 0.03;
      camera.fov = THREE.MathUtils.lerp(60, 73, feel);
      camera.updateProjectionMatrix();
      camera.position.lerp(tmpVec.set(player.pos.x, camLift, player.pos.z + camDistance), 0.08);
      camera.lookAt(player.pos.x, lookY, player.pos.z);
    }

    function animate(now = 0) {
      requestAnimationFrame(animate);
      const dt = Math.min(0.033, (now - (animate.last || now)) / 1000);
      animate.last = now;

      updatePlayer(dt, now);
      maintainItems(dt);
      updateItems(dt);
      updateLayerVisuals(now);
      maybeAdvanceDimension();
      updateHUD();

      renderer.render(scene, camera);
    }

    maintainItems(0.3);
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
