import { ACTIONS, keyLabel, saveKeybinds, resetKeybinds, loadKeybinds } from '../../data/keybinds.js';

export function renderKeybinds(main, state, onChange) {
  main.innerHTML = '';
  const intro = document.createElement('div');
  intro.innerHTML = `<div class="section-title">Per-player keys</div>
    <div class="subtitle" style="font-size:14px;color:var(--soft);margin-bottom:8px">
      Click a slot, then press a key. Esc cancels.
    </div>`;
  main.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'keybind-grid';
  for (const player of ['p1', 'p2']) {
    const col = document.createElement('div');
    col.innerHTML = `<div class="section-title" style="font-size:18px">${player.toUpperCase()}</div>`;
    for (const a of ACTIONS) {
      const cell = document.createElement('div');
      cell.className = 'keybind-cell';
      const label = document.createElement('div');
      label.textContent = a;
      const slot = document.createElement('button');
      slot.className = 'key-slot';
      slot.textContent = keyLabel(state.keybinds[player][a]);
      slot.addEventListener('click', () => listenForKey(slot, (code) => {
        state.keybinds[player][a] = code;
        slot.textContent = keyLabel(code);
        saveKeybinds(state.keybinds);
        onChange();
      }));
      cell.appendChild(label);
      cell.appendChild(slot);
      col.appendChild(cell);
    }
    grid.appendChild(col);
  }
  main.appendChild(grid);

  const globalSection = document.createElement('div');
  globalSection.innerHTML = `<div class="section-title">Global</div>`;
  const cell = document.createElement('div');
  cell.className = 'keybind-cell';
  cell.innerHTML = `<div>pause</div>`;
  const slot = document.createElement('button');
  slot.className = 'key-slot';
  slot.textContent = keyLabel(state.keybinds.global.pause);
  slot.addEventListener('click', () => listenForKey(slot, (code) => {
    state.keybinds.global.pause = code;
    slot.textContent = keyLabel(code);
    saveKeybinds(state.keybinds);
    onChange();
  }));
  cell.appendChild(slot);
  globalSection.appendChild(cell);
  main.appendChild(globalSection);

  const reset = document.createElement('button');
  reset.className = 'btn danger';
  reset.style.marginTop = '18px';
  reset.textContent = 'Reset all keybinds';
  reset.addEventListener('click', () => {
    state.keybinds = resetKeybinds();
    onChange();
    renderKeybinds(main, state, onChange);
  });
  main.appendChild(reset);
}

function listenForKey(slot, cb) {
  slot.classList.add('listening');
  const prev = slot.textContent;
  slot.textContent = '…';
  const handler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.removeEventListener('keydown', handler, true);
    slot.classList.remove('listening');
    if (e.code === 'Escape') { slot.textContent = prev; return; }
    cb(e.code);
  };
  window.addEventListener('keydown', handler, true);
}
