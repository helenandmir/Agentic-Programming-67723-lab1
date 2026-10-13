// Visual effects: pooled additive particles, shockwave rings, camera shake and screen flash.
import * as THREE from 'three';
import { rand } from './util.js';

export function createFX(ctx) {
  const { world, renderer } = ctx;
  const N = 900;
  const pos = new Float32Array(N * 3).fill(-9999);
  const col = new Float32Array(N * 3);
  const size = new Float32Array(N);
  const alpha = new Float32Array(N);
  const vel = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const maxLife = new Float32Array(N).fill(1);
  const grav = new Float32Array(N);
  let next = 0;

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage);
  const sizeAttr = new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage);
  const alphaAttr = new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', colAttr);
  geo.setAttribute('size', sizeAttr);
  geo.setAttribute('alpha', alphaAttr);
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uScale: { value: renderer.getPixelRatio() * 420 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float size; attribute float alpha; attribute vec3 color;
      uniform float uScale;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vColor = color; vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor * 1.6, a);
      }`,
  }));
  points.frustumCulled = false;
  world.root.add(points);

  const c = new THREE.Color();
  const dir = new THREE.Vector3();

  // Emit `count` particles at local position `p` (world.root space).
  function emit(p, count, { colors = [0xffffff], speed = 5, up = 2, life: l = 1.2, gravity = 6, size: s = 0.4, spread = 0 } = {}) {
    for (let k = 0; k < count; k++) {
      const i = next;
      next = (next + 1) % N;
      dir.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      const sp = speed * rand(0.35, 1);
      pos[i * 3] = p.x + rand(-spread, spread);
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z + rand(-spread, spread);
      vel[i * 3] = dir.x * sp;
      vel[i * 3 + 1] = Math.abs(dir.y) * sp + up * rand(0.5, 1.2);
      vel[i * 3 + 2] = dir.z * sp;
      c.set(colors[Math.floor(Math.random() * colors.length)]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      maxLife[i] = life[i] = l * rand(0.6, 1);
      grav[i] = gravity;
      size[i] = s * rand(0.6, 1.2);
      alpha[i] = 1;
    }
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  // Shockwave rings
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 72),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    world.root.add(m);
    rings.push({ mesh: m, t: -1, dur: 1, max: 10 });
  }
  function shockwave(p, color = 0xffffff, max = 14, dur = 0.9) {
    const r = rings.find((x) => x.t < 0) || rings[0];
    r.mesh.position.set(p.x, 0.12, p.z);
    r.mesh.material.color.set(color);
    r.mesh.visible = true;
    Object.assign(r, { t: 0, dur, max });
  }

  // Camera shake
  let shakeAmp = 0, shakeDur = 1, shakeT = 0;
  const offset = new THREE.Vector3();
  function shake(amp, dur) {
    if (amp * (1 - shakeT / shakeDur) > shakeAmp * (1 - shakeT / shakeDur) || shakeT >= shakeDur) {
      shakeAmp = amp; shakeDur = dur; shakeT = 0;
    }
  }

  const flashEl = document.getElementById('flash');
  function flash(color = '#fff', ms = 120) {
    flashEl.style.transition = 'none';
    flashEl.style.background = color;
    flashEl.style.opacity = '0.85';
    void flashEl.offsetWidth;
    flashEl.style.transition = `opacity ${ms * 3}ms ease-out`;
    flashEl.style.opacity = '0';
  }

  return {
    emit,
    shockwave,
    shake,
    flash,
    update(dt) {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) {
          alpha[i] = 0;
          pos[i * 3 + 1] = -9999;
          continue;
        }
        vel[i * 3 + 1] -= grav[i] * dt;
        const drag = Math.pow(0.5, dt);
        vel[i * 3] *= drag; vel[i * 3 + 2] *= drag;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        alpha[i] = Math.min(1, (life[i] / maxLife[i]) * 1.5);
      }
      posAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;

      for (const r of rings) {
        if (r.t < 0) continue;
        r.t += dt;
        const p = r.t / r.dur;
        r.mesh.scale.setScalar(0.5 + (1 - Math.pow(1 - Math.min(p, 1), 3)) * r.max);
        r.mesh.material.opacity = Math.max(0, 1 - p);
        if (p >= 1) { r.t = -1; r.mesh.visible = false; }
      }
      if (shakeT < shakeDur) shakeT += dt;
    },
    applyShake(camera) {
      const k = shakeT < shakeDur ? shakeAmp * Math.pow(1 - shakeT / shakeDur, 2) : 0;
      offset.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(k);
      camera.position.add(offset);
    },
    removeShake(camera) {
      camera.position.sub(offset);
    },
  };
}
