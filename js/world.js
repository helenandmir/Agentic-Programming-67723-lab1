// The floating island diorama: terrain, town, trees, sky, lights and ambient animation.
import * as THREE from 'three';
import { PALETTE, ISLAND_R, rand, pick, rng, applyScale } from './util.js';

const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...opts }));
  }
  return matCache.get(key);
}

function mesh(geo, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

// Deterministic per-vertex jitter so duplicated seam vertices move identically.
function hashJitter(x, y, z, amount) {
  const h = (a) => {
    const s = Math.sin(a) * 43758.5453;
    return s - Math.floor(s);
  };
  const k = Math.round(x * 100) * 0.0131 + Math.round(y * 100) * 0.0717 + Math.round(z * 100) * 0.0373;
  return [(h(k) - 0.5) * 2 * amount, (h(k + 1.7) - 0.5) * 2 * amount, (h(k + 3.1) - 0.5) * 2 * amount];
}

function craggy(geo, amount, keep = () => false) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (keep(x, y, z)) continue;
    const [jx, jy, jz] = hashJitter(x, y, z, amount);
    pos.setXYZ(i, x + jx, y + jy, z + jz);
  }
  geo.computeVertexNormals();
  return geo;
}

const HOUSE_QUIPS = [
  'Mortgage: 400 years.',
  'Please knock. Not like that.',
  'Zoned residential. Barely.',
  'Built to code. The code was a haiku.',
  'Home insurance does not cover acts of you.',
];
const TREE_QUIPS = [
  'I photosynthesize, therefore I am.',
  'Leaf me alone.',
  'Bark bark. (That was a tree joke.)',
  'Please do not uproot me. I have roots here.',
  "I've been standing here since Tuesday. Feels like eternity.",
];
const HALL_QUIPS = [
  'Open Mon–Fri, 9:00–9:05.',
  'Bolted down by bureaucracy.',
  'Please take a number. Now serving: 3.',
  'The clock is correct. Everything else is not.',
];
const HOUSE_NAMES = ['The Hendersons', 'Grandma Pearl', 'The Nguyens', 'Doug (alone)', 'Airbnb #4', 'The Mayor (secret)', 'The Garcias', 'Haunted (probably)', 'The Patels'];

function makeHouse(color, w, idx) {
  const g = new THREE.Group();
  const d = w * 0.95;
  const body = mesh(new THREE.BoxGeometry(w, 0.9, d), mat(PALETTE.wall));
  body.position.y = 0.45;
  const roof = mesh(new THREE.ConeGeometry(w * 0.82, 0.75, 4), mat(color));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.9 + 0.375;
  const door = mesh(new THREE.BoxGeometry(0.26, 0.45, 0.05), mat(PALETTE.door), { cast: false });
  door.position.set(0, 0.225, d / 2 + 0.01);
  const glow = mat(PALETTE.windowGlow, { emissive: PALETTE.windowGlow, emissiveIntensity: 4, flatShading: false });
  for (const sx of [-1, 1]) {
    const win = mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), glow, { cast: false });
    win.position.set(sx * w * 0.3, 0.55, d / 2 + 0.01);
    g.add(win);
  }
  const side = mesh(new THREE.BoxGeometry(0.05, 0.2, 0.22), glow, { cast: false });
  side.position.set(w / 2 + 0.01, 0.55, 0);
  const chimney = mesh(new THREE.BoxGeometry(0.16, 0.45, 0.16), mat(PALETTE.rockDark));
  chimney.position.set(w * 0.22, 1.25, -d * 0.12);
  g.add(body, roof, door, side, chimney);
  g.userData = { kind: 'house', name: HOUSE_NAMES[idx % HOUSE_NAMES.length], quips: HOUSE_QUIPS, baseScale: 1, height: 1.8 };
  return g;
}

function makeTree(idx) {
  const g = new THREE.Group();
  const sway = new THREE.Group();
  g.add(sway);
  const trunk = mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.6, 6), mat(PALETTE.trunk));
  trunk.position.y = 0.3;
  sway.add(trunk);
  const leaf = mat(pick(PALETTE.foliage));
  if (rng() < 0.55) {
    // pine
    [[0.62, 0.75], [0.47, 1.12], [0.32, 1.45]].forEach(([r, y]) => {
      const c = mesh(new THREE.ConeGeometry(r, 0.7, 7), leaf);
      c.position.y = y;
      sway.add(c);
    });
  } else {
    // round
    const a = mesh(new THREE.IcosahedronGeometry(0.55, 0), leaf);
    a.position.y = 1.0;
    const b = mesh(new THREE.IcosahedronGeometry(0.36, 0), leaf);
    b.position.set(0.25, 1.35, 0.1);
    sway.add(a, b);
  }
  const s = rand(0.8, 1.3);
  g.userData = { kind: 'tree', name: `Tree #${idx + 1}`, quips: TREE_QUIPS, baseScale: s, height: 1.8 * s, sway, phase: rand(0, 6.28) };
  return g;
}

function makeTownHall() {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(2.2, 1.5, 2.0), mat(PALETTE.wall));
  body.position.y = 0.75;
  const roof = mesh(new THREE.ConeGeometry(1.75, 0.9, 4), mat(0xc0504d));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 1.5 + 0.45;
  // Columns at the entrance
  for (const x of [-0.7, -0.25, 0.25, 0.7]) {
    const col = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 8), mat(0xf6e7d8));
    col.position.set(x, 0.6, 1.1);
    g.add(col);
  }
  const step = mesh(new THREE.BoxGeometry(2.0, 0.12, 0.5), mat(0xd9c7b0));
  step.position.set(0, 0.06, 1.2);
  // Clock tower
  const tower = mesh(new THREE.BoxGeometry(0.85, 1.6, 0.85), mat(PALETTE.wall));
  tower.position.set(0, 2.2, 0);
  const tRoof = mesh(new THREE.ConeGeometry(0.75, 1.0, 4), mat(0xc0504d));
  tRoof.rotation.y = Math.PI / 4;
  tRoof.position.set(0, 3.5, 0);
  const face = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 24),
    new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: 0xfff1c1, emissiveIntensity: 1.2 }), { cast: false });
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 2.45, 0.45);
  const handMat = new THREE.MeshBasicMaterial({ color: 0x2a1f4a });
  const makeHand = (len, width) => {
    const pivot = new THREE.Group();
    const h = new THREE.Mesh(new THREE.BoxGeometry(width, len, 0.02), handMat);
    h.position.y = len / 2;
    pivot.add(h);
    pivot.position.set(0, 2.45, 0.485);
    return pivot;
  };
  const hourHand = makeHand(0.17, 0.045);
  const minuteHand = makeHand(0.27, 0.03);
  // Flag
  const pole = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), mat(0xdddddd));
  pole.position.set(0, 4.3, 0);
  const flag = mesh(new THREE.BoxGeometry(0.4, 0.24, 0.02), mat(0x2ec4b6, { side: THREE.DoubleSide }));
  flag.position.set(0.2, 4.5, 0);
  g.add(body, roof, step, tower, tRoof, face, hourHand, minuteHand, pole, flag);
  g.userData = { kind: 'townhall', name: 'Town Hall', quips: HALL_QUIPS, baseScale: 1, height: 4.8, hourHand, minuteHand, flag };
  return g;
}

function makeCloud() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, emissive: 0xffe4f0, emissiveIntensity: 0.4 });
  const n = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const s = mesh(new THREE.IcosahedronGeometry(1, 1), m, { cast: false, receive: false });
    const r = rand(0.7, 1.3) * (i === 0 ? 1.3 : 1);
    s.scale.set(r * 1.2, r * 0.85, r);
    s.position.set((i - n / 2) * 0.9 + rand(-0.3, 0.3), rand(-0.1, 0.4), rand(-0.4, 0.4));
    g.add(s);
  }
  return g;
}

export function createWorld(ctx) {
  const { scene } = ctx;
  const root = new THREE.Group();
  scene.add(root);
  const entities = [];

  // ---------- Sky ----------
  const skyUniforms = {
    top: { value: new THREE.Color(PALETTE.skyTop) },
    mid: { value: new THREE.Color(PALETTE.skyMid) },
    horizon: { value: new THREE.Color(PALETTE.horizon) },
    bottom: { value: new THREE.Color(0x24185a) },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 bottom;
        varying vec3 vDir;
        void main() {
          float h = vDir.y;
          vec3 c = mix(horizon, mid, smoothstep(0.0, 0.32, h));
          c = mix(c, top, smoothstep(0.32, 0.9, h));
          c = mix(c, mix(mid, bottom, 0.6), smoothstep(0.02, -0.25, h));
          c = mix(c, bottom, smoothstep(-0.25, -0.8, h));
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  scene.add(sky);

  // Stars, fading out toward the horizon
  {
    const n = 1500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rand(-0.15, 1), th = rand(0, Math.PI * 2);
      const r = Math.sqrt(1 - u * u);
      pos.set([Math.cos(th) * r * 150, u * 150, Math.sin(th) * r * 150], i * 3);
      const b = THREE.MathUtils.smoothstep(u, 0.15, 0.6) * rand(0.5, 1);
      col.set([b, b, b * 1.1], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  }
  scene.fog = new THREE.Fog(PALETTE.horizon, 70, 180);

  // ---------- Lights ----------
  const hemi = new THREE.HemisphereLight(0xbde0fe, 0x6a4c93, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.0);
  sun.position.set(12, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 60 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9b5de5, 0.8);
  rim.position.set(-14, 6, -12);
  scene.add(rim);

  // ---------- Island ----------
  const island = new THREE.Group();
  root.add(island);
  const top = mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R - 0.3, 0.6, 48), mat(PALETTE.grass), { cast: false });
  top.position.y = -0.3;
  const lip = mesh(new THREE.CylinderGeometry(ISLAND_R - 0.25, ISLAND_R - 0.55, 0.5, 48), mat(PALETTE.grassEdge), { cast: false });
  lip.position.y = -0.85;
  const dirt = mesh(new THREE.CylinderGeometry(ISLAND_R - 0.5, ISLAND_R - 0.9, 0.7, 24), mat(PALETTE.rock), { cast: false });
  dirt.position.y = -1.45;
  const coneH = 9.5;
  const under = mesh(
    craggy(new THREE.ConeGeometry(ISLAND_R - 0.9, coneH, 16, 5), 0.45, (x, y) => y > coneH / 2 - 0.05),
    mat(PALETTE.rockDark), { cast: false }
  );
  under.rotation.x = Math.PI;
  under.position.y = -1.8 - coneH / 2;
  island.add(top, lip, dirt, under);
  // Stalactites hanging off the underside
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand(-0.3, 0.3);
    const h = rand(2, 4);
    const depth = rand(1.5, 4);
    const r = (ISLAND_R - 0.9) * (1 - depth / coneH) - 0.6;
    const st = mesh(craggy(new THREE.ConeGeometry(rand(0.7, 1.3), h, 6, 2), 0.15, (x, y) => y > h / 2 - 0.05),
      mat(i % 2 ? PALETTE.rock : PALETTE.rockDark), { cast: false });
    st.rotation.x = Math.PI;
    st.position.set(Math.cos(a) * r, -1.8 - depth - h / 2 + 0.6, Math.sin(a) * r);
    island.add(st);
  }

  // Floating debris rocks orbiting below
  const debris = [];
  for (let i = 0; i < 9; i++) {
    const rock = mesh(new THREE.DodecahedronGeometry(rand(0.3, 0.8), 0), mat(i % 3 ? PALETTE.rockDark : PALETTE.rock));
    const d = { mesh: rock, r: rand(11, 14.5), a: rand(0, Math.PI * 2), y: rand(-8, -2.5), speed: rand(0.04, 0.1) * (rng() < 0.5 ? 1 : -1), phase: rand(0, 6.28), spin: rand(0.2, 0.8) };
    if (rng() < 0.4) {
      const cap = mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.15, 7), mat(PALETTE.grass));
      cap.position.y = 0.35;
      rock.add(cap);
    }
    debris.push(d);
    root.add(rock);
  }

  // ---------- Pond + waterfall ----------
  const fallAngle = -0.35;
  const pondPos = new THREE.Vector3(Math.cos(fallAngle) * 7.6, 0.02, Math.sin(fallAngle) * 7.6);
  const waterMat = new THREE.MeshStandardMaterial({ color: PALETTE.water, roughness: 0.15, metalness: 0.1, emissive: 0x1b6f9a, emissiveIntensity: 0.35 });
  const pond = mesh(new THREE.CircleGeometry(1.5, 28), waterMat, { cast: false });
  pond.rotation.x = -Math.PI / 2;
  pond.position.copy(pondPos);
  root.add(pond);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a - fallAngle), Math.cos(a - fallAngle))) < 0.5) continue; // gap for the stream
    const pebble = mesh(new THREE.DodecahedronGeometry(rand(0.12, 0.22), 0), mat(0x9aa0a6));
    pebble.position.set(pondPos.x + Math.cos(a) * 1.55, 0.06, pondPos.z + Math.sin(a) * 1.55);
    root.add(pebble);
  }
  // Stream from the pond to the island edge: local +x of the group points radially outward.
  const streamLen = ISLAND_R - 8.9;
  const streamGroup = new THREE.Group();
  streamGroup.rotation.y = -fallAngle;
  const stream = mesh(new THREE.PlaneGeometry(streamLen + 0.2, 0.7), waterMat, { cast: false });
  stream.rotation.x = -Math.PI / 2;
  stream.position.set(8.9 + streamLen / 2, 0.015, 0);
  streamGroup.add(stream);
  root.add(streamGroup);

  const fallUniforms = { uTime: { value: 0 } };
  const fallH = 16;
  const fall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.75, fallH, 14, 1, true),
    new THREE.ShaderMaterial({
      uniforms: fallUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uTime; varying vec2 vUv;
        void main() {
          float stripes = fract(vUv.y * 9.0 + uTime * 1.6 + sin(vUv.x * 37.7) * 0.12);
          float foam = smoothstep(0.75, 1.0, stripes);
          vec3 water = mix(vec3(0.18, 0.62, 0.95), vec3(0.85, 0.97, 1.0), foam);
          float fade = smoothstep(0.0, 0.55, vUv.y);
          gl_FragColor = vec4(water * 1.25, 0.85 * fade);
        }`,
    })
  );
  fall.position.set(Math.cos(fallAngle) * (ISLAND_R + 0.45), -fallH / 2 + 0.05, Math.sin(fallAngle) * (ISLAND_R + 0.45));
  root.add(fall);

  // ---------- Town ----------
  const hall = makeTownHall();
  hall.rotation.y = Math.PI / 4; // face the default camera
  root.add(hall);
  entities.push(hall);

  const houses = [];
  const nHouses = 9;
  for (let i = 0; i < nHouses; i++) {
    const a = (i / nHouses) * Math.PI * 2 + rand(-0.17, 0.17) + 0.3;
    const r = 5.5 + rand(-0.3, 0.3);
    const h = makeHouse(PALETTE.roofs[i % PALETTE.roofs.length], rand(1.0, 1.3), i);
    h.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    h.lookAt(0, 0, 0);
    root.add(h);
    houses.push(h);
    entities.push(h);
  }

  const trees = [];
  let attempts = 0;
  while (trees.length < 22 && attempts++ < 2000) {
    const a = rand(0, Math.PI * 2), r = rand(2.6, 9.2);
    const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    if (houses.some((h) => h.position.distanceTo(p) < 1.6)) continue;
    if (trees.some((t) => t.position.distanceTo(p) < 1.3)) continue;
    if (p.distanceTo(pondPos) < 2.1) continue;
    if (Math.abs(Math.atan2(p.z, p.x) - fallAngle) < 0.15 && r > 7.5) continue;
    const t = makeTree(trees.length);
    t.position.copy(p);
    t.rotation.y = rand(0, Math.PI * 2);
    root.add(t);
    trees.push(t);
    entities.push(t);
  }

  // Flowers (decor, instanced)
  {
    const n = 80;
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n);
    const m = new THREE.Matrix4();
    const colors = [0xff8fab, 0xffd166, 0xffffff, 0xc77dff].map((c) => new THREE.Color(c));
    let placed = 0;
    while (placed < n) {
      const a = rand(0, Math.PI * 2), r = rand(1.8, 9.6);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - pondPos.x, z - pondPos.z) < 1.7) continue;
      m.makeTranslation(x, 0.06, z);
      fl.setMatrixAt(placed, m);
      fl.setColorAt(placed, pick(colors));
      placed++;
    }
    fl.castShadow = false;
    root.add(fl);
  }
  // Small boulders (decor)
  for (let i = 0; i < 6; i++) {
    const a = rand(0, Math.PI * 2), r = rand(3, 9.4);
    const b = mesh(new THREE.DodecahedronGeometry(rand(0.15, 0.32), 0), mat(0x9aa0a6));
    b.position.set(Math.cos(a) * r, 0.08, Math.sin(a) * r);
    root.add(b);
  }

  // ---------- Clouds ----------
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const c = makeCloud();
    // Two layers: high clouds above the camera's sightline, low clouds drifting below the island.
    const high = i % 2 === 0;
    const d = { obj: c, r: high ? rand(10, 20) : rand(14, 22), a: (i / 10) * Math.PI * 2 + rand(-0.2, 0.2), y: high ? rand(14, 18) : rand(-7, -3), speed: rand(0.015, 0.04) };
    c.scale.setScalar(rand(0.8, 1.3));
    scene.add(c);
    clouds.push(d);
  }

  const world = {
    root, island, entities, houses, trees, hall, sky, skyUniforms, sun, hemi, rim, clouds, debris, pondPos,
    update(dt, t, rawDt) {
      root.position.y = Math.sin(t * (Math.PI * 2 / 6)) * 0.15;
      fallUniforms.uTime.value = t;

      for (const tr of trees) {
        const ud = tr.userData;
        ud.sway.rotation.z = Math.sin(t * 1.3 + ud.phase) * (0.03 + (ctx.params.wind || 0) * 0.3);
      }
      for (const d of debris) {
        d.a += d.speed * dt;
        d.mesh.position.set(Math.cos(d.a) * d.r, d.y + Math.sin(t * 0.8 + d.phase) * 0.4, Math.sin(d.a) * d.r);
        d.mesh.rotation.y += d.spin * dt;
        d.mesh.rotation.x += d.spin * 0.5 * dt;
      }
      for (const c of clouds) {
        c.a += c.speed * dt * (1 + (ctx.params.wind || 0) * 6);
        c.obj.position.set(Math.cos(c.a) * c.r, c.y + Math.sin(t * 0.3 + c.r) * 0.3, Math.sin(c.a) * c.r);
      }

      // Clock tower shows real wall-clock time (sped up by the time controls later)
      const hud = hall.userData;
      const now = new Date();
      const secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + (ctx.clockOffset || 0);
      hud.minuteHand.rotation.z = -((secs / 3600) % 1) * Math.PI * 2;
      hud.hourHand.rotation.z = -((secs / 43200) % 1) * Math.PI * 2;
      hud.flag.rotation.y = Math.sin(t * 3) * 0.25;

      // Squash timers + final scale for every interactive entity
      for (const e of entities) {
        const ud = e.userData;
        if (ud.squash !== undefined && ud.squash < 1) ud.squash += rawDt;
        const cat = ctx.params.scale?.[ud.kind] ?? 1;
        applyScale(e, ud.scaleNow ?? cat, ud.heavy ?? 1);
      }
    },
  };
  return world;
}
