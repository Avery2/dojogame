import { saveRules, resetRules, DEFAULT_RULES } from '../../data/rules.js';

export function renderRulesEditor(main, state, onChange) {
  main.innerHTML = '';
  const fields = [
    ['roundSeconds', 10, 180, 5],
    ['roundsToWin', 1, 5, 1],
    ['maxHealth', 30, 300, 5],
    ['gravity', 0.2, 2.0, 0.05],
    ['walkSpeed', 1, 8, 0.25],
    ['jumpVelocity', -22, -6, 0.5],
    ['airControl', 0, 1.5, 0.05],
    ['fighterSpacing', 100, 400, 10],
    ['pushboxRadius', 16, 80, 2],
    ['hitstopMin', 0, 12, 1],
    ['hitstopMax', 2, 20, 1],
    ['wakeupInvincibleFrames', 0, 30, 1],
    ['throwTechWindow', 0, 12, 1],
    ['superMax', 50, 400, 10],
    ['superGainPerDamage', 0, 5, 0.1],
    ['losingSuperMultiplier', 1, 5, 0.1],
    ['counterHitDamageBonus', 0, 1.0, 0.05],
    ['counterHitHitstunBonus', 0, 30, 1],
  ];
  for (const [key, lo, hi, step] of fields) {
    addNumber(main, key, state.rules[key], lo, hi, step, (v) => {
      state.rules[key] = v;
      saveRules(state.rules);
      onChange();
    });
  }

  const csvRow = document.createElement('div');
  csvRow.className = 'row';
  const lbl = document.createElement('label');
  lbl.textContent = 'comboScaling (csv)';
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = state.rules.comboScaling.join(',');
  inp.addEventListener('input', () => {
    const arr = inp.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (arr.length) {
      state.rules.comboScaling = arr;
      saveRules(state.rules);
      onChange();
    }
  });
  csvRow.appendChild(lbl);
  csvRow.appendChild(inp);
  csvRow.appendChild(document.createElement('div'));
  main.appendChild(csvRow);

  const reset = document.createElement('button');
  reset.className = 'btn danger';
  reset.style.marginTop = '18px';
  reset.textContent = 'Reset rules to defaults';
  reset.addEventListener('click', () => {
    state.rules = resetRules();
    onChange();
    renderRulesEditor(main, state, onChange);
  });
  main.appendChild(reset);
}

function addNumber(parent, key, val, lo, hi, step, cb) {
  const row = document.createElement('div');
  row.className = 'row';
  const l = document.createElement('label');
  l.textContent = key;
  const wrap = document.createElement('div');
  wrap.style.display = 'flex'; wrap.style.gap = '8px';
  const r = document.createElement('input');
  r.type = 'range'; r.min = lo; r.max = hi; r.step = step; r.value = val;
  const n = document.createElement('input');
  n.type = 'number'; n.min = lo; n.max = hi; n.step = step; n.value = val; n.style.maxWidth = '88px';
  r.addEventListener('input', () => { n.value = r.value; cb(parseFloat(r.value)); v.textContent = r.value; });
  n.addEventListener('input', () => { r.value = n.value; cb(parseFloat(n.value)); v.textContent = n.value; });
  wrap.appendChild(r); wrap.appendChild(n);
  const v = document.createElement('div');
  v.className = 'value'; v.textContent = String(val);
  row.appendChild(l); row.appendChild(wrap); row.appendChild(v);
  parent.appendChild(row);
}
