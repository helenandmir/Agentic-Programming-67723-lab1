// Blob citizens: build + wander AI. Physics states (free / gettingUp) are driven by sim.js later.
import * as THREE from 'three';
import { PALETTE, rand, pick, rng } from './util.js';

const NAMES = ['Gary', 'Brenda', 'Kevin', 'Doug', 'Linda', 'Sir Reginald', 'Bob', 'Tiny Tim', 'Margaret', 'Steve', 'Olga', 'Phil', 'Dr. Blob', 'Karen (nice one)', 'Igor', 'Susan', 'Mo', 'Pip', 'Barnaby', 'Greta', 'Ludwig', 'Fran', 'Hank', 'Nana Joy', 'Chad'];
const QUIPS = [
  'Hello, God! Big fan.',
  'Are you… the admin?',
  'I live on a floating rock and I am FINE.',
  'Please do not drop anything on us.',
  'Do you take requests? I would like more Tuesdays.',
  'My therapist says you are not real.',
  'Is it true you can change gravity?',
];

const bodyGeo = new THREE.SphereGeometry(1, 18, 14);
const eyeGeo = new THREE.SphereGeometry(0.09, 10, 8);
const pupilGeo = new THREE.SphereGeometry(0.05, 8, 6);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const hatMats = [0x2a1f4a, 0xff6b6b, 0x2ec4b6, 0xffd166].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true }));

function makeCitizen(i) {
  const g = new THREE.Group();
  const bob = new THREE.Group(); // hop offset lives here, outer group stays at ground level
  g.add(bob);
  const color = pick(PALETTE.citizens);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.45 }));
  body.scale.set(0.33, 0.42, 0.33);
  body.position.y = 0.42;
  body.castShadow = true;
  bob.add(body);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx * 0.12, 0.58, 0.26);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(0, 0, 0.065);
    eye.add(pupil);
    bob.add(eye);
  }
  if (rng() < 0.5) {
    const m = pick(hatMats);
    const hat = rng() < 0.5
      ? new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 8), m)
      : new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.26, 10), m);
    hat.position.y = 0.92;
    hat.castShadow = true;
    if (hat.geometry.type === 'CylinderGeometry') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 12), m);
      brim.position.y = -0.12;
      hat.add(brim);
    }
    bob.add(hat);
  }
  g.userData = {
    kind: 'citizen',
    name: `${NAMES[i % NAMES.length]} (Citizen #${i + 1})`,
    quips: QUIPS,
    baseScale: rand(0.9, 1.1),
    height: 1.1,
    bob,
    ai: { target: new THREE.Vector3(), speed: rand(0.8, 1.4), idle: rand(0, 2), phase: rand(0, 6.28), jump: -1, panic: 0, fleeFrom: null },
  };
  return g;
}

export function createCitizens(ctx) {
  const { world } = ctx;
  const list = [];
  const avoid = [...world.houses.map((h) => h.position), new THREE.Vector3(0, 0, 0)];

  function pickTarget(ai, around) {
    for (let k = 0; k < 20; k++) {
      const a = rand(0, Math.PI * 2), r = rand(2, 8.5);
      ai.target.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      if (around && ai.target.distanceTo(around) > 5) continue;
      if (avoid.every((p) => p.distanceTo(ai.target) > (p.lengthSq() === 0 ? 2 : 1.1)) && ai.target.distanceTo(world.pondPos) > 1.8) return;
    }
  }

  for (let i = 0; i < 25; i++) {
    const c = makeCitizen(i);
    pickTarget(c.userData.ai);
    c.position.copy(c.userData.ai.target);
    pickTarget(c.userData.ai);
    world.root.add(c);
    world.entities.push(c);
    list.push(c);
  }

  const tmp = new THREE.Vector3();

  return {
    list,
    jump(c) {
      c.userData.ai.jump = 0;
    },
    // Run away from a point for a few seconds (used by events).
    fleeFrom(point, radius, seconds) {
      for (const c of list) {
        if (c.position.distanceTo(point) < radius) {
          c.userData.ai.panic = seconds;
          tmp.subVectors(c.position, point).setY(0).normalize().multiplyScalar(radius + 1);
          c.userData.ai.target.copy(point).add(tmp).clampLength(0, 9);
          c.userData.ai.idle = 0;
        }
      }
    },
    update(dt, t) {
      for (const c of list) {
        const ud = c.userData;
        const ai = ud.ai;
        const state = ud.body?.state ?? 'home';
        let hop = 0;
        if (state === 'home' || state === 'settled') {
          if (ai.panic > 0) ai.panic -= dt;
          const speed = ai.speed * (ai.panic > 0 ? 2.6 : 1);
          if (ai.idle > 0) {
            ai.idle -= dt;
          } else {
            tmp.subVectors(ai.target, c.position).setY(0);
            const dist = tmp.length();
            if (dist < 0.15) {
              ai.idle = ai.panic > 0 ? 0 : rand(1, 3);
              pickTarget(ai, ai.panic > 0 ? c.position : null);
            } else {
              tmp.multiplyScalar(Math.min(1, (speed * dt) / dist));
              c.position.add(tmp);
              const want = Math.atan2(tmp.x, tmp.z);
              let diff = want - c.rotation.y;
              diff = Math.atan2(Math.sin(diff), Math.cos(diff));
              c.rotation.y += diff * Math.min(1, dt * 8);
              hop = Math.abs(Math.sin(t * (ai.panic > 0 ? 18 : 10) + ai.phase)) * 0.08;
            }
          }
        }
        if (ai.jump >= 0) {
          ai.jump += dt;
          const p = ai.jump / 0.55;
          if (p >= 1) ai.jump = -1;
          else hop += 4 * 0.7 * p * (1 - p);
        }
        ud.bob.position.y = hop;
      }
    },
  };
}
