// =====================================================================
// PlayerAura — Feature 10 (visual sprite upgrade, level-driven)
// Adds three overlay effects ON TOP of the player without touching the
// player's sprite, animations, or movement code:
//   1. Tints the player rectangle/sprite with a CSS-filter-like colour
//      (we use Phaser tint since the player is a Rectangle — this is the
//      runtime equivalent of a CSS filter on a DOM sprite).
//   2. A floating element (orb/halo) that follows the player's head.
//   3. A soft pulsing aura behind the player that intensifies per level.
//
// Reads from GAME_STATE.currentLevel (defined in utils/constants.js):
//   1 = neutral, 2 = cool blue, 3 = gold, 4 = boss / dark red.
// =====================================================================

const PLAYER_AURA_LEVELS = {
  1: { tint: 0xffffff, orb: 0xfff6dc, aura: 0xffd8a0, auraAlpha: 0.20, intensity: 1.0 },
  2: { tint: 0x9ec6ff, orb: 0xbfe0ff, aura: 0x6fa8ff, auraAlpha: 0.30, intensity: 1.4 },
  3: { tint: 0xffd870, orb: 0xfff0a0, aura: 0xffc060, auraAlpha: 0.40, intensity: 1.8 },
  4: { tint: 0xff6a6a, orb: 0xffa0a0, aura: 0xc8202a, auraAlpha: 0.55, intensity: 2.2 },
};

// Distinct end-of-level narrative blurbs — F10 narrative.
const PLAYER_AURA_NARRATIVE = {
  1: "You crack the first egg. From its yolk drifts the Blue Garments of Taura — your shots now wear a quiet blue edge.",
  2: "You crack the second egg. The Gold Veil of Kīhei settles on your shoulders — every shot gains a twin, doubling your tide.",
  3: "You crack the third egg. The Ember of Whaiao kindles in your palm — your shots burn larger, hotter, surer.",
};

class PlayerAura {
  constructor(scene) {
    this.scene = scene;
    this.lvl = (typeof GAME_STATE !== 'undefined' && GAME_STATE.currentLevel) || 1;
    const cfg = PLAYER_AURA_LEVELS[this.lvl] || PLAYER_AURA_LEVELS[1];

    // 1) Tint — apply only if player.sprite supports tint. The current
    //    placeholder player is a Rectangle which doesn't have setTint,
    //    so we layer a coloured overlay on top of it instead. This is
    //    the equivalent CSS filter approach for our procedural sprite.
    this._tintOverlay = scene.add.rectangle(
      0, 0, PLAYER.WIDTH, PLAYER.HEIGHT,
      cfg.tint, this.lvl === 1 ? 0 : 0.35
    );
    this._tintOverlay.setDepth(11);
    this._tintOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // 2) Floating orb / halo above the head.
    this._orb = scene.add.graphics().setDepth(12);
    this._orbColor = cfg.orb;
    this._orbAngle = 0;

    // 3) Soft pulsing aura behind the player.
    this._aura = scene.add.circle(0, 0, 38, cfg.aura, cfg.auraAlpha);
    this._aura.setDepth(2);

    this._intensity = cfg.intensity;

    // Brief level-up flourish when the aura is created.
    if (this.lvl > 1) {
      const flash = scene.add.circle(0, 0, 80, cfg.aura, 0.6).setDepth(13);
      this._flash = flash;
      scene.tweens.add({
        targets: flash, scale: 1.8, alpha: 0, duration: 800, ease: 'Quad.easeOut',
        onComplete: () => flash.destroy(),
      });
    }
  }

  update(time) {
    const p = this.scene.player;
    if (!p || !p.sprite) return;
    const px = p.sprite.x, py = p.sprite.y;

    // Tint overlay follows the player rectangle.
    if (this._tintOverlay) {
      this._tintOverlay.x = px;
      this._tintOverlay.y = py;
      this._tintOverlay.rotation = p.sprite.rotation;
      this._tintOverlay.scaleX = p.sprite.scaleX;
      this._tintOverlay.scaleY = p.sprite.scaleY;
      // Match player alpha (i-frames flicker)
      this._tintOverlay.alpha = (this.lvl === 1) ? 0 : (0.35 * (p.sprite.alpha || 1));
    }

    // Aura — pulses; gets bigger/stronger per level.
    const pulse = 0.6 + 0.4 * Math.sin(time * 0.004);
    const radius = 36 * this._intensity * (0.9 + 0.1 * pulse);
    if (this._aura) {
      this._aura.x = px;
      this._aura.y = py + 6;
      this._aura.setRadius(radius);
      this._aura.alpha = (PLAYER_AURA_LEVELS[this.lvl].auraAlpha) * (0.7 + 0.3 * pulse);
    }

    // Floating orb above the head — orbits gently.
    if (this._orb) {
      this._orbAngle += 0.02;
      const ox = px + Math.cos(this._orbAngle) * 6;
      const oy = py - PLAYER.HEIGHT / 2 - 18 + Math.sin(this._orbAngle * 2) * 3;
      this._orb.clear();
      // Halo glow
      this._orb.fillStyle(this._orbColor, 0.35);
      this._orb.fillCircle(ox, oy, 10);
      // Core
      this._orb.fillStyle(this._orbColor, 1);
      this._orb.fillCircle(ox, oy, 5);
      this._orb.fillStyle(0xffffff, 0.9);
      this._orb.fillCircle(ox - 1, oy - 1, 1.6);
    }

    // F flash already self-destructs.
  }

  destroy() {
    if (this._tintOverlay) this._tintOverlay.destroy();
    if (this._orb) this._orb.destroy();
    if (this._aura) this._aura.destroy();
  }
}
