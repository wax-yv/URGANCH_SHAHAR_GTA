import * as THREE from 'three';

// GM low-poly avtomobillar — o'xshash shakl, demo uchun litsenziyasiz model
export function makeCar(type) {
  const g = new THREE.Group();
  const { len: L, wid: Wd, h: H, color } = type;
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(Wd, H * 0.55, L), bodyMat);
  body.position.y = 0.55 + H * 0.28;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.85, H * 0.45, L * 0.5), glassMat);
  cabin.position.set(0, 0.55 + H * 0.55 + H * 0.22, -L * 0.05);
  body.castShadow = cabin.castShadow = true;
  g.add(body, cabin);
  const wg = new THREE.CylinderGeometry(0.33, 0.33, 0.25, 10);
  const wm = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  const wz = L / 2 - 0.8, wx = Wd / 2;
  [[-wx, wz], [wx, wz], [-wx, -wz], [wx, -wz]].forEach(([x, z]) => {
    const wmesh = new THREE.Mesh(wg, wm);
    wmesh.rotation.z = Math.PI / 2;
    wmesh.position.set(x, 0.33, z);
    wheels.push(wmesh); g.add(wmesh);
  });
  if (type.id === 'bus' || type.id === 'tramvay') {
    for (let i = 0; i < 5; i++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(Wd + 0.04, 0.6, 1.1),
        new THREE.MeshLambertMaterial({ color: 0xbfe3ff }));
      win.position.set(0, body.position.y + 0.4, -L / 2 + 1.2 + i * 1.8);
      g.add(win);
    }
  }
  g.userData = { type, wheels, speed: 0 };
  // stop-chiroq + fara
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0x550000 });
  const bg = new THREE.BoxGeometry(0.25, 0.18, 0.1);
  const b1 = new THREE.Mesh(bg, brakeMat); b1.position.set(-Wd / 2 + 0.3, 0.9, L / 2 + 0.01);
  const b2 = new THREE.Mesh(bg, brakeMat); b2.position.set(Wd / 2 - 0.3, 0.9, L / 2 + 0.01);
  const headMat = new THREE.MeshBasicMaterial({ color: 0x444433 });
  const hg = new THREE.BoxGeometry(0.3, 0.2, 0.1);
  const h1 = new THREE.Mesh(hg, headMat); h1.position.set(-Wd / 2 + 0.3, 0.85, -L / 2 - 0.01);
  const h2 = new THREE.Mesh(hg, headMat); h2.position.set(Wd / 2 - 0.3, 0.85, -L / 2 - 0.01);
  const beam = new THREE.SpotLight(0xfff2cc, 0, 60, 0.5, 0.4);
  beam.position.set(0, 1.2, -L / 2);
  const tgt = new THREE.Object3D(); tgt.position.set(0, 0, -L / 2 - 20);
  g.add(tgt); beam.target = tgt; g.add(beam);
  g.add(b1, b2, h1, h2);
  g.userData.lights = { brakeMat, headMat, beam, on: false };
  return g;
}

export function setBrake(car, on) {
  car.userData.lights?.brakeMat.color.set(on ? 0xff2222 : 0x550000);
}
export function toggleHead(car) {
  const L = car.userData.lights; if (!L) return;
  L.on = !L.on;
  L.beam.intensity = L.on ? 60 : 0;
  L.headMat.color.set(L.on ? 0xfff6c8 : 0x444433);
}

export function makeTrafficLight() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 8),
    new THREE.MeshLambertMaterial({ color: 0x333333 }));
  pole.position.y = 2.5; pole.castShadow = true;
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x222222 }));
  box.position.y = 5.2;
  const mk = (c, y) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshBasicMaterial({ color: c }));
    m.position.set(0, y, 0.28); return m;
  };
  const red = mk(0x550000, 5.65), yel = mk(0x554400, 5.2), grn = mk(0x005500, 4.75);
  g.add(pole, box, red, yel, grn);
  g.userData = { red, yel, grn, state: 'green', t: Math.random() * 10 };
  return g;
}

export function setLight(g, state) {
  const u = g.userData; u.state = state;
  u.red.material.color.set(state === 'red' ? 0xff2222 : 0x550000);
  u.yel.material.color.set(state === 'yellow' ? 0xffbb22 : 0x554400);
  u.grn.material.color.set(state === 'green' ? 0x22ff44 : 0x005500);
}

export function makePerson(color = 0x3a6fd8) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 3, 8), mat);
  body.position.y = 1.0; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
  head.position.y = 1.95; head.castShadow = true;
  g.add(body, head);
  return g;
}

export function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x6b4a2b }));
  trunk.position.y = 0.8;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8),
    new THREE.MeshLambertMaterial({ color: 0x2f7d3a }));
  crown.position.y = 2.4; crown.castShadow = true;
  g.add(trunk, crown);
  return g;
}
