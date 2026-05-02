// Shadow Cloud Enemy
// - Patrols in a sine-wave drift
// - Fires a spotlight beam in 3 phases: idle → telegraph (warn) → fire (chase player)
// - While the beam is hitting the player, drains HP and spawns colorful orbs
//   that fly from the player into the cloud (visualizing the "color theft")
// - HP-based (multi-hit kill), contact damage on body touch

class CloudEnemy {
  constructor(scene, x, y, opts = {}) {
    const cfg = ENEMIES.SHADOW_CLOUD;
    this.scene = scene;
    this.cfg = cfg;
    this.startX = x;
    this.startY = y;
    this.scaleFactor = opts.scale || 1.0;
    this.golden = !!opts.golden;
    this.phase = Math.random() * Math.PI * 2;
    this.alive = true;
    this.hp = cfg.HP;
    this.maxHp = cfg.HP;

    // --- Visuals ---
    this.container = scene.add.container(x, y);
    this.container.setDepth(5);

    if (this.golden) {
      this.aura = scene.add.circle(0, 0, 52 * this.scaleFactor, 0xffd84f, 0.18);
      this.container.add(this.aura);
      scene.tweens.add({
        targets: this.aura, alpha: 0.35, duration: 900,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    this.bodyG = scene.add.graphics();
    this._drawCloudBody(this.bodyG);
    this.container.add(this.bodyG);

    this.eyeWhite = scene.add.circle(0, -2, 9 * this.scaleFactor, 0xffffff);
    this.eyeIris  = scene.add.circle(1, -1, 5.5 * this.scaleFactor, 0x4fa8d8);
    this.eyePupil = scene.add.circle(2, -1, 2.8 * this.scaleFactor, 0x1a2838);
    this.container.add([this.eyeWhite, this.eyeIris, this.eyePupil]);

    // --- Beam state machine ---
    this.beamState = 'idle'; // idle | telegraph | fire
    this.nextBeamAt = scene.time.now + Phaser.Math.Between(1200, 2400);
    this.beamEndAt = 0;
    this.beamStartAt = 0;
    this.beamTargetX = x;
    this.beamTargetY = y + 200;
    this.beamAngle = Math.PI / 2;  // pointing down initially
    this.beamLength = 300;

    this.beam = scene.add.graphics();
    this.beam.setDepth(4);

    this.lastDrainAt = 0;

    // --- Contact hitbox (invisible physics rect) ---
    this.hitbox = scene.add.rectangle(x, y, 64 * this.scaleFactor, 44 * this.scaleFactor, 0x000000, 0);
    scene.physics.add.existing(this.hitbox);
    this.hitbox.body.setAllowGravity(false);
    this.hitbox.body.setImmovable(true);
    this.hitbox.enemyRef = this;
  }

  _drawCloudBody(g) {
    g.clear();
    const s = this.scaleFactor;
    const bodyColor = this.golden ? 0xffe89a : COLORS.ENEMY_CLOUD;
    const hiColor   = this.golden ? 0xfff3b8 : COLORS.CLOUD_HI;
    const puffs = [
      { dx: -22, dy: 4, r: 15 },
      { dx: -5,  dy: -7, r: 20 },
      { dx: 16,  dy: 0, r: 18 },
      { dx: 3,   dy: 9, r: 16 },
      { dx: -14, dy: 12, r: 13 },
    ];
    g.fillStyle(COLORS.CLOUD_SHADOW, 0.55);
    puffs.forEach(p => g.fillCircle(p.dx * s, (p.dy + 5) * s, p.r * s));
    g.fillStyle(bodyColor, 1);
    puffs.forEach(p => g.fillCircle(p.dx * s, p.dy * s, p.r * s));
    g.fillStyle(hiColor, 1);
    puffs.slice(1, 3).forEach(p => g.fillCircle(p.dx * s, (p.dy - 6) * s, p.r * s * 0.55));
  }

  update(time, delta, player) {
    if (!this.alive) return;

    // --- Patrol: sine drift around (startX, startY) ---
    const t = time * 0.001;
    this.container.x = this.startX + Math.sin(t * this.cfg.PATROL_SPEED + this.phase) * this.cfg.PATROL_RANGE;
    this.container.y = this.startY + Math.sin(t * this.cfg.FLOAT_SPEED + this.phase) * this.cfg.FLOAT_AMPLITUDE;
    this.hitbox.setPosition(this.container.x, this.container.y);

    const px = player.sprite.x;
    const py = player.sprite.y;
    const dist = Phaser.Math.Distance.Between(this.container.x, this.container.y, px, py);

    // --- Beam state machine ---
    if (this.beamState === 'idle') {
      if (time >= this.nextBeamAt && dist <= this.cfg.BEAM_RANGE) {
        this._startTelegraph(time, px, py);
      }
    } else if (this.beamState === 'telegraph') {
      this._updateTelegraph(time, px, py);
      if (time >= this.beamEndAt) this._startFire(time, px, py);
    } else if (this.beamState === 'fire') {
      this._updateFire(time, delta, px, py, player);
      if (time >= this.beamEndAt) this._endBeam(time);
    }

    // --- Redraw beam ---
    this._drawBeam();
  }

  _startTelegraph(time, px, py) {
    this.beamState = 'telegraph';
    this.beamStartAt = time;
    this.beamEndAt = time + this.cfg.BEAM_TELEGRAPH_MS;
    this.beamTargetX = px;
    this.beamTargetY = py;
  }

  _updateTelegraph(time, px, py) {
    // Slowly track toward player during telegraph
    this.beamTargetX = Phaser.Math.Linear(this.beamTargetX, px, 0.08);
    this.beamTargetY = Phaser.Math.Linear(this.beamTargetY, py, 0.08);
  }

  _startFire(time, px, py) {
    this.beamState = 'fire';
    this.beamStartAt = time;
    this.beamEndAt = time + this.cfg.BEAM_FIRE_MS;
    this.lastDrainAt = 0;
  }

  _updateFire(time, delta, px, py, player) {
    // Beam chases the player
    this.beamTargetX = Phaser.Math.Linear(this.beamTargetX, px, this.cfg.BEAM_TRACK_LERP);
    this.beamTargetY = Phaser.Math.Linear(this.beamTargetY, py, this.cfg.BEAM_TRACK_LERP);

    // Check hit & apply drain
    const hit = this._beamHit(px, py);
    if (hit.hit && player.alive !== false) {
      const interval = Phaser.Math.Linear(
        this.cfg.DRAIN_INTERVAL_FAR,
        this.cfg.DRAIN_INTERVAL_NEAR,
        hit.strength
      );
      if (time - this.lastDrainAt >= interval) {
        this.lastDrainAt = time;
        // Drain HP (bypasses invuln — continuous drain is the whole point)
        player.hp = Math.max(0, player.hp - this.cfg.DRAIN_HP);
        this.scene.events.emit('playerHpChanged', player.hp, player.maxHp);
        // Spawn colorful drain orbs
        const count = 1 + Math.floor(hit.strength * 4);
        for (let i = 0; i < count; i++) {
          this._spawnDrainOrb(px, py);
        }
      }
    }
  }

  _endBeam(time) {
    this.beamState = 'idle';
    this.nextBeamAt = time + Phaser.Math.Between(
      this.cfg.BEAM_COOLDOWN_MIN, this.cfg.BEAM_COOLDOWN_MAX
    );
  }

  _drawBeam() {
    const g = this.beam;
    g.clear();
    if (this.beamState === 'idle') return;

    const ox = this.container.x;
    const oy = this.container.y + 14;
    const dx = this.beamTargetX - ox;
    const dy = this.beamTargetY - oy;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    this.beamAngle = angle;
    this.beamLength = Math.max(60, length);

    const topHalf = this.cfg.BEAM_TOP_HALF;
    const botHalf = this.cfg.BEAM_BOTTOM_HALF;

    // Compute cone corners in beam-local space, then rotate
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const fwdX = Math.cos(angle);
    const fwdY = Math.sin(angle);
    const tipX = ox + fwdX * this.beamLength;
    const tipY = oy + fwdY * this.beamLength;

    const p1x = ox + perpX * topHalf;
    const p1y = oy + perpY * topHalf;
    const p2x = ox - perpX * topHalf;
    const p2y = oy - perpY * topHalf;
    const p3x = tipX - perpX * botHalf;
    const p3y = tipY - perpY * botHalf;
    const p4x = tipX + perpX * botHalf;
    const p4y = tipY + perpY * botHalf;

    if (this.beamState === 'telegraph') {
      // Pulsing thin warning beam (red-orange tint)
      const pulse = 0.15 + 0.15 * Math.sin((this.scene.time.now - this.beamStartAt) * 0.015);
      g.fillStyle(0xff6060, pulse);
      g.beginPath();
      g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.lineTo(p3x, p3y); g.lineTo(p4x, p4y);
      g.closePath(); g.fillPath();
      // Bright core line
      g.lineStyle(2, 0xffaaaa, 0.7);
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(tipX, tipY); g.strokePath();
    } else {
      // Full fire beam — dark grey cone + inner highlight
      g.fillStyle(COLORS.SPOTLIGHT, 0.32);
      g.beginPath();
      g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.lineTo(p3x, p3y); g.lineTo(p4x, p4y);
      g.closePath(); g.fillPath();
      // Inner bright streak
      g.fillStyle(COLORS.SPOTLIGHT, 0.18);
      const innerTop = topHalf * 0.45;
      const innerBot = botHalf * 0.45;
      const q1x = ox + perpX * innerTop, q1y = oy + perpY * innerTop;
      const q2x = ox - perpX * innerTop, q2y = oy - perpY * innerTop;
      const q3x = tipX - perpX * innerBot, q3y = tipY - perpY * innerBot;
      const q4x = tipX + perpX * innerBot, q4y = tipY + perpY * innerBot;
      g.beginPath();
      g.moveTo(q1x, q1y); g.lineTo(q2x, q2y); g.lineTo(q3x, q3y); g.lineTo(q4x, q4y);
      g.closePath(); g.fillPath();
    }
  }

  /** Hit-test if point (px,py) is inside beam cone. Returns { hit, strength }. */
  _beamHit(px, py) {
    const ox = this.container.x;
    const oy = this.container.y + 14;
    const fwdX = Math.cos(this.beamAngle);
    const fwdY = Math.sin(this.beamAngle);
    const relX = px - ox;
    const relY = py - oy;
    const along = relX * fwdX + relY * fwdY;
    if (along < 0 || along > this.beamLength) return { hit: false, strength: 0 };
    const perpX = -fwdX;
    const perpY = fwdX * 0; // placeholder, recompute
    // perpendicular is (-sin, cos)
    const pX = -Math.sin(this.beamAngle);
    const pY = Math.cos(this.beamAngle);
    const side = Math.abs(relX * pX + relY * pY);
    const t = along / this.beamLength;
    const widthAt = Phaser.Math.Linear(this.cfg.BEAM_TOP_HALF, this.cfg.BEAM_BOTTOM_HALF, t);
    const hit = side <= widthAt + 4;
    const strength = Math.max(0, 1 - (along / this.beamLength));
    return { hit, strength };
  }

  _spawnDrainOrb(px, py) {
    const orbColors = [0xff5e7d, 0x5fc8ff, 0xffd84f, 0x8ae06e, 0xc489ff, 0xffb06e];
    const color = orbColors[Math.floor(Math.random() * orbColors.length)];
    const orb = this.scene.add.circle(
      px + Phaser.Math.Between(-10, 10),
      py + Phaser.Math.Between(-14, 8),
      Phaser.Math.FloatBetween(2.5, 4.5),
      color, 0.95
    );
    orb.setDepth(7);
    // Target: cloud center
    const targetX = () => this.container.x;
    const targetY = () => this.container.y;
    this.scene.tweens.add({
      targets: orb,
      x: { getEnd: targetX },
      y: { getEnd: targetY },
      scale: 0.2,
      alpha: 0.2,
      duration: Phaser.Math.Between(500, 750),
      ease: 'Quad.easeIn',
      onComplete: () => orb.destroy(),
    });
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    // Flash white
    this.scene.tweens.add({
      targets: this.bodyG,
      alpha: 0.2,
      duration: 70,
      yoyo: true,
    });
    if (this.hp <= 0) this._die();
  }

  _die() {
    this.alive = false;
    this.beam.destroy();
    this.hitbox.destroy();

    const cx = this.container.x;
    const cy = this.container.y;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.4, scaleY: 1.4, alpha: 0,
      duration: 450, ease: 'Quad.easeOut',
      onComplete: () => this.container.destroy(),
    });
    // Heart particle burst
    for (let i = 0; i < 10; i++) {
      const heart = this.scene.add.circle(cx, cy, 4, COLORS.HEART, 0.9);
      const ang = (Math.PI * 2 / 10) * i;
      const speed = 140;
      this.scene.tweens.add({
        targets: heart,
        x: cx + Math.cos(ang) * speed,
        y: cy + Math.sin(ang) * speed,
        alpha: 0, scale: 0,
        duration: 600, ease: 'Quad.easeOut',
        onComplete: () => heart.destroy(),
      });
    }
    this.scene.events.emit('enemyDefeated', this);
  }
}
