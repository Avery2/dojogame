export const ACTIONS = ['up', 'down', 'left', 'right', 'light', 'heavy', 'special'];

export const DEFAULT_KEYBINDS = {
  p1: {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    light: 'KeyJ',
    heavy: 'KeyK',
    special: 'KeyL',
  },
  p2: {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    light: 'Digit1',
    heavy: 'Digit2',
    special: 'Digit3',
  },
  global: { pause: 'Escape' },
};

export const DEFAULT_TOUCH_LAYOUT = {
  p1: {
    pad: { cx: 0.12, cy: 0.78, r: 0.07 },
    light: { cx: 0.34, cy: 0.86, r: 0.045 },
    heavy: { cx: 0.42, cy: 0.78, r: 0.045 },
    special: { cx: 0.46, cy: 0.88, r: 0.045 },
  },
  p2: {
    pad: { cx: 0.88, cy: 0.78, r: 0.07 },
    light: { cx: 0.66, cy: 0.86, r: 0.045 },
    heavy: { cx: 0.58, cy: 0.78, r: 0.045 },
    special: { cx: 0.54, cy: 0.88, r: 0.045 },
  },
};

const KEYS_STORAGE = 'dojo.keybinds.v1';
const TOUCH_STORAGE = 'dojo.touch.v1';

export function loadKeybinds() {
  try {
    const raw = localStorage.getItem(KEYS_STORAGE);
    if (!raw) return clone(DEFAULT_KEYBINDS);
    return mergeDeep(clone(DEFAULT_KEYBINDS), JSON.parse(raw));
  } catch { return clone(DEFAULT_KEYBINDS); }
}

export function saveKeybinds(kb) {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(kb));
}

export function resetKeybinds() {
  localStorage.removeItem(KEYS_STORAGE);
  return clone(DEFAULT_KEYBINDS);
}

export function resetKeybindsInPlace(target) {
  localStorage.removeItem(KEYS_STORAGE);
  const fresh = clone(DEFAULT_KEYBINDS);
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, fresh);
  return target;
}

export function loadTouchLayout() {
  try {
    const raw = localStorage.getItem(TOUCH_STORAGE);
    if (!raw) return clone(DEFAULT_TOUCH_LAYOUT);
    return mergeDeep(clone(DEFAULT_TOUCH_LAYOUT), JSON.parse(raw));
  } catch { return clone(DEFAULT_TOUCH_LAYOUT); }
}

export function saveTouchLayout(t) {
  localStorage.setItem(TOUCH_STORAGE, JSON.stringify(t));
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function mergeDeep(a, b) {
  for (const k of Object.keys(b)) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
      a[k] = mergeDeep(a[k] || {}, b[k]);
    } else {
      a[k] = b[k];
    }
  }
  return a;
}

export function keyLabel(code) {
  if (!code) return '—';
  return code
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace(/^Arrow/, '↑↓←→'[ ['Up','Down','Left','Right'].indexOf(code.replace('Arrow','')) ] || code)
    .replace('Space', '␣');
}
