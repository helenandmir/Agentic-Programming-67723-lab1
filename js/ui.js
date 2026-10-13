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

  return {
    tooltip,
    toast,
    update() {
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
