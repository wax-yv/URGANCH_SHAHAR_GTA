// URGANCH_SHAHAR_GTA — markaziy konfig
export const BBOX = { S: 41.5225, W: 60.5848, N: 41.5879, E: 60.6758 };
export const CENTER = { lat: 41.5517, lon: 60.6312 };
export const TILE = { rows: 4, cols: 4 };
export const ROAD_WIDTH = {
  motorway: 14, trunk: 12, primary: 10, secondary: 8,
  tertiary: 7, residential: 5.5, service: 4, unclassified: 5,
  pedestrian: 3, footway: 2, path: 2, default: 5
};
export const CAR_TYPES = [
  { id: 'matiz', name: 'Matiz', color: 0xd94f3d, len: 3.5, wid: 1.5, h: 1.5, maxV: 22 },
  { id: 'spark', name: 'Spark', color: 0x3d7bd9, len: 3.6, wid: 1.6, h: 1.55, maxV: 24 },
  { id: 'nexia2', name: 'Nexia 2', color: 0xc0c4c9, len: 4.3, wid: 1.7, h: 1.45, maxV: 28 },
  { id: 'nexia3', name: 'Nexia 3', color: 0x2b2f36, len: 4.4, wid: 1.7, h: 1.5, maxV: 29 },
  { id: 'cobalt', name: 'Cobalt', color: 0xe8e8e8, len: 4.5, wid: 1.75, h: 1.5, maxV: 30 },
  { id: 'gentra', name: 'Gentra', color: 0x1f6f4a, len: 4.6, wid: 1.78, h: 1.5, maxV: 31 },
  { id: 'damas', name: 'Damas', color: 0xf2c230, len: 3.9, wid: 1.6, h: 1.9, maxV: 21 },
  { id: 'bus', name: 'Avtobus', color: 0x2e9e4f, len: 10, wid: 2.5, h: 3, maxV: 16 },
  { id: 'tramvay', name: 'Tramvay', color: 0x8e2f2f, len: 14, wid: 2.4, h: 3.2, maxV: 14 },
];
