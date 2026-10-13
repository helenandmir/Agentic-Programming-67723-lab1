// Entry point: renderer, post-processing, camera, controls, intro and the main loop.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { rng, easeOutCubic, lerp } from './util.js';
import { createWorld } from './world.js';
import { createCitizens } from './citizens.js';
import { createUI } from './ui.js';
import { createInteract } from './interact.js';

const canvas = document.getElementById('scene');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('fatal').classList.remove('hidden');
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
const TARGET = new THREE.Vector3(0, 0.5, 0);
const HOME_SPH = new THREE.Spherical().setFromVector3(new THREE.Vector3(18, 12, 18));
const introSph = new THREE.Spherical(58, 1.05, HOME_SPH.theta - 1.4);
camera.position.setFromSpherical(introSph).add(TARGET);
camera.lookAt(TARGET);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 10;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI * 0.78;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.enabled = false;

let idleTimer = null;
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  clearTimeout(idleTimer);
});
controls.addEventListener('end', () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { controls.autoRotate = true; }, 8000);
});

// ---------- Post-processing ----------
const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.5, 0.55, 1.15);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- Shared context ----------
const ctx = {
  THREE, scene, camera, controls, renderer, composer, bloom, rng,
  params: { gravity: 1, bounce: 0.4, timeScale: 1, wind: 0, scale: { citizen: 1, tree: 1, house: 1 } },
  restoreHooks: [],
  stats: { breaks: 0, restores: 0, activeEvents: 0 },
  ready: false,
};
window.__ctx = ctx; // handy for debugging in the console

ctx.ui = createUI(ctx);
ctx.world = createWorld(ctx);
ctx.citizens = createCitizens(ctx);
ctx.interact = createInteract(ctx);

document.getElementById('pop').textContent = ctx.citizens.list.length;

// ---------- Intro ----------
const fly = { active: false, t: 0, dur: 2.6, from: null, to: null };
document.getElementById('accept').addEventListener('click', () => {
  ctx.onAccept?.();
  document.getElementById('intro').classList.add('leaving');
  setTimeout(() => document.getElementById('intro').classList.add('hidden'), 700);
  const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(TARGET));
  const to = HOME_SPH.clone();
  // Swing around the island toward the home angle along the shortest arc.
  const d = to.theta - from.theta;
  to.theta = from.theta + Math.atan2(Math.sin(d), Math.cos(d));
  Object.assign(fly, { active: true, t: 0, from, to });
  controls.autoRotate = false;
});

function finishIntro() {
  fly.active = false;
  controls.enabled = true;
  ctx.ready = true;
  document.getElementById('hud').classList.remove('hidden');
  ctx.onReady?.();
  ctx.ui.toast('Welcome, God. Please do not touch anything important.', 'info', 5);
  idleTimer = setTimeout(() => { controls.autoRotate = true; }, 8000);
}

// ---------- Resize ----------
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// ---------- Loop ----------
const clock = new THREE.Clock();
let worldTime = 0;
const sph = new THREE.Spherical();

function frame() {
  const realDt = clock.getDelta();
  const rawDt = Math.min(realDt, 1 / 30);
  const dt = rawDt * ctx.params.timeScale;
  worldTime += dt;
  const t = worldTime;

  ctx.citizens.update(dt, t);
  ctx.sim?.update(dt, t);
  ctx.events?.update(dt, t);
  ctx.world.update(dt, t, rawDt);
  ctx.fx?.update(rawDt);
  ctx.ui.update(rawDt);
  ctx.interact.update();

  if (fly.active) {
    fly.t += Math.min(realDt, 0.25); // wall-clock, so slow devices still get a 2.6 s fly-in
    const p = easeOutCubic(Math.min(1, fly.t / fly.dur));
    sph.set(lerp(fly.from.radius, fly.to.radius, p), lerp(fly.from.phi, fly.to.phi, p), lerp(fly.from.theta, fly.to.theta, p));
    camera.position.setFromSpherical(sph).add(TARGET);
    camera.lookAt(TARGET);
    if (p >= 1) finishIntro();
  } else {
    controls.update();
  }

  ctx.fx?.applyShake(camera);
  composer.render();
  ctx.fx?.removeShake(camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
