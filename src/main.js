import * as THREE from 'three';

const app = document.getElementById('app');
app.innerHTML = '<div id="hud">URGANCH_SHAHAR_GTA — yuklanmoqda...</div><canvas id="c"></canvas>';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a5c4);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.5, 2000);
camera.position.set(0, 120, 180);

const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x8a7f6a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(120, 180, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -150; sun.shadow.camera.right = 150;
sun.shadow.camera.top = 150; sun.shadow.camera.bottom = -150;
sun.shadow.camera.far = 600;
scene.add(sun);
scene.add(sun.target);

// yer 2x2km
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(2000, 2000),
  new THREE.MeshLambertMaterial({ color: 0x9aa08a })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const LAT0 = 41.5517, LON0 = 60.6312;
const toXZ = (lat, lon) => [
  (lon - LON0) * 111320 * Math.cos(LAT0 * Math.PI / 180),
  -(lat - LAT0) * 110540
];

async function loadBuildings() {
  const res = await fetch('/data/sample_buildings.json').catch(() => null);
  // vite dev da /dataishlamasa — public emas, src dan fallback
  let arr = [];
  if (res && res.ok) arr = await res.json();
  else {
    const r2 = await fetch('./data/sample_buildings.json').catch(() => null);
    if (r2 && r2.ok) arr = await r2.json();
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0xcfc4ae });
  const matNamed = new THREE.MeshLambertMaterial({ color: 0xd98f5f });
  const plain = arr.filter(b => !b.tags?.name);
  const named = arr.filter(b => b.tags?.name);
  const mk = (list, material) => {
    const m = new THREE.InstancedMesh(geo, material, Math.max(list.length, 1));
    const d = new THREE.Object3D();
    list.forEach((b, i) => {
      const c = b.center || { lat: b.lat, lon: b.lon };
      if (!c || c.lat == null) return;
      const [x, z] = toXZ(c.lat, c.lon);
      const h = b.tags?.height ? parseFloat(b.tags.height) || 8
        : b.tags?.['building:levels'] ? parseFloat(b.tags['building:levels']) * 3 : 8;
      d.position.set(x, 0, z);
      d.scale.set(12, Math.min(h, 40), 12);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  };
  mk(plain, mat); mk(named, matNamed);
  document.getElementById('hud').textContent =
    `URGANCH markaz 2x2km — ${arr.length} bino (${named.length} nomli) | WASD Yurish keyin`;
}
loadBuildings();

// oddiy orbit-yurish: sudrab aylantirish
let yaw = 0, pitch = 0.5, dist = 220;
let tx = 0, tz = 0;
addEventListener('keydown', e => {
  const s = 8;
  if (e.key === 'w' || e.key === 'W') { tx -= Math.sin(yaw) * s; tz -= Math.cos(yaw) * s; }
  if (e.key === 's' || e.key === 'S') { tx += Math.sin(yaw) * s; tz += Math.cos(yaw) * s; }
  if (e.key === 'a' || e.key === 'A') { tx -= Math.cos(yaw) * s; tz += Math.sin(yaw) * s; }
  if (e.key === 'd' || e.key === 'D') { tx += Math.cos(yaw) * s; tz -= Math.sin(yaw) * s; }
});
let drag = false, px = 0;
addEventListener('mousedown', e => { drag = true; px = e.clientX; });
addEventListener('mouseup', () => drag = false);
addEventListener('mousemove', e => { if (drag) yaw += (e.clientX - px) * 0.005, px = e.clientX; });

(function loop() {
  requestAnimationFrame(loop);
  camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(tx, 0, tz);
  sun.position.set(tx + 120, 180, tz + 60);
  sun.target.position.set(tx, 0, tz);
  renderer.render(scene, camera);
})();
