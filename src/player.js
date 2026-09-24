import * as THREE from 'three';
import { CAR_TYPES } from './config.js';
import { makeCar, setBrake, toggleHead } from './models.js';

export class Player {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.mode = 'walk';
    this.pos = new THREE.Vector3(0, 1.7, 40);
    this.yaw = 0;
    this.car = null;
    this.speed = 0;
    this.keys = {};
    this.touch = { f: 0, s: 0 }; // joystick: f oldinga, s yonga
    this.parked = [];
    addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; });
    addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    addEventListener('mousedown', e => { if (this.mode === 'walk' && e.button === 0) this.tryEnter(); });
    addEventListener('mousemove', e => {
      if (document.pointerLockElement) this.yaw -= e.movementX * 0.0025;
    });
    this.initTouch();
    this.audio = null;
    addEventListener('click', () => {
      const c = document.querySelector('canvas');
      if (c && document.pointerLockElement !== c) { try { c.requestPointerLock(); } catch { /* ignore */ } }
    });
  }
  initTouch() {
    const joy = document.createElement('div');
    joy.id = 'joy';
    joy.innerHTML = '<div id="stick"></div>';
    const btn = document.createElement('div');
    btn.id = 'tbtn';
    btn.innerHTML = '<button id="bE">E</button><button id="bP">P</button>';
    document.body.append(joy, btn);
    const stick = joy.querySelector('#stick');
    let tid = null, cx = 0, cy = 0;
    const R = 45;
    joy.addEventListener('touchstart', e => {
      const t = e.changedTouches[0]; tid = t.identifier;
      const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    }, { passive: true });
    joy.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier !== tid) continue;
        let dx = t.clientX - cx, dy = t.clientY - cy;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(d, R) / d;
        dx *= k; dy *= k;
        stick.style.transform = `translate(${dx}px,${dy}px)`;
        this.touch = { f: -dy / R, s: dx / R };
      }
    }, { passive: true });
    const end = () => { tid = null; stick.style.transform = ''; this.touch = { f: 0, s: 0 }; };
    joy.addEventListener('touchend', end); joy.addEventListener('touchcancel', end);
    document.getElementById('bE').addEventListener('touchstart', e => {
      e.preventDefault();
      this.mode === 'walk' ? this.tryEnter() : this.exitCar();
    });
    document.getElementById('bP').addEventListener('touchstart', e => { e.preventDefault(); this.parkCar(); });
    const st = document.createElement('style');
    st.textContent = `#joy{position:fixed;left:16px;bottom:70px;width:110px;height:110px;border-radius:50%;
background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35);z-index:11;touch-action:none}
#stick{width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.5);margin:31px}
#tbtn{position:fixed;right:16px;bottom:70px;z-index:11;display:flex;gap:10px}
#tbtn button{width:56px;height:56px;border-radius:50%;font-size:20px;font-weight:700;border:none;
background:rgba(255,215,95,.85);touch-action:none}
@media(pointer:fine){#joy,#tbtn{display:none}}`;
    document.head.appendChild(st);
  }
  engineSound() {
    if (this.audio) return;
    try {
      const AC = new (window.AudioContext || window.webkitAudioContext)();
      const osc = AC.createOscillator(), gain = AC.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = 60;
      gain.gain.value = 0.0;
      osc.connect(gain).connect(AC.destination);
      osc.start();
      this.audio = { AC, osc, gain };
    } catch { /* audio yo'q */ }
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
    if (best) { this.mode = 'drive'; this.car = best; this.engineSound(); }
  }
  update(dt) {
    const k = this.keys, t = this.touch;
    if (k['e']) { k['e'] = false; this.mode === 'walk' ? this.tryEnter() : this.exitCar(); }
    if (k['p'] && this.mode === 'drive') { k['p'] = false; this.parkCar(); }
    if (k['l'] && this.mode === 'drive' && this.car) { k['l'] = false; toggleHead(this.car); }
    if (this.mode === 'walk') {
      if (k['arrowleft']) this.yaw += 2.2 * dt;
      if (k['arrowright']) this.yaw -= 2.2 * dt;
      const sp = 7 * dt;
      const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const r = new THREE.Vector3(-f.z, 0, f.x);
      const fw = (k['w'] ? 1 : 0) - (k['s'] ? 1 : 0) + t.f;
      const st = (k['d'] ? 1 : 0) - (k['a'] ? 1 : 0) + t.s;
      this.pos.addScaledVector(f, fw * sp).addScaledVector(r, st * sp);
      this.camera.position.copy(this.pos);
      this.camera.rotation.set(0, this.yaw, 0, 'YXZ');
    } else if (this.car) {
      const u = this.car.userData;
      const maxV = u.type.maxV;
      const gas = (k['w'] ? 1 : 0) + Math.max(0, t.f);
      const brk = (k['s'] ? 1 : 0) + Math.max(0, -t.f);
      if (gas) this.speed = Math.min(this.speed + 18 * dt * gas, maxV);
      else if (brk) this.speed = Math.max(this.speed - 22 * dt * brk, -8);
      else this.speed *= (1 - 1.6 * dt);
      if (k[' ']) this.speed *= (1 - 4 * dt); // ruchnoy tormoz
      setBrake(this.car, !!brk || !!k[' ']);
      const steer = ((k['a'] ? 1 : 0) - (k['d'] ? 1 : 0)) - t.s;
      this.car.rotation.y += steer * 1.6 * dt * Math.sign(this.speed || 1);
      const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(this.car.quaternion);
      this.car.position.addScaledVector(fw, this.speed * dt);
      u.wheels.forEach(w => w.rotation.x += this.speed * dt * 2);
      if (this.audio) {
        this.audio.osc.frequency.value = 55 + Math.abs(this.speed) * 4;
        this.audio.gain.gain.value = 0.03;
      }
      const cp = this.car.position;
      const back = k['c'] ? 1 : -1; // C — orqaga qarash
      this.camera.position.set(cp.x - Math.sin(this.car.rotation.y) * 10 * back, Math.max(4.5, cp.y + 4.5), cp.z - Math.cos(this.car.rotation.y) * 10 * back);
      this.camera.lookAt(cp.x, 1.5, cp.z);
      this.pos.set(cp.x, 1.7, cp.z);
    }
    this.pos.x = Math.max(-4000, Math.min(4000, this.pos.x));
    this.pos.z = Math.max(-4000, Math.min(4000, this.pos.z));
    if (this.camera.position.y < 1.2) this.camera.position.y = 1.2;
  }
  exitCar() {
    if (!this.car) return;
    this.pos.set(this.car.position.x + 2.5, 1.7, this.car.position.z);
    setBrake(this.car, false);
    if (this.audio) this.audio.gain.gain.value = 0;
    this.car = null; this.mode = 'walk'; this.speed = 0;
  }
  parkCar() {
    if (this.mode !== 'drive' || !this.car) return;
    this.parked.push(this.car.position.clone());
    this.exitCar();
  }
}
