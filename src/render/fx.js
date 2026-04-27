// Pixel-art FX: chunky red squares for hits, dark squares for trails,
// gold ring for blocks, "TECH" text on tech.

const trails = []; // active heavy-swing trails

export function spawnTrail(x, y) {
  trails.push({ pts: [{x, y}], life: 12 });
}

export function feedTrails(fighter) {
  if (fighter.state !== 'active') return;
  if (!fighter.currentMove) return;
  const m = fighter.moves[fighter.currentMove];
  if (!m?.fx?.trail) return;
  const dx = m.hitbox.dx * fighter.facing;
  trails.push({ pts: [{ x: fighter.pos.x + dx, y: fighter.pos.y + m.hitbox.dy }], life: 8 });
}

export function drawFx(ctx, sim) {
  ctx.imageSmoothingEnabled = false;

  // Trails (dark pixel ghost squares)
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    t.life--;
    const a = Math.max(0, t.life / 8);
    ctx.fillStyle = `rgba(17,17,17,${a})`;
    for (const p of t.pts) {
      ctx.fillRect(Math.round(p.x) - 6, Math.round(p.y) - 6, 12, 12);
    }
    if (t.life <= 0) trails.splice(i, 1);
  }

  for (const e of sim.fx) {
    if (e.life === undefined) e.life = 30;
    const alpha = Math.max(0, e.life / 30);
    if (e.type === 'hit') {
      ctx.fillStyle = `rgba(179,35,27,${alpha})`;
      const r = 30 + (1 - alpha) * 40;
      // 8 chunky pixel "shards"
      for (let i = 0; i < 8; i++) {
        const ang = i * (Math.PI * 2 / 8) + e.x * 0.0021;
        const px = Math.round(e.x + Math.cos(ang) * r);
        const py = Math.round(e.y + Math.sin(ang) * r * 0.8);
        ctx.fillRect(px - 4, py - 4, 8, 8);
      }
      // Center burst
      const c = Math.round(8 + (1 - alpha) * 12);
      ctx.fillRect(Math.round(e.x) - c / 2, Math.round(e.y) - c / 2, c, c);
    } else if (e.type === 'block') {
      ctx.fillStyle = `rgba(199,155,58,${alpha})`;
      const r = 24 + (1 - alpha) * 24;
      for (let i = 0; i < 12; i++) {
        const ang = i * (Math.PI * 2 / 12);
        const px = Math.round(e.x + Math.cos(ang) * r);
        const py = Math.round(e.y + Math.sin(ang) * r);
        ctx.fillRect(px - 3, py - 3, 6, 6);
      }
    } else if (e.type === 'throw') {
      ctx.fillStyle = `rgba(17,17,17,${alpha * 0.85})`;
      for (let i = 0; i < 16; i++) {
        const ang = i * (Math.PI * 2 / 16);
        const r = 20 + (1 - alpha) * 30;
        const px = Math.round(e.x + Math.cos(ang) * r);
        const py = Math.round(e.y + Math.sin(ang) * r);
        ctx.fillRect(px - 4, py - 4, 8, 8);
      }
    } else if (e.type === 'tech') {
      ctx.fillStyle = `rgba(199,155,58,${alpha})`;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TECH', e.x, e.y);
    }
  }
}
