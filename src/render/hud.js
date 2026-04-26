// HUD: dual health bars, super meter, round timer, round-win pips, banner.
export function drawHud(ctx, sim, w, h) {
  const margin = 28;
  const barW = w * 0.36;
  const barH = 22;
  const meterH = 10;
  // P1 health (left, fills right→left as damage)
  drawBar(ctx, margin, margin, barW, barH, sim.fighters.p1.health / sim.rules.maxHealth, 'left');
  // P2 health (right, fills left→right)
  drawBar(ctx, w - margin - barW, margin, barW, barH, sim.fighters.p2.health / sim.rules.maxHealth, 'right');

  // Super meters
  drawSuper(ctx, margin, margin + barH + 4, barW, meterH, sim.fighters.p1.super / sim.rules.superMax, 'left');
  drawSuper(ctx, w - margin - barW, margin + barH + 4, barW, meterH, sim.fighters.p2.super / sim.rules.superMax, 'right');

  // Names
  ctx.save();
  ctx.fillStyle = '#111';
  ctx.font = '20px "Cormorant Garamond", serif';
  ctx.textBaseline = 'top';
  ctx.fillText(sim.fighters.p1.def.name + ' (P1)', margin, margin + barH + meterH + 8);
  ctx.textAlign = 'right';
  ctx.fillText('(P2) ' + sim.fighters.p2.def.name, w - margin, margin + barH + meterH + 8);
  ctx.restore();

  // Timer
  ctx.save();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 44px "Yuji Mai", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(String(sim.remainingSeconds()).padStart(2, '0'), w/2, margin - 6);
  ctx.restore();

  // Round pips
  drawPips(ctx, w/2 - 60, margin + 56, sim.roundsP1Won, sim.rules.roundsToWin, 'left');
  drawPips(ctx, w/2 + 60, margin + 56, sim.roundsP2Won, sim.rules.roundsToWin, 'right');

  // Banner
  if (sim.banner) {
    const a = Math.min(1, sim.banner.frames / 80);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#b3231b';
    ctx.font = 'bold 96px "Yuji Mai", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sim.banner.text, w/2, h * 0.32);
    ctx.restore();
  }
}

function drawBar(ctx, x, y, w, h, frac, side) {
  ctx.save();
  ctx.fillStyle = 'rgba(17,17,17,0.15)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#b3231b';
  const fw = w * Math.max(0, Math.min(1, frac));
  if (side === 'left') {
    ctx.fillRect(x + (w - fw), y, fw, h);
  } else {
    ctx.fillRect(x, y, fw, h);
  }
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawSuper(ctx, x, y, w, h, frac, side) {
  ctx.save();
  ctx.fillStyle = 'rgba(17,17,17,0.1)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#c79b3a';
  const fw = w * Math.max(0, Math.min(1, frac));
  if (side === 'left') ctx.fillRect(x + (w - fw), y, fw, h);
  else ctx.fillRect(x, y, fw, h);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawPips(ctx, x, y, won, total, side) {
  ctx.save();
  for (let i = 0; i < total; i++) {
    const cx = side === 'left' ? x - i * 18 : x + i * 18;
    ctx.beginPath();
    ctx.arc(cx, y, 6, 0, Math.PI*2);
    ctx.fillStyle = i < won ? '#b3231b' : 'rgba(17,17,17,0.2)';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}
