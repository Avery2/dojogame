export function showTitle({ overlay, onSelect, onConfig }) {
  overlay.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen';
  screen.innerHTML = `
    <h1>Dojo Fighter</h1>
    <div class="subtitle">A sumi-e duel</div>
    <div class="menu">
      <button class="menu-btn" data-mode="local">Local 2P</button>
      <button class="menu-btn" data-mode="ai" disabled title="V2">Solo vs AI</button>
      <button class="menu-btn" data-mode="remote" disabled title="V2">Remote 2P</button>
      <button class="menu-btn" data-mode="config">Configure</button>
    </div>
    <div class="subtitle" style="margin-top:24px;font-size:16px">
      P1: WASD · J/K/L &nbsp;·&nbsp; P2: Arrows · 1/2/3 &nbsp;·&nbsp; Throw = Light + Heavy &nbsp;·&nbsp; Block = Hold Back
    </div>
  `;
  overlay.appendChild(screen);
  screen.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (!btn || btn.disabled) return;
    const mode = btn.dataset.mode;
    if (mode === 'config') onConfig();
    else onSelect(mode);
  });
}

export function hideTitle({ overlay }) {
  overlay.innerHTML = '';
}
