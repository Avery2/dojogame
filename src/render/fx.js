// Ink splatter on hit, ink trails on heavy swings, block flash, throw burst.
const trails = []; // active heavy-swing trails

export function spawnTrail(x, y) {
  trails.push({ pts: [{x, y}], life: 12 });
}

export function feedTrails(fighter) {
  if (!(fighter.state === 'active' || fighter.state === 'startup')) return;
  if (!fighter.currentMove) return;
  const m = fighter.moves[fighter.currentMove];
  if (!m?.fx?.trail) return;
  const dx = m.hitbox.dx * fighter.facing;
  trails.push({ pts: [{ x: fighter.pos.x + dx * 0.6, y: fighter.pos.y + m.hitbox.dy }], life: 10 });
}

export function drawFx(ctx, sim) {
  ctx.save();
  // Trails
  ctx.lineCap = 'round';
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    t.life--;
    ctx.strokeStyle = `rgba(17,17,17,${t.life / 12})`;
    ctx.lineWidth = 12 * (t.life / 12);
    ctx.beginPath();
    for (let p = 0; p < t.pts.length; p++) {
      if (p === 0) ctx.moveTo(t.pts[p].x, t.pts[p].y);
      else ctx.lineTo(t.pts[p].x, t.pts[p].y);
    }
    ctx.stroke();
    if (t.life <= 0) trails.splice(i, 1);
  }

  // Hit splatters / blocks / throws / techs
  for (const e of sim.fx) {
    if (e.life === undefined) e.life = 30;
    const alpha = Math.max(0, e.life / 30);
    if (e.type === 'hit') {
      ctx.fillStyle = `rgba(179,35,27,${alpha})`;
      const r = 60 * (1 - e.life / 30);
      for (let i = 0; i < 8; i++) {
        const a = i * (Math.PI * 2 / 8) + (e.x * 0.01);
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.8, 6 + Math.random()*4, 0, Math.PI*2);
        ctx.fill();
      }
      // central splash
      ctx.beginPath();
      ctx.arc(e.x, e.y, 18 * alpha + 6, 0, Math.PI*2);
      ctx.fill();
    } else if (e.type === 'block') {
      ctx.strokeStyle = `rgba(199,155,58,${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 30 + (1 - alpha) * 30, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.type === 'throw') {
      ctx.fillStyle = `rgba(17,17,17,${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 40 * (1 - alpha) + 10, 0, Math.PI*2);
      ctx.fill();
    } else if (e.type === 'tech') {
      ctx.fillStyle = `rgba(199,155,58,${alpha})`;
      ctx.font = 'bold 28px "Yuji Mai", serif';
      ctx.textAlign = 'center';
      ctx.fillText('TECH', e.x, e.y);
    }
  }
  ctx.restore();
}
