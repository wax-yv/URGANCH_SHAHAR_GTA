import * as THREE from 'three';
import { toXZ, bHeight, roadWidth, citySize } from './geo.js';
import { makeTrafficLight, makeTree, setLight } from './models.js';

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

function strip(points, width, color, y) {
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

// markaziy uzuq chiziq (polosa)
function dashes(points, y = 0.09) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 6) continue;
    const n = Math.floor(len / 6);
    for (let k = 0; k < n; k += 2) {
      const t0 = k / n, t1 = Math.min((k + 1) / n, 1);
      const mx = (a[0] + (b[0] - a[0]) * (t0 + t1) / 2);
      const mz = (a[1] + (b[1] - a[1]) * (t0 + t1) / 2);
      const seg = len / n;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.25, seg * 0.9), mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -Math.atan2(dx, dz);
      m.position.set(mx, y, mz);
      g.add(m);
    }
  }
  return g;
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
  const plain = [], named = [];
  const dummy = new THREE.Object3D();
  let footprints = 0;

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
    (tags.name ? named : plain).push(rec);
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

  const routes = [];
  const streets = [];
  for (const w of roads) {
    if (!w.geometry || w.geometry.length < 2) continue;
    const pts = w.geometry.map(p => toXZ(p.lat, p.lon));
    const wd = roadWidth(w.tags);
    const hw = (w.tags || {}).highway || '';
    group.add(strip(pts, wd + 3, 0xb9b3a6, 0.04)); // tratuar
    group.add(strip(pts, wd, 0x3c3f45, 0.06));      // asfalt
    if (wd >= 7) group.add(dashes(pts));            // polosa chizig'i
    if ((w.tags || {}).name) streets.push({ name: w.tags.name, pts });
    if (['primary', 'secondary', 'tertiary'].includes(hw) && pts.length > 3)
      routes.push(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    if (['primary', 'secondary'].includes(hw) && pts.length > 4) {
      const mid = pts[Math.floor(pts.length / 2)];
      const li = makeTrafficLight();
      li.position.set(mid[0] + wd / 2 + 1.5, 0, mid[1]);
      group.add(li); ctx.lights.push(li); setLight(li, 'green');
    }
  }
  ctx.routes.push(...routes);
  ctx.streets.push(...streets);

  for (const f of water) {
    const g = f.geometry;
    if (f.type === 'way' && g && g.length > 1) {
      group.add(strip(g.map(p => toXZ(p.lat, p.lon)), 10, 0x3f8fbf, 0.08));
    } else {
      const c = f.center || (g && g[0]); if (!c) continue;
      const [x, z] = toXZ(c.lat, c.lon);
      const m = new THREE.Mesh(new THREE.CircleGeometry(35, 20),
        new THREE.MeshLambertMaterial({ color: 0x3f8fbf }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z);
      group.add(m);
    }
  }
  for (let i = 0; i < Math.min(routes.length * 4, 60); i++) {
    const rt = routes[i % Math.max(routes.length, 1)]; if (!rt) break;
    const p = rt[Math.floor(Math.random() * rt.length)];
    const t = makeTree();
    t.position.set(p.x + 9 + Math.random() * 6, 0, p.z + 9);
    group.add(t);
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
