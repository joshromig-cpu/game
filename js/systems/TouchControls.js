// Mobile touch controls — virtual D-pad and action buttons

class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.active = !scene.sys.game.device.os.desktop;

    // State
    this.left = false;
    this.right = false;
    this.up = false;
    this.jump = false;
    this.sprint = false;
    this.backstepJust = false;
    this.shoot = false;

    // Internal
    this._jumpWasDown = false;
    this._backstepWasDown = false;

    if (!this.active) return;

    this._createControls();
  }

  _createControls() {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // D-pad positioning — bottom left
    const padX = 100;
    const padY = h - 100;
    const btnSize = 48;
    const gap = 8;

    // D-pad background circle
    this.padBg = scene.add.circle(padX, padY, 70, 0xffffff, 0.08)
      .setScrollFactor(0).setDepth(1000);

    // Left button
    this.btnLeft = scene.add.triangle(
      padX - btnSize - gap, padY,
      btnSize, 0, 0, btnSize / 2, btnSize, btnSize,
      0xffffff, 0.25
    ).setScrollFactor(0).setDepth(1001).setInteractive();

    // Right button
    this.btnRight = scene.add.triangle(
      padX + btnSize + gap, padY,
      0, 0, btnSize, btnSize / 2, 0, btnSize,
      0xffffff, 0.25
    ).setScrollFactor(0).setDepth(1001).setInteractive();

    // Action buttons — bottom right
    const actX = w - 100;
    const actY = h - 100;

    // Jump button (A) — large
    this.btnJump = scene.add.circle(actX, actY - 40, 32, 0x4fb8ff, 0.3)
      .setScrollFactor(0).setDepth(1001).setInteractive();
    this.lblJump = scene.add.text(actX, actY - 40, 'A', {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    // Shoot button (B)
    this.btnShoot = scene.add.circle(actX + 50, actY + 20, 26, 0xff4f6d, 0.3)
      .setScrollFactor(0).setDepth(1001).setInteractive();
    this.lblShoot = scene.add.text(actX + 50, actY + 20, 'B', {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    // Sprint button (small, above d-pad)
    this.btnSprint = scene.add.rectangle(padX, padY - 80, 60, 28, 0xffd84f, 0.25)
      .setScrollFactor(0).setDepth(1001).setInteractive();
    this.lblSprint = scene.add.text(padX, padY - 80, 'RUN', {
      fontSize: '11px', fontFamily: 'sans-serif', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    // Touch handlers
    this._setupButton(this.btnLeft, 'left');
    this._setupButton(this.btnRight, 'right');
    this._setupButton(this.btnJump, 'jump');
    this._setupButton(this.btnSprint, 'sprint');
    this._setupButton(this.btnShoot, 'shoot');

    // Also handle touch zones for the d-pad area
    this._setupDpadZone(padX, padY);
  }

  _setupButton(btn, key) {
    btn.on('pointerdown', () => { this[key] = true; });
    btn.on('pointerup', () => { this[key] = false; });
    btn.on('pointerout', () => { this[key] = false; });
  }

  _setupDpadZone(cx, cy) {
    // Large invisible touch zone for the d-pad area
    const zone = this.scene.add.zone(cx, cy, 180, 180)
      .setScrollFactor(0).setDepth(999).setInteractive();

    zone.on('pointerdown', (pointer) => this._handleDpadTouch(pointer, cx));
    zone.on('pointermove', (pointer) => {
      if (pointer.isDown) this._handleDpadTouch(pointer, cx);
    });
    zone.on('pointerup', () => {
      this.left = false;
      this.right = false;
    });
    zone.on('pointerout', () => {
      this.left = false;
      this.right = false;
    });
  }

  _handleDpadTouch(pointer, cx) {
    const dx = pointer.x - cx;
    if (dx < -15) {
      this.left = true;
      this.right = false;
    } else if (dx > 15) {
      this.right = true;
      this.left = false;
    } else {
      this.left = false;
      this.right = false;
    }
  }

  update() {
    if (!this.active) return;

    // Handle "just pressed" for jump (so we don't continuously jump)
    const jumpDown = this.jump;
    this.backstepJust = false;

    if (jumpDown && !this._jumpWasDown) {
      // Jump was just pressed
      this.jump = true;
    } else if (jumpDown && this._jumpWasDown) {
      // Jump is held — don't re-trigger
      this.jump = false;
    }
    this._jumpWasDown = jumpDown;
  }
}
