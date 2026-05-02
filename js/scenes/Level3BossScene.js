// Level 3 — Celestial Ascent: Boss Fight
// The boss is a pure white version of the protagonist — his shadow self.
// Fight flow:
//   Phase 1: Shadow beams. Player dodges and/or deflects (Mirror) to charge heart meter.
//     On full meter, player unleashes a Heart Blast that damages the boss heavily.
//   Phase 2: Rage. Boss chases, fires fan beams. Cracks widen, revealing darkness inside.
//   Phase 3: Stunned (revelation). Player finishes him with final heart blast.
//   Epilogue: Boss shatters; fragments drift toward player; they merge; color floods in.
//
// Mirror deflect:
//   Hold Q (keyboard) or Shift+Up (touch) — a mirror shield appears in front of the player.
//   If a beam would hit the player while mirroring, the beam is reflected and meter fills.

class Level3BossScene extends Phaser.Scene {
  constructor() { super({ key: 'Level3BossScene' }); }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    // Start world mostly desaturated — color floods in as boss weakens.
    this._saturation = 0.2;
    this.cameras.main.setBounds(0, 0, W, H);

    // ---------- Dali backdrop ----------
    this._buildBackdrop();

    // ---------- Arena ground ----------
    const groundY = H - 80;
    this.groundY = groundY;
    const groundG = this.add.graphics();
    groundG.fillStyle(COLORS.DALI_DESERT, 1);
    groundG.fillRect(0, groundY, W, H - groundY);
    groundG.fillStyle(COLORS.DALI_DESERT_HI, 0.6);
    // cracked earth highlights
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * W;
      const y = groundY + 4 + Math.random() * (H - groundY - 8);
      groundG.fillRect(x, y, 1 + Math.random() * 3, 1);
    }
    // Horizon fracture line
    groundG.lineStyle(2, 0x2a1428, 0.8);
    groundG.beginPath();
    groundG.moveTo(0, groundY);
    for (let x = 0; x <= W; x += 16) {
      groundG.lineTo(x, groundY + Math.sin(x * 0.04) * 2);
    }
    groundG.strokePath();

    this.platforms = this.physics.add.staticGroup();
    const ground = this.add.rectangle(W / 2, groundY + (H - groundY) / 2, W, H - groundY, 0x000000, 0);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // Two floating slabs for vertical play — heights tuned so double-jump can clear them
    const slabs = [
      { x: 220, y: groundY - 140, w: 200, h: 20 },
      { x: W - 220, y: groundY - 140, w: 200, h: 20 },
      { x: W / 2, y: groundY - 250, w: 240, h: 20 },
    ];
    this.slabRects = [];
    slabs.forEach(s => {
      const rect = this.add.rectangle(s.x, s.y, s.w, s.h, 0x000000, 0);
      this.physics.add.existing(rect, true);
      this.platforms.add(rect);
      // Visual: stone slab
      const g = this.add.graphics();
      g.fillStyle(COLORS.DALI_ARCH, 1);
      g.fillRoundedRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 4);
      g.fillStyle(0xffffff, 0.18);
      g.fillRect(s.x - s.w / 2 + 4, s.y - s.h / 2 + 2, s.w - 8, 2);
      this.slabRects.push(rect);
    });

    // ---------- Player ----------
    this.player = new Player(this, 200, groundY - 80);
    this.physics.add.collider(this.player.sprite, this.platforms);
    this.player.createMirrorShield();

    // ---------- Cursors ----------
    this.cursors = this.input.keyboard.createCursorKeys();
    this.cursors.shift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    // Use arrow UP for jump (matches createCursorKeys) but also accept SPACE.
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.cursors.backstep = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.cursors.shoot = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.mirrorKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.blastKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // ---------- Heart bullets ----------
    this.heartBullets = [];

    // ---------- Boss ----------
    this.boss = new ShadowBoss(this, W / 2, groundY - 260);

    // ---------- Deflect meter ----------
    this.deflectMeter = 0;

    // ---------- Active shadow beams (damage sources) ----------
    this.activeBeams = []; // { x1,y1,x2,y2, width, createdAt, lastDamageAt, reflected }

    // ---------- UI ----------
    this._buildUI();

    // ---------- Intro sequence ----------
    this._startIntro();

    // ---------- Phase tracking ----------
    this.phase = 'intro'; // intro, p1, p2, p3, outro
    this.lastTauntAt = 0;
  }

  // ==================================================================
  // BACKDROP — Dali-esque melting surrealism
  // ==================================================================
  _buildBackdrop() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const g = this.add.graphics();
    // Sky gradient
    const bands = 60;
    const colors = [COLORS.DALI_SKY_TOP, COLORS.DALI_SKY_MID, COLORS.DALI_SKY_HORIZON, COLORS.DALI_SKY_LOW];
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      let col;
      if (t < 0.33) col = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(colors[0]),
        Phaser.Display.Color.IntegerToColor(colors[1]),
        1, t / 0.33
      );
      else if (t < 0.75) col = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(colors[1]),
        Phaser.Display.Color.IntegerToColor(colors[2]),
        1, (t - 0.33) / 0.42
      );
      else col = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(colors[2]),
        Phaser.Display.Color.IntegerToColor(colors[3]),
        1, (t - 0.75) / 0.25
      );
      const hex = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
      g.fillStyle(hex, 1);
      g.fillRect(0, (H * i) / bands, W, H / bands + 1);
    }

    // Distant pale moon
    g.fillStyle(0xfaf8f4, 0.5);
    g.fillCircle(W * 0.78, H * 0.22, 60);
    g.fillStyle(0xd8d4c8, 0.25);
    g.fillCircle(W * 0.78, H * 0.22, 80);

    // Melting arches (impossible architecture silhouettes)
    this._drawMeltingArch(g, W * 0.15, H * 0.72, 90, 260);
    this._drawMeltingArch(g, W * 0.85, H * 0.70, 110, 280);
    this._drawMeltingArch(g, W * 0.50, H * 0.78, 70, 180);

    // Floating melting clocks (Dali touch)
    this.clocks = [];
    for (let i = 0; i < 3; i++) {
      const cx = 150 + i * 450;
      const cy = 120 + (i % 2) * 60;
      const clock = this._drawMeltingClock(cx, cy);
      this.clocks.push({ obj: clock, baseY: cy, phase: i * 1.3 });
    }

    // Floating eyes / drifting particles for Dali vibe
    this.driftParticles = [];
    for (let i = 0; i < 24; i++) {
      const p = this.add.circle(
        Math.random() * W,
        Math.random() * H * 0.6,
        1 + Math.random() * 2,
        0xfaf8f4,
        0.3 + Math.random() * 0.4
      );
      this.driftParticles.push({ obj: p, vx: (Math.random() - 0.5) * 0.4, vy: -0.15 - Math.random() * 0.3 });
    }
  }

  _drawMeltingArch(g, x, yBase, w, h) {
    g.fillStyle(COLORS.DALI_ARCH, 0.75);
    // Pillar left
    g.fillRect(x - w / 2, yBase - h, w * 0.18, h);
    // Pillar right
    g.fillRect(x + w / 2 - w * 0.18, yBase - h, w * 0.18, h);
    // Arch top
    g.fillEllipse(x, yBase - h + w * 0.15, w, w * 0.4);
    // Melting drip down-right (Dali)
    g.beginPath();
    g.moveTo(x + w / 2 - w * 0.18, yBase - h + w * 0.1);
    g.lineTo(x + w / 2 + 6, yBase - h * 0.4);
    g.lineTo(x + w / 2 - 2, yBase - h * 0.3);
    g.closePath();
    g.fillPath();
  }

  _drawMeltingClock(x, y) {
    const g = this.add.graphics();
    g.fillStyle(COLORS.DALI_CLOCK, 0.85);
    // Main body — ellipse drooping
    g.fillEllipse(0, 0, 56, 44);
    // Rim darker
    g.lineStyle(2, 0x8a6a4a, 0.9);
    g.strokeEllipse(0, 0, 56, 44);
    // Melt drip
    g.fillStyle(COLORS.DALI_CLOCK, 0.9);
    g.fillTriangle(-20, 18, 10, 22, 2, 64);
    // Clock hands
    g.lineStyle(2, 0x2a1828, 1);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -14); g.strokePath();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(12, 4); g.strokePath();
    g.fillStyle(0x2a1828, 1);
    g.fillCircle(0, 0, 2);
    g.x = x; g.y = y;
    return g;
  }

  // ==================================================================
  // UI — HP bars, deflect meter, taunt text
  // ==================================================================
  _buildUI() {
    const W = GAME_WIDTH;

    // Player HP bar (top-left)
    this.add.rectangle(20, 20, 204, 16, 0x000000, 0.6).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    this.playerHpBar = this.add.rectangle(22, 22, 200, 12, 0xff6ea6, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(101);
    this.add.text(20, 40, 'PLAYER', { fontFamily: 'Courier', fontSize: '10px', color: '#fff6e8' })
      .setScrollFactor(0).setDepth(101);

    // Boss HP bar (top-center, wide)
    const bossBarW = 600;
    this.add.rectangle(W / 2, 20, bossBarW + 4, 20, 0x000000, 0.6).setScrollFactor(0).setDepth(100);
    this.bossHpBar = this.add.rectangle(W / 2 - bossBarW / 2, 20, bossBarW, 16, 0xd8d4c8, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    this.bossHpLabel = this.add.text(W / 2, 40, 'THE SHADOW SELF', {
      fontFamily: 'Courier', fontSize: '12px', color: '#fff6e8',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

    // Deflect meter (bottom-center)
    this.add.text(W / 2, GAME_HEIGHT - 46, 'HEART METER', {
      fontFamily: 'Courier', fontSize: '10px', color: '#fff6e8',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);
    this.add.rectangle(W / 2, GAME_HEIGHT - 28, 304, 14, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(100);
    this.deflectBar = this.add.rectangle(W / 2 - 150, GAME_HEIGHT - 28, 0, 10, COLORS.DEFLECT_METER, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    this.blastReadyText = this.add.text(W / 2, GAME_HEIGHT - 60, '', {
      fontFamily: 'Courier', fontSize: '14px', color: '#ffd84f',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

    // Controls hint
    this.add.text(W - 10, GAME_HEIGHT - 10,
      'ARROWS move · SPACE jump · Z shoot · Q mirror · E heart-blast (when full)',
      { fontFamily: 'Courier', fontSize: '10px', color: '#ffffff88' }
    ).setOrigin(1, 1).setScrollFactor(0).setDepth(101);

    // Taunt / dialogue text
    this.tauntText = this.add.text(W / 2, GAME_HEIGHT / 2 - 100, '', {
      fontFamily: 'Courier', fontSize: '20px', color: '#fff6e8',
      align: 'center', wordWrap: { width: W * 0.75 },
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
  }

  // ==================================================================
  // INTRO
  // ==================================================================
  _startIntro() {
    this._sayTaunt('You made it this far...', 2400);
    this.time.delayedCall(2800, () => {
      this._sayTaunt('Now meet the one you never wanted to see.', 2600);
    });
    this.time.delayedCall(5800, () => {
      this.phase = 'p1';
      this.boss.activate();
    });
  }

  _sayTaunt(text, duration = 3000) {
    this.tauntText.setText(text).setAlpha(0);
    this.tweens.add({
      targets: this.tauntText, alpha: 1, duration: 350,
      hold: duration,
      yoyo: true,
      onComplete: () => this.tauntText.setText(''),
    });
  }

  // ==================================================================
  // BULLETS (reuse Level1 pattern)
  // ==================================================================
  spawnHeart(x, y, dir) {
    const speed = WEAPONS.HEART_GUN.BULLET_SPEED;
    const g = this.add.graphics();
    g.fillStyle(0xff6ea6, 1);
    g.fillCircle(-4, 0, 6);
    g.fillCircle(4, 0, 6);
    g.fillTriangle(-9, 1, 9, 1, 0, 11);
    g.fillStyle(0xffc4d8, 0.9);
    g.fillCircle(-3, -2, 2);
    g.x = x; g.y = y;
    g.setDepth(8);

    const glow = this.add.circle(x, y, 10, 0xff9ab8, 0.5).setDepth(7);

    // Muzzle flash
    const flash = this.add.circle(x, y, 14, 0xff9ab8, 0.9).setDepth(9);
    this.tweens.add({ targets: flash, scale: 0.2, alpha: 0, duration: 160, onComplete: () => flash.destroy() });

    this.heartBullets.push({ g, glow, x, y, dir, speed, life: 1500, damage: WEAPONS.HEART_GUN.DAMAGE });
  }

  // ==================================================================
  // BOSS SHADOW BEAM — damage + mirror deflect logic
  // ==================================================================
  registerBeam(beam) {
    this.activeBeams.push(beam);
  }

  _tickBeams(time, delta) {
    for (let i = this.activeBeams.length - 1; i >= 0; i--) {
      const b = this.activeBeams[i];
      b.ttl -= delta;
      if (b.ttl <= 0) {
        b.graphics.destroy();
        this.activeBeams.splice(i, 1);
        continue;
      }

      // Check hit against player
      if (!b.reflected && this._pointInBeam(this.player.sprite.x, this.player.sprite.y, b)) {
        if (this.player.isMirroring && this._facingBeam(b)) {
          // Deflect!
          if (time - (b.lastDeflectAt || 0) > 200) {
            b.lastDeflectAt = time;
            this._onDeflect(b);
          }
        } else if (time - (b.lastDamageAt || 0) > BOSS.BEAM_DAMAGE_INTERVAL) {
          b.lastDamageAt = time;
          this.player.takeDamage(BOSS.BEAM_DAMAGE);
        }
      }

      // Reflected beams damage the boss
      if (b.reflected && this.boss && this.boss.alive) {
        if (this._pointInBeam(this.boss.body.x, this.boss.body.y, b)) {
          if (time - (b.lastBossHitAt || 0) > 160) {
            b.lastBossHitAt = time;
            this.boss.takeDamage(4);
          }
        }
      }
    }
  }

  _pointInBeam(px, py, b) {
    // Simple capsule check: distance from point to line segment <= width/2
    const dx = b.x2 - b.x1, dy = b.y2 - b.y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return false;
    let t = ((px - b.x1) * dx + (py - b.y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = b.x1 + t * dx, cy = b.y1 + t * dy;
    const ddx = px - cx, ddy = py - cy;
    return (ddx * ddx + ddy * ddy) <= (b.width * 0.5) * (b.width * 0.5);
  }

  _facingBeam(b) {
    // Player is "facing" the beam if the beam's source direction matches player's mirror direction
    const sourceDir = Math.sign(b.x1 - this.player.sprite.x);
    const playerDir = this.player.facingRight ? 1 : -1;
    return sourceDir === playerDir;
  }

  _onDeflect(beam) {
    beam.reflected = true;
    // Flip the beam visually toward the boss
    const g = beam.graphics;
    g.clear();
    const sx = this.player.sprite.x + (this.player.facingRight ? 30 : -30);
    const sy = this.player.sprite.y;
    const tx = this.boss.body.x, ty = this.boss.body.y;
    beam.x1 = sx; beam.y1 = sy;
    beam.x2 = tx; beam.y2 = ty;
    beam.width = 38;
    beam.ttl = 600;
    g.fillStyle(0xff9ab8, 0.8);
    this._drawCapsule(g, sx, sy, tx, ty, beam.width * 0.5);
    g.fillStyle(0xffffff, 0.6);
    this._drawCapsule(g, sx, sy, tx, ty, beam.width * 0.25);

    // Sparkle at mirror
    for (let i = 0; i < 10; i++) {
      const s = this.add.circle(sx, sy, 2 + Math.random() * 2, 0xffffff, 1).setDepth(12);
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: s,
        x: sx + Math.cos(a) * 30,
        y: sy + Math.sin(a) * 30,
        alpha: 0, duration: 400,
        onComplete: () => s.destroy(),
      });
    }

    // Charge meter
    this.deflectMeter = Math.min(BOSS.DEFLECT_METER_MAX, this.deflectMeter + BOSS.DEFLECT_METER_PER_HIT);
  }

  _drawCapsule(g, x1, y1, x2, y2, r) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len, ny = dx / len;
    g.fillTriangle(x1 + nx * r, y1 + ny * r, x2 + nx * r, y2 + ny * r, x2 - nx * r, y2 - ny * r);
    g.fillTriangle(x1 + nx * r, y1 + ny * r, x2 - nx * r, y2 - ny * r, x1 - nx * r, y1 - ny * r);
    g.fillCircle(x1, y1, r);
    g.fillCircle(x2, y2, r);
  }

  // ==================================================================
  // HEART BLAST (full meter → E)
  // ==================================================================
  _fireHeartBlast() {
    if (this.deflectMeter < BOSS.DEFLECT_METER_MAX) return;
    this.deflectMeter = 0;

    const sx = this.player.sprite.x;
    const sy = this.player.sprite.y;
    const tx = this.boss.body.x, ty = this.boss.body.y;
    const angle = Math.atan2(ty - sy, tx - sx);

    // Flash
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffc4d8, 0.6)
      .setScrollFactor(0).setDepth(250);
    this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });

    // Giant heart-wave beam
    const g = this.add.graphics().setDepth(14);
    g.fillStyle(0xff6ea6, 0.9);
    this._drawCapsule(g, sx, sy, tx, ty, 40);
    g.fillStyle(0xffc4d8, 0.8);
    this._drawCapsule(g, sx, sy, tx, ty, 20);

    this.tweens.add({
      targets: g, alpha: 0, duration: 700,
      onComplete: () => g.destroy(),
    });

    // Shockwave rings from player
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(sx, sy, 10, 0xffffff, 0).setDepth(12)
        .setStrokeStyle(3, 0xff6ea6, 0.8);
      this.tweens.add({
        targets: ring, radius: 180, alpha: 0,
        delay: i * 120, duration: 700,
        onUpdate: () => ring.setRadius ? null : null, // radius direct set below
        onComplete: () => ring.destroy(),
      });
      this.tweens.add({
        targets: ring, scale: 18, alpha: 0,
        delay: i * 120, duration: 700,
      });
    }

    // Heart petals explosion
    for (let i = 0; i < 20; i++) {
      const ang = (Math.PI * 2 / 20) * i;
      const p = this.add.circle(tx, ty, 6, [0xff6ea6, 0xffd84f, 0x8aa8ff, 0xa8e0a8][i % 4], 1).setDepth(13);
      this.tweens.add({
        targets: p,
        x: tx + Math.cos(ang) * 160,
        y: ty + Math.sin(ang) * 160,
        alpha: 0, scale: 0,
        duration: 900, ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }

    this.boss.takeDamage(BOSS.HEART_BLAST_DAMAGE);
    this.cameras.main.shake(250, 0.01);

    // Color floods in proportionally
    this._saturation = Math.min(1, this._saturation + 0.22);
    this._applySaturation();
  }

  _applySaturation() {
    // Rough world saturation: fade clocks & particles from desaturated to vivid
    const t = this._saturation;
    this.clocks.forEach(c => c.obj.alpha = 0.6 + t * 0.4);
    this.driftParticles.forEach(p => p.obj.alpha = 0.3 + t * 0.5);
  }

  // ==================================================================
  // UPDATE
  // ==================================================================
  update(time, delta) {
    const dt = delta / 1000;

    // Drift clocks + particles
    this.clocks.forEach(c => {
      c.obj.y = c.baseY + Math.sin(time * 0.0008 + c.phase) * 8;
      c.obj.rotation = Math.sin(time * 0.0004 + c.phase) * 0.06;
    });
    this.driftParticles.forEach(p => {
      p.obj.x += p.vx;
      p.obj.y += p.vy;
      if (p.obj.y < -10) { p.obj.y = GAME_HEIGHT; p.obj.x = Math.random() * GAME_WIDTH; }
      if (p.obj.x < -10) p.obj.x = GAME_WIDTH;
      if (p.obj.x > GAME_WIDTH + 10) p.obj.x = 0;
    });

    // Player — allow SPACE or UP for jump
    const merged = {
      left: this.cursors.left,
      right: this.cursors.right,
      up: { isDown: this.cursors.up.isDown || this.spaceKey.isDown },
      shift: this.cursors.shift,
      backstep: this.cursors.backstep,
      shoot: this.cursors.shoot,
    };
    this.player.update(merged, null);

    // Mirror toggle
    const mirrorHeld = this.mirrorKey.isDown;
    this.player.setMirrorActive(mirrorHeld);
    this.player.drawMirrorShield(30, 0);

    // Heart blast
    if (Phaser.Input.Keyboard.JustDown(this.blastKey)) {
      this._fireHeartBlast();
    }

    // Bullets
    for (let i = this.heartBullets.length - 1; i >= 0; i--) {
      const b = this.heartBullets[i];
      b.x += b.dir * b.speed * dt;
      b.life -= delta;
      b.g.x = b.x; b.g.y = b.y;
      b.glow.x = b.x; b.glow.y = b.y;
      let hit = false;
      if (this.boss && this.boss.alive) {
        const ddx = b.x - this.boss.body.x;
        const ddy = b.y - this.boss.body.y;
        if (Math.abs(ddx) < BOSS.WIDTH / 2 + 10 && Math.abs(ddy) < BOSS.HEIGHT / 2 + 10) {
          this.boss.takeDamage(b.damage);
          hit = true;
        }
      }
      if (hit || b.life <= 0 || b.x < -30 || b.x > GAME_WIDTH + 30) {
        b.g.destroy(); b.glow.destroy();
        this.heartBullets.splice(i, 1);
      }
    }

    // Boss
    if (this.boss) this.boss.update(time, delta, this.player);

    // Beams
    this._tickBeams(time, delta);

    // UI updates
    this.playerHpBar.scaleX = Math.max(0, this.player.hp / this.player.maxHp);
    if (this.boss) this.bossHpBar.scaleX = Math.max(0, this.boss.hp / BOSS.HP_TOTAL);
    this.deflectBar.width = (this.deflectMeter / BOSS.DEFLECT_METER_MAX) * 300;
    if (this.deflectMeter >= BOSS.DEFLECT_METER_MAX) {
      this.blastReadyText.setText('HEART BLAST READY — press E');
    } else {
      this.blastReadyText.setText('');
    }

    // Death check
    if (this.player.hp <= 0 && this.phase !== 'outro' && this.phase !== 'dead') {
      this.phase = 'dead';
      this._onPlayerDeath();
    }

    // Phase transitions driven by boss HP
    if (this.boss && this.phase === 'p1' && this.boss.hp <= BOSS.HP_TOTAL - BOSS.PHASE_1_HP) {
      this.phase = 'p2';
      this.boss.enterPhase2();
      this._sayTaunt('This has been a journey for you...', 2800);
      this.time.delayedCall(3000, () => {
        this._sayTaunt('Now is the real time where you discover\nthat you are as blank as a canvas.', 3400);
      });
    }
    if (this.boss && this.phase === 'p2' && this.boss.hp <= BOSS.PHASE_3_HP) {
      this.phase = 'p3';
      this.boss.enterPhase3();
      this._sayTaunt('...is that... me?', 2600);
    }
    if (this.boss && this.boss.hp <= 0 && this.phase !== 'outro') {
      this.phase = 'outro';
      this._onBossDefeated();
    }
  }

  _onPlayerDeath() {
    this._sayTaunt('You cannot escape yourself.', 2600);
    this.cameras.main.fade(1800, 0, 0, 0);
    this.time.delayedCall(2200, () => this.scene.restart());
  }

  // ==================================================================
  // OUTRO — shatter + merge revelation
  // ==================================================================
  _onBossDefeated() {
    // Stop attacks
    this.activeBeams.forEach(b => b.graphics.destroy());
    this.activeBeams.length = 0;

    this.cameras.main.shake(700, 0.015);
    this.cameras.main.flash(400, 255, 255, 255);

    const bx = this.boss.body.x, by = this.boss.body.y;
    this.boss.shatter();

    // Fragment drift → player merge
    this.time.delayedCall(1800, () => {
      this._sayTaunt('He is not my enemy. He is me.', 3200);
    });

    this.time.delayedCall(3400, () => {
      // Color floods fully
      this._saturation = 1;
      this._applySaturation();
      this._colorFlood();
    });

    this.time.delayedCall(5600, () => {
      this._sayTaunt('I am whole.', 2800);
    });

    this.time.delayedCall(9200, () => {
      this.cameras.main.fade(1800, 255, 246, 232);
    });

    this.time.delayedCall(11200, () => {
      // Return to Level 1 for now (or future credits scene)
      this.scene.start('Level1Scene');
    });
  }

  _colorFlood() {
    // Burst of colorful rings from player
    const px = this.player.sprite.x, py = this.player.sprite.y;
    const palette = [0xff6ea6, 0xffd84f, 0x8aa8ff, 0xa8e0a8, 0xc489ff, 0x5fd8ff];
    for (let i = 0; i < 6; i++) {
      const ring = this.add.circle(px, py, 8, 0, 0)
        .setStrokeStyle(4, palette[i], 0.85).setDepth(14);
      this.tweens.add({
        targets: ring, scale: 28, alpha: 0,
        duration: 1800, delay: i * 120, ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
    // Petals rain
    for (let i = 0; i < 60; i++) {
      const col = palette[i % palette.length];
      const p = this.add.circle(Math.random() * GAME_WIDTH, -20, 3 + Math.random() * 4, col, 0.9).setDepth(14);
      this.tweens.add({
        targets: p,
        y: GAME_HEIGHT + 20,
        x: p.x + (Math.random() - 0.5) * 80,
        alpha: 0,
        duration: 2400 + Math.random() * 1200,
        delay: i * 40,
        ease: 'Sine.easeInOut',
        onComplete: () => p.destroy(),
      });
    }
  }
}


// =====================================================================
// SHADOW BOSS — pure white doppelganger; cracks widen as HP drops
// =====================================================================
class ShadowBoss {
  constructor(scene, x, y) {
    this.scene = scene;
    this.hp = BOSS.HP_TOTAL;
    this.alive = true;
    this.phaseNum = 1;
    this.active = false;

    // Container + artwork
    this.container = scene.add.container(x, y);
    this.container.setDepth(9);

    this.bodyG = scene.add.graphics();
    this._drawBody(0); // 0 = no cracks
    this.container.add(this.bodyG);

    // Eyes (glowing slits)
    this.eyeL = scene.add.circle(-8, -20, 2, 0x0a0612, 1);
    this.eyeR = scene.add.circle(8, -20, 2, 0x0a0612, 1);
    this.container.add([this.eyeL, this.eyeR]);

    // Physics body (invisible rect used for position + collisions with bullets)
    this.body = scene.physics.add.existing(
      scene.add.rectangle(x, y, BOSS.WIDTH, BOSS.HEIGHT, 0, 0)
    );
    this.body.body.setAllowGravity(false);

    this.startX = x; this.startY = y;
    this.centerY = y;
    this.moveDir = 1;

    this.beamCooldown = 1800; // intro grace
    this.beamState = 'idle';
    this.beamStateTime = 0;
    this.beamActiveObj = null;
    this.beamTargetAngle = 0;

    // Halo
    this.halo = scene.add.circle(0, -6, 56, 0xfaf8f4, 0.12);
    this.container.addAt(this.halo, 0);

    // Shadow aura under boss (ominous)
    this.aura = scene.add.ellipse(0, 36, 110, 22, 0x0a0612, 0.4);
    this.container.addAt(this.aura, 0);

    // Entry — boss falls from sky
    this.container.alpha = 0;
    this.container.y -= 200;
    scene.tweens.add({
      targets: this.container,
      alpha: 1, y: y,
      duration: 2200, ease: 'Cubic.easeOut',
    });
  }

  activate() { this.active = true; }

  _drawBody(crackLevel) {
    const g = this.bodyG;
    g.clear();
    const W = BOSS.WIDTH, H = BOSS.HEIGHT;
    // Shadow underlay
    g.fillStyle(BOSS.BOSS_CRACK !== undefined ? COLORS.BOSS_CRACK : 0x0a0612, 1);
    g.fillRoundedRect(-W / 2 - 2, -H / 2 - 2, W + 4, H + 4, 10);
    // White outer body
    g.fillStyle(COLORS.BOSS_WHITE, 1);
    g.fillRoundedRect(-W / 2, -H / 2, W, H, 8);
    // Shaded edge
    g.fillStyle(COLORS.BOSS_WHITE_SHADE, 0.7);
    g.fillRoundedRect(-W / 2, H / 2 - 10, W, 10, 6);
    // Head band (mirroring player's glasses)
    g.fillStyle(COLORS.BOSS_WHITE_SHADE, 1);
    g.fillRect(-14, -H / 2 + 8, 28, 6);

    // Cracks — progressively larger, revealing inky darkness
    if (crackLevel > 0) {
      g.lineStyle(2, COLORS.BOSS_CRACK, 1);
      const maxCracks = 3 + Math.floor(crackLevel * 12);
      // Deterministic pseudo-random cracks based on crackLevel buckets
      const seed = Math.floor(crackLevel * 100);
      const rand = (i) => {
        const s = Math.sin((seed + i) * 12.9898) * 43758.5453;
        return s - Math.floor(s);
      };
      for (let i = 0; i < maxCracks; i++) {
        const sx = (rand(i * 2) - 0.5) * W * 0.9;
        const sy = (rand(i * 2 + 1) - 0.5) * H * 0.9;
        g.beginPath();
        g.moveTo(sx, sy);
        let cx = sx, cy = sy;
        const segs = 3 + Math.floor(rand(i * 3) * 4);
        for (let s = 0; s < segs; s++) {
          cx += (rand(i + s * 7) - 0.5) * 14;
          cy += (rand(i + s * 11) - 0.5) * 14;
          g.lineTo(cx, cy);
        }
        g.strokePath();
      }
      // Small "void" pockets at deeper crack levels
      if (crackLevel > 0.55) {
        g.fillStyle(COLORS.BOSS_CRACK, 1);
        for (let i = 0; i < 4; i++) {
          const sx = (rand(i * 5) - 0.5) * W * 0.7;
          const sy = (rand(i * 5 + 1) - 0.5) * H * 0.7;
          g.fillCircle(sx, sy, 2 + rand(i) * 2);
        }
      }
    }
  }

  update(time, delta, player) {
    if (!this.alive || !this.active) {
      // Keep container glued to body even when inactive (intro fall)
      return;
    }

    // Keep container aligned to physics rect
    this.container.x = this.body.x;
    this.container.y = this.body.y;

    // Float
    const floatY = Math.sin(time * 0.001 * BOSS.FLOAT_SPEED) * BOSS.FLOAT_AMP;
    this.container.y = this.body.y + Math.sin(time * 0.003) * 2; // tiny bob

    // Movement — drift sideways, bob vertically, track player loosely
    const px = player.sprite.x;
    const targetX = Phaser.Math.Clamp(px + Math.sin(time * 0.0004) * 180, 200, GAME_WIDTH - 200);
    const targetY = this.startY + floatY + (this.phaseNum === 2 ? -30 : 0);

    const speed = BOSS.MOVE_SPEED * (this.phaseNum >= 2 ? 1.5 : 1);
    const dx = targetX - this.body.x, dy = targetY - this.body.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.body.body.setVelocity((dx / len) * speed, (dy / len) * speed * 1.2);

    // Face player (flip eyes)
    const facingR = px > this.body.x;
    this.eyeL.x = facingR ? -10 : 10;
    this.eyeR.x = facingR ? 6 : -6;

    // Attack pattern
    this._updateAttacks(time, delta, player);

    // Crack level = 1 - hp/total
    const crackLevel = 1 - this.hp / BOSS.HP_TOTAL;
    // Re-draw body only every 0.1 bucket to save perf
    const bucket = Math.floor(crackLevel * 10) / 10;
    if (this._lastCrackBucket !== bucket) {
      this._lastCrackBucket = bucket;
      this._drawBody(bucket);
    }

    // Aura throb stronger in later phases
    this.aura.setAlpha(0.3 + 0.15 * Math.sin(time * 0.004) + this.phaseNum * 0.05);
    this.halo.setAlpha(0.12 + (this.phaseNum === 3 ? 0.2 : 0));
  }

  _updateAttacks(time, delta, player) {
    if (this.phaseNum === 3) {
      // Stunned — no attacks, but occasional wince tween
      return;
    }
    this.beamCooldown -= delta;
    if (this.beamCooldown > 0) return;

    if (this.phaseNum === 1) {
      this._fireBeam(player);
      this.beamCooldown = BOSS.BEAM_COOLDOWN_MS + Math.random() * 400;
    } else if (this.phaseNum === 2) {
      // Fan of beams
      this._fireFan(player);
      this.beamCooldown = BOSS.BEAM_COOLDOWN_MS * 1.4;
    }
  }

  _fireBeam(player) {
    // Telegraph line, then fire
    const scene = this.scene;
    const sx = this.body.x, sy = this.body.y + 10;
    const tx = player.sprite.x, ty = player.sprite.y;
    const angle = Math.atan2(ty - sy, tx - sx);

    // Telegraph (thin red line)
    const tele = scene.add.graphics().setDepth(13);
    tele.lineStyle(2, 0xff4060, 0.9);
    const LEN = 900;
    const ex = sx + Math.cos(angle) * LEN;
    const ey = sy + Math.sin(angle) * LEN;
    tele.beginPath(); tele.moveTo(sx, sy); tele.lineTo(ex, ey); tele.strokePath();

    scene.tweens.add({
      targets: tele, alpha: 0.2, yoyo: true, repeat: 2,
      duration: BOSS.BEAM_TELEGRAPH_MS / 6,
      onComplete: () => {
        tele.destroy();
        this._actuallyFireBeam(sx, sy, angle, LEN);
      },
    });
  }

  _actuallyFireBeam(sx, sy, angle, LEN) {
    const scene = this.scene;
    const ex = sx + Math.cos(angle) * LEN;
    const ey = sy + Math.sin(angle) * LEN;
    const g = scene.add.graphics().setDepth(12);
    g.fillStyle(COLORS.BOSS_BEAM_EDGE, 0.6);
    scene._drawCapsule(g, sx, sy, ex, ey, BOSS.BEAM_WIDTH * 0.5);
    g.fillStyle(COLORS.BOSS_BEAM_CORE, 0.9);
    scene._drawCapsule(g, sx, sy, ex, ey, BOSS.BEAM_WIDTH * 0.25);

    const beam = {
      graphics: g, x1: sx, y1: sy, x2: ex, y2: ey,
      width: BOSS.BEAM_WIDTH, ttl: BOSS.BEAM_FIRE_MS, lastDamageAt: 0, reflected: false,
    };
    scene.registerBeam(beam);

    // Soft flash
    const flash = scene.add.circle(sx, sy, 30, 0x6a2a88, 0.6).setDepth(13);
    scene.tweens.add({ targets: flash, alpha: 0, scale: 2, duration: 300, onComplete: () => flash.destroy() });
  }

  _fireFan(player) {
    const sx = this.body.x, sy = this.body.y + 10;
    const tx = player.sprite.x, ty = player.sprite.y;
    const baseAngle = Math.atan2(ty - sy, tx - sx);
    const n = BOSS.FAN_COUNT, spread = BOSS.FAN_SPREAD;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const angle = baseAngle + (t - 0.5) * spread;
      this.scene.time.delayedCall(i * 80, () => {
        if (!this.alive) return;
        const LEN = 900;
        const tele = this.scene.add.graphics().setDepth(13);
        tele.lineStyle(2, 0xff4060, 0.8);
        const ex = sx + Math.cos(angle) * LEN;
        const ey = sy + Math.sin(angle) * LEN;
        tele.beginPath(); tele.moveTo(sx, sy); tele.lineTo(ex, ey); tele.strokePath();
        this.scene.tweens.add({
          targets: tele, alpha: 0.2, duration: 400, yoyo: true,
          onComplete: () => {
            tele.destroy();
            this._actuallyFireBeam(this.body.x, this.body.y + 10, angle, LEN);
          },
        });
      });
    }
  }

  enterPhase2() {
    this.phaseNum = 2;
    // Dramatic shake + shed white dust
    this.scene.cameras.main.shake(400, 0.008);
    for (let i = 0; i < 20; i++) {
      const p = this.scene.add.circle(this.body.x, this.body.y, 2, COLORS.BOSS_WHITE, 1).setDepth(10);
      const a = Math.random() * Math.PI * 2;
      this.scene.tweens.add({
        targets: p,
        x: this.body.x + Math.cos(a) * 80,
        y: this.body.y + Math.sin(a) * 80,
        alpha: 0, duration: 700,
        onComplete: () => p.destroy(),
      });
    }
    this.beamCooldown = 800;
  }

  enterPhase3() {
    this.phaseNum = 3;
    // Stop moving — boss sags
    this.body.body.setVelocity(0, 0);
    this.scene.tweens.add({
      targets: this.container, angle: 10, y: this.container.y + 30,
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.beamCooldown = 99999;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    // White flash
    this.scene.tweens.add({
      targets: this.bodyG, alpha: 0.2, duration: 80, yoyo: true,
    });
    // Chip particles (dark dust from cracks)
    for (let i = 0; i < 4; i++) {
      const p = this.scene.add.circle(this.body.x, this.body.y, 2, COLORS.BOSS_CRACK, 1).setDepth(11);
      this.scene.tweens.add({
        targets: p,
        x: this.body.x + (Math.random() - 0.5) * 60,
        y: this.body.y + (Math.random() - 0.5) * 60,
        alpha: 0, duration: 500,
        onComplete: () => p.destroy(),
      });
    }
    if (this.hp <= 0) this.alive = false;
  }

  shatter() {
    this.alive = false;
    const cx = this.body.x, cy = this.body.y;
    this.body.destroy();
    // Hide main body
    this.scene.tweens.add({
      targets: this.container, alpha: 0, duration: 400,
      onComplete: () => this.container.destroy(),
    });
    // Shard pieces
    for (let i = 0; i < BOSS.SHATTER_PIECES; i++) {
      const size = 4 + Math.random() * 8;
      const color = Math.random() > 0.5 ? COLORS.BOSS_WHITE : COLORS.BOSS_CRACK;
      const shard = this.scene.add.rectangle(cx, cy, size, size, color, 1).setDepth(13);
      shard.rotation = Math.random() * Math.PI;
      const ang = (Math.PI * 2 / BOSS.SHATTER_PIECES) * i + Math.random() * 0.3;
      const dist = 80 + Math.random() * 220;
      // Phase 1: explode outward
      this.scene.tweens.add({
        targets: shard,
        x: cx + Math.cos(ang) * dist,
        y: cy + Math.sin(ang) * dist - 40,
        rotation: shard.rotation + Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1),
        duration: 900, ease: 'Quad.easeOut',
        onComplete: () => {
          // Phase 2: drift toward player, then dissolve (merge)
          const target = this.scene.player.sprite;
          this.scene.tweens.add({
            targets: shard,
            x: target.x, y: target.y,
            alpha: 0, scale: 0.2,
            duration: 1400 + Math.random() * 400,
            ease: 'Cubic.easeIn',
            onUpdate: () => { /* target is moving — chase */ },
            onComplete: () => shard.destroy(),
          });
        },
      });
    }
  }
}
