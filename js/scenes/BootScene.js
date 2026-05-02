// Boot scene — loading screen (minimal for Phase 1)

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // Simple loading text
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    this.add.text(cx, cy - 40, 'Colors of the Moment Fade Away', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#f0eeff',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 10, 'Loading...', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#7c6fad'
    }).setOrigin(0.5);

    // Proceed to level — use a click/tap to start (works even when tab is backgrounded)
    const startText = this.add.text(cx, cy + 60, 'Click or tap to start', {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#7c6fad',
    }).setOrigin(0.5);

    // Pulse the start text
    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => {
      this.scene.start('Level1Scene');
    });

    // Also auto-start after a delay (for when tab is focused)
    this._elapsed = 0;
    this._ready = false;
  }

  update(time, delta) {
    if (this._ready) return;
    this._elapsed += delta;
    if (this._elapsed >= 2000) {
      this._ready = true;
      this.scene.start('Level1Scene');
    }
  }
}
