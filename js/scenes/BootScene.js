// Boot scene — title / loading screen with reliable scene transition.
//
// Two start paths: (a) auto-advance after a short delay, (b) tap/click skip.
// Both are guarded by a single flag so the transition can't fire twice and
// double-start Level1Scene.

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Wire up loader error reporting. Any 404 / asset failure during boot
    // is logged so it's visible on-device via the debug overlay or browser
    // dev tools. (BootScene currently doesn't load any assets, but this
    // future-proofs the scene if assets are added later.)
    this.load.on('loaderror', (file) => {
      const msg = `[load error] ${file && file.key} -> ${file && file.src}`;
      window.__lastError = msg;
      console.error(msg);
    });
  }

  create() {
    // Use scale dimensions so the boot screen lays out correctly even when
    // CSS / orientation pinned the canvas to a non-design size before this
    // scene started. (Camera width/height match scale in FIT mode.)
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    this.add.rectangle(cx, cy, w, h, 0x0a0a1a).setScrollFactor(0);

    this.add.text(cx, cy - 60, 'Colors of the Moment Fade Away', {
      fontSize: '32px',
      // Web-safe fallback chain so missing custom fonts don't make text
      // disappear on mobile.
      fontFamily: 'Georgia, "Times New Roman", serif',
      color: '#f0eeff',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 8, 'Loading...', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#7c6fad',
    }).setOrigin(0.5);

    const isTouch = window.MobileSupport && MobileSupport.isTouchDevice(this);
    const startText = this.add.text(cx, cy + 70,
      isTouch ? 'Tap to start' : 'Click or tap to start',
      {
        fontSize: '16px',
        fontFamily: 'sans-serif',
        color: '#a895d8',
      }
    ).setOrigin(0.5);

    // Pulse the start text
    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    this._transitioned = false;
    this._elapsed = 0;
    this._autoAdvanceAtMs = 2000;

    this._go = () => {
      if (this._transitioned) return;
      this._transitioned = true;
      // First user gesture — unlock audio for iOS.
      if (window.MobileSupport) MobileSupport.unlockAudio(this);
      this.scene.start('Level1Scene');
    };

    this.input.once('pointerdown', this._go);
    this.input.keyboard.once('keydown', this._go);

    // Auto-advance after 2s so a missed tap doesn't strand the player on
    // the boot screen. We use TWO independent mechanisms — a scene timer
    // AND a delta-accumulator in update() — because on some browsers the
    // scene clock starts ticking late and the timer alone fires unreliably.
    this.time.delayedCall(this._autoAdvanceAtMs, this._go);

    if (window.DebugOverlay) DebugOverlay.attach(this);
  }

  update(time, delta) {
    if (this._transitioned) return;
    this._elapsed += delta || 0;
    if (this._elapsed >= this._autoAdvanceAtMs) this._go();
  }
}
