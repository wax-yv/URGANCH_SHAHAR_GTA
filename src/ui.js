// HUD + minimap + bino nomi
export function initUI(ctx, player) {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <b>URGANCH_SHAHAR_GTA</b> <span id="mode">PIYODA</span> <span id="comp">🧭 N</span> |
    WASD yurish/haydash, E — mashinaga o'tish/tushish, P — parkovka, L — fara, N — tun, G — info |
    <span id="stat"></span><br/><span id="bname"></span>`;
  document.body.prepend(hud);
  addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'g' && window.__cityStat) {
      const el = document.getElementById('bname');
      if (el) { el.textContent = window.__cityStat; el.dataset.lock = Date.now(); }
    }
  });
  addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'h') {
      document.querySelectorAll('#hud,#minimap,#help,#joy,#tbtn').forEach(el => {
        if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
      });
    }
  });
  const map = document.createElement('canvas');
  map.id = 'minimap'; map.width = map.height = 170;
  document.body.appendChild(map);
  const help = document.createElement('div');
  help.id = 'help';
  help.innerHTML = `Mashina yaqinida <b>E</b> (yoki klik). W/S gaz-tormoz, A/D rul, Space ruchnoy, C orqa, V kamera, L fara, N tun, T teleport, G info, H foto. Piyoda: WASD + strelka kamera.`;
  document.body.appendChild(help);
  setTimeout(() => help.remove(), 12000);
  initPauseMenu();
  return { hud, map };
}

export const Quality = {
  mode: localStorage.getItem('urganch_q') || 'auto',
  sound: localStorage.getItem('urganch_s') !== 'off',
};

function initPauseMenu() {
  const ov = document.createElement('div');
  ov.id = 'pause';
  ov.style.display = 'none';
  ov.innerHTML = `
    <div id="pcard">
      <b>URGANCH_SHAHAR_GTA</b><span>PAUZA</span>
      <button id="pResume">▶ Davom etish (Esc)</button>
      <button id="pQuality">🎨 Sifat: <i id="qVal"></i></button>
      <button id="pSound">🔊 Ovoz: <i id="sVal"></i></button>
      <div id="phelp">WASD yurish/haydash • E mashina • P parkovka • R rescue • T teleport<br/>
      L fara • N tun • C orqa • V kamera • G info • H foto • strelka kamera</div>
    </div>`;
  document.body.appendChild(ov);
  const st = document.createElement('style');
  st.textContent = `#pause{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(5,8,12,.72);backdrop-filter:blur(3px)}
#pcard{display:flex;flex-direction:column;gap:10px;background:#141a22;border:1px solid #ffd75f55;border-radius:16px;padding:26px 30px;color:#fff;min-width:320px;text-align:center}
#pcard b{color:#ffd75f;font-size:22px;letter-spacing:2px}
#pcard span{opacity:.7;font-size:13px;letter-spacing:4px}
#pcard button{background:#222b36;color:#fff;border:1px solid #ffffff2a;border-radius:10px;padding:10px;font-size:15px;cursor:pointer}
#pcard button:hover{border-color:#ffd75f;background:#2a3442}
#phelp{font-size:12px;opacity:.65;line-height:1.7}`;
  document.head.appendChild(st);
  const qv = () => document.getElementById('qVal').textContent =
    { auto: 'Avto', high: 'Yuqori', med: "O'rta", low: 'Past' }[Quality.mode];
  const sv = () => document.getElementById('sVal').textContent = Quality.sound ? 'Yoniq' : "O'chiq";
  qv(); sv();
  document.getElementById('pResume').onclick = () => togglePause(false);
  document.getElementById('pQuality').onclick = () => {
    Quality.mode = { auto: 'high', high: 'med', med: 'low', low: 'auto' }[Quality.mode];
    localStorage.setItem('urganch_q', Quality.mode);
    window.__applyQuality?.(); qv();
  };
  document.getElementById('pSound').onclick = () => {
    Quality.sound = !Quality.sound;
    localStorage.setItem('urganch_s', Quality.sound ? 'on' : 'off');
    window.__applySound?.(); sv();
  };
}

export function togglePause(force) {
  const ov = document.getElementById('pause');
  const show = force !== undefined ? force : ov.style.display === 'none';
  ov.style.display = show ? 'flex' : 'none';
  window.__paused = show;
  if (show && document.pointerLockElement) document.exitPointerLock();
  return show;
}
export function isPaused() { return !!window.__paused; }

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
  // o'yinchi (yo'nalish strelkasi)
  const [px, pz] = dot(Math.max(-4000, Math.min(4000, player.pos.x)), Math.max(-4000, Math.min(4000, player.pos.z)));
  const yaw = player.mode === 'drive' && player.car ? player.car.rotation.y : player.yaw;
  c.save();
  c.translate(px, pz);
  c.rotate(Math.atan2(-Math.sin(yaw), Math.cos(yaw)));
  c.fillStyle = '#22ff44';
  c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 5); c.lineTo(-4, 5); c.closePath(); c.fill();
  c.restore();
}

export function updateStat(player, fps) {
  const m = document.getElementById('mode');
  const spd = player.mode === 'drive' ? Math.abs(Math.round(player.speed * 3.6)) : 0;
  if (m) m.textContent = player.mode === 'walk' ? 'PIYODA' : (`MASHINA: ${(player.car?.userData.type.name || '')} ${spd} km/h`);
  const s = document.getElementById('stat');
  if (s) s.textContent = `FPS ${fps} | mashinalar ${player.cars?.length ?? 0} | bot ${window.__bots ?? 15}`;
  const cp = document.getElementById('comp');
  if (cp) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const yaw = player.mode === 'drive' && player.car ? player.car.rotation.y : player.yaw;
    cp.textContent = '🧭 ' + dirs[((Math.round(-yaw / (Math.PI / 4)) % 8) + 8) % 8];
  }
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
