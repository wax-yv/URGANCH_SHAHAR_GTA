import * as THREE from 'three';
import { BBOX, TILE } from './config.js';
import { toXZ, citySize } from './geo.js';
import { buildGround, buildTile } from './city.js';
import { Player } from './player.js';
import { Sim } from './sim.js';
import { initUI, drawMinimap, updateStat } from './ui.js';

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

const ctx = { named: [], lights: [], routes: [] };
const world = new THREE.Group();
scene.add(world);

async function loadTiles() {
  let ok = 0;
  for (let r = 0; r < TILE.rows; r++) {
    for (let c = 0; c < TILE.cols; c++) {
      try {
        const res = await fetch(`./data/tiles/t_${r}_${c}.json`);
        if (!res.ok) continue;
        const tile = await res.json();
        const g = new THREE.Group();
        const st = buildTile(g, tile, ctx);
        world.add(g); ok++;
        console.log(`tile t_${r}_${c}:`, st);
      } catch { /* hali tayyor emas */ }
    }
  }
  if (!ok) {
    // fallback: markaz sample
    try {
      const res = await fetch('./data/sample_buildings.json');
      const buildings = res.ok ? await res.json() : [];
      const g = new THREE.Group();
      buildTile(g, { buildings, roads: [], water: [] }, ctx);
      world.add(g);
      console.log('fallback sample:', buildings.length);
    } catch (e) { console.warn('no data', e); }
  }
  return ok;
}

const player = new Player(scene, camera);
const ui = initUI(ctx, player);

// mashina spawn nuqtalari: asosiy yo'l bo'ylab + parkovka
function carSpots() {
  const spots = [];
  for (const rt of ctx.routes.slice(0, 8)) {
    for (let i = 0; i < rt.length; i += 6) spots.push({ x: rt[i].x + 4, z: rt[i].z });
  }
  for (let i = 0; i < 12; i++) spots.push({ x: -60 + i * 10, z: 90 }); // parkovka qatori
  if (!spots.length) for (let i = 0; i < 20; i++) spots.push({ x: (i - 10) * 12, z: 60 });
  return spots;
}

let sim = null;
let fps = 60, last = performance.now(), frames = 0, ft = 0;

// bino nomi raycast
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let downAt = 0;
addEventListener('mousedown', () => downAt = performance.now());
addEventListener('mouseup', e => {
  if (performance.now() - downAt > 250) return; // sudrash emas, klik
  if (player.mode === 'drive') return;
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  // nomli binolar yaqinini topish (pozitsiya bo'yicha)
  const hit = ray.intersectObjects(world.children, true)[0];
  const el = document.getElementById('bname');
  if (el) {
    if (hit) {
      let best = null, bd = 1e9;
      for (const n of ctx.named) {
        const d = (n.x - hit.point.x) ** 2 + (n.z - hit.point.z) ** 2;
        if (d < bd) { bd = d; best = n; }
      }
      el.textContent = best && bd < 400 ? `📍 ${best.tags.name || ''} ${best.tags.amenity || best.tags.shop || ''}` : '';
    } else if (el) el.textContent = '';
  }
  player.tryEnter();
});

(async () => {
  await loadTiles();
  player.spawnCars(scene, carSpots());
  sim = new Sim(scene, ctx);
  const el = document.getElementById('bname');
  if (el) el.textContent = `Yuklandi: ${ctx.named.length} nomli bino | mashina yaqinida E bosing`;
})();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

(function loop(t) {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now; frames++; ft += dt;
  if (ft >= 0.5) { fps = Math.round(frames / ft); frames = 0; ft = 0; }
  player.update(dt);
  sim?.update(dt);
  // quyosh o'yinchini kuzatadi (soya 150m)
  sun.position.set(player.pos.x + 120, 180, player.pos.z + 60);
  sun.target.position.set(player.pos.x, 0, player.pos.z);
  updateStat(player, fps);
  drawMinimap(ui.map, player, ctx);
  renderer.render(scene, camera);
})(0);
