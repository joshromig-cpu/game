// HUD overlay — coins, HP, controls hint.
//
// All HUD elements are pinned with setScrollFactor(0) and positioned in
// camera space so they stay glued to the screen as the world scrolls.
// On mobile the controls hint is moved up to avoid overlap with the
// on-screen touch buttons (which sit at h-100).

class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' });
  }

  create() {
    // Cam matches the design size in FIT mode; ok to use either.
    const W = this.scale.width;
    const H = this.scale.height;

    const isTouch = window.MobileSupport && MobileSupport.isTouchDevice(this);

    // Coin display
    this.coinIcon = this.add.circle(40, 30, 8, COLORS.COIN, 0.8)
      .setScrollFactor(0).setDepth(50);
    this.coinText = this.add.text(56, 22, '0', {
      fontSize: '18px',
      fontFamily: 'sans-serif, Arial',
      color: '#ffd84f',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(50);

    // HP bar (top-left, below coins)
    const barX = 24, barY = 52, barW = 160, barH = 14;
    this.add.rectangle(barX, barY, barW, barH, 0x000000, 0.35)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(50);
    this.hpBar = this.add.rectangle(barX + 2, barY + 2, barW - 4, barH - 4, 0xff6a8a, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(51);
    this.hpBarMaxW = barW - 4;
    this.add.text(barX + barW + 8, barY - 1, 'HP', {
      fontSize: '12px', fontFamily: 'sans-serif, Arial', color: '#fff6e8',
    }).setScrollFactor(0).setDepth(51);

    // Controls hint. On touch devices, place near the TOP so it doesn't
    // overlap the on-screen joystick / jump button (which sit at the
    // bottom of the canvas at h-110 each). On desktop, keep the
    // historical bottom-center position.
    const hintText = isTouch
      ? 'DPAD move · A jump · B shoot · X back · RUN sprint'
      : 'Arrow Keys / WASD — Move    Space — Jump    Shift — Sprint    X — Backstep    Z — Shoot';

    const hintY = isTouch ? 80 : H - 30;
    this.hint = this.add.text(W / 2, hintY, hintText, {
      fontSize: '12px',
      fontFamily: 'sans-serif, Arial',
      color: '#f0eeff',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0.55).setScrollFactor(0).setDepth(50);

    // Fade hint after 5 seconds (so it stays around long enough to read).
    this.time.delayedCall(5000, () => {
      if (this.hint && this.hint.active) {
        this.tweens.add({ targets: this.hint, alpha: 0, duration: 2000 });
      }
    });

    // Subscribe to game-scene events from whichever scene is currently
    // emitting them. Level1Scene is the default at launch; if HUDScene
    // is ever reused for another scene it should still work because we
    // re-resolve the source scene here.
    const source = this.scene.get('Level1Scene');

    // Re-sync with the current values immediately — events emitted by
    // Level1Scene's create() may have fired BEFORE this scene's create()
    // ran, so we'd otherwise miss the initial state.
    if (source && source.player) {
      this._updateHp(source.player.hp, source.player.maxHp);
      this.coinText.setText(String(source.coinCount || 0));
    }

    const onHp = (hp, maxHp) => this._updateHp(hp, maxHp);
    const onCoin = (count) => {
      this.coinText.setText(count.toString());
      if (count > 0) {
        this.tweens.add({
          targets: [this.coinIcon, this.coinText],
          scaleX: 1.3, scaleY: 1.3,
          duration: 100, yoyo: true,
        });
      }
    };
    source.events.on('playerHpChanged', onHp);
    source.events.on('coinCollected', onCoin);

    // Remove listeners on shutdown so HUDScene can be safely re-launched
    // (e.g. after a debug warp to Level3 and back) without leaking handlers.
    this.events.once('shutdown', () => {
      source.events.off('playerHpChanged', onHp);
      source.events.off('coinCollected', onCoin);
    });

    if (window.DebugOverlay) DebugOverlay.attach(this);
  }

  _updateHp(hp, maxHp) {
    const pct = Math.max(0, hp / maxHp);
    this.tweens.add({
      targets: this.hpBar,
      scaleX: pct,
      duration: 180,
      ease: 'Quad.easeOut',
    });
  }
}
