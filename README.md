# URGANCH_SHAHAR_GTA

Urganch 7.2x7.6 km GTA-demo — Vite + Three.js. Faqat ochiq OSM data.
`41.5225,60.5848,41.5879,60.6758` | 4x4 tile streaming | 60fps nishon.

## Boshqaruv (desktop)
- WASD — piyoda yurish / mashinada gaz-tormoz-rul, strelka — kamera
- Sichqoncha — kamera (klik bilan lock)
- E yoki klik — yaqin mashinaga o'tirish/tushish
- P — parkovka, L — fara, Space — ruchnoy tormoz, C — orqa kamera, H — foto rejim, T — landmark teleport, R — mashina rescue, L — fara
- Bino klik — nomi (OSM `name` bo'lsa)

## Mashinalar
Matiz, Spark, Nexia 2/3, Cobalt, Gentra, Damas, Avtobus, Tramvay — low-poly o'xshash modellar, minimal arcade-fizika.

## Tizimlar
Yo'l/tratuar alohida, suv/kanal, svetofor sikl (8-2-8), 15 bot-trafik, 40 NPC piyoda, parkovka qatori, minimap, bino nomlari.

## Ishga tushirish
npm install
npm run dev

## Vercel test
Vercel → Add New Project → `wax-yv/URGANCH_SHAHAR_GTA` import → build `npm run build`, output `dist`. `vercel.json` tayyor.

## Data
`tools/fetch_full.py` — 4x4 tile OSM fetch. `public/data/tiles/t_r_c.json` tayyor bo'lsa avtomatik yuklanadi, bo'lmasa markaz sample bilan ishlaydi.
