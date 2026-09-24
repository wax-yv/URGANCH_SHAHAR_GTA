# URGANCH_SHAHAR_GTA — TOPSHIRISH HUJJATI (boshqa AI uchun)

## 1. Loyiha
Urganch shahri 7.2x7.6 km GTA-demo. Stack: Vite + Three.js 0.186. Repo: `wax-yv/URGANCH_SHAHAR_GTA`, branch `main`.
Chegara: lat 41.5225–41.5879, lon 60.5848–60.6758. Markaz: 41.5517, 60.6312.
Ishga tushirish: `npm install && npm run dev` (port 8011). Build: `npm run build` (Vercel: output `dist`).

## 2. Ma'lumot qatlamlari (`public/data/`)
- `tiles/t_R_C.json` (4x4, R=row 0-3 janub-shimol, C=col 0-3 g'arb-sharq): `{bbox:[s,w,n,e], buildings:[{type,tags:{name,building,height,building:levels,amenity,shop},center:{lat,lon}|geometry:[{lat,lon}]}], roads:[{tags:{highway,name},geometry}], water:[...]}` — jami ~19.8k bino, 2.7k yo'l.
- `poi.json`: `{parking:[...], school, bank, shop, food, hospital}` — ~1195 nuqta, har biri `{tags, center|geometry}`.
- `models/*.glb`: cobalt, gentra, spark, matiz, damas, avtobus, tramvay-a/b (Kenney CC0 + Poly Pizza; CC-BY "Bus" jeremy — attributsiya shart).
- `sample_buildings.json`: zaxira (tile bo'lmasa).

## 3. ANIQ LANDMARK KOORDINATALAR (OSM, tekshirilgan)
- Xorazm viloyat hokimligi: 41.54934, 60.63011 (townhall)
- Urganch shahar hokimligi: 41.56220, 60.62593 (townhall)
- Vokzal (temir yo'l): 41.53677, 60.63220 (train_station)
- Avtovokzal: 41.53856, 60.63086
- GAI (politsiya): 41.53195, 60.67011 (police)
- Ichki Ishlar bo'limi: 41.56056, 60.62546 (police)
- Agrobank: 41.54800, 60.63035 | Ipoteka filiali: 41.54344, 60.62824 | O'zsanoatqurilishbank: 41.55136, 60.63002 | Markaziy bank XB: 41.56094, 60.62586
- Doshkinjonbobo ziyoratgohi: 41.55864, 60.62313 | Oxunbobo jome masjidi: 41.55586, 60.64175 | Shahobiddin masjidi: 41.55558, 60.59240
- TATU Urganch: 41.57054, 60.63202 | Ma'mun univ 3-bino: 41.55115, 60.62404
- Khorezm Palace: 41.55093, 60.63435 | KARVON mall: 41.55313, 60.62333 | Sharq bozori: 41.54116, 60.63700 | ЦУМ: 41.55571, 60.62166
- Kengashlar uyi: 41.55044, 60.62957 | Kutubxona markazi: 41.54940, 60.63540

## 4. ASOSIY KO'CHALAR (400 ta ichidan eng kattalari)
Zarbulok, G'alaba, Joyhun/Jayhun, Obodlik, Xonqa, Al-Xorazmiy, Sanoatchilar, Islom Karimov, Amir Temur, Mustaqillik, Tinchlik, Al-Beruniy, Xiva o'tishlari, Pahlavon Maxmud, Munis Xorazmiy, J.Manguberdi, Samarkand, Maqtumquli.
To'liq ro'yxat kodda: `public/data/tiles/*.json` → `roads[].tags.name`.

## 5. URGANCH 3D KONSEPSIYASI
- Shovot kanali shaharni sharq-g'arb bo'ylab kesib o'tadi (suv qatlami tile'larda).
- Markaz: 3-5 qavatli monumental ma'muriyat (sariq-bej), maydonlar, haykallar.
- Sovet 4-5 qavatli g'isht/panel turar-joylar; Shovot bo'yida yangi 7-12 qavatli oq-bej; chekkada 1 qavatli hovlili mahallalar, yassi tomlar.
- Gamma: och sariq-bej-kulrang; ko'k tomli bozorlar; paxta-naqsh chiroqlar.
- Hozirgi kodda: `src/landmarks.js` — 9 landmark taxminiy markaz koordinatalarda; 3-bo'limdagi ANIQ koordinatalarga ko'chirish kerak!

## 6. Boshqaruv
WASD piyoda/mashina, sichqoncha kamera, E o'tirish, P parkovka, R rescue, T teleport, L fara, N tun, C orqa, V kamera, G info, H foto, Esc pauza. Touch: joystick + E/P/💡.

## 7. Arxitektura (`src/`)
`config.js` (chegara, yo'l kengliklari, mashina tiplari) → `geo.js` (lat/lon→metr, balandlik) → `city.js` (tile qurish: fasad-instancing, merged yo'llar) → `facades.js` (64 seedli fasad × 8 tint = 512) → `landmarks.js` → `garage.js` (GLB preload + avto-masshtab) → `player.js` → `sim.js` (bot/NPC/svetofor) → `labels.js` → `ui.js` (HUD, minimap, pauza) → `main.js` (orkestr, streaming 900m, avto-sifat).

## 8. Ma'lum kamchiliklar
- Binolar fasadlari procedural (foto-tekstura emas); vitrinalar chizilgan.
- Ba'zi tile'da yo'l geometriyasi kam (fallback: bino-only) — trafik o'sha zonada siyrak.
- Suv: 86 obyekt; Shovot uzluksizligi tekshirilmagan.
- WebGLsiz muhitda test qilib bo'lmaydi — real brauzerda tekshirish shart.
