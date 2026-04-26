import { Fighter, STATES } from './fighter.js';

export class Simulation {
  constructor({ rules, moves, p1Def, p2Def }) {
    this.rules = rules;
    this.moves = moves;
    this.fx = [];
    this.events = []; // drained each tick by host (audio cues etc.)
    this.frame = 0;
    this.roundFrame = 0;
    this.roundsP1Won = 0;
    this.roundsP2Won = 0;
    this.roundOver = false;
    this.roundOverTimer = 0;
    this.roundOverWinner = null; // 'p1' | 'p2' | 'draw'
    this.matchOver = false;
    this.banner = null; // {text, frames}
    this.shake = 0;
    this.lastHitFrame = { p1: -999, p2: -999 };
    this.fighters = {
      p1: new Fighter({
        slot: 'p1', def: p1Def, moves, rules,
        x: rules.stageWidth / 2 - rules.fighterSpacing,
        facing: 1,
      }),
      p2: new Fighter({
        slot: 'p2', def: p2Def, moves, rules,
        x: rules.stageWidth / 2 + rules.fighterSpacing,
        facing: -1,
      }),
    };
  }

  framesSinceLastHit(slot) { return this.frame - this.lastHitFrame[slot]; }
  recordHit(slot) { this.lastHitFrame[slot] = this.frame; }
  recordBlock(slot) { /* no-op for now */ }

  remainingSeconds() {
    const elapsed = this.roundFrame / this.rules.fps;
    return Math.max(0, Math.ceil(this.rules.roundSeconds - elapsed));
  }

  resetRound(swap = false) {
    this.fx = [];
    this.roundFrame = 0;
    this.roundOver = false;
    this.roundOverTimer = 0;
    this.roundOverWinner = null;
    this.shake = 0;
    this.banner = { text: 'Begin', frames: 90 };
    const p1 = this.fighters.p1;
    const p2 = this.fighters.p2;
    p1.health = this.rules.maxHealth; p2.health = this.rules.maxHealth;
    p1.super = 0; p2.super = 0;
    p1.combo = 0; p2.combo = 0;
    p1.pos = { x: this.rules.stageWidth/2 - this.rules.fighterSpacing, y: this.rules.stageHeight*this.rules.groundY };
    p2.pos = { x: this.rules.stageWidth/2 + this.rules.fighterSpacing, y: this.rules.stageHeight*this.rules.groundY };
    p1.vel = {x:0,y:0}; p2.vel = {x:0,y:0};
    p1.facing = 1; p2.facing = -1;
    p1.onGround = true; p2.onGround = true;
    p1.airAttackUsed = false; p2.airAttackUsed = false;
    p1.invincible = 0; p2.invincible = 0;
    p1.hitstopFrames = 0; p2.hitstopFrames = 0;
    p1.state = STATES.IDLE; p2.state = STATES.IDLE;
    p1.stateFrame = 0; p2.stateFrame = 0;
    p1.currentMove = null; p2.currentMove = null;
  }

  resetMatch() {
    this.roundsP1Won = 0;
    this.roundsP2Won = 0;
    this.matchOver = false;
    this.resetRound();
  }

  tick(p1Edges, p2Edges) {
    this.frame++;
    this.events.length = 0;
    if (!this.roundOver) this.roundFrame++;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 1);
    if (this.banner) {
      this.banner.frames--;
      if (this.banner.frames <= 0) this.banner = null;
    }

    const p1 = this.fighters.p1;
    const p2 = this.fighters.p2;

    if (!this.roundOver) {
      p1.faceOpponent(p2);
      p2.faceOpponent(p1);

      p1.tick(p1Edges, p2, this);
      p2.tick(p2Edges, p1, this);

      this._resolveCollisions();
      this._resolveHits();
      this._clampToStage();

      // Round ends?
      if (p1.health <= 0 || p2.health <= 0) {
        this.roundOver = true;
        this.roundOverTimer = 120;
        if (p1.health <= 0 && p2.health <= 0) this.roundOverWinner = 'draw';
        else if (p1.health <= 0) { this.roundOverWinner = 'p2'; this.roundsP2Won++; }
        else { this.roundOverWinner = 'p1'; this.roundsP1Won++; }
        this.banner = { text: this.roundOverWinner === 'draw' ? 'Double KO' : (this.roundOverWinner === 'p1' ? 'P1 Wins' : 'P2 Wins'), frames: 200 };
        this.shake = 30;
        if (this.roundsP1Won >= this.rules.roundsToWin || this.roundsP2Won >= this.rules.roundsToWin) {
          this.matchOver = true;
        }
      } else if (this.remainingSeconds() <= 0) {
        this.roundOver = true;
        this.roundOverTimer = 120;
        this.roundOverWinner = p1.health > p2.health ? 'p1' : (p2.health > p1.health ? 'p2' : 'draw');
        if (this.roundOverWinner === 'p1') this.roundsP1Won++;
        else if (this.roundOverWinner === 'p2') this.roundsP2Won++;
        this.banner = { text: 'Time', frames: 200 };
        if (this.roundsP1Won >= this.rules.roundsToWin || this.roundsP2Won >= this.rules.roundsToWin) {
          this.matchOver = true;
        }
      }
    } else {
      this.roundOverTimer--;
    }

    // Trim fx (new fx default to life=30 if not set)
    for (const f of this.fx) if (f.life === undefined) f.life = 30;
    this.fx = this.fx.filter(f => --f.life > 0);
  }

  _resolveCollisions() {
    // Keep a minimum pushbox separation when both grounded
    const p1 = this.fighters.p1, p2 = this.fighters.p2;
    const min = this.rules.pushboxRadius * 2;
    const dx = p2.pos.x - p1.pos.x;
    const adx = Math.abs(dx);
    if (adx < min && p1.onGround && p2.onGround) {
      const overlap = min - adx;
      const dir = dx >= 0 ? 1 : -1;
      p1.pos.x -= overlap / 2 * dir;
      p2.pos.x += overlap / 2 * dir;
    }
  }

  _resolveHits() {
    const p1 = this.fighters.p1, p2 = this.fighters.p2;
    this._tryHit(p1, p2);
    this._tryHit(p2, p1);
  }

  _tryHit(attacker, defender) {
    const hb = attacker.activeHitbox();
    if (!hb || attacker.moveConnected) return;
    if (defender.isInvincible()) return;
    const dhb = defender.hurtbox();
    if (!aabb(hb, dhb)) return;
    const move = hb.move;

    // Throw resolution
    if (move.type === 'throw' || move.hitHeight === 'throw') {
      // Defender airborne is immune to ground throw
      if (!defender.onGround) return;
      // Defender already in stun? throws don't tech vs stunned defender — but in this engine
      // we simplify: stunned = unable to tech, throw connects (a "punish throw")
      if (!defender.isStunned() && defender.throwTechFrames > 0) {
        defender.techThrow(attacker, this);
        return;
      }
      defender.receiveThrow(move, attacker, this);
      this._applyHitstop(attacker, defender, move);
      return;
    }

    // Block resolution
    const blocking = this._isBlocking(defender, move);
    if (blocking) {
      defender.receiveBlock(move, attacker, this);
    } else {
      defender.receiveHit(move, attacker, this);
      this.shake = Math.max(this.shake, move.knockdown ? 14 : 8);
    }
    this._applyHitstop(attacker, defender, move);
  }

  _isBlocking(defender, move) {
    // Cannot block while attacking, in stun, airborne (no air-block in V1), or not in idle/walk
    if (defender.isAttacking() || defender.isStunned()) return false;
    if (!defender.onGround) return false;
    if (defender.state === STATES.WAKEUP || defender.state === STATES.KNOCKDOWN || defender.state === STATES.KO) return false;
    const inputs = defender.lastInputs;
    if (!inputs) return false;
    const back = (defender.facing === 1 ? inputs.held.left : inputs.held.right);
    if (!back) return false;
    const crouching = defender.state === STATES.CROUCH;
    switch (move.hitHeight) {
      case 'high': return !crouching; // standing block only
      case 'low':  return crouching;  // crouch block only
      case 'mid':  return true;       // both
      case 'overhead': return !crouching; // crouch block fails
      case 'throw': return false;
      default: return true;
    }
  }

  _applyHitstop(attacker, defender, move) {
    const hs = clamp(move.hitstop, this.rules.hitstopMin, this.rules.hitstopMax);
    attacker.hitstopFrames = hs;
    defender.hitstopFrames = hs;
  }

  _clampToStage() {
    const margin = 30;
    for (const slot of ['p1', 'p2']) {
      const f = this.fighters[slot];
      if (f.pos.x < margin) f.pos.x = margin;
      if (f.pos.x > this.rules.stageWidth - margin) f.pos.x = this.rules.stageWidth - margin;
    }
  }
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
