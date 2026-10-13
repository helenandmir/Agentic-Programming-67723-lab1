// BREAK REALITY: the event runner and the events themselves.
import * as THREE from 'three';
import { rand, pick } from './util.js';

// ---------------------------------------------------------------------------
// Event: Unscheduled Duck
// ---------------------------------------------------------------------------
function makeDuck() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd60a, roughness: 0.25, emissive: 0x6b4a00, emissiveIntensity: 0.25 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.35 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const add = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  const sphere = new THREE.SphereGeometry(1, 32, 22);
  add(sphere, yellow, 0, 0.95, 0, 1.25, 0.95, 1.6); // body
  const tail = add(new THREE.ConeGeometry(0.45, 0.9, 16), yellow, 0, 1.45, -1.55);
  tail.rotation.x = -0.9;
  add(sphere, yellow, 0, 2.2, 0.95, 0.78, 0.78, 0.78); // head
  add(sphere, orange, 0, 2.05, 1.8, 0.42, 0.17, 0.5); // beak
  for (const sx of [-1, 1]) {
    add(sphere, black, sx * 0.4, 2.45, 1.5, 0.13, 0.15, 0.1);
    add(sphere, white, sx * 0.43, 2.5, 1.59, 0.04, 0.04, 0.03);
    add(sphere, yellow, sx * 1.15, 1.1, -0.1, 0.25, 0.55, 0.85); // wings
  }
  g.userData = {
    kind: 'duck',
    name: 'The Duck',
    quips: ['QUACK.', 'I am not a metaphor.', 'I was told this was a bathtub.', 'Squeak. (Threatening.)', 'Do not make eye contact with the duck.'],
    baseScale: 1.7,
    height: 2.9 * 1.7,
  };
  g.visible = false;
  return g;
}

function duckEvent(ctx) {
  const { world, fx, audio, sim, ui, citizens } = ctx;
  let duck, shadow;
  const up = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3();

  function build() {
    if (duck) return;
    duck = makeDuck();
    world.root.add(duck);
    world.entities.push(duck); // clickable
    shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.visible = false;
    world.root.add(shadow);
  }

  function impact(ev, big) {
    const p = duck.position;
    ev.squashT = 0;
    ev.squashA = big ? 0.45 : 0.25;
    if (big) {
      fx.shockwave(p, 0xffd60a, 18, 1.1);
      fx.shockwave(p, 0xffffff, 11, 0.7);
      fx.emit(tmp.copy(p).addScaledVector(up, 1), 220, { colors: [0xffd60a, 0xffffff, 0xff8c00, 0xfff3b0], speed: 11, up: 5, life: 1.8, gravity: 9, size: 0.55, spread: 1.5 });
      fx.shake(0.7, 1.0);
      fx.flash('#fff6d5', 130);
      audio.boom();
      audio.quack(0.18);
      sim.impulse(p, 9.5, 13);
      citizens.fleeFrom(p, 11, 3);
      ui.toast('A duck has landed. Experts are calling it "a lot of duck".', 'danger');
    } else {
      fx.shockwave(p, 0xffd60a, 8, 0.7);
      fx.emit(p, 40, { colors: [0xffd60a, 0xffffff], speed: 6, up: 3, life: 1, gravity: 9, size: 0.4 });
      fx.shake(0.25, 0.5);
      audio.boing();
      sim.impulse(p, 6, 6);
    }
  }

  return {
    id: 'duck',
    name: 'UNSCHEDULED DUCK',
    subtitle: 'Duck classified as weather event',
    start(ev) {
      build();
      const a = rand(0, Math.PI * 2), r = rand(0, 3);
      duck.position.set(Math.cos(a) * r, 45, Math.sin(a) * r);
      // Face the camera so its silly face is visible on landing.
      const camLocal = world.root.worldToLocal(ctx.camera.position.clone());
      duck.rotation.set(0, Math.atan2(camLocal.x - duck.position.x, camLocal.z - duck.position.z), 0);
      duck.visible = true;
      duck.userData.heavy = 1;
      shadow.position.set(duck.position.x, 0.04, duck.position.z);
      shadow.visible = true;
      Object.assign(ev, { phase: 'fall', vy: 0, bounces: 0, squashT: 99, squashA: 0, nextQuack: 3, leaveT: 0 });
      citizens.fleeFrom(duck.position.clone().setY(0), 7, 3);
      audio.whoosh();
    },
    update(ev, dt) {
      const p = duck.position;
      if (ev.phase === 'fall') {
        ev.vy -= 30 * dt; // the duck does not respect your gravity settings
        p.y += ev.vy * dt;
        if (p.y <= 0 && ev.vy < 0) {
          p.y = 0;
          impact(ev, ev.bounces === 0);
          ev.bounces++;
          ev.vy = -ev.vy * Math.min(0.95, ctx.params.bounce * 0.75);
          if (ev.vy < 3 || ev.bounces >= 5) {
            ev.vy = 0;
            ev.phase = 'sit';
          }
        }
      } else if (ev.phase === 'sit') {
        ev.nextQuack -= dt;
        if (ev.nextQuack <= 0) {
          ev.nextQuack = 3;
          audio.quack();
          duck.userData.squash = 0;
          fx.emit(tmp.copy(p).setY(4.2), 6, { colors: [0xffd60a], speed: 1.5, up: 2, life: 0.8, gravity: 1, size: 0.5 });
        }
        if (ev.t > 14) {
          ev.phase = 'leave';
          ui.toast('The duck has left the chat.', 'info');
        }
      } else if (ev.phase === 'leave') {
        ev.vy += 5 * dt;
        p.y += ev.vy * dt;
        duck.rotation.y += 2.5 * dt;
        if (p.y > 45) return true;
      }
      // Shadow grows as the duck approaches
      const h = Math.max(0, p.y);
      shadow.position.set(p.x, 0.04, p.z);
      shadow.scale.setScalar(0.6 + 3.4 * (1 - Math.min(1, h / 45)));
      shadow.material.opacity = 0.55 * (1 - Math.min(1, h / 45));
      // Impact squash spring
      ev.squashT += dt;
      duck.userData.heavy = 1 - ev.squashA * Math.exp(-5 * ev.squashT) * Math.cos(16 * ev.squashT);
      return false;
    },
    cleanup(ev, instant) {
      if (instant && duck.visible) {
        fx.emit(tmp.copy(duck.position).addScaledVector(up, 2), 60, { colors: [0xffd60a, 0xffffff], speed: 6, up: 2, life: 0.9, gravity: 2, size: 0.5 });
      }
      duck.visible = false;
      shadow.visible = false;
    },
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
export function createEvents(ctx) {
  const { ui, audio } = ctx;
  const EVENTS = [duckEvent(ctx)];
  const active = [];
  let lastId = null;
  const btn = document.getElementById('break');

  function buffering() {
    ui.toast('The universe is buffering. Please wait.', 'warn', 2.5);
    btn.classList.remove('wobble');
    void btn.offsetWidth;
    btn.classList.add('wobble');
    audio.glitch();
  }

  function trigger(id) {
    if (active.length >= 2) return buffering();
    const free = EVENTS.filter((e) => !active.some((a) => a.def === e));
    let pool = id ? free.filter((e) => e.id === id) : free.filter((e) => e.id !== lastId);
    if (!pool.length) pool = free;
    if (!pool.length) return buffering();
    const def = pick(pool);
    lastId = def.id;
    const ev = { def, t: 0 };
    active.push(ev);
    ctx.stats.breaks++;
    ctx.stats.activeEvents = active.length;
    ui.banner(`⚠ REALITY EVENT: ${def.name}`, def.subtitle);
    def.start(ev);
  }

  btn.addEventListener('click', () => {
    if (!ctx.ready) return;
    trigger();
  });
  window.__trigger = trigger; // dev helper: __trigger('duck')

  ctx.restoreHooks.push(() => {
    for (const ev of active) ev.def.cleanup(ev, true);
    active.length = 0;
    ctx.stats.activeEvents = 0;
  });

  (ctx.readyHooks ||= []).push(() => document.getElementById('break-wrap').classList.remove('hidden'));

  return {
    trigger,
    active,
    update(dt) {
      for (let i = active.length - 1; i >= 0; i--) {
        const ev = active[i];
        ev.t += dt;
        if (ev.def.update(ev, dt)) {
          ev.def.cleanup(ev, false);
          active.splice(i, 1);
          ctx.stats.activeEvents = active.length;
        }
      }
    },
  };
}
