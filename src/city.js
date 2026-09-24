import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toXZ, bHeight, roadWidth, citySize } from './geo.js';
import { makeTrafficLight, setLight } from './models.js';

export function buildGround(scene) {
  const { w, h } = citySize();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(w + 600, h + 600),
    new THREE.MeshLambertMaterial({ color: 0x8e9a7d })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const city = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({ color: 0x939a88 })
  );
  city.rotation.x = -Math.PI / 2; city.position.y = 0.02; city.receiveShadow = true;
  scene.add(city);
}

// footprint polygon -> ekstruziya (ShapeGeometry + yon devorlarsiz box-approx)
function footprintMesh(ptsXZ, h, color) {
  if (ptsXZ.length < 3) return null;
  const shape = new THREE.Shape();
  shape.moveTo(ptsXZ[0][0], -ptsXZ[0][1]);
  for (let i = 1; i < ptsXZ.length; i++) shape.lineTo(ptsXZ[i][0], -ptsXZ[i][1]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function buildTile(group, tile, ctx) {
  const { buildings = [], roads = [], water = [] } = tile;
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const plain = [], named = [], edu = [], civic = [];
  const dummy = new THREE.Object3D();
  let footprints = 0;

  const catOf = (tags) => {
    const a = (tags.amenity || '').toLowerCase();
    const b = (tags.building || '').toLowerCase();
    const s = (tags.shop || '').toLowerCase();
    if (a === 'school' || a === 'kindergarten' || a === 'university' || b === 'school') return 'edu';
    if (a || s || b === 'commercial' || b === 'retail' || b === 'office' || b === 'hotel') return 'civic';
    return 'plain';
  };

  for (const b of buildings) {
    const tags = b.tags || {};
    const h = bHeight(tags);
    // 1) footprint geometriya bo'lsa — aniq ekstruziya
    const geom = b.geometry;
    if (b.type === 'way' && geom && geom.length >= 3) {
      const pts = geom.map(p => toXZ(p.lat, p.lon));
      // markazga nisbatan lokal
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const local = pts.map(([x, z]) => [x - cx, z - cz]);
      const col = tags.name ? 0xd98f5f : 0xcfc4ae;
      const m = footprintMesh(local, h, col);
      if (m) {
        m.position.set(cx, 0, cz);
        // OSM clockwise/CCW muammosi bo'lsa ham ko'rinadi
        m.material.side = THREE.DoubleSide;
        group.add(m); footprints++;
        const rec = { x: cx, z: cz, h, tags, mesh: m };
        ctx.named.push(...(tags.name ? [rec] : []));
        ctx.solids.push({ x: cx, z: cz, r: Math.max(4, Math.hypot(
          Math.max(...local.map(p => p[0])) - Math.min(...local.map(p => p[0])),
          Math.max(...local.map(p => p[1])) - Math.min(...local.map(p => p[1]))) / 2) });
        continue;
      }
    }
    // 2) markaz nuqta — 1:1 pozitsiya, standart o'lcham
    const c = b.center || (b.lat != null ? { lat: b.lat, lon: b.lon } : null);
    if (!c || c.lat == null) continue;
    const [x, z] = toXZ(c.lat, c.lon);
    const rec = { x, z, h, tags };
    if (tags.name) { named.push(rec); }
    else if (catOf(tags) === 'edu') edu.push(rec);
    else if (catOf(tags) === 'civic') civic.push(rec);
    else plain.push(rec);
    ctx.solids.push({ x, z, r: 7 });
    if (tags.name) ctx.named.push(rec);
  }
  const mkSet = (list, color) => {
    if (!list.length) return;
    const m = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color }), list.length);
    list.forEach((r, i) => {
      dummy.position.set(r.x, 0, r.z);
      dummy.scale.set(11, r.h, 11);
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    });
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  };
  mkSet(plain, 0xcfc4ae); mkSet(named, 0xd98f5f);
  mkSet(edu, 0xe0a458); mkSet(civic, 0x9fc3d8);

  const routes = [];
  const streets = [];
  // bitta tile — 3 draw call: tratuar + asfalt + chiziq
  const sideGeos = [], asfGeos = [], dashGeos = [];
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const pushStrip = (arr, pts, wd, y) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      if (len < 0.5) continue;
      const g = new THREE.PlaneGeometry(wd, len);
      tmpE.set(-Math.PI / 2, 0, -Math.atan2(dx, dz)); tmpQ.setFromEuler(tmpE);
      tmpM.compose(new THREE.Vector3((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2), tmpQ, one);
      g.applyMatrix4(tmpM); arr.push(g);
    }
  };
  for (const w of roads) {
    if (!w.geometry || w.geometry.length < 2) continue;
    const pts = w.geometry.map(p => toXZ(p.lat, p.lon));
    const wd = roadWidth(w.tags);
    const hw = (w.tags || {}).highway || '';
    pushStrip(sideGeos, pts, wd + 3, 0.04);
    pushStrip(asfGeos, pts, wd, 0.06);
    if (wd >= 7) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dx = b[0] - a[0], dz = b[1] - a[1];
        const len = Math.hypot(dx, dz);
        if (len < 6) continue;
        const n = Math.floor(len / 6);
        tmpE.set(-Math.PI / 2, 0, -Math.atan2(dx, dz)); tmpQ.setFromEuler(tmpE);
        for (let k = 0; k < n; k += 2) {
          const t0 = k / n, t1 = Math.min((k + 1) / n, 1);
          const g = new THREE.PlaneGeometry(0.25, (len / n) * 0.9);
          tmpM.compose(new THREE.Vector3(a[0] + (b[0] - a[0]) * (t0 + t1) / 2, 0.09, a[1] + (b[1] - a[1]) * (t0 + t1) / 2), tmpQ, one);
          g.applyMatrix4(tmpM); dashGeos.push(g);
        }
      }
    }
    if ((w.tags || {}).name) streets.push({ name: w.tags.name, pts });
    if (['primary', 'secondary', 'tertiary'].includes(hw) && pts.length > 3)
      routes.push(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    if (['primary', 'secondary'].includes(hw) && pts.length > 4) {
      const mi = Math.floor(pts.length / 2);
      const mid = pts[mi];
      const nxt = pts[Math.min(mi + 1, pts.length - 1)];
      const ang = Math.atan2(nxt[0] - mid[0], nxt[1] - mid[1]);
      const li = makeTrafficLight();
      li.position.set(mid[0] + wd / 2 + 1.5, 0, mid[1]);
      group.add(li); ctx.lights.push(li); setLight(li, 'green');
      // zebra — piyodalar o'tish joyi
      const zg = new THREE.Group();
      const zmat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
      for (let s = -3; s <= 3; s++) {
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.6, wd - 1), zmat);
        bar.rotation.x = -Math.PI / 2; bar.rotation.z = -ang;
        bar.position.set(mid[0] + Math.cos(ang) * s * 1.1, 0.075, mid[1] - Math.sin(ang) * s * 1.1);
        zg.add(bar);
      }
      group.add(zg);
    }
  }
  ctx.routes.push(...routes);
  ctx.streets.push(...streets);
  const addMerged = (arr, color, basic = false) => {
    if (!arr.length) return;
    const m = new THREE.Mesh(mergeGeometries(arr),
      basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }));
    m.receiveShadow = true;
    group.add(m);
  };
  addMerged(sideGeos, 0xb9b3a6);
  addMerged(asfGeos, 0x3c3f45);
  addMerged(dashGeos, 0xf2f2f2, true);

  const watGeos = [];
  for (const f of water) {
    const g = f.geometry;
    if (f.type === 'way' && g && g.length > 1) {
      pushStrip(watGeos, g.map(p => toXZ(p.lat, p.lon)), 10, 0.08);
    } else {
      const c = f.center || (g && g[0]); if (!c) continue;
      const [x, z] = toXZ(c.lat, c.lon);
      const m = new THREE.Mesh(new THREE.CircleGeometry(35, 20),
        new THREE.MeshLambertMaterial({ color: 0x3f8fbf }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z);
      group.add(m);
    }
  }
  addMerged(watGeos, 0x3f8fbf);
  const treePos = [];
  for (let i = 0; i < Math.min(routes.length * 4, 60); i++) {
    const rt = routes[i % Math.max(routes.length, 1)]; if (!rt) break;
    const p = rt[Math.floor(Math.random() * rt.length)];
    treePos.push([p.x + 9 + Math.random() * 6, p.z + 9]);
  }
  if (treePos.length) {
    const td = new THREE.Object3D();
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.2, 1.6, 6),
      new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), treePos.length);
    const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(1.2, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0x2f7d3a }), treePos.length);
    treePos.forEach(([x, z], i) => {
      td.position.set(x, 0.8, z); td.updateMatrix(); trunk.setMatrixAt(i, td.matrix);
      td.position.set(x, 2.4, z); td.updateMatrix(); crown.setMatrixAt(i, td.matrix);
    });
    crown.castShadow = true;
    group.add(trunk, crown);
  }
  // ko'cha chiroqlari (tun uchun emissiv)
  const lampHeads = [], lampPoles = [];
  const lampM4 = new THREE.Matrix4();
  for (const rt of routes.slice(0, 6)) {
    for (let i = 0; i < rt.length; i += 8) {
      const g = new THREE.SphereGeometry(0.35, 6, 6);
      lampM4.makeTranslation(rt[i].x + 6, 6.2, rt[i].z);
      g.applyMatrix4(lampM4); lampHeads.push(g);
      const pole = new THREE.CylinderGeometry(0.09, 0.09, 6.2, 5);
      lampM4.makeTranslation(rt[i].x + 6, 3.1, rt[i].z);
      pole.applyMatrix4(lampM4); lampPoles.push(pole);
      if (lampHeads.length > 25) break;
    }
    if (lampHeads.length > 25) break;
  }
  if (lampHeads.length) {
    const hm = new THREE.Mesh(mergeGeometries(lampHeads), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    const pm = new THREE.Mesh(mergeGeometries(lampPoles), new THREE.MeshLambertMaterial({ color: 0x2c2c2c }));
    pm.castShadow = true;
    group.add(hm, pm);
  }
  return { buildings: buildings.length, footprints, roads: roads.length };
}

// POI qatlam: parking zonalar + muassasa markerlari
export function buildPOI(group, poi, ctx) {
  if (!poi) return;
  const lots = poi.parking || [];
  for (const f of lots) {
    const g = f.geometry;
    const c = f.center || (g && g[0]);
    if (!c) continue;
    const [x, z] = toXZ(c.lat, c.lon);
    let w = 30, d = 18;
    if (f.type === 'way' && g && g.length > 2) {
      const pts = g.map(p => toXZ(p.lat, p.lon));
      const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
      w = Math.max(10, Math.max(...xs) - Math.min(...xs));
      d = Math.max(8, Math.max(...zs) - Math.min(...zs));
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshLambertMaterial({ color: 0x555b63 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.07, z); m.receiveShadow = true;
    group.add(m);
    // P belgisi
    ctx.named.push({ x, z, h: 3, tags: { name: '🅿 ' + (f.tags?.name || 'Parking'), amenity: 'parking' } });
  }
  const pin = (list, color) => {
    for (const e of (list || []).slice(0, 600)) {
      const c = e.center || (e.lat != null ? e : null);
      if (!c || c.lat == null) continue;
      const [x, z] = toXZ(c.lat, c.lon);
      const m = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 8),
        new THREE.MeshLambertMaterial({ color }));
      m.position.set(x, 0, z); m.castShadow = true;
      group.add(m);
      ctx.solids.push({ x, z, r: 6 });
      if (e.tags?.name) ctx.named.push({ x, z, h: 10, tags: e.tags });
    }
  };
  pin(poi.school, 0xe07b39); pin(poi.bank, 0x3a7bd5);
  pin(poi.shop, 0x9b59b6); pin(poi.food, 0xe74c3c); pin(poi.hospital, 0xecf0f1);
}
