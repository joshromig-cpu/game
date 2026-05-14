// Game constants — tuning values for Gris-like physics and gameplay

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

// ====================================================================
// TUNING — Feature 11
// Easy-to-adjust knobs for camera framing and cloud enemy presence.
// Tweak these without touching any other code.
// ====================================================================
const TUNING = {
  // 1.0 = current framing. <1.0 = more zoomed out (smaller player on screen).
  // 0.85 starts the player slightly more zoomed out than before.
  CAMERA_ZOOM: 0.85,

  // Multiplier applied to cloud enemy scale on spawn. 1.0 = original size.
  // >1.0 makes cloud enemies bigger and more imposing.
  CLOUD_ENEMY_SCALE: 1.25,
};

// ====================================================================
// GAME_STATE — shared, lightweight level-tracking singleton used by
// features that need to know which level we're in (ally cloud gating,
// per-level visual sprite upgrade, etc). Avoid mutating from gameplay
// code — scenes set this in their create().
// Values: 1 (L1), 2 (L2), 3 (L3 Celestial Bridge), 4 (Boss Fight)
// ====================================================================
const GAME_STATE = {
  currentLevel: 1,
  // First-encounter tracking for Ally Clouds — Feature 6.
  // Keyed by `${levelKey}:${cloudType}` so it resets on a fresh session.
  allyCloudIntroSeen: {},
};

function setCurrentLevelFromScene(scene) {
  const key = scene.scene.key;
  if (key === 'Level1Scene') GAME_STATE.currentLevel = 1;
  else if (key === 'Level2Scene') GAME_STATE.currentLevel = 2;
  else if (key === 'Level3Scene') GAME_STATE.currentLevel = 3;
  else if (key === 'Level3BossScene') GAME_STATE.currentLevel = 4;
}

const PLAYER = {
  // Movement — smooth, floaty, momentum-based (Gris-like)
  WALK_ACCEL: 400,        // Gradual acceleration (not instant)
  SPRINT_ACCEL: 600,
  MAX_WALK_SPEED: 200,
  MAX_SPRINT_SPEED: 350,
  DRAG: 800,              // Ground friction — smooth deceleration
  AIR_DRAG: 200,          // Less drag in air — more floaty

  // Jumping — graceful arcs, slow descent
  JUMP_VELOCITY: -420,    // Initial upward force
  DOUBLE_JUMP_VELOCITY: -350,
  GRAVITY: 700,           // Lower than typical platformer for floatiness
  DOUBLE_JUMP_GRAVITY: 400, // Even lower during double-jump spin
  MAX_FALL_SPEED: 500,

  // Backstep — silk-slide feel
  BACKSTEP_VELOCITY: 300,
  BACKSTEP_DURATION: 250, // ms

  // Dimensions (placeholder)
  WIDTH: 40,
  HEIGHT: 64,
};

const LEVEL = {
  // Level 1 dimensions
  WIDTH: 12000,
  HEIGHT: 720,
  GROUND_Y: 620,     // Y position of ground surface
  TILE_SIZE: 32,
};

const ENEMIES = {
  SHADOW_CLOUD: {
    HP: 30,
    CONTACT_DAMAGE: 3,
    PATROL_RANGE: 130,
    PATROL_SPEED: 1.15,      // sine multiplier
    FLOAT_AMPLITUDE: 26,
    FLOAT_SPEED: 1.8,
    BEAM_RANGE: 260,          // px at which beam starts firing
    BEAM_TELEGRAPH_MS: 1100,
    BEAM_FIRE_MS: 2000,
    BEAM_COOLDOWN_MIN: 1600,
    BEAM_COOLDOWN_MAX: 3000,
    BEAM_TOP_HALF: 10,
    BEAM_BOTTOM_HALF: 55,
    BEAM_TRACK_LERP: 0.028,
    DRAIN_INTERVAL_FAR: 420,  // ms/tick at far
    DRAIN_INTERVAL_NEAR: 180,
    DRAIN_HP: 1,
  },
  SPANGERELL: {
    HP: 40,
    CONTACT_DAMAGE: 15,
    PATROL_SPEED: 50,
    CHARGE_SPEED: 170,
    CHARGE_RANGE: 280,
    VERT_TOLERANCE: 80,
    PATROL_RANGE: 140,
    WIDTH: 44,
    HEIGHT: 36,
  },
};

const WEAPONS = {
  HEART_GUN: {
    BULLET_SPEED: 520,
    FIRE_RATE: 260,
    DAMAGE: 15,
  },
};

// --- Boss (Level 3) ---
const BOSS = {
  // Phases
  PHASE_1_HP: 100,   // shadow-beam phase (deflect to charge meter)
  PHASE_2_HP: 100,   // rage phase — fan beams + chase
  PHASE_3_HP: 60,    // revelation phase — stunned, vulnerable
  HP_TOTAL: 260,

  WIDTH: 44,
  HEIGHT: 76,
  FLOAT_AMP: 36,
  FLOAT_SPEED: 1.4,
  MOVE_SPEED: 90,

  // Shadow beam attack
  BEAM_TELEGRAPH_MS: 900,
  BEAM_FIRE_MS: 1500,
  BEAM_COOLDOWN_MS: 1400,
  BEAM_WIDTH: 44,
  BEAM_DAMAGE_INTERVAL: 140, // ms
  BEAM_DAMAGE: 6,

  // Fan (phase 2)
  FAN_COUNT: 5,
  FAN_SPREAD: 0.9, // radians

  // Mirror deflect
  MIRROR_WIDTH: 52,
  MIRROR_HEIGHT: 84,
  MIRROR_ARC_RADIUS: 62,
  DEFLECT_METER_MAX: 100,
  DEFLECT_METER_PER_HIT: 14,
  HEART_BLAST_DAMAGE: 40,

  // Revelation
  SHATTER_PIECES: 28,
};

const COLORS = {
  PLAYER: 0x4a7a8a,       // Teal — matches the boy's tunic in concept art

  // Ground / platforms — Ghibli grassland
  GROUND_GRASS: 0x7cc46a,  // Bright grass green (top layer)
  GROUND_GRASS_HI: 0xa8dc88, // Grass highlight
  GROUND_DIRT: 0x8a6a46,   // Warm dirt/earth
  PLATFORM_GRASS: 0x86cc6e,
  PLATFORM_GRASS_HI: 0xb2dc8e,
  PLATFORM_WOOD: 0xa07050,
  PLATFORM_WOOD_DARK: 0x70503a,

  // Sky — warm Ghibli gradient (top → horizon)
  SKY_TOP: 0x3a5878,       // Deep slate blue
  SKY_MID: 0x9abbc4,       // Hazy cyan
  SKY_HORIZON: 0xf2d8a0,   // Warm cream
  SKY_LOW: 0xf6c48a,       // Soft peach

  // Clouds — soft cream stacks
  CLOUD_SHADOW: 0xc6b888,
  CLOUD_MID: 0xeadca0,
  CLOUD_LIGHT: 0xf8ecc4,
  CLOUD_HI: 0xfff6dc,

  // Distant hills / mountains (atmospheric recession)
  HILLS_FAR: 0x5a8aa0,
  HILLS_MID: 0x6ea890,
  HILLS_NEAR: 0x7ec076,

  // Distant buildings (colorful silhouettes from concept art)
  BUILDING_CORAL: 0xc87a5e,
  BUILDING_LAVENDER: 0xb8a0c8,
  BUILDING_MINT: 0x9cc89c,
  BUILDING_ROOF: 0x6aa26a,

  // Enemy clouds (spotlight cloud creatures)
  ENEMY_CLOUD: 0xf8ecc4,
  SPOTLIGHT: 0x222028,     // Dark cone

  // Pickups & UI
  COIN: 0xffd84f,
  HEART: 0xff9ab8,
  UI_TEXT: 0xfff6e8,
  UI_BG: 0x2a1a0e,

  // Level 3 Boss — Dali surrealism palette
  DALI_SKY_TOP: 0x1a1028,      // deep indigo
  DALI_SKY_MID: 0x4a2862,      // violet
  DALI_SKY_HORIZON: 0xd0708a,  // dusky pink
  DALI_SKY_LOW: 0xffc890,      // molten amber
  DALI_DESERT: 0x8a5a4a,       // cracked earth
  DALI_DESERT_HI: 0xb88a6a,
  DALI_ARCH: 0x6a4a6e,         // melting arches
  DALI_CLOCK: 0xf0d090,

  // Boss
  BOSS_WHITE: 0xfaf8f4,
  BOSS_WHITE_SHADE: 0xd8d4c8,
  BOSS_CRACK: 0x0a0612,        // inky darkness in the cracks
  BOSS_BEAM_CORE: 0x2a0a3a,
  BOSS_BEAM_EDGE: 0x6a2a88,
  MIRROR_GLASS: 0xcfe8ff,
  MIRROR_FRAME: 0xe8c870,
  DEFLECT_METER: 0xff6ea6,
};
