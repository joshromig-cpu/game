// Player entity — Gris-like floaty, graceful movement

class Player {
  constructor(scene, x, y) {
    this.scene = scene;

    // Create player as a colored rectangle (placeholder)
    this.sprite = scene.add.rectangle(x, y, PLAYER.WIDTH, PLAYER.HEIGHT, COLORS.PLAYER);
    scene.physics.add.existing(this.sprite);

    this.body = this.sprite.body;
    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocity(PLAYER.MAX_SPRINT_SPEED, PLAYER.MAX_FALL_SPEED);
    this.body.setGravityY(PLAYER.GRAVITY);
    this.body.setDragX(PLAYER.DRAG);

    // State
    this.isSprinting = false;
    this.hasDoubleJumped = false;
    this.isInDoubleJump = false;
    this.isBackstepping = false;
    this.backstepTimer = 0;
    this.facingRight = true;
    this.isOnGround = false;
    this._jumpHeldLastFrame = false; // for edge-triggered jump

    // Combat state
    this.hp = 100;
    this.maxHp = 100;
    this.invulnTimer = 0;        // ms of invulnerability remaining
    this.fireCooldown = 0;        // ms until next heart can fire
    this.fireCooldownMax = 260;   // shot rate

    // Visual flourishes (placeholder — will be animations later)
    this.clothTrail = [];

    // Rose-colored glasses indicator (small pink rectangle on top)
    this.glasses = scene.add.rectangle(0, 0, 20, 6, 0xff84c8);

    // Flowing clothing indicator (small trailing shape)
    this.clothingTrail = scene.add.rectangle(0, 0, 12, 20, 0x9c8fcd, 0.4);

    // Mirror shield (hidden by default; activated in boss fight)
    this.isMirroring = false;
    this.mirrorGraphics = null;
  }

  // Mirror deflect support — the boss scene enables this and draws/hides the shield.
  setMirrorActive(active) {
    this.isMirroring = !!active;
    if (this.mirrorGraphics) this.mirrorGraphics.setVisible(this.isMirroring);
  }

  createMirrorShield() {
    if (this.mirrorGraphics) return this.mirrorGraphics;
    const g = this.scene.add.graphics();
    g.setDepth(11);
    g.setVisible(false);
    this.mirrorGraphics = g;
    return g;
  }

  drawMirrorShield(offsetX, offsetY) {
    if (!this.mirrorGraphics || !this.isMirroring) return;
    const g = this.mirrorGraphics;
    g.clear();
    const dir = this.facingRight ? 1 : -1;
    const x = this.sprite.x + dir * offsetX;
    const y = this.sprite.y + offsetY;
    // Frame
    g.fillStyle(0xe8c870, 1);
    g.fillRoundedRect(x - 12 * dir, y - 42, 24, 84, 10);
    // Glass with gradient streaks
    g.fillStyle(0xcfe8ff, 0.85);
    g.fillRoundedRect(x - 8 * dir, y - 38, 16, 76, 7);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(x - 6 * dir, y - 32, 3, 64);
    // Sparkle
    const t = this.scene.time.now * 0.01;
    const sparkleY = y - 30 + (Math.sin(t) * 20);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, sparkleY, 3);
  }

  update(cursors, touchInput) {
    this.isOnGround = this.body.blocked.down || this.body.touching.down;

    // Reset double jump when landing
    if (this.isOnGround) {
      this.hasDoubleJumped = false;
      this.isInDoubleJump = false;
      this.body.setGravityY(PLAYER.GRAVITY);
      this.body.setDragX(PLAYER.DRAG);
    } else {
      this.body.setDragX(PLAYER.AIR_DRAG);
    }

    // Handle backstep
    if (this.isBackstepping) {
      this.backstepTimer -= this.scene.game.loop.delta;
      if (this.backstepTimer <= 0) {
        this.isBackstepping = false;
      }
      this._updateVisuals();
      return; // No other input during backstep
    }

    // --- Input handling ---
    const left = cursors.left.isDown || (touchInput && touchInput.left);
    const right = cursors.right.isDown || (touchInput && touchInput.right);
    const up = cursors.up.isDown || (touchInput && touchInput.jump);
    const sprint = cursors.shift.isDown || (touchInput && touchInput.sprint);
    const backstep = Phaser.Input.Keyboard.JustDown(cursors.backstep) || (touchInput && touchInput.backstepJust);

    this.isSprinting = sprint;
    const accel = this.isSprinting ? PLAYER.SPRINT_ACCEL : PLAYER.WALK_ACCEL;
    const maxSpeed = this.isSprinting ? PLAYER.MAX_SPRINT_SPEED : PLAYER.MAX_WALK_SPEED;
    this.body.setMaxVelocityX(maxSpeed);

    // Horizontal movement — smooth acceleration
    if (left) {
      this.body.setAccelerationX(-accel);
      this.facingRight = false;
    } else if (right) {
      this.body.setAccelerationX(accel);
      this.facingRight = true;
    } else {
      this.body.setAccelerationX(0);
    }

    // Jump — edge triggered so double-jump requires a fresh press
    const jumpPressed = up && !this._jumpHeldLastFrame;
    if (jumpPressed && this._canJump()) {
      this._jump();
    }
    this._jumpHeldLastFrame = !!up;

    // Backstep
    if (backstep && this.isOnGround) {
      this._backstep();
    }

    // Fire heart
    const shoot = (cursors.shoot && cursors.shoot.isDown) || (touchInput && touchInput.shoot);
    const delta = this.scene.game.loop.delta;
    if (this.fireCooldown > 0) this.fireCooldown -= delta;
    if (shoot && this.fireCooldown <= 0) {
      this._fireHeart();
      this.fireCooldown = this.fireCooldownMax;
    }

    // Tick invuln
    if (this.invulnTimer > 0) {
      this.invulnTimer -= delta;
      // Flicker
      this.sprite.alpha = (Math.floor(this.invulnTimer / 60) % 2 === 0) ? 0.4 : 1;
    } else {
      this.sprite.alpha = 1;
    }

    this._updateVisuals();
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnTimer = 900;
    this.scene.events.emit('playerHpChanged', this.hp, this.maxHp);

    // Red flash
    const flash = this.scene.add.rectangle(
      this.sprite.x, this.sprite.y,
      PLAYER.WIDTH + 10, PLAYER.HEIGHT + 10,
      0xff4040, 0.6
    );
    this.scene.tweens.add({
      targets: flash, alpha: 0, duration: 200,
      onComplete: () => flash.destroy(),
    });

    // Small knockback upward
    this.body.setVelocityY(-200);
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.scene.events.emit('playerHpChanged', this.hp, this.maxHp);
  }

  _fireHeart() {
    const dir = this.facingRight ? 1 : -1;
    const hx = this.sprite.x + dir * (PLAYER.WIDTH / 2 + 6);
    const hy = this.sprite.y - 4;
    if (this.scene.spawnHeart) {
      this.scene.spawnHeart(hx, hy, dir);
    }
  }

  _canJump() {
    // Allow jump if: on ground (first jump) or in air without double jump used
    if (this.isOnGround) return true;
    if (!this.hasDoubleJumped) return true;
    return false;
  }

  _jump() {
    if (this.isOnGround) {
      // First jump — graceful arc
      this.body.setVelocityY(PLAYER.JUMP_VELOCITY);
      this.hasDoubleJumped = false;
      this.isInDoubleJump = false;
    } else if (!this.hasDoubleJumped) {
      // Double jump — spin, clothing catches air, slower descent
      this.body.setVelocityY(PLAYER.DOUBLE_JUMP_VELOCITY);
      this.hasDoubleJumped = true;
      this.isInDoubleJump = true;
      this.body.setGravityY(PLAYER.DOUBLE_JUMP_GRAVITY);
    }
  }

  _backstep() {
    this.isBackstepping = true;
    this.backstepTimer = PLAYER.BACKSTEP_DURATION;
    const direction = this.facingRight ? -1 : 1;
    this.body.setVelocityX(PLAYER.BACKSTEP_VELOCITY * direction);
    this.body.setAccelerationX(0);
  }

  _updateVisuals() {
    // Position glasses on player's head
    this.glasses.x = this.sprite.x;
    this.glasses.y = this.sprite.y - PLAYER.HEIGHT / 2 + 8;

    // Trailing clothing effect — follows with lag for flowing feel
    const targetX = this.sprite.x + (this.facingRight ? -10 : 10);
    const targetY = this.sprite.y + 10;
    this.clothingTrail.x += (targetX - this.clothingTrail.x) * 0.15;
    this.clothingTrail.y += (targetY - this.clothingTrail.y) * 0.15;

    // Scale clothing trail based on movement for billowing effect
    const speed = Math.abs(this.body.velocity.x);
    const billowScale = 1 + (speed / PLAYER.MAX_SPRINT_SPEED) * 0.8;
    this.clothingTrail.setScale(billowScale, billowScale);

    // Spin effect during double jump
    if (this.isInDoubleJump && !this.isOnGround) {
      this.sprite.rotation += 0.12;
      this.clothingTrail.alpha = 0.7;
    } else {
      this.sprite.rotation = 0;
      this.clothingTrail.alpha = 0.4;
    }

    // Backstep visual — squash effect
    if (this.isBackstepping) {
      this.sprite.setScale(0.8, 1.1);
    } else {
      this.sprite.setScale(1, 1);
    }
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }
}
