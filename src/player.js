import * as THREE from 'three';
import { CAR_TYPES } from './config.js';
import { makeCar } from './models.js';

// O'yinchi: piyoda (WASD+sichqoncha) + mashina (arcade) + E o'tirish/tushish
export class Player {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.mode = 'walk';
    this.pos = new THREE.Vector3(0, 1.7, 40);
    this.yaw = 0;
    this.car = null;
    this.speed = 0;
    this.keys = {};
    this.parked = [];
    addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; });
    addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    addEventListener('mousedown', e => { if (this.mode === 'walk' && e.button === 0) this.tryEnter(); });
    addEventListener('mousemove', e => {
      if (document.pointerLockElement) this.yaw -= e.movementX * 0.0025;
    });
    renderer_dom_lock(camera);
  }
  spawnCars(scene, spots) {
    this.cars = [];
    const defs = CAR_TYPES;
    spots.slice(0, 40).forEach((p, i) => {
      const t = defs[i % defs.length];
      const c = makeCar(t);
      c.position.set(p.x, 0, p.z);
      c.rotation.y = (i % 4) * Math.PI / 2;
      scene.add(c); this.cars.push(c);
    });
  }
  tryEnter() {
    if (this.mode === 'drive') return;
    let best = null, bd = 4;
    for (const c of this.cars) {
      const d = c.position.distanceTo(new THREE.Vector3(this.pos.x, 0, this.pos.z));
      if (d < bd) { bd = d; best = c; }
    }
    if (best) { this.mode = 'drive'; this.car = best; }
  }
  update(dt) {
    const k = this.keys;
    if (k['e']) { k['e'] = false; this.mode === 'walk' ? this.tryEnter() : this.exitCar(); }
    if (k['p'] && this.mode === 'drive') { k['p'] = false; this.parkCar(); }
    // rejim almashtirish: 1-piyoda 2-mashina yaqiniga teleport emas
    if (this.mode === 'walk') {
      const sp = 7 * dt;
      const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const r = new THREE.Vector3(-f.z, 0, f.x);
      if (k['w']) this.pos.addScaledVector(f, sp);
      if (k['s']) this.pos.addScaledVector(f, -sp);
      if (k['a']) this.pos.addScaledVector(r, -sp);
      if (k['d']) this.pos.addScaledVector(r, sp);
      this.camera.position.copy(this.pos);
      this.camera.rotation.set(0, this.yaw, 0, 'YXZ');
    } else if (this.car) {
      const u = this.car.userData;
      const maxV = u.type.maxV;
      if (k['w']) this.speed = Math.min(this.speed + 18 * dt, maxV);
      else if (k['s']) this.speed = Math.max(this.speed - 22 * dt, -8);
      else this.speed *= (1 - 1.6 * dt);
      if (k['a']) this.car.rotation.y += (1.6 * dt) * Math.sign(this.speed || 1);
      if (k['d']) this.car.rotation.y -= (1.6 * dt) * Math.sign(this.speed || 1);
      const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(this.car.quaternion);
      this.car.position.addScaledVector(fw, -this.speed * dt * -1);
      // minimal fizika: g'ildirak aylanishi
      u.wheels.forEach(w => w.rotation.x += this.speed * dt * 2);
      const cp = this.car.position.clone();
      this.camera.position.set(cp.x - Math.sin(this.car.rotation.y) * -10, 4.5, cp.z - Math.cos(this.car.rotation.y) * -10);
      this.camera.lookAt(cp.x, 1.5, cp.z);
      this.pos.set(cp.x, 1.7, cp.z);
    }
  }
  exitCar() {
    if (!this.car) return;
    const p = this.car.position.clone();
    p.x += 2.5; this.pos.set(p.x, 1.7, p.z);
    this.car = null; this.mode = 'walk'; this.speed = 0;
  }
  parkCar() {
    if (!this.car) return;
    this.parked.push(this.car.position.clone());
    this.exitCar();
  }
}
function renderer_dom_lock(camera) {
  addEventListener('click', () => {
    const c = document.querySelector('canvas');
    if (c && document.pointerLockElement !== c && camera) {
      // faqat walk rejimda lock — xatolik chiqmasligi uchun try
      try { c.requestPointerLock(); } catch { /* ignore */ }
    }
  });
}
