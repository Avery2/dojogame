import { MOVE_IDS, saveMoves, resetMoves } from '../../data/moves/index.js';
import { Simulation } from '../../simulation.js';
import { drawStage } from '../../render/stage.js';
import { drawFighter } from '../../render/fighter.js';
import { drawFx } from '../../render/fx.js';
import { FIGHTERS } from '../../data/fighters/index.js';
import { edgeTracker } from '../../input/edges.js';
import { KeyboardProvider } from '../../input/keyboard.js';

let previewSim = null;
let previewLoopId = null;
let previewKb = null;
let previewEdges = null;

export function renderMovesEditor(main, state, onChange) {
  main.innerHTML = '';

  // Move picker
  const picker = document.createElement('div');
  picker.className = 'move-picker';
  let active = state.activeMoveId || MOVE_IDS[0];
  for (const id of MOVE_IDS) {
    const b = document.createElement('button');
    b.textContent = state.moves[id].label || id;
    if (id === active) b.classList.add('active');
    b.addEventListener('click', () => {
      state.activeMoveId = id;
      renderMovesEditor(main, state, onChange);
    });
    picker.appendChild(b);
  }
  main.appendChild(picker);

  const move = state.moves[active];

  // Numeric/text fields
  addRow(main, 'startup (frames)',  numberInput(move.startup, 1, 60, 1, v => set(move, 'startup', v)));
  addRow(main, 'active',  numberInput(move.active, 1, 30, 1, v => set(move, 'active', v)));
  addRow(main, 'recovery', numberInput(move.recovery, 1, 80, 1, v => set(move, 'recovery', v)));
  addRow(main, 'damage',   numberInput(move.damage, 0, 60, 1, v => set(move, 'damage', v)));
  addRow(main, 'chip',     numberInput(move.chip, 0, 20, 1, v => set(move, 'chip', v)));
  addRow(main, 'hitstun',   numberInput(move.hitstun, 0, 60, 1, v => set(move, 'hitstun', v)));
  addRow(main, 'blockstun', numberInput(move.blockstun, 0, 60, 1, v => set(move, 'blockstun', v)));
  addRow(main, 'hitstop',   numberInput(move.hitstop, 0, 16, 1, v => set(move, 'hitstop', v)));
  addRow(main, 'knockdown', boolInput(move.knockdown, v => set(move, 'knockdown', v)));
  addRow(main, 'cancelWindow start', numberInput(move.cancelWindow[0], 0, 60, 1, v => { move.cancelWindow[0] = v; persist(); }));
  addRow(main, 'cancelWindow end',   numberInput(move.cancelWindow[1], 0, 60, 1, v => { move.cancelWindow[1] = v; persist(); }));
  addRow(main, 'cancelsInto (csv)', textInput(move.cancelsInto.join(','), v => {
    move.cancelsInto = v.split(',').map(s => s.trim()).filter(Boolean);
    persist();
  }));
  addRow(main, 'hitHeight', selectInput(['high','mid','low','overhead','throw'], move.hitHeight, v => set(move, 'hitHeight', v)));
  addRow(main, 'hitbox dx', numberInput(move.hitbox.dx, -200, 300, 1, v => { move.hitbox.dx = v; persist(); }));
  addRow(main, 'hitbox dy', numberInput(move.hitbox.dy, -240, 60, 1, v => { move.hitbox.dy = v; persist(); }));
  addRow(main, 'hitbox w',  numberInput(move.hitbox.w, 10, 300, 1, v => { move.hitbox.w = v; persist(); }));
  addRow(main, 'hitbox h',  numberInput(move.hitbox.h, 10, 200, 1, v => { move.hitbox.h = v; persist(); }));
  addRow(main, 'knockback x', numberInput(move.knockback.x, -20, 20, 0.5, v => { move.knockback.x = v; persist(); }));
  addRow(main, 'knockback y', numberInput(move.knockback.y, -20, 20, 0.5, v => { move.knockback.y = v; persist(); }));
  addRow(main, 'sound freq', numberInput(move.sound.freq, 40, 2000, 10, v => { move.sound.freq = v; persist(); }));
  addRow(main, 'sound dur',  numberInput(move.sound.dur, 0.02, 1, 0.02, v => { move.sound.dur = v; persist(); }));
  addRow(main, 'sound type', selectInput(['sine','square','sawtooth','triangle'], move.sound.type, v => { move.sound.type = v; persist(); }));

  // Preview
  const preview = document.createElement('div');
  preview.className = 'preview-pane';
  preview.innerHTML = `
    <div class="section-title" style="margin-top:0">Practice preview</div>
    <div style="font-style:normal;color:var(--ink)">
      Preview canvas below. P1 controls (default WASD + JKL) move; opponent is a stationary practice target.
      Tweak values above and they take effect immediately.
    </div>
    <canvas id="preview-canvas" width="640" height="320" style="margin-top:8px;background:var(--paper);border:1px solid var(--ink);width:100%;max-width:640px;display:block"></canvas>
  `;
  main.appendChild(preview);
  startPreview(preview.querySelector('canvas'), state);

  function set(o, k, v) { o[k] = v; persist(); }
  function persist() { saveMoves(state.moves); onChange(); }
}

export function stopMovesPreview() {
  if (previewLoopId !== null) cancelAnimationFrame(previewLoopId);
  previewLoopId = null;
  if (previewKb) { previewKb.destroy(); previewKb = null; }
  previewSim = null;
}

function startPreview(canvas, state) {
  stopMovesPreview();
  const ctx = canvas.getContext('2d');
  // Build a sim with current moves; opponent is a "training dummy" that never inputs.
  const dummyRules = { ...state.rules, stageWidth: canvas.width, stageHeight: canvas.height, fighterSpacing: 90, groundY: 0.85 };
  previewSim = new Simulation({
    rules: dummyRules,
    moves: state.moves,
    p1Def: FIGHTERS.monk,
    p2Def: FIGHTERS.monk,
  });
  previewKb = new KeyboardProvider(state.keybinds);
  previewEdges = { p1: edgeTracker(), p2: edgeTracker() };

  // Run a 60Hz simulated loop, but limit to when canvas is on-screen.
  let lastFixed = performance.now();
  let acc = 0;
  const dt = 1000 / 60;
  function loop(now) {
    acc += now - lastFixed;
    lastFixed = now;
    if (acc > 200) acc = 200;
    while (acc >= dt) {
      const p1Raw = previewKb.read('p1');
      const e1 = previewEdges.p1.update(p1Raw);
      const e2 = previewEdges.p2.update({ up:false, down:false, left:false, right:false, light:false, heavy:false, special:false });
      previewSim.tick(e1, e2);
      acc -= dt;
    }
    drawStage(ctx, canvas.width, canvas.height);
    drawFx(ctx, previewSim);
    drawFighter(ctx, previewSim.fighters.p1, { showBoxes: true });
    drawFighter(ctx, previewSim.fighters.p2, { showBoxes: true });
    previewLoopId = requestAnimationFrame(loop);
  }
  previewLoopId = requestAnimationFrame(loop);
}

function addRow(parent, label, control) {
  const row = document.createElement('div');
  row.className = 'row';
  const l = document.createElement('label');
  l.textContent = label;
  row.appendChild(l);
  row.appendChild(control.input);
  const v = document.createElement('div');
  v.className = 'value';
  v.textContent = control.format();
  control.input.addEventListener('input', () => v.textContent = control.format());
  row.appendChild(v);
  parent.appendChild(row);
}

function numberInput(initial, min, max, step, cb) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.gap = '8px';
  const r = document.createElement('input');
  r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = initial;
  const n = document.createElement('input');
  n.type = 'number'; n.min = min; n.max = max; n.step = step; n.value = initial;
  n.style.maxWidth = '88px';
  r.addEventListener('input', () => { n.value = r.value; cb(parseFloat(r.value)); });
  n.addEventListener('input', () => { r.value = n.value; cb(parseFloat(n.value)); });
  wrap.appendChild(r); wrap.appendChild(n);
  return { input: wrap, format: () => Number(n.value).toString() };
}

function boolInput(initial, cb) {
  const c = document.createElement('input');
  c.type = 'checkbox';
  c.checked = !!initial;
  c.addEventListener('change', () => cb(c.checked));
  return { input: c, format: () => c.checked ? 'yes' : 'no' };
}

function textInput(initial, cb) {
  const t = document.createElement('input');
  t.type = 'text';
  t.value = initial;
  t.addEventListener('input', () => cb(t.value));
  return { input: t, format: () => '' };
}

function selectInput(options, initial, cb) {
  const s = document.createElement('select');
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o;
    if (o === initial) opt.selected = true;
    s.appendChild(opt);
  }
  s.addEventListener('change', () => cb(s.value));
  return { input: s, format: () => s.value };
}

export function resetMovesEditor(state) {
  state.moves = resetMoves();
}
