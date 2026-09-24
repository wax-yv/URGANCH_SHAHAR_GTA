import * as THREE from 'three';
import { TILE } from './config.js';
import { buildGround, buildTile, buildPOI } from './city.js';
import { Player } from './player.js';
import { Sim } from './sim.js';
import { Labels } from './labels.js';
import { initUI, drawMinimap, updateStat, nearestStreet } from './ui.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a5c4);
scene.fog = new THREE.Fog(0x87a5c4, 400, 1600);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.5, 3000);
camera.position.set(0, 120, 200);

scene.add(new THREE.HemisphereLight(0xbfd6ff, 0x8a7f6a, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(120, 180, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, far: 700 });
scene.add(sun, sun.target);

buildGround(scene);

const ctx = { named: [], lights: [], routes: [], solids: [], streets: [] };
const world = new THREE.Group();
scene.add(world);
const tileGroups = [];
const labels = new Labels(scene);

async function loadTiles() {
  const free = new URLSearchParams(location.search).has('free');
  const ov = document.createElement('div');
  ov.id = 'load';
  if (free) ov.style.display = 'none';
  ov.innerHTML = '<b>URGANCH_SHAHAR_GTA</b><br/><span id="loadmsg">Xarita yuklanmoqda...</span>';
  document.body.appendChild(ov);
  let ok = 0;
  const total = TILE.rows * TILE.cols;
  let done = 0;
  for (let r = 0; r < TILE.rows; r++) {
    for (let c = 0; c < TILE.cols; c++) {
      done++;
      const msg = document.getElementById('loadmsg');
      if (msg) msg.textContent = `Xarita yuklanmoqda... ${done}/${total}`;
      try {
        const res = await fetch(`./data/tiles/t_${r}_${c}.json`);
        if (!res.ok) continue;
        const tile = await res.json();
        const g = new THREE.Group();
        const st = buildTile(g, tile, ctx);
        g.userData.center = st.center || null;
        // markaz: bbox o'rtasi
        if (tile.bbox) {
          const [s, w, n, e] = tile.bbox;
          const { toXZ } = await import('./geo.js');
          const [x1, z1] = toXZ((s + n) / 2, (w + e) / 2);
          g.userData.center = new THREE.Vector3(x1, 0, z1);
        }
        world.add(g); tileGroups.push(g); ok++;
      } catch { /* tayyor emas */ }
    }
  }
  if (!ok) {
    try {
      const res = await fetch('./data/sample_buildings.json');
      const buildings = res.ok ? await res.json() : [];
      const g = new THREE.Group();
      buildTile(g, { buildings, roads: [], water: [] }, ctx);
      g.userData.center = new THREE.Vector3(0, 0, 0);
      world.add(g); tileGroups.push(g);
    } catch { /* ignore */ }
  }
  // POI qatlami (mavjud bo'lsa)
  try {
    const rp = await fetch('./data/poi.json');
    if (rp.ok) {
      const poi = await rp.json();
      const g = new THREE.Group();
      buildPOI(g, poi, ctx);
      world.add(g);
    }
  } catch { /* hali yo'q */ }
  return ok;
}

// to'qnashuv gridi: 100m katakchalar (11k+ bino uchun)
let solidGrid = null;
function buildSolidGrid() {
  solidGrid = new Map();
  for (const s of ctx.solids) {
    const k = Math.floor(s.x / 100) + ':' + Math.floor(s.z / 100);
    if (!solidGrid.has(k)) solidGrid.set(k, []);
    solidGrid.get(k).push(s);
  }
}
function collide(p, isCar, carR = 2) {
  const cx = Math.floor(p.x / 100), cz = Math.floor(p.z / 100);
  for (let ix = cx - 1; ix <= cx + 1; ix++) {
    for (let iz = cz - 1; iz <= cz + 1; iz++) {
      const cell = solidGrid.get(ix + ':' + iz);
      if (!cell) continue;
      for (const s of cell) {
        const dx = p.x - s.x, dz = p.z - s.z;
        const rr = s.r + (isCar ? carR : 0.6);
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 0.001) {
          const d = Math.sqrt(d2);
          p.x = s.x + (dx / d) * rr;
          p.z = s.z + (dz / d) * rr;
        }
      }
    }
  }
}

const player = new Player(scene, camera);
const ui = initUI(ctx, player);

function carSpots() {
  const spots = [];
  for (const rt of ctx.routes.slice(0, 8))
    for (let i = 0; i < rt.length; i += 6) spots.push({ x: rt[i].x + 4, z: rt[i].z });
  for (let i = 0; i < 12; i++) spots.push({ x: -60 + i * 10, z: 90 });
  if (!spots.length) for (let i = 0; i < 20; i++) spots.push({ x: (i - 10) * 12, z: 60 });
  return spots;
}

let sim = null, fps = 60, last = performance.now(), frames = 0, ft = 0;
let qLevel = 0, qTimer = 0; // avto-sifat: 0 to'liq, 1 o'rta, 2 past
function autoQuality(dt) {
  qTimer += dt;
  if (qTimer < 3) return;
  qTimer = 0;
  if (fps < 28 && qLevel < 2) qLevel++;
  else if (fps > 55 && qLevel > 0) qLevel--;
  else return;
  if (qLevel === 0) { renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true; sun.castShadow = true; }
  if (qLevel === 1) { renderer.setPixelRatio(1); sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  if (qLevel === 2) { renderer.shadowMap.enabled = false; sun.castShadow = false; }
}
let streetT = 0;
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let downAt = 0;
addEventListener('mousedown', () => downAt = performance.now());
addEventListener('mouseup', e => {
  if (performance.now() - downAt > 250 || player.mode === 'drive') return;
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(world.children, true)[0];
  const el = document.getElementById('bname');
  if (el) {
    if (hit) {
      let best = null, bd = 1e9;
      for (const n of ctx.named) {
        const d = (n.x - hit.point.x) ** 2 + (n.z - hit.point.z) ** 2;
        if (d < bd) { bd = d; best = n; }
      }
      if (best && bd < 900) {
        el.textContent = `📍 ${best.tags.name || ''} ${best.tags.amenity || best.tags.shop || ''}`;
        el.dataset.lock = Date.now();
      }
    }
  }
  player.tryEnter();
});

(async () => {
  const n = await loadTiles();
  const ov = document.getElementById('load');
  if (ov) ov.remove();
  player.spawnCars(scene, carSpots());
  player.named = ctx.named;
  buildSolidGrid();
  sim = new Sim(scene, ctx, player);
  labels.rebuild(ctx.named);
  document.title = `READY named=${ctx.named.length} routes=${ctx.routes.length} lights=${ctx.lights.length}`;
  const el = document.getElementById('bname');
  if (el) el.textContent = `Yuklandi: ${ctx.named.length} nomli bino, ${ctx.routes.length} trafik route | E — mashinaga o'tish`;
})();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

(function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now; frames++; ft += dt;
  if (ft >= 0.5) { fps = Math.round(frames / ft); frames = 0; ft = 0; }
  player.update(dt);
  // to'qnashuv
  if (player.mode === 'walk') collide(player.pos, false);
  else if (player.car) { collide(player.car.position, true); player.pos.set(player.car.position.x, 1.7, player.car.position.z); }
  sim?.update(dt);
  labels.update(player.pos);
  autoQuality(dt);
  streetT += dt;
  if (streetT > 1) {
    streetT = 0;
    const el = document.getElementById('bname');
    if (el) {
      const locked = el.dataset.lock && (Date.now() - +el.dataset.lock < 8000);
      if (!locked) {
        const st = nearestStreet(ctx, player.pos);
        if (st) el.textContent = `🛣 ${st}`;
      }
    }
  }
  // tile streaming: 600m dan uzoq tile yashirin
  for (const g of tileGroups) {
    if (!g.userData.center) continue;
    g.visible = g.userData.center.distanceTo(player.pos) < 900;
  }
  sun.position.set(player.pos.x + 120, 180, player.pos.z + 60);
  sun.target.position.set(player.pos.x, 0, player.pos.z);
  updateStat(player, fps);
  drawMinimap(ui.map, player, ctx);
  renderer.render(scene, camera);
})();
