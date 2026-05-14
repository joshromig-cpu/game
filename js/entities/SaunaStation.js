// =====================================================================
// Sauna Health Station — Feature 8
// Observation Zones (sparse trees, no-enemy bands)  — Feature 12
// Fully self-contained: no edits to Player health or enemy code.
// On entry: hide the player behind the box for 3s, play steam particles,
//          then re-emerge with player.hp restored to max + a warm glow.
// =====================================================================

const SAUNA_TUNING = {
  WIDTH: 56,
  HEIGHT: 72,
  STEAM_MS: 3000,    // duration of the spa visit
  COOLDOWN_MS: 9000, // before the same sauna can be used again
};

class SaunaStation {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.state = 'idle';      // idle | active | cooldown
    this._stateEndsAt = 0;
    this._playerHidden = false;

    // Container so we can move/destroy as a unit if needed.
    this.container = scene.add.container(x, y);
    this.container.setDepth(6);

    // Build a tiny wooden cabin: dark roof, plank body, warm glowing window.
    const g = scene.add.graphics();
    const W = SAUNA_TUNING.WIDTH, H = SAUNA_TUNING.HEIGHT;
    // Cabin body
    g.fillStyle(0x6a3a22, 1);
    g.fillRoundedRect(-W / 2, -H / 2, W, H, 4);
    // Plank lines
    g.lineStyle(1, 0x4a2a16, 0.8);
    for (let i = 1; i < 4; i++) {
      const y = -H / 2 + (H / 4) * i;
      g.beginPath(); g.moveTo(-W / 2 + 2, y); g.lineTo(W / 2 - 2, y); g.strokePath();
    }
    // Sloped roof
    g.fillStyle(0x2a1a10, 1);
    g.fillTriangle(-W / 2 - 6, -H / 2, W / 2 + 6, -H / 2, 0, -H / 2 - 22);
    // Door
    g.fillStyle(0x3a2010, 1);
    g.fillRect(-12, 0, 24, H / 2);
    g.fillStyle(0xffd47a, 0.85);
    g.fillCircle(7, H / 4 + 2, 1.5); // door knob
    // Chimney
    g.fillStyle(0x4a2a16, 1);
    g.fillRect(W / 2 - 16, -H / 2 - 18, 8, 12);
    this.container.add(g);

    // Warm glowing window
    this.window = scene.add.rectangle(0, -H / 4, 22, 16, 0xffcf6a, 1).setStrokeStyle(2, 0x8a4a20, 1);
    this.container.add(this.window);
    // Window glow pulse
    scene.tweens.add({
      targets: this.window, alpha: 0.65, yoyo: true, repeat: -1,
      duration: 1400, ease: 'Sine.easeInOut',
    });

    // Soft window halo around the cabin
    this.halo = scene.add.circle(0, -H / 4, 28, 0xffcf6a, 0.22);
    this.container.addAt(this.halo, 0);
    scene.tweens.add({
      targets: this.halo, scale: 1.18, alpha: 0.32, yoyo: true, repeat: -1,
      duration: 1600, ease: 'Sine.easeInOut',
    });

    // Tiny "HEAL" pictograph above the cabin
    const heart = scene.add.graphics();
    heart.fillStyle(0xff8eaf, 1);
    heart.fillCircle(-3, -H / 2 - 36, 3);
    heart.fillCircle(3, -H / 2 - 36, 3);
    heart.fillTriangle(-6, -H / 2 - 34, 6, -H / 2 - 34, 0, -H / 2 - 28);
    this.container.add(heart);
    scene.tweens.add({
      targets: heart, y: heart.y - 4, yoyo: true, repeat: -1, duration: 1200,
      ease: 'Sine.easeInOut',
    });

    // Always-on lazy steam puff from the chimney (sets the mood).
    scene.time.addEvent({
      delay: 1200, loop: true, callback: () => this._chimneyPuff(),
    });
  }

  _chimneyPuff() {
    if (!this.container || !this.container.scene) return;
    const sx = this.x + (SAUNA_TUNING.WIDTH / 2 - 12);
    const sy = this.y - SAUNA_TUNING.HEIGHT / 2 - 18;
    const p = this.scene.add.circle(sx, sy, 5, 0xfff0d8, 0.55).setDepth(7);
    this.scene.tweens.add({
      targets: p,
      y: sy - 60, x: sx + Phaser.Math.Between(-12, 12),
      alpha: 0, scale: 1.6,
      duration: 1800, ease: 'Sine.easeOut',
      onComplete: () => p.destroy(),
    });
  }

  update(time) {
    const player = this.scene.player;
    if (!player) return;

    if (this.state === 'idle') {
      // Overlap check (within cabin bounds, on ground roughly).
      const dx = Math.abs(player.sprite.x - this.x);
      const dy = Math.abs(player.sprite.y - this.y);
      if (dx < SAUNA_TUNING.WIDTH * 0.55 && dy < SAUNA_TUNING.HEIGHT * 0.7) {
        this._begin(time);
      }
    } else if (this.state === 'active') {
      // Keep player parked behind the cabin (no physics changes — just pin x).
      player.sprite.x = this.x;
      player.body.setVelocity(0, 0);
      if (time >= this._stateEndsAt) this._end(time);
    } else if (this.state === 'cooldown') {
      if (time >= this._stateEndsAt) this.state = 'idle';
    }
  }

  _begin(time) {
    this.state = 'active';
    this._stateEndsAt = time + SAUNA_TUNING.STEAM_MS;
    const player = this.scene.player;

    // Hide player visuals "behind" the box. We just dim alpha — we DO NOT
    // touch the player's hp directly until the end (one heal event).
    this._playerHidden = true;
    player.sprite.alpha = 0;
    if (player.glasses) player.glasses.alpha = 0;
    if (player.clothingTrail) player.clothingTrail.alpha = 0;

    // Bell-ringing "ding"
    const ding = this.scene.add.text(this.x, this.y - SAUNA_TUNING.HEIGHT / 2 - 60,
      '~ steam ~', {
        fontFamily: 'Georgia, serif', fontSize: '14px', color: '#fff6e8',
        stroke: '#3a2050', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
    this.scene.tweens.add({
      targets: ding, y: ding.y - 24, alpha: 0,
      duration: 1500, onComplete: () => ding.destroy(),
    });

    // Spawn dense steam plume for the whole duration.
    this._steamTimer = this.scene.time.addEvent({
      delay: 80, loop: true,
      callback: () => this._spawnSteamParticle(),
    });
  }

  _spawnSteamParticle() {
    const sx = this.x + Phaser.Math.Between(-18, 18);
    const sy = this.y + SAUNA_TUNING.HEIGHT / 2 - 4;
    const p = this.scene.add.circle(sx, sy, Phaser.Math.Between(5, 9),
      Phaser.Math.RND.pick([0xfff6e8, 0xffe4c8, 0xfff0d8]), 0.65).setDepth(7);
    this.scene.tweens.add({
      targets: p,
      y: sy - Phaser.Math.Between(60, 110),
      x: sx + Phaser.Math.Between(-20, 20),
      alpha: 0, scale: 2.2,
      duration: 1400, ease: 'Sine.easeOut',
      onComplete: () => p.destroy(),
    });
  }

  _end(time) {
    this.state = 'cooldown';
    this._stateEndsAt = time + SAUNA_TUNING.COOLDOWN_MS;

    const player = this.scene.player;

    // One-shot heal — uses Player.heal if available, otherwise emit event.
    if (typeof player.heal === 'function') {
      player.heal(player.maxHp);
    } else {
      player.hp = player.maxHp;
      this.scene.events.emit('playerHpChanged', player.hp, player.maxHp);
    }

    // Restore visibility
    player.sprite.alpha = 1;
    if (player.glasses) player.glasses.alpha = 1;
    if (player.clothingTrail) player.clothingTrail.alpha = 0.4;

    if (this._steamTimer) { this._steamTimer.destroy(); this._steamTimer = null; }

    // Brief warm glow effect that sits on the player for ~1.4s and follows.
    const glow = this.scene.add.circle(player.sprite.x, player.sprite.y, 36, 0xffd28a, 0.6).setDepth(7);
    const glowTimer = this.scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        if (!glow.active) { glowTimer.destroy(); return; }
        glow.x = player.sprite.x;
        glow.y = player.sprite.y;
      },
    });
    this.scene.tweens.add({
      targets: glow, scale: 2.2, alpha: 0, duration: 1400, ease: 'Quad.easeOut',
      onComplete: () => { glow.destroy(); glowTimer.destroy(); },
    });

    // Final bigger puff
    for (let i = 0; i < 14; i++) {
      this._spawnSteamParticle();
    }
    // "Healed!" toast
    const toast = this.scene.add.text(player.sprite.x, player.sprite.y - 60, 'restored', {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#fff6e8',
      stroke: '#3a2050', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
    this.scene.tweens.add({
      targets: toast, y: toast.y - 24, alpha: 0,
      duration: 1200, onComplete: () => toast.destroy(),
    });
  }
}

// =====================================================================
// ObservationZone — Feature 12
// A horizontal segment of Level 1 where:
//   - No enemies spawn (we never add any in this band)
//   - Camera scroll slightly slows (set via scene._cameraSlowMul)
//   - Sparse foreground tree silhouettes draw in front
//   - Optionally hosts a SaunaStation inside the band
// Built entirely from scene data — no enemy or player code is modified.
// =====================================================================
class ObservationZone {
  constructor(scene, xStart, xEnd, opts = {}) {
    this.scene = scene;
    this.xStart = xStart;
    this.xEnd = xEnd;
    this.slowMul = opts.slowMul != null ? opts.slowMul : 0.6; // camera lerp scale
    this.hasSauna = !!opts.sauna;
    this.saunaOffset = opts.saunaOffset != null ? opts.saunaOffset : 0.5;

    // Draw sparse trees as a foreground overlay across the band.
    this._drawForegroundTrees();

    // Subtle ground-band tint to read as a "quiet meadow".
    const w = xEnd - xStart;
    const groundY = (typeof LEVEL !== 'undefined') ? LEVEL.GROUND_Y : 600;
    const band = scene.add.rectangle(xStart + w / 2, groundY + 10, w, 24, 0xa8dc88, 0.35);
    band.setDepth(2);

    // Sauna right inside the zone, if requested.
    if (this.hasSauna) {
      const sx = xStart + (xEnd - xStart) * this.saunaOffset;
      const sy = groundY - SAUNA_TUNING.HEIGHT / 2 - 4;
      this.sauna = new SaunaStation(scene, sx, sy);
    }
  }

  _drawForegroundTrees() {
    const scene = this.scene;
    const groundY = (typeof LEVEL !== 'undefined') ? LEVEL.GROUND_Y : 600;
    const count = Math.floor((this.xEnd - this.xStart) / 130);
    for (let i = 0; i < count; i++) {
      const x = this.xStart + 60 + i * 130 + Phaser.Math.Between(-30, 30);
      const baseY = groundY + 20;
      const trunkH = Phaser.Math.Between(140, 220);

      const g = scene.add.graphics();
      g.setDepth(15); // in front of player so the world feels layered
      // Trunk
      g.fillStyle(0x3a261a, 0.9);
      g.fillRect(x - 5, baseY - trunkH, 10, trunkH);
      // Canopy clusters
      g.fillStyle(0x2f5a3a, 0.92);
      g.fillCircle(x - 16, baseY - trunkH + 8, 24);
      g.fillCircle(x + 12, baseY - trunkH + 2, 28);
      g.fillCircle(x + 2, baseY - trunkH - 14, 22);
      g.fillStyle(0x4a7a4a, 0.6);
      g.fillCircle(x + 6, baseY - trunkH - 4, 12);
    }
  }

  // Test if the player is within this zone. Returns slow-multiplier or null.
  contains(player) {
    return player.sprite.x >= this.xStart && player.sprite.x <= this.xEnd;
  }

  update(time) {
    if (this.sauna) this.sauna.update(time);
  }
}
