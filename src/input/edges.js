// Helpers to convert raw {pressed} state into press/release edges per frame.
import { ACTIONS } from '../data/keybinds.js';

export function edgeTracker() {
  const prev = {};
  for (const a of ACTIONS) prev[a] = false;
  return {
    update(now) {
      const out = { pressed: {}, released: {}, held: {} };
      for (const a of ACTIONS) {
        const wasDown = prev[a];
        const isDown = !!now[a];
        out.pressed[a] = isDown && !wasDown;
        out.released[a] = !isDown && wasDown;
        out.held[a] = isDown;
        prev[a] = isDown;
      }
      return out;
    },
  };
}
