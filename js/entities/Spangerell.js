// Spangerell — ground enemy.
// Patrols within a range; when the player is within CHARGE_RANGE horizontally
// and close enough vertically, it telegraphs (crouch) then charges at high speed.
// Contact damages the player. Takes multiple heart hits to kill.

class Spangerell {
  constructor(scene, x, y, opts = {}) {
    const cfg = ENEMIES.SPANGERELL;
    this.scene = scene;
    this.cfg = cfg;
    this.startX = x;
    this.hp = cfg.HP;
    this.maxHp = cfg.HP;
    this.alive = true;
    this.patrolRange = opts.patrolRange || cfg.PATROL_RANGE;
    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.facingRight = this.patrolDir > 0;
    this.isCharging = false;
    this.chargeCooldownUntil = 0;

    // --- Container + artwork ---
    this.container = scene.add.container(x, y);
    this.container.setDepth(6);

    const g = scene.add.graphics();

    // Body — orchid/flytrap hybrid body, warm magenta
    const bodyColor = 0xc8508a;
    const bodyShadow = 0x8a2a60;
    const headColor  = 0x2a5a3a; // venus flytrap head
    const headHi    = 0x6ea25a;

    // Stem (back)
    g.fillStyle(0x3a6a3a, 1);
    g.fillRoundedRect(-4, -6, 8, 24, 3);

    // Body blob (flowing)
    g.fillStyle(bodyShadow, 1);
    g.fillEllipse(0, 8, cfg.WIDTH + 4, cfg.HEIGHT + 4);
    g.fillStyle(bodyColor, 1);
    g.fillEllipse(0, 6, cfg.WIDTH, cfg.HEIGHT);

    // Body highlight streak
    g.fillStyle(0xffb0d0, 0.5);
    g.fillEllipse(-6, 0, cfg.WIDTH * 0.4, cfg.HEIGHT * 0.3);

    this.container.add(g);

    // Head (separately so we can scale it on charge telegraph)
    this.headPart = scene.add.container(0, -cfg.HEIGHT / 2 - 4);
    const headG = scene.add.graphics();
    // Jaw bottom
    headG.fillStyle(headColor, 1);
    headG.fillEllipse(0, 6, 26, 14);
    headG.fillStyle(headHi, 1);
    headG.fillEllipse(-3, 4, 18, 8);
    // Jaw top (flytrap upper)
    headG.fillStyle(headColor, 1);
    headG.fillEllipse(0, -4, 26, 14);
    // Teeth hint
    headG.fillStyle(0xffffff, 0.8);
    for (let i = -8; i <= 8; i += 4) {
      headG.fillTriangle(i - 1, 0, i + 1, 0, i, 3);
    }
    // Small eyes
    headG.fillStyle(0xffd070, 1);
    headG.fillCircle(-6, -2, 1.6);
    headG.fillCircle(6, -2, 1.6);

    this.jawInner = headG;
    this.headPart.add(headG);
    this.container.add(this.headPart);

    // Subtle tail anther
    const anther = scene.add.circle(0, cfg.HEIGHT / 2 + 2, 3, 0xffd070, 0.9);
    this.container.add(anther);

    // --- Physics body ---
    this.body = scene.physics.add.existing(
      scene.add.rectangle(x, y, cfg.WIDTH, cfg.HEIGHT, 0x000000, 0)
    );
    this.body.body.setAllowGravity(true);
    this.body.body.setGravityY(800);
    this.body.body.setCollideWorldBounds(false);
    this.body.enemyRef = this;
    // Add collider with scene platforms later (wiring in scene)

    // HP bar (small, above body)
    this.hpBarBg = scene.add.rectangle(0, -cfg.HEIGHT / 2 - 22, 38, 4, 0x000000, 0.5);
    this.hpBarFg = scene.add.rectangle(-19, -cfg.HEIGHT / 2 - 22, 38, 4, 0xff6a8a, 1).setOrigin(0, 0.5);
    this.container.add([this.hpBarBg, this.hpBarFg]);
  }

  update(time, delta, player) {
    if (!this.alive) return;

    // Keep container aligned with physics body
    this.container.x = this.body.x;
    this.container.y = this.body.y;

    const px = player.sprite.x;
    const py = player.sprite.y;
    const distX = Math.abs(px - this.body.x);
    const distY = Math.abs(py - this.body.y);
    const dirToPlayer = px > this.body.x ? 1 : -1;

    const canSee = distX < this.cfg.CHARGE_RANGE
                 && distY < this.cfg.VERT_TOLERANCE
                 && time >= this.chargeCooldownUntil;

    if (canSee) {
      // Charge
      if (!this.isCharging) {
        this.isCharging = true;
        // Telegraph: brief crouch
        this.scene.tweens.add({
          targets: this.container,
          scaleY: 0.75,
          duration: 160,
          yoyo: true,
        });
      }
      this.body.body.setVelocityX(this.cfg.CHARGE_SPEED * dirToPlayer);
      this.facingRight = dirToPlayer > 0;

      // Jaw chatter
      const pulse = 1.0 + Math.sin(time * 0.02) * 0.18;
      this.headPart.setScale(pulse, pulse);
    } else {
      if (this.isCharging) {
        this.isCharging = false;
        this.chargeCooldownUntil = time + 900;
      }
      this.headPart.setScale(1, 1);
      // Patrol
      const dist = this.body.x - this.startX;
      if (Math.abs(dist) > this.patrolRange) this.patrolDir *= -1;
      this.body.body.setVelocityX(this.cfg.PATROL_SPEED * this.patrolDir);
      this.facingRight = this.patrolDir > 0;
    }

    // Flip visuals to match facing
    this.container.scaleX = this.facingRight ? 1 : -1;

    // Contact damage
    const playerDistX = Math.abs(player.sprite.x - this.body.x);
    const playerDistY = Math.abs(player.sprite.y - this.body.y);
    if (playerDistX < (this.cfg.WIDTH / 2 + PLAYER.WIDTH / 2)
     && playerDistY < (this.cfg.HEIGHT / 2 + PLAYER.HEIGHT / 2)) {
      player.takeDamage(this.cfg.CONTACT_DAMAGE);
    }

    // Update HP bar
    this.hpBarFg.scaleX = Math.max(0, this.hp / this.maxHp);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    // Flash
    this.scene.tweens.add({
      targets: this.container.list,
      alpha: 0.25,
      duration: 70,
      yoyo: true,
    });
    // Knockback
    const knockDir = this.facingRight ? -1 : 1;
    this.body.body.setVelocityX(180 * knockDir);
    this.body.body.setVelocityY(-120);
    if (this.hp <= 0) this._die();
  }

  _die() {
    this.alive = false;
    const cx = this.body.x;
    const cy = this.body.y;
    this.body.destroy();
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 0, scaleY: 0, alpha: 0,
      duration: 400, ease: 'Quad.easeOut',
      onComplete: () => this.container.destroy(),
    });
    // Colorful petal burst
    const petalColors = [0xff5e7d, 0xffd84f, 0x5fc8ff, 0x8ae06e, 0xc489ff];
    for (let i = 0; i < 14; i++) {
      const color = petalColors[Math.floor(Math.random() * petalColors.length)];
      const p = this.scene.add.circle(cx, cy, 4, color, 1);
      const ang = (Math.PI * 2 / 14) * i + Math.random() * 0.3;
      const speed = 150;
      this.scene.tweens.add({
        targets: p,
        x: cx + Math.cos(ang) * speed + (Math.random() - 0.5) * 40,
        y: cy + Math.sin(ang) * speed * 0.5 - 40,
        alpha: 0, scale: 0,
        duration: 900, ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
    this.scene.events.emit('enemyDefeated', this);
  }
}
