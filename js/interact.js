// Raycast clicks on the world: squash-and-stretch + a quip in a speech bubble.
import * as THREE from 'three';
import { pickFresh } from './util.js';

export function createInteract(ctx) {
  const { renderer, camera, world, ui } = ctx;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const down = { x: 0, y: 0 };
  let lastQuip = null;
  let hoverFrame = 0;
  let pointer = null;

  function entityAt(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(world.entities, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.kind) o = o.parent;
      if (o && o.visible) return { obj: o, point: h.point };
    }
    return null;
  }

  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { down.x = e.clientX; down.y = e.clientY; });
  el.addEventListener('pointerup', (e) => {
    if (!ctx.ready) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; // it was a drag
    const hit = entityAt(e.clientX, e.clientY);
    if (!hit) return;
    const { obj } = hit;
    const ud = obj.userData;
    ud.squash = 0;
    if (ud.kind === 'citizen') ctx.citizens.jump(obj);
    const quip = ud.onClick?.(obj) ?? pickFresh(ud.quips, lastQuip);
    lastQuip = quip;
    ui.tooltip(obj, ud.name, quip);
    ctx.audio?.boing?.();
    ctx.onEntityClick?.(obj, hit.point);
  });
  el.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pointer = e; });
  el.addEventListener('pointerleave', () => { pointer = null; document.body.classList.remove('hovering'); });

  return {
    update() {
      if (!pointer || !ctx.ready || ++hoverFrame % 4) return;
      document.body.classList.toggle('hovering', !!entityAt(pointer.clientX, pointer.clientY));
    },
  };
}
