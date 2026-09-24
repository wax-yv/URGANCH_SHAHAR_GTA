import { CENTER, ROAD_WIDTH } from './config.js';
const KX = 111320 * Math.cos(CENTER.lat * Math.PI / 180);
const KZ = 110540;
export const toXZ = (lat, lon) => [(lon - CENTER.lon) * KX, -(lat - CENTER.lat) * KZ];
export const citySize = () => {
  const [x1] = toXZ(CENTER.lat, 60.5848);
  const [x2] = toXZ(CENTER.lat, 60.6758);
  const [, z1] = toXZ(41.5225, CENTER.lon);
  const [, z2] = toXZ(41.5879, CENTER.lon);
  return { w: Math.abs(x2 - x1), h: Math.abs(z2 - z1) };
};
export const bHeight = (tags = {}) => {
  if (tags.height) { const v = parseFloat(tags.height); if (v > 0) return Math.min(v, 45); }
  if (tags['building:levels']) { const v = parseFloat(tags['building:levels']); if (v > 0) return Math.min(v * 3, 45); }
  const t = (tags.building || 'yes').toLowerCase();
  if (t === 'apartments' || t === 'commercial' || t === 'school') return 12;
  if (t === 'house' || t === 'garage' || t === 'shed') return 4.5;
  return 8;
};
export const roadWidth = (tags = {}) => ROAD_WIDTH[tags.highway] ?? ROAD_WIDTH.default;
