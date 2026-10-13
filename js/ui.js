// DOM UI: speech-bubble tooltip and toast notifications.
import * as THREE from 'three';

export function createUI(ctx) {
  const $ = (id) => document.getElementById(id);
  const tipEl = $('tooltip');
  const toastsEl = $('toasts');
  const tip = { obj: null, until: 0 };
  const v = new THREE.Vector3();

  function tooltip(obj, name, text, seconds = 2.6) {
    tipEl.innerHTML = '';
    const n = document.createElement('span');
    n.className = 'tt-name';
    n.textContent = name;
    tipEl.append(n, document.createTextNode(text));
    tipEl.classList.remove('hidden', 'pop');
    void tipEl.offsetWidth; // restart the pop animation
    tipEl.classList.add('pop');
    tip.obj = obj;
    tip.until = performance.now() + seconds * 1000;
    position();
  }

  function position() {
    if (!tip.obj) return;
    tip.obj.getWorldPosition(v);
    v.y += (tip.obj.userData.height ?? 1.5) * tip.obj.scale.y + 0.2;
    v.project(ctx.camera);
    if (v.z > 1) { tipEl.style.opacity = '0'; return; }
    tipEl.style.opacity = '1';
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    tipEl.style.left = `${Math.min(window.innerWidth - 130, Math.max(130, x))}px`;
    tipEl.style.top = `${Math.max(70, y)}px`;
  }

  function toast(text, kind = 'info', seconds = 4) {
    const el = document.createElement('div');
    el.className = `toast glass ${kind}`;
    el.textContent = text;
    toastsEl.append(el);
    while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 400);
    }, seconds * 1000);
  }

  // ---------- REALITY SETTINGS panel ----------
  const ZONES = {
    gravity: [
      { max: -0.3, label: 'Upside-down', lines: ['Gravity is now optional. Citizens have filed a complaint.', 'Down is the new up. Please update your maps.', 'Houses are now technically aircraft.'] },
      { max: 0.3, label: 'Space Mode', lines: ['Welcome to space. Please hold onto your houses.', 'Zero gravity achieved. Nobody trained for this.', 'Citizens report feeling "existentially floaty".'] },
      { max: 0.88, label: 'Floaty', lines: ['Citizens report feeling floaty. Productivity down 80%.', 'Moon-mode activated. Everyone is jumping for no reason.', 'Light gravity. Hats are now considered projectiles.'] },
      { max: 1.12, label: 'Earth (boring)', lines: ['Gravity restored to factory settings. Boring, but legal.', 'Gravity is back to normal. The citizens are suspicious.', 'Standard gravity. Physicists breathe a sigh of relief.'] },
      { max: 2.0, label: 'Heavy Day', lines: ['Everyone suddenly gained 40 kg.', 'Heavy gravity. Citizens are reconsidering stairs.', 'Things feel heavier. So does the mood.'] },
      { max: 99, label: 'Jupiter-ish', lines: ['Jupiter mode. Spines are being compressed.', 'Gravity at 3×. The town is now a pancake.', 'Even the clouds are struggling.'] },
    ],
    bounce: [
      { max: 0.2, label: 'Clay', lines: ['Everything is now clay. Nothing bounces. Nothing is fun.'] },
      { max: 0.6, label: 'Normal', lines: ['Bounciness: normal. Mostly.'] },
      { max: 1.0, label: 'Rubber', lines: ['Everything is rubber now. Ground included.', 'Boing levels elevated.'] },
      { max: 99, label: 'Flubber (illegal)', lines: ['Flubber levels exceed legal limits.', 'Bounces now GAIN energy. Thermodynamics has left the chat.'] },
    ],
  };
  const zoneOf = (name, v) => ZONES[name].findIndex((z) => v <= z.max);

  const inputs = { gravity: $('gravity'), bounce: $('bounce') };
  const valEls = { gravity: $('gravity-val'), bounce: $('bounce-val') };
  const tweens = {};
  const lastZone = { gravity: zoneOf('gravity', 1), bounce: zoneOf('bounce', 0.4) };
  const debounce = {};
  const lastLine = {};

  function render(name) {
    const el = inputs[name];
    if (!el) return;
    const v = ctx.params[name];
    el.value = v;
    const min = +el.min, max = +el.max;
    el.style.setProperty('--fill', `${((v - min) / (max - min)) * 100}%`);
    const z = ZONES[name]?.[zoneOf(name, v)];
    el.classList.toggle('wild', !!z && z.label !== 'Earth (boring)' && z.label !== 'Normal');
    valEls[name].innerHTML = `<b>${v.toFixed(2)}</b>${z ? ' · ' + z.label : ''}`;
  }

  function comment(name) {
    const zi = zoneOf(name, ctx.params[name]);
    if (zi === lastZone[name]) return;
    lastZone[name] = zi;
    const lines = ZONES[name][zi].lines;
    let line;
    do { line = lines[Math.floor(Math.random() * lines.length)]; } while (lines.length > 1 && line === lastLine[name]);
    lastLine[name] = line;
    toast(line, name === 'gravity' && zi !== 3 ? 'warn' : 'info');
  }

  // Set a reality parameter and keep its slider in sync. animate: glide over ~0.6 s.
  function setParam(name, value, { animate = false, silent = true } = {}) {
    if (animate) {
      tweens[name] = { from: ctx.params[name], to: value, t: 0, dur: 0.6 };
    } else {
      delete tweens[name];
      ctx.params[name] = value;
      render(name);
    }
    if (silent) lastZone[name] = zoneOf(name, value);
  }

  for (const [name, el] of Object.entries(inputs)) {
    el.addEventListener('input', () => {
      delete tweens[name];
      ctx.params[name] = parseFloat(el.value);
      render(name);
      clearTimeout(debounce[name]);
      debounce[name] = setTimeout(() => comment(name), 600);
    });
    render(name);
  }

  const panel = $('panel');
  $('panel-toggle').addEventListener('click', () => {
    const c = panel.classList.toggle('collapsed');
    $('panel-toggle').setAttribute('aria-expanded', String(!c));
  });
  $('restore').addEventListener('click', () => {
    ctx.sim.restore();
    toast(Math.random() < 0.5 ? 'Reality restored. Nobody saw anything.' : 'Reality restored. Please act natural.', 'info');
  });

  const stabEl = $('stability');
  let shownStab = -1;

  (ctx.readyHooks ||= []).push(() => {
    panel.classList.remove('hidden');
    if (window.innerWidth <= 700) panel.classList.add('collapsed');
  });

  return {
    tooltip,
    toast,
    setParam,
    update(dt) {
      for (const [name, tw] of Object.entries(tweens)) {
        tw.t += dt;
        const p = Math.min(1, tw.t / tw.dur);
        ctx.params[name] = tw.from + (tw.to - tw.from) * (1 - Math.pow(1 - p, 3));
        render(name);
        if (p >= 1) delete tweens[name];
      }
      if (ctx.stability !== undefined && ctx.stability !== shownStab) {
        shownStab = ctx.stability;
        stabEl.textContent = `${shownStab}%`;
        stabEl.className = shownStab > 75 ? 'ok' : shownStab > 40 ? 'meh' : 'bad';
      }
      if (!tip.obj) return;
      if (performance.now() > tip.until) {
        tip.obj = null;
        tipEl.classList.add('hidden');
        return;
      }
      position();
    },
  };
}
