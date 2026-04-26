import { MOVE_IDS } from '../moves/index.js';

export default {
  id: 'oni',
  name: 'Oni',
  sashColor: '#1a1a1a',
  trim: '#b3231b',
  pose: {
    height: 220,
    headRadius: 22,
    shoulder: 70,
    hip: 120,
    armLen: 62,
    legLen: 88,
    strokeWidth: 16,
  },
  movelist: MOVE_IDS,
  startingHealth: null,
};
