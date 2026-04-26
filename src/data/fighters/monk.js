import { MOVE_IDS } from '../moves/index.js';

export default {
  id: 'monk',
  name: 'Monk',
  sashColor: '#b3231b',
  trim: '#c79b3a',
  pose: {
    height: 200,
    headRadius: 18,
    shoulder: 60,
    hip: 110,
    armLen: 56,
    legLen: 84,
    strokeWidth: 14,
  },
  movelist: MOVE_IDS,
  startingHealth: null,
};
