import light from './light.js';
import light_crouch from './light_crouch.js';
import heavy from './heavy.js';
import heavy_crouch from './heavy_crouch.js';
import sweep from './sweep.js';
import uppercut from './uppercut.js';
import jump_kick from './jump_kick.js';
import special from './special.js';
import throwMove from './throw.js';

export const DEFAULT_MOVES = {
  light, light_crouch, heavy, heavy_crouch, sweep, uppercut, jump_kick, special, throw: throwMove,
};

export const MOVE_IDS = Object.keys(DEFAULT_MOVES);

const STORAGE = 'dojo.moves.v1';

export function loadMoves() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return cloneMoves(DEFAULT_MOVES);
    const stored = JSON.parse(raw);
    const merged = cloneMoves(DEFAULT_MOVES);
    for (const id of Object.keys(stored)) {
      if (merged[id]) merged[id] = { ...merged[id], ...stored[id], hitbox: { ...merged[id].hitbox, ...(stored[id].hitbox || {}) }, knockback: { ...merged[id].knockback, ...(stored[id].knockback || {}) }, sound: { ...merged[id].sound, ...(stored[id].sound || {}) } };
    }
    return merged;
  } catch { return cloneMoves(DEFAULT_MOVES); }
}

export function saveMoves(moves) {
  localStorage.setItem(STORAGE, JSON.stringify(moves));
}

export function resetMoves() {
  localStorage.removeItem(STORAGE);
  return cloneMoves(DEFAULT_MOVES);
}

function cloneMoves(m) {
  const out = {};
  for (const k of Object.keys(m)) out[k] = JSON.parse(JSON.stringify(m[k]));
  return out;
}
