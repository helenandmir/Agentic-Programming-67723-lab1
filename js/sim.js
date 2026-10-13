// Tiny custom physics: entity bodies, gravity/bounce, impulses and RESTORE REALITY.
import * as THREE from 'three';
import { ISLAND_R, rand, clamp, easeOutBack, easeOutCubic } from './util.js';

// Gravity below which each category lifts off (citizens first, houses last).
const LIFT = { citizen: 0.85, tree: 0.55, house: 0.3 };
const RECYCLE_LINES = {
  citizen: (n) => `${n} has been recycled. They seem fine.`,
  tree: (n) => `${n} fell into the void and has been replanted.`,
  house: (n) => `${n}'s house was returned to sender.`,
};

export function createSim(ctx) {
  const { world, params, ui } = ctx;
  const bodies = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tmpV = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  let suppressDetach = 0;
  let lastRecycleToast = 0;

  for (const e of world.entities) {
    const kind = e.userData.kind;
    if (!(kind in LIFT)) continue; // the Town Hall is bolted down by bureaucracy
    const b = {
      obj: e,
      kind,
      home: { pos: e.position.clone(), quat: e.quaternion.clone() },
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      state: 'home', // home | free | settled | returning
      liftThreshold: LIFT[kind] + rand(0, 0.15),
      hoverCeil: rand(4, 14),
      phase: rand(0, 6.28),
      grounded: false,
      ret: null,
    };
    e.userData.body = b;
    bodies.push(b);
  }

  function detach(b, kick = 1) {
    if (b.state === 'returning') return;
    b.state = 'free';
    b.grounded = false;
    b.vel.set(rand(-0.6, 0.6), rand(0.5, 2) * kick, rand(-0.6, 0.6));
    b.angVel.set(rand(-1.5, 1.5), rand(-1, 1), rand(-1.5, 1.5));
  }

  // Slowly rotate a body back upright, keeping its heading.
  function uprightTarget(q) {
    tmpE.setFromQuaternion(q, 'YXZ');
    tmpE.x = 0;
    tmpE.z = 0;
    return tmpQ.setFromEuler(tmpE);
  }

  function respawn(b) {
    b.obj.position.copy(b.home.pos);
    b.obj.quaternion.copy(b.home.quat);
    b.vel.set(0, 0, 0);
    b.angVel.set(0, 0, 0);
    b.state = 'home';
    b.obj.userData.squash = 0;
    const now = performance.now();
    if (now - lastRecycleToast > 5000) {
      lastRecycleToast = now;
      ui.toast(RECYCLE_LINES[b.kind](b.obj.userData.name.replace(/ \(.*\)$/, '')), 'info');
    }
  }

  // Restore ring wave
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1, 96),
    new THREE.MeshBasicMaterial({ color: 0x5ff5e4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  ring.visible = false;
  world.root.add(ring);
  let ringT = -1;

  function stepFree(b, dt, t) {
    const o = b.obj;
    const g = params.gravity * (ctx.lowG > 0 ? 0.15 : 1);
    b.vel.y += -9.8 * g * dt;
    if (g < 0.3) {
      // Floaty regime: hover at different heights, bob gently, drift back toward the island.
      if (o.position.y > b.hoverCeil) b.vel.y -= (o.position.y - b.hoverCeil) * 3 * dt;
      b.vel.y += Math.sin(t * 1.3 + b.phase) * 0.6 * dt;
      const r = Math.hypot(o.position.x, o.position.z);
      if (r > ISLAND_R - 1) {
        b.vel.x -= (o.position.x / r) * 1.5 * dt;
        b.vel.z -= (o.position.z / r) * 1.5 * dt;
      }
      b.vel.multiplyScalar(Math.pow(0.35, dt));
    }
    if (params.wind) b.vel.x += params.wind * 6 * dt;
    b.vel.clampLength(0, 30);
    o.position.addScaledVector(b.vel, dt);

    tmpE.set(b.angVel.x * dt, b.angVel.y * dt, b.angVel.z * dt);
    o.quaternion.multiply(tmpQ.setFromEuler(tmpE));

    const r = Math.hypot(o.position.x, o.position.z);
    b.grounded = false;
    if (o.position.y <= 0 && r < ISLAND_R - 0.2 && o.position.y > -1.5) {
      o.position.y = 0;
      if (b.vel.y < 0) {
        const impact = -b.vel.y;
        b.vel.y = Math.min(impact * params.bounce, 17); // Flubber is fun, orbit is not
        if (impact > 2.5) o.userData.squash = 0;
        b.vel.x *= 0.85;
        b.vel.z *= 0.85;
        b.angVel.multiplyScalar(0.7);
      }
      if (b.vel.y < 0.6) {
        b.grounded = true;
        b.vel.y = Math.max(0, b.vel.y);
        b.vel.x *= Math.pow(0.03, dt);
        b.vel.z *= Math.pow(0.03, dt);
        b.angVel.multiplyScalar(Math.pow(0.02, dt));
        o.quaternion.slerp(uprightTarget(o.quaternion), Math.min(1, dt * 3));
        if (g >= 0.9 && b.vel.length() < 0.6) {
          b.state = 'settled';
          if (b.kind === 'citizen') o.userData.ai.target.copy(o.position);
        }
      }
    }
    if (o.position.y < -40) respawn(b);
  }

  function updateStability(dt) {
    let free = 0;
    for (const b of bodies) if (b.state === 'free') free++;
    const s = 100 - 15 * Math.abs(params.gravity - 1) - 45 * (free / bodies.length) - (params.bounce > 1 ? 10 : 0) - (ctx.stats.activeEvents || 0) * 15;
    ctx.stability = clamp(Math.round(s), 0, 100);
  }

  let stabTimer = 0;

  return {
    bodies,
    detach,
    impulse(center, radius, strength) {
      for (const b of bodies) {
        if (b.state === 'returning') continue;
        tmpV.subVectors(b.obj.position, center).setY(0);
        const d = tmpV.length();
        if (d > radius) continue;
        const fall = 1 - d / radius;
        if (b.state !== 'free') detach(b, 0);
        if (d > 0.001) tmpV.divideScalar(d); else tmpV.set(rand(-1, 1), 0, rand(-1, 1)).normalize();
        b.vel.addScaledVector(tmpV, strength * fall * rand(0.7, 1.1));
        b.vel.addScaledVector(up, strength * 1.2 * fall * rand(0.7, 1.2));
        b.angVel.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(strength * 0.35);
        b.obj.userData.squash = 0;
      }
    },
    restore() {
      suppressDetach = 0.9;
      for (const b of bodies) {
        if (b.state === 'home') continue;
        const delay = (b.home.pos.length() / ISLAND_R) * 0.45;
        b.state = 'returning';
        b.ret = { t: -delay, fromPos: b.obj.position.clone(), fromQuat: b.obj.quaternion.clone() };
      }
      ctx.lowG = 0;
      ui.setParam('gravity', 1, { animate: true });
      ui.setParam('bounce', 0.4, { animate: true });
      for (const f of ctx.restoreHooks) f();
      ctx.stats.restores++;
      ringT = 0;
      ring.visible = true;
    },
    update(dt, t, rawDt) {
      if (suppressDetach > 0) suppressDetach -= rawDt;
      if (ctx.lowG > 0) ctx.lowG -= dt;
      const g = params.gravity;
      for (const b of bodies) {
        const o = b.obj;
        if ((b.state === 'home' || b.state === 'settled') && suppressDetach <= 0 && g < b.liftThreshold) detach(b);
        if (b.state === 'free') stepFree(b, dt, t);
        else if (b.state === 'settled') o.quaternion.slerp(uprightTarget(o.quaternion), Math.min(1, dt * 3));
        else if (b.state === 'returning') {
          b.ret.t += rawDt;
          const p = clamp(b.ret.t / 1.0, 0, 1);
          o.position.lerpVectors(b.ret.fromPos, b.home.pos, easeOutBack(p));
          o.quaternion.slerpQuaternions(b.ret.fromQuat, b.home.quat, easeOutCubic(p));
          if (p >= 1) {
            b.state = 'home';
            b.vel.set(0, 0, 0);
            b.angVel.set(0, 0, 0);
            o.userData.squash = 0;
          }
        }
        // Heavy gravity visibly squishes everything.
        const heavyTarget = g > 1.2 ? Math.max(0.7, 1 - 0.12 * (g - 1)) : 1;
        o.userData.heavy = (o.userData.heavy ?? 1) + (heavyTarget - (o.userData.heavy ?? 1)) * Math.min(1, rawDt * 6);
      }

      if (ringT >= 0) {
        ringT += rawDt;
        const p = ringT / 1.3;
        ring.scale.setScalar(0.5 + easeOutCubic(Math.min(1, p)) * 16);
        ring.material.opacity = Math.max(0, 1 - p);
        if (p >= 1) { ringT = -1; ring.visible = false; }
      }

      stabTimer -= rawDt;
      if (stabTimer <= 0) { stabTimer = 0.25; updateStability(); }
    },
  };
}
