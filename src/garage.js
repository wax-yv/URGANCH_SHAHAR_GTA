import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeCar } from './models.js';

// GLB garaj: real modellar, avto-masshtab, fallback procedural
const FILES = {
  matiz: 'matiz.glb', spark: 'spark.glb', nexia2: 'cobalt.glb',
  nexia3: 'cobalt.glb', cobalt: 'cobalt.glb', gentra: 'gentra.glb',
  damas: 'damas.glb', bus: 'avtobus.glb', tramvay: 'tramvay-a.glb',
};
const cache = new Map();
const loader = new GLTFLoader();
let ready = false;

function fitModel(obj, type) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const s = type.len / Math.max(size.z, 0.01);
  obj.scale.multiplyScalar(s);
  // yerga o'tqazish
  const b2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= b2.min.y;
  return obj;
}

function addRig(g, type) {
  const L = type.len, Wd = type.wid;
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
  g.add(tgt); beam.target = tgt; g.add(beam, b1, b2, h1, h2);
  g.userData.lights = { brakeMat, headMat, beam, on: false };
  g.userData.wheels = [];
}

export async function preloadGarage(onProgress) {
  const ids = Object.keys(FILES);
  let done = 0;
  await Promise.all(ids.map(id => new Promise(res => {
    loader.load(`./models/${FILES[id]}`,
      gltf => {
        const inner = gltf.scene;
        inner.rotation.y = Math.PI; // Kenney/Quaternius +Z -> o'yin -Z
        inner.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
        cache.set(id, inner);
        done++; onProgress?.(done, ids.length); res();
      },
      undefined,
      () => { done++; onProgress?.(done, ids.length); res(); });
  })));
  ready = true;
}
export function garageReady() { return ready; }

export function makeGameCar(type) {
  const src = cache.get(type.id);
  const g = new THREE.Group();
  if (src) {
    const inner = src.clone(true);
    fitModel(inner, type);
    g.add(inner);
    // rang variatsiyasi: birinchi material klon
    inner.traverse(o => {
      if (o.isMesh && o.material && o.material.color && !o.userData._tinted) {
        o.userData._tinted = true;
      }
    });
  } else {
    const fb = makeCar(type);
    g.add(fb);
  }
  addRig(g, type);
  g.userData.type = type;
  g.userData.speed = 0;
  return g;
}
