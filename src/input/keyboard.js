import { ACTIONS } from '../data/keybinds.js';

export class KeyboardProvider {
  constructor(keybinds) {
    this.keybinds = keybinds;
    this.down = new Set();
    this._onDown = (e) => {
      this.down.add(e.code);
      if (e.code === this.keybinds.global?.pause) e.preventDefault();
      if (this._isGameKey(e.code)) e.preventDefault();
    };
    this._onUp = (e) => { this.down.delete(e.code); };
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);
  }

  setKeybinds(kb) { this.keybinds = kb; }

  _isGameKey(code) {
    for (const slot of ['p1', 'p2']) {
      const map = this.keybinds[slot];
      for (const a of ACTIONS) if (map[a] === code) return true;
    }
    return false;
  }

  read(playerSlot /* 'p1' | 'p2' */) {
    const map = this.keybinds[playerSlot];
    const out = { up:false, down:false, left:false, right:false, light:false, heavy:false, special:false };
    for (const a of ACTIONS) if (map[a] && this.down.has(map[a])) out[a] = true;
    return out;
  }

  isPause() {
    return this.down.has(this.keybinds.global?.pause || 'Escape');
  }

  destroy() {
    window.removeEventListener('keydown', this._onDown);
    window.removeEventListener('keyup', this._onUp);
  }
}
