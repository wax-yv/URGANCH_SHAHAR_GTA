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
  // real yo'llar sxematik (masshtab: shahar ~7600m -> 170px)
  const SX = 170 / 8000, OZ = 85;
  const dot = (x, z) => [OZ + x * SX, OZ + z * SX];
  c.strokeStyle = '#6b7280'; c.lineWidth = 1;
  for (const rt of ctx.routes.slice(0, 40)) {
    c.beginPath();
    rt.forEach((p, i) => {
      const [mx, mz] = dot(p.x, p.z);
      i ? c.lineTo(mx, mz) : c.moveTo(mx, mz);
    });
    c.stroke();
  }
  c.fillStyle = '#3f8fbf';
  c.fillRect(80, 20, 10, 130); // kanal sxematik
  // o'yinchi
  const [px, pz] = dot(Math.max(-4000, Math.min(4000, player.pos.x)), Math.max(-4000, Math.min(4000, player.pos.z)));
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

// eng yaqin ko'cha nomi
export function nearestStreet(ctx, pos) {
  let best = null, bd = 30 * 30;
  for (const st of ctx.streets) {
    for (const [x, z] of st.pts) {
      const d = (x - pos.x) ** 2 + (z - pos.z) ** 2;
      if (d < bd) { bd = d; best = st.name; }
    }
  }
  return best;
}
