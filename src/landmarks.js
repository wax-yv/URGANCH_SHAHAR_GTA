import * as THREE from 'three';

// Urganch landmarklar — alohida detallashgan modellar (stilizatsiya + konsepsiya)
const M = (c) => new THREE.MeshLambertMaterial({ color: c });
function box(g, w, h, d, x, y, z, mat, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || M(0xd8c49a));
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  g.add(m); return m;
}
function cyl(g, rt, rb, h, x, y, z, mat, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat || M(0xcfc4ae));
  m.position.set(x, y, z); m.castShadow = true;
  g.add(m); return m;
}

export function buildLandmarks(scene, ctx) {
  const g = new THREE.Group();
  const solid = (x, z, r) => ctx.solids.push({ x, z, r });

  // 1. Viloyat hokimiyati (0,-120)
  {
    const x = 0, z = -120;
    box(g, 64, 14, 22, x, 7, z, M(0xe0d0a8));
    box(g, 68, 1.5, 26, x, 0.75, z, M(0xb0a080)); // poydevor
    box(g, 66, 1.2, 24, x, 14.6, z, M(0xc0b090)); // karniz
    for (let i = -3; i <= 3; i++) cyl(g, 0.7, 0.7, 12, x + i * 7, 6, z + 11.5, M(0xf0e4c8));
    box(g, 20, 3, 4, x, 15.5, z + 10, M(0xd8c090)); // peshtoq
    cyl(g, 0.12, 0.12, 9, x, 19, z + 10, M(0x888888)); // bayroq ustuni
    box(g, 3, 1.8, 0.1, x + 1.6, 22, z + 10, new THREE.MeshBasicMaterial({ color: 0x2e9ff0 }));
    ctx.named.push({ x, z, h: 18, tags: { name: 'Xorazm viloyat hokimiyati' } });
    solid(x, z, 36);
  }
  // 2. Jaloliddin Manguberdi haykali (-40,-180)
  {
    const x = -40, z = -180, bronze = M(0x4a5a3a);
    box(g, 8, 4, 8, x, 2, z, M(0x8a8a8e));
    box(g, 9, 0.6, 9, x, 4.3, z, M(0x6a6a6e));
    box(g, 4.4, 1.6, 1.6, x, 6.4, z, bronze); // ot tanasi
    [[-1.4, -0.5], [1.4, -0.5], [-1.4, 0.5], [1.4, 0.5]].forEach(([dx, dz]) =>
      cyl(g, 0.22, 0.28, 2.2, x + dx, 4.9, z + dz, bronze, 6));
    box(g, 1.1, 1.9, 1.1, x - 0.3, 8, z, bronze); // chavandoz
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), bronze);
    head.position.set(x - 0.3, 9.3, z); head.castShadow = true; g.add(head);
    ctx.named.push({ x, z, h: 11, tags: { name: 'Jaloliddin Manguberdi haykali' } });
    solid(x, z, 7);
  }
  // 3. Al-Xorazmiy majmuasi (-160,-60)
  {
    const x = -160, z = -60;
    const park = new THREE.Mesh(new THREE.CircleGeometry(26, 24), M(0x4a8a4a));
    park.rotation.x = -Math.PI / 2; park.position.set(x, 0.05, z); park.receiveShadow = true; g.add(park);
    box(g, 5, 3, 5, x, 1.5, z, M(0x9a9aa0));
    box(g, 2.2, 2.6, 1.4, x, 4.3, z, M(0x5a6a5a)); // olim qomati
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), M(0x5a6a5a));
    hd.position.set(x, 6.2, z); g.add(hd);
    ctx.named.push({ x, z, h: 9, tags: { name: 'Al-Xorazmiy majmuasi' } });
    solid(x, z, 8);
  }
  // 4. Ogahiy teatri (140,-40)
  {
    const x = 140, z = -40;
    box(g, 30, 9, 18, x, 4.5, z, M(0xe8dcc0));
    for (let i = -2; i <= 2; i++) cyl(g, 0.6, 0.6, 8, x + i * 5, 4, z + 9.5, M(0xf4ecd8));
    box(g, 28, 1.6, 4, x, 8.8, z + 9, M(0xd8ccb0));
    ctx.named.push({ x, z, h: 12, tags: { name: 'Ogahiy nomli teatr' } });
    solid(x, z, 18);
  }
  // 5. Vokzal (300,700)
  {
    const x = 300, z = 700;
    box(g, 70, 7, 16, x, 3.5, z, M(0xd0c8b8));
    box(g, 70, 4, 0.6, x, 4, z - 8.2, new THREE.MeshLambertMaterial({ color: 0x6aa8d0 })); // shisha fasad
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.5, 16), M(0xf0f0f0));
    clock.rotation.x = Math.PI / 2; clock.position.set(x, 9, z - 8); g.add(clock);
    ctx.named.push({ x, z, h: 12, tags: { name: 'Urganch vokzali' } });
    solid(x, z, 38);
  }
  // 6. Jome masjidi (-350,250)
  {
    const x = -350, z = 250;
    box(g, 20, 7, 20, x, 3.5, z, M(0xe4d6b8));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x3a7a9a));
    dome.position.set(x, 7, z); dome.castShadow = true; g.add(dome);
    cyl(g, 1.2, 1.5, 18, x + 13, 9, z + 8, M(0xe4d6b8)); // minora
    cyl(g, 1.8, 1.8, 1, x + 13, 14, z + 8, M(0xc4b898));
    ctx.named.push({ x, z, h: 16, tags: { name: 'Jome masjidi' } });
    solid(x, z, 16);
  }
  // 7. TATU filiali (-220,-260)
  {
    const x = -220, z = -260;
    box(g, 24, 14, 14, x, 7, z, new THREE.MeshLambertMaterial({ color: 0x4a7ab0 }));
    box(g, 26, 1, 16, x, 14.5, z, M(0xe0e0e0));
    for (let f = 0; f < 4; f++) box(g, 24.4, 0.5, 14.4, x, 3 + f * 3, z, M(0xd0d0d0), false);
    ctx.named.push({ x, z, h: 17, tags: { name: 'TATU Urganch filiali' } });
    solid(x, z, 15);
  }
  // 8. Markaziy bozor (220,180)
  {
    const x = 220, z = 180;
    box(g, 50, 5, 40, x, 2.5, z, M(0xd8cba8));
    box(g, 52, 1.2, 42, x, 5.6, z, M(0x2e6ab0)); // ko'k tom
    ctx.named.push({ x, z, h: 9, tags: { name: 'Markaziy bozor' } });
    solid(x, z, 32);
  }
  // 9. Xorazm Palace (120,-320)
  {
    const x = 120, z = -320;
    box(g, 18, 30, 18, x, 15, z, M(0xe8e0cc));
    for (let f = 0; f < 8; f++) box(g, 18.4, 0.4, 4, x, 4 + f * 3, z + 7, M(0x6aa8c8), false);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(16, 8),
      new THREE.MeshLambertMaterial({ color: 0x3fb0e0 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(x + 20, 0.06, z); g.add(pool);
    ctx.named.push({ x, z, h: 33, tags: { name: 'Xorazm Palace' } });
    solid(x, z, 16);
  }
  scene.add(g);
  return g;
}
