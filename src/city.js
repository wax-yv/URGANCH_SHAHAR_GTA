import * as THREE from 'three';
import { toXZ, bHeight, roadWidth, citySize } from './geo.js';
import { makeTrafficLight, makeTree, setLight } from './models.js';

export function buildGround(scene) {
  const { w, h } = citySize();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(w + 400, h + 400),
    new THREE.MeshLambertMaterial({ color: 0x9aa08a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // asfalt asos markaziy
  const city = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({ color: 0x8f9587 })
  );
  city.rotation.x = -Math.PI / 2; city.position.y = 0.02; city.receiveShadow = true;
  scene.add(city);
}

function ribbon(points, width, color, y = 0.06) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.5) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, len), mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(dx, dz);
    m.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

export function buildTile(group, tile, ctx) {
  const { buildings = [], roads = [], water = [] } = tile;
  // --- binolar (InstancedMesh: oddiy + nomli alohida rang) ---
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const plain = [], named = [];
  const nameInfo = [];
  for (const b of buildings) {
    const c = b.center || (b.lat != null ? { lat: b.lat, lon: b.lon } : null);
    if (!c || c.lat == null) continue;
    const [x, z] = toXZ(c.lat, c.lon);
    const h = bHeight(b.tags);
    const rec = { x, z, h, tags: b.tags || {} };
    if (rec.tags.name) { named.push(rec); nameInfo.push(rec); }
    else plain.push(rec);
  }
  const dummy = new THREE.Object3D();
  const mkSet = (list, color) => {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color }), list.length);
    list.forEach((r, i) => {
      dummy.position.set(r.x, 0, r.z);
      dummy.scale.set(11, r.h, 11);
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    });
    m.castShadow = m.receiveShadow = true;
    group.add(m); return m;
  };
  mkSet(plain, 0xcfc4ae); mkSet(named, 0xd98f5f);
  ctx.named.push(...nameInfo);

  // --- yo'llar + tratuar ---
  const routes = [];
  for (const w of roads) {
    if (!w.geometry || w.geometry.length < 2) continue;
    const pts = w.geometry.map(p => toXZ(p.lat, p.lon));
    const wd = roadWidth(w.tags);
    group.add(ribbon(pts, wd, 0x3c3f45, 0.06));
    group.add(ribbon(pts, wd + 3, 0xb9b3a6, 0.04)); // tratuar asosi
    const hw = (w.tags || {}).highway || '';
    if (['primary', 'secondary', 'tertiary'].includes(hw) && pts.length > 3) {
      routes.push(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    }
    // svetofor har uzun yo'l o'rtasiga
    if (['primary', 'secondary'].includes(hw) && pts.length > 4) {
      const mid = pts[Math.floor(pts.length / 2)];
      const li = makeTrafficLight();
      li.position.set(mid[0] + wd / 2 + 1, 0, mid[1]);
      group.add(li); ctx.lights.push(li); setLight(li, 'green');
    }
  }
  ctx.routes.push(...routes);

  // --- suv (kanal/ko'l) ---
  for (const f of water) {
    const g = f.geometry || (f.center ? [f.center] : null);
    if (!g) continue;
    if (f.type === 'way' && g.length > 1) {
      const pts = g.map(p => toXZ(p.lat, p.lon));
      group.add(ribbon(pts, 10, 0x3f8fbf, 0.08));
    } else {
      const c = f.center || g[0]; if (!c) continue;
      const [x, z] = toXZ(c.lat, c.lon);
      const m = new THREE.Mesh(new THREE.CircleGeometry(35, 20),
        new THREE.MeshLambertMaterial({ color: 0x3f8fbf }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z);
      group.add(m);
    }
  }

  // --- daraxtlar (yo'l bo'yi, siyrak) ---
  for (let i = 0; i < Math.min(routes.length * 4, 60); i++) {
    const rt = routes[i % Math.max(routes.length, 1)]; if (!rt) break;
    const p = rt[Math.floor(Math.random() * rt.length)];
    const t = makeTree();
    t.position.set(p.x + 8 + Math.random() * 6, 0, p.z + 8);
    group.add(t);
  }
  return { buildings: buildings.length, roads: roads.length };
}
