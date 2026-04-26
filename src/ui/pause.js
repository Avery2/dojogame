export function showPause({ overlay, onResume, onRestartRound, onRestartMatch, onConfigure, onQuit }) {
  overlay.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen';
  screen.innerHTML = `
    <h1 style="font-size:64px">Paused</h1>
    <div class="menu">
      <button class="menu-btn" data-act="resume">Resume</button>
      <button class="menu-btn" data-act="round">Restart Round</button>
      <button class="menu-btn" data-act="match">Restart Match</button>
      <button class="menu-btn" data-act="config">Configure</button>
      <button class="menu-btn danger" data-act="quit">Quit to Title</button>
    </div>
  `;
  overlay.appendChild(screen);
  screen.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    switch (btn.dataset.act) {
      case 'resume': onResume(); break;
      case 'round': onRestartRound(); break;
      case 'match': onRestartMatch(); break;
      case 'config': onConfigure(); break;
      case 'quit': onQuit(); break;
    }
  });
}
