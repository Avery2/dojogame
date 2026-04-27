// Pixel-art fighter: chunky filled rectangles. Pose is computed in
// fighter-local coordinates where x is facing-relative (forward = +x) and y
// matches screen direction (up = -y, down = +y, with y=0 at the feet).
//
// Critical: during ACTIVE frames the leading fist/foot is forced to the
// hitbox center (move.hitbox.dx, move.hitbox.dy). That guarantees the
// rendered punch/kick visually lands where the simulation says it does.

import { STATES } from '../fighter.js';

const PX = 4;                  // base pixel size
const COLOR_INK = '#111';
const COLOR_FIST = '#0f0f0f';
const COLOR_PAPER = '#efe7d6';

export function drawFighter(ctx, fighter, opts = {}) {
  ctx.imageSmoothingEnabled = false;
  const sx = Math.round(fighter.pos.x);
  const sy = Math.round(fighter.pos.y);
  const facing = fighter.facing;

  const pose = computePose(fighter);

  // Wakeup invincibility = blink the whole figure
  if (fighter.invincible > 0 && Math.floor(fighter.invincible / 3) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }

  // Draw order: legs (back), torso, arms (back), head, sash, arms (front), legs (front), fists
  drawLimb(ctx, sx, sy, facing, pose.hip, pose.legBack.knee, 6, COLOR_INK);
  drawLimb(ctx, sx, sy, facing, pose.legBack.knee, pose.legBack.foot, 6, COLOR_INK);
  drawRect(ctx, sx, sy, facing, pose.legBack.foot, 12, 4, COLOR_INK);

  // Torso (filled rect from hip to shoulder)
  drawTorso(ctx, sx, sy, facing, pose.hip, pose.shoulder, 14, COLOR_INK);

  drawLimb(ctx, sx, sy, facing, pose.shoulder, pose.armBack.elbow, 5, COLOR_INK);
  drawLimb(ctx, sx, sy, facing, pose.armBack.elbow, pose.armBack.fist, 5, COLOR_INK);

  // Head: square head with two pixel "eyes"
  drawRect(ctx, sx, sy, facing, pose.head, 18, 18, COLOR_INK);
  drawRect(ctx, sx, sy, facing, { x: pose.head.x + 3, y: pose.head.y - 1 }, 2, 2, COLOR_PAPER);
  drawRect(ctx, sx, sy, facing, { x: pose.head.x - 4, y: pose.head.y - 1 }, 2, 2, COLOR_PAPER);

  // Sash (red horizontal band across waist)
  const waistY = (pose.hip.y + pose.shoulder.y) / 2 + 6;
  drawRect(ctx, sx, sy, facing, { x: 0, y: waistY }, 22, 6, fighter.def.sashColor);
  drawRect(ctx, sx, sy, facing, { x: 6, y: waistY + 6 }, 4, 8, fighter.def.sashColor);

  // Front arm
  drawLimb(ctx, sx, sy, facing, pose.shoulder, pose.armFront.elbow, 5, COLOR_INK);
  drawLimb(ctx, sx, sy, facing, pose.armFront.elbow, pose.armFront.fist, 5, COLOR_INK);

  // Front leg
  drawLimb(ctx, sx, sy, facing, pose.hip, pose.legFront.knee, 6, COLOR_INK);
  drawLimb(ctx, sx, sy, facing, pose.legFront.knee, pose.legFront.foot, 6, COLOR_INK);
  drawRect(ctx, sx, sy, facing, pose.legFront.foot, 12, 4, COLOR_INK);

  // Fists (drawn after arms so they're on top)
  drawRect(ctx, sx, sy, facing, pose.armFront.fist, 8, 8, COLOR_FIST);
  drawRect(ctx, sx, sy, facing, pose.armBack.fist, 8, 8, COLOR_FIST);

  ctx.globalAlpha = 1;

  if (opts.showBoxes) {
    const hb = fighter.activeHitbox();
    const hu = fighter.hurtbox();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 100, 255, 0.7)';
    ctx.strokeRect(hu.x, hu.y, hu.w, hu.h);
    if (hb) {
      ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
      ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
    }
  }
}

function computePose(fighter) {
  const p = fighter.def.pose;
  const phase = (fighter.stateFrame % 30) / 30;

  // Defaults: standing relaxed
  const hipY = -(p.hip);
  const shoulderY = -(p.hip + p.shoulder);
  const headY = shoulderY - p.headRadius - 4;
  const pose = {
    hip: { x: 0, y: hipY },
    shoulder: { x: 0, y: shoulderY },
    head: { x: 0, y: headY },
    armBack: {
      elbow: { x: -10, y: shoulderY + 28 },
      fist:  { x: -12, y: shoulderY + 56 },
    },
    armFront: {
      elbow: { x: 12, y: shoulderY + 28 },
      fist:  { x: 14, y: shoulderY + 56 },
    },
    legBack: {
      knee: { x: -6, y: hipY + p.legLen * 0.45 },
      foot: { x: -14, y: 0 },
    },
    legFront: {
      knee: { x: 6, y: hipY + p.legLen * 0.45 },
      foot: { x: 14, y: 0 },
    },
  };

  const s = fighter.state;
  if (s === STATES.WALK_F || s === STATES.WALK_B) {
    const sw = Math.sin(phase * Math.PI * 2) * 14;
    pose.legFront.foot.x = 14 + sw;
    pose.legBack.foot.x = -14 - sw;
    pose.armFront.fist.x = 14 - sw * 0.4;
    pose.armBack.fist.x = -12 + sw * 0.4;
  }
  if (s === STATES.CROUCH) {
    const cy = -(p.hip * 0.5);
    const sy2 = cy - p.shoulder * 0.65;
    pose.hip.y = cy;
    pose.shoulder.y = sy2;
    pose.head.y = sy2 - p.headRadius - 4;
    pose.legBack.knee = { x: -22, y: cy + 16 };
    pose.legFront.knee = { x: 22, y: cy + 16 };
    pose.legBack.foot = { x: -28, y: 0 };
    pose.legFront.foot = { x: 28, y: 0 };
    pose.armBack.elbow = { x: -16, y: sy2 + 22 };
    pose.armBack.fist  = { x: -8,  y: sy2 + 38 };
    pose.armFront.elbow = { x: 18, y: sy2 + 22 };
    pose.armFront.fist  = { x: 16, y: sy2 + 38 };
  }
  if (!fighter.onGround) {
    // Tucked legs while in the air
    pose.legBack.knee.y = hipY + 18;
    pose.legBack.foot = { x: -10, y: hipY + 36 };
    pose.legFront.knee.y = hipY + 18;
    pose.legFront.foot = { x: 10, y: hipY + 36 };
  }
  if (s === STATES.HITSTUN || s === STATES.BLOCKSTUN) {
    pose.head.x = -4;
    pose.shoulder.x = -2;
    pose.armBack.fist.x = -18;
    pose.armBack.fist.y = shoulderY + 70;
    pose.armFront.fist.x = -8;
  }
  if (s === STATES.KNOCKDOWN) {
    // Lying on back, feet to the rear
    pose.hip = { x: -4, y: -10 };
    pose.shoulder = { x: 14, y: -16 };
    pose.head = { x: 22, y: -20 };
    pose.armBack.elbow = { x: 8, y: -8 };
    pose.armBack.fist  = { x: -2, y: -4 };
    pose.armFront.elbow = { x: 18, y: -10 };
    pose.armFront.fist  = { x: 26, y: -4 };
    pose.legBack.knee = { x: -16, y: -12 };
    pose.legBack.foot = { x: -28, y: -4 };
    pose.legFront.knee = { x: -14, y: -18 };
    pose.legFront.foot = { x: -26, y: -10 };
  }
  if (s === STATES.KO) {
    pose.hip = { x: 0, y: -6 };
    pose.shoulder = { x: -12, y: -10 };
    pose.head = { x: -22, y: -14 };
    pose.armBack.elbow = { x: -8, y: -4 };
    pose.armBack.fist  = { x: -16, y: 0 };
    pose.armFront.elbow = { x: -10, y: -8 };
    pose.armFront.fist  = { x: -20, y: -2 };
    pose.legBack.knee = { x: 14, y: -8 };
    pose.legBack.foot = { x: 26, y: -2 };
    pose.legFront.knee = { x: 12, y: -14 };
    pose.legFront.foot = { x: 24, y: -8 };
  }

  // === Hitbox alignment ===
  // During ACTIVE frames, force the leading fist/foot to the hitbox center so
  // the visible strike lands exactly on the simulation hitbox.
  if (s === STATES.ACTIVE && fighter.currentMove) {
    const m = fighter.moves[fighter.currentMove];
    if (m && m.hitbox) {
      const hbx = m.hitbox.dx;
      const hby = m.hitbox.dy;
      const id = m.id;
      if (id === 'sweep' || id === 'jump_kick' || id === 'heavy_crouch' || id === 'light_crouch') {
        pose.legFront.foot = { x: hbx, y: hby };
        pose.legFront.knee = {
          x: (pose.hip.x + hbx) / 2,
          y: (pose.hip.y + hby) / 2 + 8,
        };
      } else {
        pose.armFront.fist = { x: hbx, y: hby };
        pose.armFront.elbow = {
          x: (pose.shoulder.x + hbx) / 2,
          y: (pose.shoulder.y + hby) / 2 - 6,
        };
      }
    }
  }
  if (s === STATES.STARTUP && fighter.currentMove) {
    // Wind-up: fist/foot pulled back toward shoulder (visual telegraph)
    const m = fighter.moves[fighter.currentMove];
    if (m && m.hitbox) {
      const t = Math.min(1, fighter.moveFrame / Math.max(1, m.startup));
      const id = m.id;
      const targetX = m.hitbox.dx;
      const targetY = m.hitbox.dy;
      if (id === 'sweep' || id === 'jump_kick' || id === 'heavy_crouch' || id === 'light_crouch') {
        pose.legFront.foot = lerpPt(pose.legFront.foot, { x: targetX, y: targetY }, t * 0.4);
      } else {
        pose.armFront.fist = lerpPt({ x: -16, y: pose.shoulder.y + 40 }, { x: targetX, y: targetY }, t);
        pose.armFront.elbow = lerpPt(pose.armFront.elbow, { x: targetX * 0.4, y: pose.shoulder.y + 24 }, t);
      }
    }
  }
  if (s === STATES.RECOVERY && fighter.currentMove) {
    const m = fighter.moves[fighter.currentMove];
    if (m && m.hitbox) {
      const r = fighter.moveFrame - (m.startup + m.active);
      const t = Math.min(1, r / Math.max(1, m.recovery));
      const startFist = { x: m.hitbox.dx, y: m.hitbox.dy };
      pose.armFront.fist = lerpPt(startFist, { x: 14, y: pose.shoulder.y + 56 }, t);
    }
  }

  return pose;
}

function lerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function drawRect(ctx, sx, sy, facing, p, w, h, color) {
  const x = Math.round(sx + p.x * facing - w / 2);
  const y = Math.round(sy + p.y - h / 2);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(w), Math.round(h));
}

function drawTorso(ctx, sx, sy, facing, hip, shoulder, w, color) {
  const x1 = sx + hip.x * facing;
  const y1 = sy + hip.y;
  const x2 = sx + shoulder.x * facing;
  const y2 = sy + shoulder.y;
  // Step pixels along torso line, drawing a fixed-width bar at each.
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  const steps = Math.ceil(len / PX);
  ctx.fillStyle = color;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(x1 + dx * t);
    const cy = Math.round(y1 + dy * t);
    ctx.fillRect(cx - Math.round(w / 2), cy - PX / 2, w, PX);
  }
}

function drawLimb(ctx, sx, sy, facing, a, b, thick, color) {
  const x1 = sx + a.x * facing;
  const y1 = sy + a.y;
  const x2 = sx + b.x * facing;
  const y2 = sy + b.y;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  const steps = Math.max(2, Math.ceil(len / PX));
  ctx.fillStyle = color;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(x1 + dx * t);
    const cy = Math.round(y1 + dy * t);
    ctx.fillRect(cx - thick / 2, cy - thick / 2, thick, thick);
  }
}
