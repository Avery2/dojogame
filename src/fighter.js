// Fighter FSM + move interpreter. Pure simulation — no rendering, no input reading
// (tick receives an `edges` object: { pressed, released, held } per action).

export const STATES = {
  IDLE: 'idle',
  WALK_F: 'walk_f',
  WALK_B: 'walk_b',
  CROUCH: 'crouch',
  JUMP: 'jump',
  STARTUP: 'startup',
  ACTIVE: 'active',
  RECOVERY: 'recovery',
  BLOCKSTUN: 'blockstun',
  HITSTUN: 'hitstun',
  KNOCKDOWN: 'knockdown',
  WAKEUP: 'wakeup',
  THROWN: 'thrown',
  KO: 'ko',
};

export class Fighter {
  constructor({ slot, def, moves, rules, x, facing }) {
    this.slot = slot;
    this.def = def;
    this.moves = moves;
    this.rules = rules;
    this.health = rules.maxHealth;
    this.super = 0;
    this.pos = { x, y: groundY(rules) };
    this.vel = { x: 0, y: 0 };
    this.facing = facing;
    this.onGround = true;
    this.airAttackUsed = false;
    this.state = STATES.IDLE;
    this.stateFrame = 0;
    this.currentMove = null;
    this.moveFrame = 0;
    this.moveConnected = false;
    this.combo = 0;
    this.lastHitFrame = -999;
    this.invincible = 0;
    this.throwTechFrames = 0; // frames since last simultaneous throw input
    this.hitstopFrames = 0;
    this.lastInputs = null;
  }

  isAttacking() {
    return this.state === STATES.STARTUP || this.state === STATES.ACTIVE || this.state === STATES.RECOVERY;
  }
  isStunned() {
    return this.state === STATES.HITSTUN || this.state === STATES.BLOCKSTUN ||
      this.state === STATES.KNOCKDOWN || this.state === STATES.THROWN;
  }
  isInvincible() { return this.invincible > 0 || this.state === STATES.KO || this.state === STATES.THROWN; }

  hurtbox() {
    const crouching = this.state === STATES.CROUCH ||
      (this.currentMove && this.moves[this.currentMove]?.stance === 'crouching');
    const w = 70;
    const h = crouching ? 110 : 200;
    return { x: this.pos.x - w/2, y: this.pos.y - h, w, h };
  }

  activeHitbox() {
    if (this.state !== STATES.ACTIVE || !this.currentMove) return null;
    const m = this.moves[this.currentMove];
    if (!m?.hitbox) return null;
    const dx = m.hitbox.dx * this.facing;
    return {
      x: this.pos.x + dx - m.hitbox.w/2,
      y: this.pos.y + m.hitbox.dy - m.hitbox.h/2,
      w: m.hitbox.w,
      h: m.hitbox.h,
      move: m,
    };
  }

  faceOpponent(opponent) {
    if (this.isStunned() || this.isAttacking() || !this.onGround) return;
    if (this.state === STATES.KNOCKDOWN || this.state === STATES.WAKEUP || this.state === STATES.KO) return;
    const dir = opponent.pos.x >= this.pos.x ? 1 : -1;
    this.facing = dir;
  }

  // Step the FSM by one frame. Edges = { pressed, released, held } from edgeTracker.
  tick(edges, opponent, sim) {
    this.lastInputs = edges;
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--;
      return;
    }
    if (this.invincible > 0) this.invincible--;

    // Track simultaneous throw tech input window (for defender)
    if (edges.pressed.light && edges.pressed.heavy) this.throwTechFrames = this.rules.throwTechWindow;
    else if (this.throwTechFrames > 0) this.throwTechFrames--;

    // Apply gravity / motion
    if (!this.onGround) {
      this.vel.y += this.rules.gravity;
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;
      const gy = groundY(this.rules);
      if (this.pos.y >= gy) {
        this.pos.y = gy;
        this.vel.x = 0;
        this.vel.y = 0;
        this.onGround = true;
        this.airAttackUsed = false;
        if (this.state === STATES.JUMP) this.transition(STATES.IDLE);
        if (this.state === STATES.HITSTUN) this.transition(STATES.KNOCKDOWN, 22);
        if (this.state === STATES.THROWN) this.transition(STATES.KNOCKDOWN, 22);
      }
    }

    // State machine
    switch (this.state) {
      case STATES.IDLE:
      case STATES.WALK_F:
      case STATES.WALK_B:
        this.tickGroundNeutral(edges, opponent, sim);
        break;
      case STATES.CROUCH:
        this.tickCrouch(edges, opponent, sim);
        break;
      case STATES.JUMP:
        this.tickJump(edges, opponent, sim);
        break;
      case STATES.STARTUP:
      case STATES.ACTIVE:
      case STATES.RECOVERY:
        this.tickAttack(edges, opponent, sim);
        break;
      case STATES.BLOCKSTUN:
      case STATES.HITSTUN:
        this.stateFrame--;
        if (this.stateFrame <= 0) this.transition(STATES.IDLE);
        break;
      case STATES.KNOCKDOWN:
        this.stateFrame--;
        if (this.stateFrame <= 0) {
          this.invincible = this.rules.wakeupInvincibleFrames;
          this.transition(STATES.WAKEUP, this.rules.wakeupInvincibleFrames);
        }
        break;
      case STATES.WAKEUP:
        this.stateFrame--;
        if (this.stateFrame <= 0) this.transition(STATES.IDLE);
        break;
      case STATES.THROWN:
        // Animated by attacker via grabHold; auto-resolved when active->recovery on attacker
        this.stateFrame--;
        if (this.stateFrame <= 0) this.transition(STATES.IDLE);
        break;
      case STATES.KO:
        break;
    }

    this.stateFrame++;
    this.combo = (sim.framesSinceLastHit(this.slot) > 30) ? 0 : this.combo;
  }

  tickGroundNeutral(edges, opponent, sim) {
    // Crouch transition
    if (edges.held.down) { this.transition(STATES.CROUCH); return; }
    // Jump transition
    if (edges.pressed.up) {
      this.vel.y = this.rules.jumpVelocity;
      this.vel.x = (edges.held.left ? -1 : edges.held.right ? 1 : 0) * this.rules.walkSpeed * 0.9;
      this.onGround = false;
      this.transition(STATES.JUMP);
      return;
    }
    // Throw input (light + heavy together)
    if (edges.pressed.light && edges.pressed.heavy) {
      this.startMove('throw');
      return;
    }
    if (edges.pressed.special && this.super >= (this.moves.special?.meterCost || 0)) {
      this.startMove('special');
      this.super -= (this.moves.special?.meterCost || 0);
      return;
    }
    if (edges.pressed.heavy) { this.startMove('heavy'); return; }
    if (edges.pressed.light) { this.startMove('light'); return; }
    // Walk
    const back = (this.facing === 1 ? edges.held.left : edges.held.right);
    const fwd  = (this.facing === 1 ? edges.held.right : edges.held.left);
    if (fwd) {
      this.pos.x += this.rules.walkSpeed * this.facing;
      this.transition(STATES.WALK_F, null, /*reset*/false);
      this.state = STATES.WALK_F;
    } else if (back) {
      this.pos.x -= this.rules.walkSpeed * this.facing;
      this.transition(STATES.WALK_B, null, false);
      this.state = STATES.WALK_B;
    } else {
      this.state = STATES.IDLE;
    }
  }

  tickCrouch(edges, opponent, sim) {
    if (!edges.held.down) { this.transition(STATES.IDLE); return; }
    if (edges.pressed.light && edges.pressed.heavy) { this.startMove('throw'); return; }
    if (edges.pressed.heavy) { this.startMove('heavy_crouch'); return; }
    if (edges.pressed.light) { this.startMove('light_crouch'); return; }
    if (edges.pressed.special) { this.startMove('sweep'); return; }
  }

  tickJump(edges, opponent, sim) {
    // Air control
    const dir = (edges.held.left ? -1 : edges.held.right ? 1 : 0);
    if (dir !== 0) {
      this.vel.x += dir * this.rules.airControl;
      const max = this.rules.walkSpeed * 1.4;
      this.vel.x = Math.max(-max, Math.min(max, this.vel.x));
    }
    if (!this.airAttackUsed && (edges.pressed.light || edges.pressed.heavy || edges.pressed.special)) {
      this.startMove('jump_kick');
      this.airAttackUsed = true;
    }
  }

  tickAttack(edges, opponent, sim) {
    const m = this.moves[this.currentMove];
    if (!m) { this.transition(STATES.IDLE); return; }
    this.moveFrame++;
    if (this.state === STATES.STARTUP && this.moveFrame > m.startup) {
      this.state = STATES.ACTIVE;
      this.stateFrame = 0;
    }
    if (this.state === STATES.ACTIVE && this.moveFrame > m.startup + m.active) {
      this.state = STATES.RECOVERY;
      this.stateFrame = 0;
    }
    if (this.state === STATES.RECOVERY) {
      // Cancel into a follow-up move?
      if (this.moveConnected && m.cancelsInto.length > 0) {
        const cw = m.cancelWindow || [0, 0];
        const recoveryFrame = this.moveFrame - (m.startup + m.active);
        if (recoveryFrame >= cw[0] && recoveryFrame <= cw[1]) {
          const next = pickCancelTarget(edges, m, this);
          if (next) { this.startMove(next); return; }
        }
      }
      if (this.moveFrame >= m.startup + m.active + m.recovery) {
        this.transition(this.onGround ? STATES.IDLE : STATES.JUMP);
      }
    }
    // No movement during attacks except aerial drift handled by gravity
  }

  startMove(id) {
    const m = this.moves[id];
    if (!m) return;
    this.currentMove = id;
    this.moveFrame = 0;
    this.moveConnected = false;
    this.state = STATES.STARTUP;
    this.stateFrame = 0;
  }

  transition(state, frames = null, reset = true) {
    this.state = state;
    if (reset) this.stateFrame = 0;
    if (frames !== null) this.stateFrame = frames;
  }

  receiveHit(move, attacker, sim) {
    const counter = (this.state === STATES.STARTUP);
    const scaling = this.rules.comboScaling[Math.min(attacker.combo, this.rules.comboScaling.length - 1)];
    let dmg = move.damage * scaling;
    let hitstun = move.hitstun;
    if (counter) {
      dmg *= (1 + (move.counterHit?.damageBonus || 0));
      hitstun += (move.counterHit?.hitstunBonus || 0);
    }
    dmg = Math.round(dmg);
    this.health = Math.max(0, this.health - dmg);
    attacker.combo += 1;
    attacker.moveConnected = true;
    attacker.super = Math.min(this.rules.superMax, attacker.super + dmg * 0.6);
    this.super = Math.min(this.rules.superMax, this.super + dmg * this.rules.superGainPerDamage / 4);

    // Hitstop both
    const hs = clamp(move.hitstop, this.rules.hitstopMin, this.rules.hitstopMax);
    this.hitstopFrames = hs;
    attacker.hitstopFrames = hs;

    // Knockback
    const dir = attacker.facing;
    this.vel.x = move.knockback.x * dir;
    if (move.knockback.y < 0) {
      this.vel.y = move.knockback.y;
      this.onGround = false;
    }
    this.pos.x += this.vel.x; // immediate small push

    if (move.knockdown || !this.onGround) {
      this.transition(STATES.HITSTUN, hitstun);
      // landing later transitions to KNOCKDOWN
      if (move.knockdown && this.onGround) {
        this.vel.y = move.knockback.y || -8;
        this.onGround = false;
      }
    } else {
      this.transition(STATES.HITSTUN, hitstun);
    }

    sim.fx.push({ type: 'hit', x: this.pos.x, y: this.pos.y - 100, dmg });
    sim.events.push({ kind: 'hit' });
    sim.recordHit(attacker.slot);

    if (this.health <= 0) this.transition(STATES.KO);
  }

  receiveBlock(move, attacker, sim) {
    const chip = Math.round((move.chip || 0) * (1 - 0));
    this.health = Math.max(1, this.health - chip); // chip won't KO unless from a move that does
    if (chip > 0 && this.health <= 0) this.health = 1;
    this.transition(STATES.BLOCKSTUN, move.blockstun);
    const hs = clamp(move.hitstop, this.rules.hitstopMin, this.rules.hitstopMax);
    this.hitstopFrames = hs;
    attacker.hitstopFrames = hs;
    this.vel.x = (move.knockback.x * 0.5) * attacker.facing;
    this.pos.x += this.vel.x;
    sim.fx.push({ type: 'block', x: this.pos.x, y: this.pos.y - 100 });
    sim.events.push({ kind: 'block' });
    sim.recordBlock(attacker.slot);
  }

  receiveThrow(move, attacker, sim) {
    const dmg = Math.round(move.damage);
    this.health = Math.max(0, this.health - dmg);
    attacker.combo = 1;
    attacker.moveConnected = true;
    const dir = attacker.facing;
    this.vel.x = move.knockback.x * dir;
    this.vel.y = move.knockback.y;
    this.onGround = false;
    this.transition(STATES.THROWN, 30);
    sim.fx.push({ type: 'throw', x: this.pos.x, y: this.pos.y - 100, dmg });
    sim.events.push({ kind: 'throw' });
    sim.recordHit(attacker.slot);
    if (this.health <= 0) this.transition(STATES.KO);
  }

  techThrow(attacker, sim) {
    // both pushed back, no damage
    this.vel.x = -4 * attacker.facing;
    attacker.vel.x = -4 * (-attacker.facing);
    this.transition(STATES.IDLE);
    attacker.transition(STATES.IDLE);
    attacker.currentMove = null;
    sim.fx.push({ type: 'tech', x: (this.pos.x + attacker.pos.x)/2, y: this.pos.y - 80 });
    sim.events.push({ kind: 'tech' });
  }
}

function groundY(rules) {
  return rules.stageHeight * rules.groundY;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function pickCancelTarget(edges, currentMove, fighter) {
  // Order matters: special > heavy > light, and crouch variants if down held.
  const crouching = edges.held.down;
  if (edges.pressed.special && currentMove.cancelsInto.includes('special') &&
      fighter.super >= (fighter.moves.special?.meterCost || 0)) {
    fighter.super -= (fighter.moves.special?.meterCost || 0);
    return 'special';
  }
  if (edges.pressed.special && crouching && currentMove.cancelsInto.includes('sweep')) return 'sweep';
  if (edges.pressed.heavy) {
    if (crouching && currentMove.cancelsInto.includes('heavy_crouch')) return 'heavy_crouch';
    if (currentMove.cancelsInto.includes('heavy')) return 'heavy';
  }
  if (edges.pressed.light && currentMove.cancelsInto.includes('light')) return 'light';
  return null;
}
