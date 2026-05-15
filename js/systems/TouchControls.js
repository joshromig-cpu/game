// Mobile touch controls — virtual D-pad and action buttons.
//
// The control surface auto-repositions to camera coords on creation and
// whenever the screen resizes (orientation change). All graphics are pinned
// with setScrollFactor(0) so they don't move with world scroll, and live on
// depth 1000+ to stay on top of HUD elements.

class TouchControls {
  constructor(scene) {
    this.scene = scene;
    // Use MobileSupport detection — handles iPad-as-Mac and DEBUG_MODE.
    this.active = !!(window.MobileSupport && MobileSupport.isTouchDevice(scene));

    // Input state — read each frame by Player.update().
    this.left = false;
    this.right = false;
    this.up = false;
    this.jump = false;          // "is button currently pressed" (level-triggered)
    this._jumpEdge = false;     // edge-triggered flag — cleared each frame
    this.sprint = false;
    this.backstepJust = false;
    this.shoot = false;

    // Track active pointer IDs per button so we don't drop pressed state
    // when another finger moves over the button.
    this._pointers = { left: new Set(), right: new Set(), jump: new Set(),
                       sprint: new Set(), shoot: new Set(), back: new Set() };

    if (!this.active) return;

    this._createControls();

    // Re-layout on resize / orientation change.
    scene.scale.on('resize', () => this._layout());

    // Clear one-shot flags AFTER the scene's update tick so player.update()
    // sees them on the frame the gesture started. Without this, pointerdown
    // could fire mid-frame and be cleared before player.update() reads it.
    this._postUpdate = () => {
      this.backstepJust = false;
      this._jumpEdge = false;
    };
    scene.events.on('postupdate', this._postUpdate);

    scene.events.once('shutdown', () => {
      scene.scale.off('resize');
      scene.events.off('postupdate', this._postUpdate);
    });
  }

  _createControls() {
    const scene = this.scene;
    this._objs = [];

    // D-pad
    this.padBg = scene.add.circle(0, 0, 70, 0xffffff, 0.08);
    this._objs.push(this.padBg);

    this.btnLeft = scene.add.triangle(0, 0,
      48, 0, 0, 24, 48, 48,
      0xffffff, 0.25).setInteractive();
    this.btnRight = scene.add.triangle(0, 0,
      0, 0, 48, 24, 0, 48,
      0xffffff, 0.25).setInteractive();
    this._objs.push(this.btnLeft, this.btnRight);

    // Jump (A) — large blue
    this.btnJump = scene.add.circle(0, 0, 38, 0x4fb8ff, 0.32).setInteractive();
    this.lblJump = scene.add.text(0, 0, 'A', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
    this._objs.push(this.btnJump, this.lblJump);

    // Shoot (B) — small red
    this.btnShoot = scene.add.circle(0, 0, 28, 0xff4f6d, 0.32).setInteractive();
    this.lblShoot = scene.add.text(0, 0, 'B', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);
    this._objs.push(this.btnShoot, this.lblShoot);

    // Sprint — small yellow above d-pad
    this.btnSprint = scene.add.rectangle(0, 0, 64, 28, 0xffd84f, 0.28).setInteractive();
    this.lblSprint = scene.add.text(0, 0, 'RUN', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#ffffff',
    }).setOrigin(0.5);
    this._objs.push(this.btnSprint, this.lblSprint);

    // Backstep button (X) — small magenta near jump
    this.btnBack = scene.add.circle(0, 0, 22, 0xc489ff, 0.32).setInteractive();
    this.lblBack = scene.add.text(0, 0, 'X', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5);
    this._objs.push(this.btnBack, this.lblBack);

    // All controls: pinned, top of display list.
    for (const o of this._objs) {
      o.setScrollFactor(0);
      o.setDepth(1001);
    }
    this.padBg.setDepth(1000);

    // Wire up button press / release.
    this._setupButton(this.btnLeft,   'left');
    this._setupButton(this.btnRight,  'right');
    this._setupButton(this.btnJump,   'jump');
    this._setupButton(this.btnSprint, 'sprint');
    this._setupButton(this.btnShoot,  'shoot');
    this._setupButton(this.btnBack,   'back');

    this._layout();
  }

  _layout() {
    if (!this.active || !this.btnJump) return;
    // Camera size matches the game's design size in FIT mode; the scaler
    // letterboxes that into the viewport. Buttons in camera coords stay
    // properly positioned inside the visible game rectangle.
    const cam = this.scene.cameras.main;
    const w = cam.width, h = cam.height;

    // D-pad bottom-left
    const padX = 110, padY = h - 110;
    this.padBg.setPosition(padX, padY);
    this.btnLeft.setPosition(padX - 60, padY - 24);
    this.btnRight.setPosition(padX + 12, padY - 24);
    this.btnSprint.setPosition(padX, padY - 84);
    this.lblSprint.setPosition(padX, padY - 84);

    // Action buttons bottom-right
    const actX = w - 110, actY = h - 110;
    this.btnJump.setPosition(actX, actY - 30);
    this.lblJump.setPosition(actX, actY - 30);
    this.btnShoot.setPosition(actX + 60, actY + 20);
    this.lblShoot.setPosition(actX + 60, actY + 20);
    this.btnBack.setPosition(actX - 58, actY + 20);
    this.lblBack.setPosition(actX - 58, actY + 20);
  }

  _setupButton(btn, key) {
    btn.on('pointerdown', (pointer) => {
      this._pointers[key].add(pointer.id);
      this[key] = true;
      if (key === 'jump') this._jumpEdge = true;
      if (key === 'back') this.backstepJust = true;
      // Resume audio context — this counts as a user gesture.
      if (window.MobileSupport) MobileSupport.unlockAudio(this.scene);
    });
    const release = (pointer) => {
      if (pointer && pointer.id != null) this._pointers[key].delete(pointer.id);
      if (this._pointers[key].size === 0) this[key] = false;
    };
    btn.on('pointerup',   release);
    btn.on('pointerout',  release);
    btn.on('pointerupoutside', release);
  }

  // Player reads `this.jump` (level-triggered). The edge-triggered flag is
  // available via the helper isJumpJustPressed() for callers that want it.
  isJumpJustPressed() {
    const v = this._jumpEdge;
    this._jumpEdge = false;
    return v;
  }

  update() {
    if (!this.active) return;
    // No-op — flags are reset via the scene's postupdate event so they're
    // visible to player.update() during the same frame the gesture occurred.
  }
}
