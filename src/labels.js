import * as THREE from 'three';

// Nomli binolar uchun masofaviy sprite-label (150m ichida)
const cache = new Map();
function textSprite(text) {
  if (cache.has(text)) return cache.get(text).clone();
  const cv = document.createElement('canvas');
  const fs = 44; // shrift
  const c = cv.getContext('2d');
  c.font = `bold ${fs}px system-ui`;
  const w = Math.ceil(c.measureText(text).width) + 30;
  cv.width = w; cv.height = 64;
  const c2 = cv.getContext('2d');
  c2.fillStyle = 'rgba(8,12,18,0.78)';
  c2.beginPath(); c2.roundRect(0, 6, w, 52, 12); c2.fill();
  c2.font = `bold ${fs}px system-ui`;
  c2.fillStyle = '#ffd75f'; c2.textBaseline = 'middle';
  c2.fillText(text, 15, 34);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sp.scale.set(w / 12, 64 / 12, 1);
  cache.set(text, sp);
  return sp.clone();
}

export class Labels {
  constructor(scene) {
    this.scene = scene; this.group = new THREE.Group();
    scene.add(this.group); this.items = [];
  }
  rebuild(named) {
    this.group.clear(); this.items = [];
    for (const n of named.slice(0, 400)) {
      const name = (n.tags.name || '').slice(0, 28);
      if (!name) continue;
      const sp = textSprite(name);
      sp.position.set(n.x, n.h + 6, n.z);
      sp.visible = false;
      this.group.add(sp);
      this.items.push({ sp, ...n });
    }
  }
  update(pos) {
    for (const it of this.items) {
      const d2 = (it.x - pos.x) ** 2 + (it.z - pos.z) ** 2;
      it.sp.visible = d2 < 150 * 150;
    }
  }
}
