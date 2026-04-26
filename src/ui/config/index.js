import { renderKeybinds } from './keybinds.js';
import { renderMovesEditor, stopMovesPreview } from './moves.js';
import { renderRulesEditor } from './rules.js';

export function showConfig({ overlay, state, onClose, onChange }) {
  overlay.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'config';
  wrap.innerHTML = `
    <header>
      <h2>Configure</h2>
      <nav>
        <button data-tab="keybinds" class="active">Keybinds</button>
        <button data-tab="moves">Moves</button>
        <button data-tab="rules">Rules</button>
      </nav>
    </header>
    <main></main>
    <footer>
      <div>
        <button class="btn" data-act="export">Export JSON</button>
        <button class="btn" data-act="import">Import JSON</button>
        <input type="file" accept="application/json" id="cfg-file" hidden />
      </div>
      <div>
        <button class="btn" data-act="close">Close</button>
      </div>
    </footer>
  `;
  overlay.appendChild(wrap);

  const main = wrap.querySelector('main');
  const nav = wrap.querySelector('nav');
  let active = 'keybinds';

  const renderTab = () => {
    if (active !== 'moves') stopMovesPreview();
    if (active === 'keybinds') renderKeybinds(main, state, onChange);
    else if (active === 'moves') renderMovesEditor(main, state, onChange);
    else renderRulesEditor(main, state, onChange);
  };

  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    active = b.dataset.tab;
    nav.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    renderTab();
  });

  wrap.querySelector('footer').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'close') {
      stopMovesPreview();
      onClose();
    } else if (b.dataset.act === 'export') {
      exportJSON(state);
    } else if (b.dataset.act === 'import') {
      wrap.querySelector('#cfg-file').click();
    }
  });
  wrap.querySelector('#cfg-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.keybinds) Object.assign(state.keybinds, json.keybinds);
      if (json.moves) Object.assign(state.moves, json.moves);
      if (json.rules) Object.assign(state.rules, json.rules);
      onChange();
      renderTab();
    } catch (err) { alert('Invalid JSON: ' + err.message); }
  });

  renderTab();
}

function exportJSON(state) {
  const blob = new Blob([JSON.stringify({ keybinds: state.keybinds, moves: state.moves, rules: state.rules }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dojo-config.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
