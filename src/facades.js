// Seedli procedural fasadlar — Urganch palitrasi (sariq-bej-kulrang-g'isht)
export const VARIANTS = 64;
export const TINTS = [0xffffff, 0xf2e2c4, 0xe8d0a8, 0xd8d8d8, 0xf0d0c0, 0xe0e8f0, 0xd0c8b8, 0xf5f0e0];
export const ROOFS = [0x8a6f5c, 0x6b6f75, 0x9a8a7a, 0x7a5c4c, 0x5c6068, 0xa89880, 0x746052, 0x8c8c90];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WALLS = [0xd8c49a, 0xc9b183, 0xbfae90, 0xe0d6c0, 0xc4a882, 0xb0a89a, 0xd0b090, 0xe8e0d0, 0xb98d68, 0xcfc4b0];
const SIGNS = [0x2e7fd9, 0xd92e2e, 0x2ed97f, 0xf2b230, 0x9b59d9, 0x30c0d0, 0xe06a30, 0x4a90d9];

export function facadeTexture(seed, civic = false) {
  const R = mulberry32(seed * 2654435761 + (civic ? 97 : 13));
  const W = 128, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const wall = WALLS[Math.floor(R() * WALLS.length)];
  c.fillStyle = '#' + wall.toString(16).padStart(6, '0');
  c.fillRect(0, 0, W, H);
  // kir/chang dog'lari
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(60,50,40,${0.03 + R() * 0.05})`;
    c.fillRect(R() * W, R() * H, 2 + R() * 8, 2 + R() * 6);
  }
  const floors = civic ? 1 + Math.floor(R() * 3) : 2 + Math.floor(R() * 7);
  const fh = H / (floors + (civic ? 0.6 : 0.4));
  // yer qavat: vitrina yoki kirish
  if (civic) {
    const sh = fh * 1.1;
    c.fillStyle = '#20262e'; c.fillRect(4, H - sh, W - 8, sh - 6);
    c.fillStyle = 'rgba(150,200,230,0.85)';
    const nw = 3 + Math.floor(R() * 2);
    for (let i = 0; i < nw; i++) {
      const ww = (W - 8) / nw;
      c.fillRect(4 + i * ww + 2, H - sh + 8, ww - 4, sh - 20);
    }
    c.fillStyle = '#' + SIGNS[Math.floor(R() * SIGNS.length)].toString(16).padStart(6, '0');
    c.fillRect(4, H - sh - 12, W - 8, 10); // peshlavha
  } else {
    c.fillStyle = '#3a322a'; c.fillRect(W / 2 - 8, H - 22, 16, 22); // eshik
  }
  // qavat derazalari
  const y0 = civic ? H - fh * 1.1 - 14 : H - 30;
  for (let f = 0; f < floors; f++) {
    const y = y0 - f * fh;
    if (y < 6) break;
    const nw = 3 + Math.floor(R() * 3);
    const arch = R() < 0.25; // sharqona ravoqli
    for (let i = 0; i < nw; i++) {
      const ww = (W - 10) / nw;
      const x = 5 + i * ww + 2, w = ww - 5, h = fh * 0.55;
      c.fillStyle = '#4a4238'; c.fillRect(x - 1, y - h - 1, w + 2, h + 2); // rom
      const lit = R() < 0.3;
      c.fillStyle = lit ? '#ffd77a' : (R() < 0.5 ? '#2a3542' : '#5a6a7a');
      c.fillRect(x, y - h, w, h);
      if (arch) { c.fillStyle = c.fillStyle; c.beginPath(); c.arc(x + w / 2, y - h, w / 2, Math.PI, 0); c.fill(); }
      if (!lit && R() < 0.4) { c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x, y - h, w, 3); } // yaltiroq
    }
    if (R() < 0.35) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, y + 2, W, 3); } // balkon soyasi
  }
  // karniz
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, 0, W, 4);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, 4, W, 2);
  return cv;
}

const texCache = new Map();
export function getFacade(variant, civic) {
  const key = variant + (civic ? ':c' : ':r');
  if (!texCache.has(key)) {
    const cv = facadeTexture(variant, civic);
    texCache.set(key, cv);
  }
  return texCache.get(key);
}
