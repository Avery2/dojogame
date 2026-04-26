export const DEFAULT_RULES = {
  fps: 60,
  roundSeconds: 60,
  roundsToWin: 2,
  maxHealth: 100,
  gravity: 0.7,
  walkSpeed: 3.0,
  jumpVelocity: -13,
  airControl: 0.35,
  groundY: 0.82,
  stageWidth: 1280,
  stageHeight: 720,
  fighterSpacing: 220,
  pushboxRadius: 36,
  comboScaling: [1.0, 0.8, 0.6, 0.4, 0.3, 0.25, 0.2],
  superGainPerDamage: 1.4,
  superMax: 100,
  losingSuperMultiplier: 2.0,
  hitstopMin: 4,
  hitstopMax: 8,
  wakeupInvincibleFrames: 6,
  throwTechWindow: 4,
  counterHitDamageBonus: 0.25,
  counterHitHitstunBonus: 6,
  chipDamageOnBlock: 0.25,
};

const STORAGE = 'dojo.rules.v1';

export function loadRules() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return { ...DEFAULT_RULES };
    return { ...DEFAULT_RULES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_RULES };
  }
}

export function saveRules(rules) {
  localStorage.setItem(STORAGE, JSON.stringify(rules));
}

export function resetRules() {
  localStorage.removeItem(STORAGE);
  return { ...DEFAULT_RULES };
}
