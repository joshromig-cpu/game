// PlayerAnimations — loads the hero sprite sheet and defines animations.
//
// SHEET LAYOUT (matches the new Ghibli 8x8 sheet from Lovable)
//   - Image:    1920 x 1920 px
//   - Grid:     8 rows x 8 cols = 64 cells
//   - Frame:    240 x 240 px each
//   - Col 0:    row LABEL baked in — SKIPPED at runtime
//   - Cols 1-7: 7 usable art frames per row
//
// ROW MAP (row index -> animation)
//   Row 0  IDLE (facing right)
//   Row 1  RUN
//   Row 2  JUMP rise / APEX hang / FALL descent (split across the row)
//   Row 3  PICKUP HAMMER then SWING HAMMER
//   Row 4  FORWARD ROLL
//   Rows 5-7 reserved
//
// Frame indices are row*8 + col. Col 0 is always the label, so valid
// indices for row R are (R*8 + 1) .. (R*8 + 7).

const PlayerAnimations = {
  SHEET_KEY: 'hero_sheet',
  SHEET_PATH: 'assets/sprites/player/hero_sheet.png',
  FRAME_W: 240,
  FRAME_H: 240,
  COLS: 8,
  ROWS: 8,

  preload(scene) {
    scene.load.spritesheet(this.SHEET_KEY, this.SHEET_PATH, {
      frameWidth: this.FRAME_W,
      frameHeight: this.FRAME_H,
    });
  },

  create(scene) {
    const a = scene.anims;
    const key = this.SHEET_KEY;

    const makeRange = (name, start, end, frameRate, repeat = -1) => {
      if (a.exists(name)) return;
      a.create({
        key: name,
        frames: a.generateFrameNumbers(key, { start, end }),
        frameRate,
        repeat,
      });
    };

    const makeList = (name, indices, frameRate, repeat = -1) => {
      if (a.exists(name)) return;
      a.create({
        key: name,
        frames: indices.map(i => ({ key, frame: i })),
        frameRate,
        repeat,
      });
    };

    // Row 0 — IDLE: cells 1..7 (skip label at col 0)
    makeRange('hero_idle', 1, 7, 8, -1);

    // Row 1 — RUN: cells 9..15
    makeRange('hero_run', 9, 15, 14, -1);

    // Row 2 — JUMP (rise) / APEX (hang) / FALL (descent) split across cols 1..7
    // Tweak these index lists if your row's split is different.
    makeList('hero_jump', [17, 18, 19],          18, 0);
    makeList('hero_apex', [20, 21],              10, -1);
    makeList('hero_fall', [22, 23],              14, -1);

    // Row 3 — PICKUP HAMMER (first half) then SWING HAMMER (second half)
    makeList('hero_pickup_hammer', [25, 26, 27],     14, 0);
    makeList('hero_swing_hammer',  [28, 29, 30, 31], 18, 0);

    // Row 4 — FORWARD ROLL: cells 33..39
    makeRange('hero_roll', 33, 39, 20, 0);
  },

  // Pick the right anim key from Player physics state.
  pickKey(player) {
    const vy = player.body.velocity.y;
    const vx = player.body.velocity.x;
    if (player.isBackstepping) return 'hero_roll';
    if (!player.isOnGround) {
      if (vy < -60) return 'hero_jump';
      if (vy > 60)  return 'hero_fall';
      return 'hero_apex';
    }
    if (Math.abs(vx) > 20) return 'hero_run';
    return 'hero_idle';
  },
};
