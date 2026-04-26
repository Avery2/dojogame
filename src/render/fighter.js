// Procedural sumi-e fighter: thick brush strokes for head, torso, arms, legs.
// Pose driven by current state + a few hand-tuned offsets per state.
import { STATES } from '../fighter.js';

export function drawFighter(ctx, fighter, opts = {}) {
  const pose = fighter.def.pose;
  const sx = fighter.pos.x;
  const sy = fighter.pos.y; // feet
  const facing = fighter.facing;

  const f = poseForState(fighter, pose);
  // Wakeup blink
  if (fighter.invincible > 0 && Math.floor(fighter.invincible / 2) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#111';
  ctx.fillStyle = '#111';
  ctx.lineWidth = pose.strokeWidth;

  // Hip & shoulder anchors
  const hip = { x: sx, y: sy - f.hipY };
  const shoulder = { x: sx + f.lean * facing, y: sy - f.shoulderY };

  // Legs
  drawLimb(ctx, hip,
    { x: sx + f.leg1Knee.x * facing, y: sy - f.leg1Knee.y },
    { x: sx + f.leg1Foot.x * facing, y: sy - f.leg1Foot.y });
  drawLimb(ctx, hip,
    { x: sx + f.leg2Knee.x * facing, y: sy - f.leg2Knee.y },
    { x: sx + f.leg2Foot.x * facing, y: sy - f.leg2Foot.y });

  // Torso
  ctx.beginPath();
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(shoulder.x, shoulder.y);
  ctx.stroke();

  // Sash (red)
  ctx.save();
  ctx.strokeStyle = fighter.def.sashColor;
  ctx.lineWidth = pose.strokeWidth * 0.55;
  ctx.beginPath();
  const sashY = (hip.y + shoulder.y) / 2 + 10;
  ctx.moveTo(hip.x - 22, sashY);
  ctx.lineTo(hip.x + 22, sashY + 6);
  ctx.stroke();
  ctx.restore();

  // Arms
  drawLimb(ctx, shoulder,
    { x: sx + f.arm1Elbow.x * facing, y: sy - f.arm1Elbow.y },
    { x: sx + f.arm1Hand.x * facing, y: sy - f.arm1Hand.y });
  drawLimb(ctx, shoulder,
    { x: sx + f.arm2Elbow.x * facing, y: sy - f.arm2Elbow.y },
    { x: sx + f.arm2Hand.x * facing, y: sy - f.arm2Hand.y });

  // Head
  ctx.beginPath();
  ctx.arc(shoulder.x + facing * 4, shoulder.y - pose.headRadius - 4, pose.headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Block stance flair (subtle)
  if (isBlocking(fighter)) {
    ctx.save();
    ctx.strokeStyle = 'rgba(199, 155, 58, 0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(shoulder.x, shoulder.y - 10, pose.headRadius + 18, -Math.PI*0.7, Math.PI*0.2, false);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  // Debug hitboxes
  if (opts.showBoxes) {
    const hb = fighter.activeHitbox();
    const hu = fighter.hurtbox();
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 100, 255, 0.7)';
    ctx.strokeRect(hu.x, hu.y, hu.w, hu.h);
    if (hb) {
      ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
      ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
    }
    ctx.restore();
  }
}

function poseForState(fighter, pose) {
  const s = fighter.state;
  const phase = (fighter.stateFrame % 30) / 30;
  // Default standing pose
  let f = {
    hipY: pose.hip,
    shoulderY: pose.shoulder + pose.hip,
    lean: 0,
    leg1Knee: { x: -8, y: pose.legLen * 0.5 },
    leg1Foot: { x: -16, y: 0 },
    leg2Knee: { x: 8, y: pose.legLen * 0.5 },
    leg2Foot: { x: 16, y: 0 },
    arm1Elbow: { x: -22, y: pose.shoulder + pose.hip - 36 },
    arm1Hand:  { x: -10, y: pose.shoulder + pose.hip - 70 },
    arm2Elbow: { x: 22,  y: pose.shoulder + pose.hip - 36 },
    arm2Hand:  { x: 32,  y: pose.shoulder + pose.hip - 70 },
  };
  if (s === STATES.WALK_F || s === STATES.WALK_B) {
    const sw = Math.sin(phase * Math.PI * 2) * 14;
    f.leg1Foot.x = -16 + sw;
    f.leg2Foot.x = 16 - sw;
    f.arm1Hand.x = -10 - sw * 0.5;
    f.arm2Hand.x = 32 + sw * 0.5;
  }
  if (s === STATES.CROUCH) {
    f.hipY = pose.hip * 0.45;
    f.shoulderY = (pose.shoulder + pose.hip) * 0.6;
    f.leg1Knee = { x: -28, y: pose.legLen * 0.3 };
    f.leg2Knee = { x: 28, y: pose.legLen * 0.3 };
    f.leg1Foot = { x: -32, y: 0 };
    f.leg2Foot = { x: 32, y: 0 };
    f.arm1Elbow = { x: -30, y: f.shoulderY - 30 };
    f.arm1Hand  = { x: -10, y: f.shoulderY - 50 };
    f.arm2Elbow = { x: 30,  y: f.shoulderY - 30 };
    f.arm2Hand  = { x: 18,  y: f.shoulderY - 50 };
  }
  if (s === STATES.JUMP || !fighter.onGround) {
    f.leg1Foot.y = pose.legLen * 0.4;
    f.leg2Foot.y = pose.legLen * 0.4;
    f.leg1Knee.y = pose.legLen * 0.7;
    f.leg2Knee.y = pose.legLen * 0.7;
  }
  if (s === STATES.STARTUP || s === STATES.ACTIVE || s === STATES.RECOVERY) {
    const m = fighter.moves[fighter.currentMove];
    if (m) {
      const t = (s === STATES.ACTIVE) ? 1 : (s === STATES.STARTUP ? 0.5 : 0.7);
      // Project lead arm or leg toward hitbox
      const reach = Math.hypot(m.hitbox.dx, m.hitbox.dy);
      const ang = Math.atan2(m.hitbox.dy, m.hitbox.dx);
      const handX = Math.cos(ang) * reach * t;
      const handY = -Math.sin(ang) * reach * t * -1; // hitbox dy is screen-down negative-up; pose uses sy - y
      const targetY = pose.shoulder + pose.hip + m.hitbox.dy * t;
      const targetX = m.hitbox.dx * t;
      // Use arm2 (front) for hand-strikes, leg for sweeps/uppercuts maybe
      if (m.id.includes('sweep') || m.id === 'jump_kick') {
        f.leg2Knee = { x: targetX * 0.5, y: pose.legLen * 0.5 };
        f.leg2Foot = { x: targetX, y: -m.hitbox.dy * t };
      } else {
        f.arm2Elbow = { x: targetX * 0.5, y: pose.shoulder + pose.hip - 30 + m.hitbox.dy * 0.3 };
        f.arm2Hand  = { x: targetX, y: pose.shoulder + pose.hip + m.hitbox.dy * t };
      }
    }
  }
  if (s === STATES.HITSTUN || s === STATES.BLOCKSTUN) {
    f.lean = -8;
  }
  if (s === STATES.KNOCKDOWN) {
    f.hipY = 30;
    f.shoulderY = 50;
    f.leg1Foot = { x: -30, y: 10 };
    f.leg2Foot = { x: 30, y: 10 };
    f.leg1Knee = { x: -20, y: 15 };
    f.leg2Knee = { x: 20, y: 15 };
    f.arm1Hand = { x: -50, y: 30 };
    f.arm2Hand = { x: 50, y: 30 };
  }
  if (s === STATES.KO) {
    f.hipY = 20;
    f.shoulderY = 40;
    f.lean = -30;
  }
  return f;
}

function isBlocking(fighter) {
  if (!fighter.lastInputs) return false;
  if (fighter.isAttacking() || fighter.isStunned()) return false;
  const back = (fighter.facing === 1 ? fighter.lastInputs.held.left : fighter.lastInputs.held.right);
  return back && fighter.onGround;
}

function drawLimb(ctx, a, b, c) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(b.x, b.y, c.x, c.y);
  ctx.stroke();
}
