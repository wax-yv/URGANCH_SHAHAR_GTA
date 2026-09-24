import * as THREE from 'three';
import { CAR_TYPES } from './config.js';
import { makeCar, makePerson, setLight } from './models.js';

export class Sim {
  constructor(scene, ctx, player = null) {
    this.scene = scene; this.ctx = ctx; this.player = player;
    this.bots = []; this.npcs = [];
    this.lightT = 0; this._st = 'green';
    this.spawnBots();
    this.spawnNpcs();
  }
  spawnBots() {
    const routes = this.ctx.routes.filter(r => r.length > 5).slice(0, 12);
    if (!routes.length) return;
    for (let i = 0; i < 15; i++) {
      const t = CAR_TYPES[i % 7];
      const c = makeCar(t);
      const rt = routes[i % routes.length];
      const idx = Math.floor(Math.random() * rt.length);
      c.position.copy(rt[idx]); c.position.y = 0;
      this.scene.add(c);
      this.bots.push({ mesh: c, route: rt, i: idx, v: 7 + Math.random() * 4, wait: 0 });
    }
  }
  spawnNpcs() {
    const cols = [0x3a6fd8, 0xd83a6f, 0x3ad86f, 0xd8a53a, 0x7a3ad8];
    const routes = this.ctx.routes.filter(r => r.length > 3);
    for (let i = 0; i < 40; i++) {
      const p = makePerson(cols[i % cols.length]);
      if (routes.length) {
        const rt = routes[i % routes.length];
        const pt = rt[Math.floor(Math.random() * rt.length)];
        p.position.set(pt.x + 4 + Math.random() * 3, 0, pt.z + 4); // tratuarda
      } else {
        p.position.set((Math.random() - 0.5) * 1400, 0, (Math.random() - 0.5) * 1400);
      }
      p.userData = { a: Math.random() * Math.PI * 2, t: Math.random() * 5 };
      this.scene.add(p); this.npcs.push(p);
    }
  }
  nearRedLight(pos) {
    for (const l of this.ctx.lights) {
      if (l.userData.state !== 'red') continue;
      const dx = pos.x - l.position.x, dz = pos.z - l.position.z;
      if (dx * dx + dz * dz < 18 * 18) return true;
    }
    return false;
  }
  update(dt) {
    this.lightT += dt;
    const ph = this.lightT % 18;
    const st = ph < 8 ? 'green' : ph < 10 ? 'yellow' : 'red';
    if (this._st !== st) {
      this._st = st;
      this.ctx.lights.forEach((l, i) => setLight(l,
        i % 2 ? (st === 'green' ? 'red' : st === 'red' ? 'green' : 'yellow') : st));
    }
    for (const b of this.bots) {
      if (b.wait > 0) { b.wait -= dt; continue; }
      const next = b.route[(b.i + 1) % b.route.length];
      if ((this._st === 'red' || this._st === 'yellow') && this.nearRedLight(next)) {
        b.wait = 0.4; continue; // svetoforda to'xtash
      }
      // o'yinchi mashinasi oldinda bo'lsa — to'xtash
      if (this.player?.car) {
        const pp = this.player.car.position;
        const dx = pp.x - b.mesh.position.x, dz = pp.z - b.mesh.position.z;
        if (dx * dx + dz * dz < 8 * 8) { b.wait = 0.5; continue; }
      }
      b.i = (b.i + 1) % b.route.length;
      const p = b.route[b.i];
      const prev = b.mesh.position;
      const dx = p.x - prev.x, dz = p.z - prev.z;
      b.mesh.position.set(p.x, 0, p.z);
      if (dx * dx + dz * dz > 0.01) b.mesh.rotation.y = Math.atan2(-dx, -dz);
    }
    for (const n of this.npcs) {
      const u = n.userData; u.t -= dt;
      if (u.t <= 0) { u.t = 3 + Math.random() * 4; u.a = Math.random() * Math.PI * 2; }
      // mashina yaqinlashsa — qochish
      const pc = this.player?.car;
      if (pc && Math.abs(this.player.speed) > 6) {
        const dx = n.position.x - pc.position.x, dz = n.position.z - pc.position.z;
        if (dx * dx + dz * dz < 7 * 7) { u.a = Math.atan2(dx, dz); u.t = 1.2; }
      }
      n.position.x += Math.sin(u.a) * 1.4 * dt;
      n.position.z += Math.cos(u.a) * 1.4 * dt;
      n.rotation.y = u.a;
    }
  }
}
