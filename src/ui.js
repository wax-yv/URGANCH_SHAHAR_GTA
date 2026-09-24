// HUD + minimap + bino nomi
export function initUI(ctx, player) {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <b>URGANCH_SHAHAR_GTA</b> <span id="mode">PIYODA</span> |
    WASD yurish/haydash, E — mashinaga o'tish/tushish, P — parkovka, 1/2 — kamera |
    <span id="stat"></span><br/><span id="bname"></span>`;
  document.body.prepend(hud);
  const map = document.createElement('canvas');
  map.id = 'minimap'; map.width = map.height = 170;
  document.body.appendChild(map);
  const help = document.createElement('div');
  help.id = 'help';
  help.innerHTML = `Mashina yaqinida <b>E</b> bosing (yoki mashinani bosing). Haydashda W/S gaz-tormoz, A/D rul.`;
  document.body.appendChild(help);
  setTimeout(() => help.remove(), 12000);
  return { hud, map };
}

export function drawMinimap(map, player, ctx) {
  const c = map.getContext('2d');
  c.fillStyle = '#20242a'; c.fillRect(0, 0, 170, 170);
  c.fillStyle = '#3f8fbf';
  c.fillRect(80, 20, 10, 130); // kanal sxematik
  c.fillStyle = '#d9a45f';
  ctx.named.slice(0, 200).forEach(() => {});
  // o'yinchi
  const px = 85 + Math.max(-80, Math.min(80, player.pos.x / 40));
  const pz = 85 + Math.max(-80, Math.min(80, player.pos.z / 40));
  c.fillStyle = '#22ff44';
  c.beginPath(); c.arc(px, pz, 4, 0, 7); c.fill();
}

export function updateStat(player, fps) {
  const m = document.getElementById('mode');
  const spd = player.mode === 'drive' ? Math.abs(Math.round(player.speed * 3.6)) : 0;
  if (m) m.textContent = player.mode === 'walk' ? 'PIYODA' : (`MASHINA: ${(player.car?.userData.type.name || '')} ${spd} km/s`);
  const s = document.getElementById('stat');
  if (s) s.textContent = `FPS ${fps} | mashinalar ${player.cars?.length ?? 0} | bot ${window.__bots ?? 15}`;
}
