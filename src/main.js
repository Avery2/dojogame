import { Simulation } from './simulation.js';
import { loadRules } from './data/rules.js';
import { loadMoves } from './data/moves/index.js';
import { loadKeybinds, loadTouchLayout } from './data/keybinds.js';
import { FIGHTERS, DEFAULT_MATCHUP } from './data/fighters/index.js';
import { KeyboardProvider } from './input/keyboard.js';
import { TouchProvider } from './input/touch.js';
import { edgeTracker } from './input/edges.js';
import { drawStage, invalidateStage } from './render/stage.js';
import { drawFighter } from './render/fighter.js';
import { drawFx, feedTrails } from './render/fx.js';
import { drawHud } from './render/hud.js';
import { playMoveSfx, playHit, playBlock } from './audio.js';
import { showTitle, hideTitle } from './ui/title.js';
import { showPause } from './ui/pause.js';
import { showConfig } from './ui/config/index.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const touchLayer = document.getElementById('touch-layer');

const state = {
  rules: loadRules(),
  moves: loadMoves(),
  keybinds: loadKeybinds(),
  touchLayout: loadTouchLayout(),
  matchup: DEFAULT_MATCHUP, // ['monk','monk'] in V1
  mode: 'title', // title | match | pause | config
  prevMode: null,
  sim: null,
  showBoxes: false,
  pauseEdge: false,
  prevMoves: { p1: null, p2: null },
};

const kb = new KeyboardProvider(state.keybinds);
const touch = new TouchProvider(state.touchLayout, touchLayer);
const edges = { p1: edgeTracker(), p2: edgeTracker() };

window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', (e) => {
  if (e.code === 'F2') { state.showBoxes = !state.showBoxes; }
});

// Detect tablet vs desktop: enable touch overlay for primary touch devices
if (matchMedia('(pointer: coarse)').matches) {
  touch.enable();
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.rules.stageWidth = w;
  state.rules.stageHeight = h;
  invalidateStage();
  touch.relayout();
}

function startMatch() {
  const [p1Id, p2Id] = state.matchup;
  state.sim = new Simulation({
    rules: state.rules,
    moves: state.moves,
    p1Def: FIGHTERS[p1Id],
    p2Def: FIGHTERS[p2Id],
  });
  state.sim.resetRound();
  state.prevMoves = { p1: null, p2: null };
  state.mode = 'match';
  hideTitle({ overlay });
}

function quitToTitle() {
  state.sim = null;
  state.mode = 'title';
  showTitle({
    overlay,
    onSelect: (mode) => {
      if (mode === 'local') startMatch();
    },
    onConfig: () => openConfig('title'),
  });
}

function openPause() {
  state.prevMode = 'match';
  state.mode = 'pause';
  showPause({
    overlay,
    onResume: () => { overlay.innerHTML = ''; state.mode = 'match'; },
    onRestartRound: () => { state.sim.resetRound(); overlay.innerHTML = ''; state.mode = 'match'; },
    onRestartMatch: () => { state.sim.resetMatch(); overlay.innerHTML = ''; state.mode = 'match'; },
    onConfigure: () => openConfig('pause'),
    onQuit: () => { overlay.innerHTML = ''; quitToTitle(); },
  });
}

function openConfig(returnTo) {
  state.prevMode = returnTo;
  state.mode = 'config';
  showConfig({
    overlay,
    state,
    onClose: () => {
      overlay.innerHTML = '';
      if (state.prevMode === 'pause' && state.sim) openPause();
      else quitToTitle();
    },
    onChange: () => { /* live: state.rules / moves are referenced by sim by reference */ },
  });
}

// Fixed timestep loop
let last = performance.now();
let acc = 0;
const dt = 1000 / 60;

function loop(now) {
  const elapsed = Math.min(200, now - last);
  last = now;
  acc += elapsed;

  if (state.mode === 'match') {
    while (acc >= dt) {
      tickFrame();
      acc -= dt;
    }
  } else {
    acc = 0;
  }

  render();
  requestAnimationFrame(loop);
}

function tickFrame() {
  const sim = state.sim;
  if (!sim) return;

  const p1Raw = mergeInputs(kb.read('p1'), touch.read('p1'));
  const p2Raw = mergeInputs(kb.read('p2'), touch.read('p2'));
  const e1 = edges.p1.update(p1Raw);
  const e2 = edges.p2.update(p2Raw);

  // Pause edge
  const pauseDown = kb.isPause();
  if (pauseDown && !state.pauseEdge) {
    state.pauseEdge = true;
    openPause();
    return;
  }
  state.pauseEdge = pauseDown;

  // Track move starts for whoosh sounds
  const before = { p1: sim.fighters.p1.currentMove, p2: sim.fighters.p2.currentMove };
  sim.tick(e1, e2);
  for (const slot of ['p1', 'p2']) {
    const f = sim.fighters[slot];
    if (f.currentMove && f.currentMove !== state.prevMoves[slot] && f.state === 'startup' && f.moveFrame <= 1) {
      const m = state.moves[f.currentMove];
      if (m?.sound) playMoveSfx(m.sound);
    }
    state.prevMoves[slot] = f.currentMove;
  }

  for (const ev of sim.events) {
    if (ev.kind === 'hit' || ev.kind === 'throw') playHit();
    else if (ev.kind === 'block') playBlock();
  }
}

function render() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (state.mode === 'title' || state.mode === 'config') {
    drawStage(ctx, w, h);
    return;
  }

  let shakeX = 0, shakeY = 0;
  if (state.sim?.shake > 0) {
    shakeX = (Math.random() - 0.5) * state.sim.shake;
    shakeY = (Math.random() - 0.5) * state.sim.shake;
  }
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawStage(ctx, w, h);
  if (state.sim) {
    feedTrails(state.sim.fighters.p1);
    feedTrails(state.sim.fighters.p2);
    drawFx(ctx, state.sim);
    drawFighter(ctx, state.sim.fighters.p1, { showBoxes: state.showBoxes });
    drawFighter(ctx, state.sim.fighters.p2, { showBoxes: state.showBoxes });
    drawHud(ctx, state.sim, w, h);
  }
  ctx.restore();

  if (state.mode === 'pause') {
    // pause overlay handled by DOM
  }
}

function mergeInputs(a, b) {
  return {
    up: a.up || b.up,
    down: a.down || b.down,
    left: a.left || b.left,
    right: a.right || b.right,
    light: a.light || b.light,
    heavy: a.heavy || b.heavy,
    special: a.special || b.special,
  };
}

quitToTitle();
requestAnimationFrame(loop);
