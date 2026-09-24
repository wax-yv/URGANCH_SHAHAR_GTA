import * as THREE from 'three';
import { CAR_TYPES } from './config.js';
import { makeCar, makePerson, setLight } from './models.js';

// Bot-trafik + NPC + svetofor sikli
export class Sim {
  constructor(scene, ctx) {
    this.scene = scene; this.ctx = ctx;
    this.bots = []; this.npcs = [];
    this.lightT = 0;
    this.spawnBots();
    this.spawnNpcs();
  }
  spawnBots() {
    const routes = this.ctx.routes.filter(r => r.length > 5).slice(0, 12);
    if (!routes.length) return;
    for (let i = 0; i < 15; i++) {
      const t = CAR_TYPES[i % 7]; // bus/tramvay botsiz
      const c = makeCar(t);
      const rt = routes[i % routes.length];
      const idx = Math.floor(Math.random() * rt.length);
      c.position.copy(rt[idx]); c.position.y = 0;
      this.scene.add(c);
      this.bots.push({ mesh: c, route: rt, i: idx, v: 6 + Math.random() * 5, dir: 1 });
    }
  }
  spawnNpcs() {
    const cols = [0x3a6fd8, 0xd83a6f, 0x3ad86f, 0xd8a53a, 0x7a3ad8];
    for (let i = 0; i < 40; i++) {
      const p = makePerson(cols[i % cols.length]);
      p.position.set((Math.random() - 0.5) * 1200, 0, (Math.random() - 0.5) * 1200);
      p.userData = { a: Math.random() * Math.PI * 2, t: Math.random() * 5 };
      this.scene.add(p); this.npcs.push(p);
    }
  }
  update(dt) {
    // svetofor: 8s yashil, 2s sariq, 8s qizil
    this.lightT += dt;
    const ph = this.lightT % 18;
    const st = ph < 8 ? 'green' : ph < 10 ? 'yellow' : 'red';
    if (this._st !== st) {
      this._st = st;
      this.ctx.lights.forEach((l, i) => setLight(l, i % 2 ? (st === 'green' ? 'red' : st === 'red' ? 'green' : 'yellow') : st));
    }
    const redAll = this._st === 'red';
    for (const b of this.bots) {
      if (redAll && Math.random() < 0.02) continue; // qizilda sekinlashuv effekti
      b.i = (b.i + 1) % b.route.length;
      const p = b.route[b.i];
      const prev = b.mesh.position;
      b.mesh.position.set(p.x, 0, p.z);
      const dx = p.x - prev.x, dz = p.z - prev.z;
      if (dx * dx + dz * dz > 0.01) b.mesh.rotation.y = Math.atan2(-dx, -dz);
    }
    for (const n of this.npcs) {
      const u = n.userData; u.t -= dt;
      if (u.t <= 0) { u.t = 3 + Math.random() * 4; u.a = Math.random() * Math.PI * 2; }
      n.position.x += Math.sin(u.a) * 1.4 * dt;
      n.position.z += Math.cos(u.a) * 1.4 * dt;
      n.rotation.y = u.a;
    }
  }
}
