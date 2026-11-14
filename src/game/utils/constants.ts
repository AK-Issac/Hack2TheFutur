export const GAME_WIDTH = 1146;
export const GAME_HEIGHT = 866;

export const ARENA_BOUNDS = {
  x: 0,
  y: 0,
  width: 1146,
  height: 866,
};

export const COLORS = {
  bgMain: 0x080914,
  bgSecondary: 0x10152A,
  bgPanel: 0x171D2B,
  blueElectric: 0x00D9FF,
  purpleNeon: 0xA78BFA,
  greenAcid: 0xA3FF12,
  redWarning: 0xFF3B5C,
  silver: 0xC8D2E8,
  textMain: 0xF3F4F6,
  textMuted: 0x9299A8,
};

export const PLAYER_CONFIG = {
  speed: 240,
  size: 24,
  health: 100,
  maxHealth: 100,
  fireRateMs: 160,
  invulnerabilityMs: 1000,
};

export const ENEMY_CONFIG = {
  basic: {
    health: 40,
    speed: 105,
    damage: 15,
    scoreValue: 50,
  },
  fast: {
    health: 20,
    speed: 160,
    damage: 10,
    scoreValue: 75,
  },
};

export const PROJECTILE_CONFIG = {
  speed: 550,
  damage: 25,
  lifespanMs: 1800,
};

export const COLLECTIBLE_CONFIG = {
  dataValue: 100,
  magnetRange: 90,
  magnetSpeed: 300,
  lifetimeMs: 15000,
};

