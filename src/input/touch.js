// TouchProvider: virtual D-pad + 3 face buttons per side, vertical-split tablet layout.
// Exposes the same {up,down,left,right,light,heavy,special} interface as KeyboardProvider.

export class TouchProvider {
  constructor(layout, container) {
    this.layout = layout;
    this.container = container;
    this.state = { p1: emptyState(), p2: emptyState() };
    this.activeTouches = new Map(); // touchId -> { player, kind, controlId, padOrigin }
    this.elements = { p1: {}, p2: {} };
    this.enabled = false;
    this._onStart = this._onStart.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onEnd = this._onEnd.bind(this);
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.container.classList.add('active');
    this._render();
    this.container.addEventListener('touchstart', this._onStart, { passive: false });
    this.container.addEventListener('touchmove', this._onMove, { passive: false });
    this.container.addEventListener('touchend', this._onEnd, { passive: false });
    this.container.addEventListener('touchcancel', this._onEnd, { passive: false });
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this.container.classList.remove('active');
    this.container.innerHTML = '';
    this.activeTouches.clear();
    this.state.p1 = emptyState();
    this.state.p2 = emptyState();
    this.container.removeEventListener('touchstart', this._onStart);
    this.container.removeEventListener('touchmove', this._onMove);
    this.container.removeEventListener('touchend', this._onEnd);
    this.container.removeEventListener('touchcancel', this._onEnd);
  }

  setLayout(layout) {
    this.layout = layout;
    if (this.enabled) {
      this.container.innerHTML = '';
      this._render();
    }
  }

  _render() {
    const W = this.container.clientWidth;
    const H = this.container.clientHeight;
    for (const player of ['p1', 'p2']) {
      const cfg = this.layout[player];
      const pad = makeEl('div', 'touch-pad', this.container, {
        left: cfg.pad.cx * W - cfg.pad.r * W,
        top: cfg.pad.cy * H - cfg.pad.r * H,
        width: cfg.pad.r * W * 2,
        height: cfg.pad.r * H * 2,
      });
      pad.dataset.player = player;
      pad.dataset.kind = 'pad';
      const knob = document.createElement('div');
      knob.className = 'touch-pad-knob';
      knob.style.position = 'absolute';
      knob.style.left = '50%';
      knob.style.top = '50%';
      knob.style.transform = 'translate(-50%, -50%)';
      pad.appendChild(knob);
      this.elements[player].pad = pad;
      this.elements[player].knob = knob;
      for (const btn of ['light', 'heavy', 'special']) {
        const b = makeEl('div', 'touch-btn', this.container, {
          left: cfg[btn].cx * W - cfg[btn].r * W,
          top: cfg[btn].cy * H - cfg[btn].r * H,
          width: cfg[btn].r * W * 2,
          height: cfg[btn].r * H * 2,
        });
        b.textContent = btn[0].toUpperCase();
        b.dataset.player = player;
        b.dataset.kind = btn;
        this.elements[player][btn] = b;
      }
    }
  }

  _onStart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const target = document.elementFromPoint(t.clientX, t.clientY);
      const ctl = target?.closest('[data-player]');
      if (!ctl) continue;
      const player = ctl.dataset.player;
      const kind = ctl.dataset.kind;
      if (kind === 'pad') {
        const rect = ctl.getBoundingClientRect();
        this.activeTouches.set(t.identifier, { player, kind, padOrigin: { x: rect.left + rect.width/2, y: rect.top + rect.height/2 }, padRadius: rect.width/2 });
        this._updatePad(player, t.clientX, t.clientY, rect);
      } else {
        this.activeTouches.set(t.identifier, { player, kind });
        this.state[player][kind] = true;
        this.elements[player][kind]?.classList.add('active');
      }
    }
  }

  _onMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const info = this.activeTouches.get(t.identifier);
      if (!info) continue;
      if (info.kind === 'pad') {
        const ctl = this.elements[info.player].pad;
        const rect = ctl.getBoundingClientRect();
        this._updatePad(info.player, t.clientX, t.clientY, rect);
      }
    }
  }

  _onEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const info = this.activeTouches.get(t.identifier);
      if (!info) continue;
      this.activeTouches.delete(t.identifier);
      if (info.kind === 'pad') {
        this.state[info.player].up = false;
        this.state[info.player].down = false;
        this.state[info.player].left = false;
        this.state[info.player].right = false;
        const knob = this.elements[info.player].knob;
        if (knob) {
          knob.style.transform = 'translate(-50%, -50%)';
          knob.classList.remove('active');
        }
      } else {
        this.state[info.player][info.kind] = false;
        this.elements[info.player][info.kind]?.classList.remove('active');
      }
    }
  }

  _updatePad(player, cx, cy, rect) {
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + rect.height / 2;
    const dx = cx - ox;
    const dy = cy - oy;
    const r = rect.width / 2;
    const dead = r * 0.25;
    const mag = Math.hypot(dx, dy);
    const s = this.state[player];
    s.left = dx < -dead;
    s.right = dx > dead;
    s.up = dy < -dead;
    s.down = dy > dead;
    const knob = this.elements[player].knob;
    if (knob) {
      const kr = Math.min(mag, r);
      const angle = Math.atan2(dy, dx);
      knob.style.transform = `translate(calc(-50% + ${Math.cos(angle) * kr}px), calc(-50% + ${Math.sin(angle) * kr}px))`;
      if (mag > dead) knob.classList.add('active'); else knob.classList.remove('active');
    }
  }

  read(player) {
    return { ...this.state[player] };
  }

  isPause() { return false; }

  destroy() { this.disable(); }
}

function emptyState() {
  return { up:false, down:false, left:false, right:false, light:false, heavy:false, special:false };
}

function makeEl(tag, cls, parent, style) {
  const e = document.createElement(tag);
  e.className = cls;
  Object.assign(e.style, {
    position: 'absolute',
    left: style.left + 'px',
    top: style.top + 'px',
    width: style.width + 'px',
    height: style.height + 'px',
  });
  parent.appendChild(e);
  return e;
}
