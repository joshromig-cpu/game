// =====================================================================
// Ally Clouds — Features 2, 3, 4, 5, 6
// Self-contained helper clouds the player can activate by walking into.
// They never modify Player, CloudEnemy, Spangerell, or movement/collision
// logic — they only read player state and emit their own effects.
//
// Three types:
//   - ShooterAllyCloud  (F2)  fires friendly bolts at nearby enemies
//   - LiftAllyCloud     (F3)  scoops the player up and carries them
//   - BubbleAllyCloud   (F4)  wraps the player in a 3-hit shield
//
// Activation flow shared by all types:
//   spawn  -> idle (gentle bob, looks inviting)
//          -> [optional first-encounter INTRO with speech bubble] (F6)
//          -> player touch -> ENTRANCE flourish
//          -> ACTIVE for cfg.duration with a shrinking visual timer
//          -> GOODBYE wave
//          -> destroy
// =====================================================================

const ALLY_CLOUD = {
  SHOOTER: {
    type: 'shooter',
    duration: 8000,             // F2 — 8 seconds
    fireInterval: 280,
    bulletSpeed: 380,
    bulletDamage: 8,
    bulletColor: 0xb8f0ff,      // pale cyan — distinct from player's pink hearts
    bulletGlow:  0x6fdfff,
    bodyColor:   0xe8f6ff,
    bodyShade:   0xa8d8f0,
    aura:        0x4fcfff,
    introLine:   "Zap-zap! I'll soften them up while you breathe.",
    introName:   "Sparkcloud",
  },
  LIFT: {
    type: 'lift',
    duration: 10000,            // F3 — 10 seconds
    arcAmplitude: 110,
    arcSpeed: 110,              // forward px / sec average
    steerForce: 180,            // player nudge L/R
    bodyColor:  0xffeac4,
    bodyShade:  0xf0c890,
    aura:       0xffd070,
    introLine:  "Hop on, dear. The wind owes me a favour.",
    introName:  "Carrybun",
  },
  BUBBLE: {
    type: 'bubble',
    duration: 20000,            // soft cap — really ends after 3 hits
    maxHits: 3,                 // F4 — absorb 3 hits
    bodyColor:  0xf0d8ff,
    bodyShade:  0xc8a8e8,
    aura:       0xe9b8ff,
    introLine:  "Squeeze inside — I'll soak the bumps for you.",
    introName:  "Plumpkin",
  },
};

class AllyCloud {
  constructor(scene, x, y, type) {
    this.scene = scene;
    this.startX = x;
    this.startY = y;
    this.type = type;
    this.cfg = ALLY_CLOUD[type.toUpperCase()];
    if (!this.cfg) {
      console.warn('[AllyCloud] unknown type:', type);
      this.cfg = ALLY_CLOUD.SHOOTER;
    }

    this.alive = true;
    this.state = 'idle'; // idle | intro | active | ending | goodbye
    this._phase = Math.random() * Math.PI * 2;
    this._birthAt = scene.time.now;
    this._activatedAt = 0;
    this._hits = 0;           // bubble
    this._nextFireAt = 0;     // shooter
    this._sentToPlayer = false;
    this._steerVx = 0;

    // Container + visuals
    this.container = scene.add.container(x, y);
    this.container.setDepth(7);

    // Soft aura behind body
    this.aura = scene.add.circle(0, 4, 38, this.cfg.aura, 0.25);
    this.container.add(this.aura);

    // Cloud body
    this.bodyG = scene.add.graphics();
    this._drawBody(this.bodyG);
    this.container.add(this.bodyG);

    // Big friendly eyes
    this.eyeL = scene.add.circle(-9, -3, 4, 0xffffff, 1);
    this.eyeR = scene.add.circle(9, -3, 4, 0xffffff, 1);
    this.pupilL = scene.add.circle(-8, -3, 1.8, 0x223044, 1);
    this.pupilR = scene.add.circle(10, -3, 1.8, 0x223044, 1);
    this.container.add([this.eyeL, this.eyeR, this.pupilL, this.pupilR]);

    // Tiny smile
    this.smile = scene.add.graphics();
    this.smile.lineStyle(2, 0x223044, 0.85);
    this.smile.beginPath();
    this.smile.arc(0, 6, 6, 0.15, Math.PI - 0.15, false);
    this.smile.strokePath();
    this.container.add(this.smile);

    // Type-specific badge
    this._addBadge();

    // Shrinking timer ring (drawn during ACTIVE)
    this.timerRing = scene.add.graphics().setDepth(8);

    // Pop the cloud into view (small entrance scale-up)
    this.container.setScale(0.2);
    this.container.alpha = 0;
    scene.tweens.add({
      targets: this.container,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 600, ease: 'Back.easeOut',
    });
  }

  _drawBody(g) {
    g.clear();
    const c = this.cfg;
    const puffs = [
      { dx: -22, dy: 4, r: 14 },
      { dx: -5,  dy: -6, r: 18 },
      { dx: 16,  dy: -1, r: 16 },
      { dx: 3,   dy: 8,  r: 14 },
      { dx: -14, dy: 10, r: 11 },
    ];
    g.fillStyle(c.bodyShade, 0.7);
    puffs.forEach(p => g.fillCircle(p.dx, p.dy + 4, p.r));
    g.fillStyle(c.bodyColor, 1);
    puffs.forEach(p => g.fillCircle(p.dx, p.dy, p.r));
    g.fillStyle(0xffffff, 0.55);
    puffs.slice(1, 3).forEach(p => g.fillCircle(p.dx, p.dy - 5, p.r * 0.55));
  }

  _addBadge() {
    const g = this.scene.add.graphics();
    if (this.type === 'shooter') {
      // Tiny lightning bolt
      g.fillStyle(0x4fcfff, 1);
      g.fillTriangle(-4, -16, 4, -16, -1, -8);
      g.fillTriangle(-1, -8, 6, -8, -2, 2);
    } else if (this.type === 'lift') {
      // Small upward chevron / wings
      g.lineStyle(2, 0xffa040, 1);
      g.beginPath(); g.moveTo(-12, -14); g.lineTo(-4, -20); g.lineTo(4, -20); g.lineTo(12, -14); g.strokePath();
    } else if (this.type === 'bubble') {
      // Tiny bubble ring on top
      g.lineStyle(2, 0xa040ff, 1);
      g.strokeCircle(0, -16, 6);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(-2, -18, 1.5);
    }
    this.badge = g;
    this.container.add(g);
  }

  // Public: attempt activation — returns true if accepted.
  activate(player) {
    if (this.state !== 'idle' || !this.alive) return false;
    this.state = 'active';
    this._activatedAt = this.scene.time.now;
    this.player = player;

    // Cute "entrance" flourish — quick excited squash
    this.scene.tweens.add({
      targets: this.container, scaleX: 1.25, scaleY: 0.8, duration: 140,
      yoyo: true, ease: 'Sine.easeInOut',
    });
    // Sparkle ring on activation
    const sx = this.container.x, sy = this.container.y;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const s = this.scene.add.circle(sx, sy, 3, 0xffffff, 0.9).setDepth(8);
      this.scene.tweens.add({
        targets: s,
        x: sx + Math.cos(a) * 48,
        y: sy + Math.sin(a) * 48,
        alpha: 0, duration: 480,
        onComplete: () => s.destroy(),
      });
    }

    // Per-type hooks
    if (this.type === 'shooter') this._onShooterActivate();
    if (this.type === 'lift')    this._onLiftActivate(player);
    if (this.type === 'bubble')  this._onBubbleActivate(player);

    return true;
  }

  // ===== type-specific activate hooks =====
  _onShooterActivate() {
    this._nextFireAt = this.scene.time.now + 200;
    this._myBullets = [];
  }

  _onLiftActivate(player) {
    // Snap cloud above player & lock player to its underside.
    this.container.x = player.sprite.x;
    this.container.y = player.sprite.y - 70;
    this._liftAnchor = { x: this.container.x, y: this.container.y };
    this._liftStartTime = this.scene.time.now;
    // Stop existing player velocity gently
    player.body.setVelocity(0, 0);
    // Disable normal gravity for the duration of the lift only.
    this._savedGravity = player.body.gravity.y;
    player.body.setGravityY(0);
    // Disable backstep/auto-input by zeroing acceleration each frame in update.
  }

  _onBubbleActivate(player) {
    // Layer a bubble graphic over the player. Don't touch the player's
    // own hit detection — instead we intercept by toggling player invuln
    // briefly while the bubble exists, and by destroying enemies that
    // touch the bubble (or eating a "crack" on each touch).
    this._bubbleG = this.scene.add.graphics().setDepth(11);
    this._bubbleHits = 0;
    this._bubblePop = false;
    // Hide cloud body — the bubble itself is the visual now.
    this.scene.tweens.add({
      targets: this.container, alpha: 0.0, duration: 400,
    });
  }

  // Called by scene every frame when state != destroyed.
  update(time, delta) {
    if (!this.alive) return;
    const dt = delta / 1000;

    // Idle bob whenever not actively flying with player.
    if (this.state === 'idle' || this.state === 'intro') {
      const t = time * 0.001;
      this.container.x = this.startX + Math.sin(t * 0.8 + this._phase) * 14;
      this.container.y = this.startY + Math.sin(t * 1.4 + this._phase) * 8;
    }

    if (this.state === 'active') {
      if (this.type === 'shooter') this._tickShooter(time, delta);
      if (this.type === 'lift')    this._tickLift(time, delta, dt);
      if (this.type === 'bubble')  this._tickBubble(time, delta);
      this._drawTimerRing(time);
      this._checkDurationEnd(time);
    }
  }

  _drawTimerRing(time) {
    const g = this.timerRing;
    g.clear();
    if (this.cfg.duration <= 0) return;
    const elapsed = time - this._activatedAt;
    const remain = Math.max(0, 1 - elapsed / this.cfg.duration);
    if (this.type === 'bubble') {
      // For bubble, ring represents remaining hits as 3 small pips.
      const pipsLeft = this.cfg.maxHits - this._bubbleHits;
      const cx = this.player ? this.player.sprite.x : this.container.x;
      const cy = (this.player ? this.player.sprite.y : this.container.y) - 60;
      for (let i = 0; i < this.cfg.maxHits; i++) {
        const filled = i < pipsLeft;
        g.fillStyle(filled ? 0xff9ab8 : 0x333344, 0.95);
        g.fillCircle(cx - 18 + i * 18, cy, 5);
      }
      return;
    }
    // Shrinking ring around the cloud (or player for lift)
    const cx = (this.type === 'lift' && this.player) ? this.player.sprite.x : this.container.x;
    const cy = (this.type === 'lift' && this.player) ? this.player.sprite.y - 48 : this.container.y - 36;
    const radius = 22;
    g.lineStyle(3, 0xfff6dc, 0.85);
    g.beginPath();
    g.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remain, false);
    g.strokePath();
    // Pulsing inner glow
    const pulse = 0.4 + 0.3 * Math.sin(time * 0.012);
    g.fillStyle(0xfff6dc, pulse * 0.25);
    g.fillCircle(cx, cy, radius - 4);
  }

  _checkDurationEnd(time) {
    if (this.type === 'bubble') {
      if (this._bubbleHits >= this.cfg.maxHits || this._bubblePop) {
        this._popBubble();
        return;
      }
    }
    if (time - this._activatedAt >= this.cfg.duration) {
      this._beginGoodbye();
    }
  }

  // ===== shooter =====
  _tickShooter(time, delta) {
    if (time < this._nextFireAt) return;
    // Find nearest living enemy
    const enemies = (this.scene.enemies || []).concat(this.scene.groundEnemies || []);
    let best = null, bestD = 1e9;
    for (const e of enemies) {
      if (!e.alive) continue;
      const ex = e.container ? e.container.x : (e.body ? e.body.x : null);
      const ey = e.container ? e.container.y : (e.body ? e.body.y : null);
      if (ex == null) continue;
      const dx = ex - this.container.x, dy = ey - this.container.y;
      const d = dx * dx + dy * dy;
      if (d < bestD && d < 600 * 600) { bestD = d; best = e; }
    }
    if (!best) { this._nextFireAt = time + 200; return; }
    this._fireShooterBolt(best);
    this._nextFireAt = time + this.cfg.fireInterval;
  }

  _fireShooterBolt(targetEnemy) {
    const sx = this.container.x, sy = this.container.y + 8;
    const tx = targetEnemy.container ? targetEnemy.container.x : targetEnemy.body.x;
    const ty = targetEnemy.container ? targetEnemy.container.y : targetEnemy.body.y;
    const ang = Math.atan2(ty - sy, tx - sx);
    const vx = Math.cos(ang) * this.cfg.bulletSpeed;
    const vy = Math.sin(ang) * this.cfg.bulletSpeed;

    // Diamond-shaped sparkle bolt — clearly different from player's pink hearts
    const g = this.scene.add.graphics().setDepth(8);
    g.fillStyle(this.cfg.bulletColor, 1);
    g.fillTriangle(-7, 0, 0, -10, 7, 0);
    g.fillTriangle(-7, 0, 0, 10, 7, 0);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(0, 0, 3);
    g.x = sx; g.y = sy;
    g.rotation = ang;

    const glow = this.scene.add.circle(sx, sy, 12, this.cfg.bulletGlow, 0.6).setDepth(7);

    const bolt = { g, glow, x: sx, y: sy, vx, vy, life: 1500 };
    this._myBullets = this._myBullets || [];
    this._myBullets.push(bolt);
  }

  // ===== lift =====
  _tickLift(time, delta, dt) {
    if (!this.player) return;
    const elapsed = time - this._liftStartTime;
    // Gentle forward arc — sinusoidal vertical bob, steady forward.
    const arcT = elapsed * 0.001;
    const facing = this.player.facingRight ? 1 : -1;
    const forward = this.cfg.arcSpeed * facing;

    // Read horizontal steering input (cursors/touch) WITHOUT mutating player code.
    // We poll the scene's cursors directly — same source Player.update polls.
    let steer = 0;
    const c = this.scene.cursors;
    if (c) {
      if ((c.left && c.left.isDown) || (this.scene.wasd && this.scene.wasd.left && this.scene.wasd.left.isDown)) steer -= 1;
      if ((c.right && c.right.isDown) || (this.scene.wasd && this.scene.wasd.right && this.scene.wasd.right.isDown)) steer += 1;
    }
    const tc = this.scene.touchControls;
    if (tc && tc.active) {
      if (tc.left) steer -= 1;
      if (tc.right) steer += 1;
    }
    this._steerVx += (steer * this.cfg.steerForce - this._steerVx) * 0.12;

    // Move cloud
    const dx = forward * dt + this._steerVx * dt;
    const dy = Math.sin(arcT * 1.6) * 0.4 - 0.6; // gently rise
    this.container.x += dx;
    this.container.y += dy;

    // Pin player just under the cloud (use setPosition so the physics
    // body stays in sync with the sprite).
    this.player.sprite.setPosition(this.container.x, this.container.y + 70);
    this.player.body.setVelocity(0, 0);
    this.player.body.setAcceleration(0, 0);

    // Trail of soft mist
    if (time % 100 < 16) {
      const m = this.scene.add.circle(this.container.x - facing * 18, this.container.y + 20,
        Phaser.Math.Between(4, 6), 0xfff0d8, 0.6).setDepth(6);
      this.scene.tweens.add({
        targets: m, alpha: 0, scale: 0.4, x: m.x - facing * 60,
        duration: 700, onComplete: () => m.destroy(),
      });
    }

    // Constrain to world / scene bounds: stop short of edges.
    const minX = 80;
    const maxX = (typeof LEVEL !== 'undefined' && this.scene.scene.key === 'Level1Scene') ? LEVEL.WIDTH - 80 : GAME_WIDTH - 80;
    const minY = 80;
    const maxY = (this.scene.groundY || (typeof LEVEL !== 'undefined' ? LEVEL.GROUND_Y : GAME_HEIGHT - 80)) - 120;
    if (this.container.x < minX) this.container.x = minX;
    if (this.container.x > maxX) this.container.x = maxX;
    if (this.container.y < minY) this.container.y = minY;
    if (this.container.y > maxY) this.container.y = maxY;
  }

  // ===== bubble =====
  _tickBubble(time) {
    if (!this.player) return;
    const cx = this.player.sprite.x;
    const cy = this.player.sprite.y;
    // Draw the bubble with crack stages
    const g = this._bubbleG;
    g.clear();
    const stage = this._bubbleHits;
    const r = 44;
    g.fillStyle(0xd8c8ff, 0.18);
    g.fillCircle(cx, cy, r);
    g.lineStyle(3, 0xe8d8ff, 0.95);
    g.strokeCircle(cx, cy, r);
    g.lineStyle(2, 0xffffff, 0.6);
    g.beginPath();
    g.arc(cx - 12, cy - 14, 18, -1.0, -0.2);
    g.strokePath();
    // Cracks — accumulate with stage
    if (stage >= 1) {
      g.lineStyle(1.5, 0x442266, 0.85);
      g.beginPath();
      g.moveTo(cx - r * 0.7, cy - 4); g.lineTo(cx - r * 0.2, cy - 14); g.lineTo(cx + r * 0.1, cy + 4);
      g.strokePath();
    }
    if (stage >= 2) {
      g.lineStyle(1.5, 0x442266, 0.85);
      g.beginPath();
      g.moveTo(cx + r * 0.6, cy - r * 0.3); g.lineTo(cx + r * 0.15, cy + r * 0.1); g.lineTo(cx + r * 0.35, cy + r * 0.55);
      g.strokePath();
    }
    if (stage >= 3) {
      // Bubble is about to pop — denser web
      for (let i = 0; i < 4; i++) {
        g.lineStyle(1, 0x442266, 0.8);
        g.beginPath();
        const a = i * 0.7;
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
        g.strokePath();
      }
    }

    // Intercept enemy contact: any enemy whose body overlaps the bubble
    // radius eats a crack and is knocked back slightly. We do NOT modify
    // any enemy code — we just touch its velocity if a body exists.
    const enemies = (this.scene.enemies || []).concat(this.scene.groundEnemies || []);
    for (const e of enemies) {
      if (!e.alive) continue;
      const ex = e.container ? e.container.x : (e.body ? e.body.x : null);
      const ey = e.container ? e.container.y : (e.body ? e.body.y : null);
      if (ex == null) continue;
      const ddx = ex - cx, ddy = ey - cy;
      if (ddx * ddx + ddy * ddy < (r + 18) * (r + 18)) {
        this._bubbleHit(time, e, ddx, ddy);
        if (this._bubbleHits >= this.cfg.maxHits) break;
      }
    }

    // While bubbled, keep the player invulnerable to "natural" damage by
    // refreshing their invuln timer each frame. Original health/collision
    // logic is untouched; we just layer on top via the existing
    // invulnTimer the Player class already supports.
    if (this.player.invulnTimer < 120) this.player.invulnTimer = 120;
  }

  _bubbleHit(time, enemy, ddx, ddy) {
    // Throttle so a single contact doesn't burn all stages instantly.
    if (time - (this._lastBubbleHitAt || 0) < 320) return;
    this._lastBubbleHitAt = time;
    this._bubbleHits += 1;
    // Knockback enemy
    if (enemy.body && enemy.body.body && enemy.body.body.setVelocity) {
      const m = 240;
      const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      enemy.body.body.setVelocity((ddx / len) * m, (ddy / len) * m - 80);
    }
    // Crack shockwave
    const cx = this.player.sprite.x, cy = this.player.sprite.y;
    const ring = this.scene.add.circle(cx, cy, 30, 0, 0).setStrokeStyle(3, 0xffffff, 0.9).setDepth(12);
    this.scene.tweens.add({
      targets: ring, scale: 2, alpha: 0, duration: 320,
      onComplete: () => ring.destroy(),
    });
    // Brief camera shake
    if (this.scene.cameras && this.scene.cameras.main) {
      this.scene.cameras.main.shake(100, 0.004);
    }
  }

  _popBubble() {
    if (this.state === 'goodbye' || this.state === 'destroyed') return;
    this.state = 'goodbye';
    const cx = this.player.sprite.x, cy = this.player.sprite.y;
    // Big pop ring + droplet particles
    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.circle(cx, cy, 30 + i * 8, 0, 0)
        .setStrokeStyle(3, [0xf0d8ff, 0xffffff, 0xa6f0ff][i], 0.9).setDepth(13);
      this.scene.tweens.add({
        targets: ring, scale: 3, alpha: 0, duration: 520, delay: i * 60,
        onComplete: () => ring.destroy(),
      });
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const p = this.scene.add.circle(cx, cy, 3 + Math.random() * 2, 0xe8d8ff, 0.95).setDepth(13);
      this.scene.tweens.add({
        targets: p,
        x: cx + Math.cos(a) * 80,
        y: cy + Math.sin(a) * 80,
        alpha: 0, scale: 0,
        duration: 520, ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
    if (this._bubbleG) this._bubbleG.destroy();
    this._destroy();
  }

  _beginGoodbye() {
    if (this.state === 'goodbye') return;
    this.state = 'goodbye';
    this.timerRing.clear();

    if (this.type === 'lift' && this.player) {
      // Always restore to PLAYER.GRAVITY — the player's update() loop will
      // re-tune it from there based on jump state.
      this.player.body.setGravityY(PLAYER.GRAVITY);
    }

    // Small wave + happy fade
    const g = this.scene.add.text(this.container.x, this.container.y - 50,
      this.type === 'lift' ? 'safe travels~' : (this.type === 'bubble' ? 'pop!' : 'bye-bye!'),
      { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#fff6e8',
        stroke: '#3a2050', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(20);
    this.scene.tweens.add({
      targets: g, y: g.y - 28, alpha: 0,
      duration: 900, onComplete: () => g.destroy(),
    });

    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 40, alpha: 0, scaleX: 0.4, scaleY: 0.4,
      duration: 700, ease: 'Sine.easeIn',
      onComplete: () => this._destroy(),
    });
  }

  _destroy() {
    this.alive = false;
    this.state = 'destroyed';
    if (this.timerRing) this.timerRing.destroy();
    if (this._bubbleG) this._bubbleG.destroy();
    if (this.container) this.container.destroy();
    if (this._myBullets) {
      this._myBullets.forEach(b => { if (b.g) b.g.destroy(); if (b.glow) b.glow.destroy(); });
      this._myBullets.length = 0;
    }
  }

  // Distance check for activation overlap.
  overlapsPlayer(player) {
    if (!this.alive || this.state !== 'idle') return false;
    const dx = player.sprite.x - this.container.x;
    const dy = player.sprite.y - this.container.y;
    return (dx * dx + dy * dy) < (50 * 50);
  }
}

// =====================================================================
// AllyCloudManager — drives idle/intro/activation/bullet-update for all
// clouds in a scene. Scenes only need to call:
//    this.allyManager = new AllyCloudManager(this);
//    this.allyManager.spawnForCurrentLevel(spec);
//    this.allyManager.update(time, delta);
// =====================================================================
class AllyCloudManager {
  constructor(scene) {
    this.scene = scene;
    this.clouds = [];
    // F6 — first-encounter intro state (per scene session).
    // Resets when a new scene instance is created (i.e. on level start).
    this._introsTriggered = {};
  }

  // F5: gate cloud placement by current level.
  // spec is an array of { type: 'shooter'|'lift'|'bubble', x, y, levels: [1,3] }.
  // Anything whose levels[] doesn't include GAME_STATE.currentLevel is skipped.
  spawnForCurrentLevel(spec) {
    const lvl = GAME_STATE.currentLevel;
    spec.forEach(s => {
      if (!s.levels || s.levels.indexOf(lvl) === -1) return;
      const c = new AllyCloud(this.scene, s.x, s.y, s.type);
      this.clouds.push(c);
    });
  }

  // Boss-fight scripted spawn helper — F5 final bullet.
  // Spawns a single cloud at (x,y) regardless of level, with optional auto-despawn.
  scriptedSpawn(type, x, y, autoDespawnMs) {
    const c = new AllyCloud(this.scene, x, y, type);
    this.clouds.push(c);
    if (autoDespawnMs) {
      this.scene.time.delayedCall(autoDespawnMs, () => {
        if (c.alive && c.state === 'idle') c._beginGoodbye();
      });
    }
    return c;
  }

  update(time, delta) {
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      c.update(time, delta);

      // Intro (F6) — when player approaches a fresh cloud for the first time
      // in this session, pause it and show a speech bubble.
      const lvlKey = this.scene.scene.key + ':' + c.type;
      if (c.state === 'idle' && !this._introsTriggered[lvlKey] && this._playerNear(c, 220)) {
        this._introsTriggered[lvlKey] = true;
        GAME_STATE.allyCloudIntroSeen[lvlKey] = true;
        this._playIntro(c);
      }

      // Activation: idle cloud touched by player
      if (c.state === 'idle' && c.overlapsPlayer(this.scene.player)) {
        c.activate(this.scene.player);
      }

      // Tick shooter bullets (manager owns the loop so cloud destruction
      // doesn't strand orphans).
      if (c._myBullets && c._myBullets.length) {
        const dt = delta / 1000;
        for (let j = c._myBullets.length - 1; j >= 0; j--) {
          const b = c._myBullets[j];
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.g.x = b.x; b.g.y = b.y;
          if (b.glow) { b.glow.x = b.x; b.glow.y = b.y; }
          b.life -= delta;
          // Hit detection: any enemy in the scene
          let hit = false;
          const enemies = (this.scene.enemies || []).concat(this.scene.groundEnemies || []);
          for (const e of enemies) {
            if (!e.alive) continue;
            const ex = e.container ? e.container.x : (e.body ? e.body.x : null);
            const ey = e.container ? e.container.y : (e.body ? e.body.y : null);
            if (ex == null) continue;
            if (Math.abs(b.x - ex) < 36 && Math.abs(b.y - ey) < 30) {
              if (e.takeDamage) e.takeDamage(c.cfg.bulletDamage);
              hit = true; break;
            }
          }
          // Also hit the boss if present
          if (!hit && this.scene.boss && this.scene.boss.alive) {
            const ddx = b.x - this.scene.boss.body.x;
            const ddy = b.y - this.scene.boss.body.y;
            if (Math.abs(ddx) < BOSS.WIDTH / 2 + 10 && Math.abs(ddy) < BOSS.HEIGHT / 2 + 10) {
              this.scene.boss.takeDamage(c.cfg.bulletDamage);
              hit = true;
            }
          }
          if (hit || b.life <= 0) {
            b.g.destroy(); if (b.glow) b.glow.destroy();
            c._myBullets.splice(j, 1);
          }
        }
      }

      if (!c.alive) this.clouds.splice(i, 1);
    }
  }

  _playerNear(cloud, range) {
    const p = this.scene.player;
    if (!p) return false;
    const dx = p.sprite.x - cloud.container.x;
    const dy = p.sprite.y - cloud.container.y;
    return (dx * dx + dy * dy) < range * range;
  }

  // F6: intro animation — cloud floats in toward player (already on-screen,
  // we just nudge it), pauses, shows a speech bubble, then drifts back to
  // its idle position.
  _playIntro(cloud) {
    const scene = this.scene;
    if (cloud.state !== 'idle') return;
    cloud.state = 'intro';
    const player = scene.player;
    const targetX = player.sprite.x + (player.facingRight ? 60 : -60);
    const targetY = player.sprite.y - 80;
    const homeX = cloud.startX, homeY = cloud.startY;

    // Float toward player
    scene.tweens.add({
      targets: cloud.container,
      x: targetX, y: targetY,
      duration: 700, ease: 'Sine.easeInOut',
      onComplete: () => this._showSpeechBubble(cloud, player, () => {
        // Drift to idle position
        scene.tweens.add({
          targets: cloud.container,
          x: homeX, y: homeY,
          duration: 700, ease: 'Sine.easeInOut',
          onComplete: () => {
            // Update startX/startY so idle bob hovers around the new home
            cloud.startX = homeX;
            cloud.startY = homeY;
            if (cloud.state === 'intro') cloud.state = 'idle';
          },
        });
      }),
    });
  }

  _showSpeechBubble(cloud, player, onDone) {
    const scene = this.scene;
    const cx = cloud.container.x, cy = cloud.container.y - 56;

    const text = scene.add.text(cx, cy,
      `${cloud.cfg.introName}:\n"${cloud.cfg.introLine}"`,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#2a1a3a',
        align: 'center',
        wordWrap: { width: 220 },
      }
    ).setOrigin(0.5).setDepth(22);

    const padX = 12, padY = 8;
    const b = text.getBounds();
    const bg = scene.add.graphics().setDepth(21);
    bg.fillStyle(0xfff6dc, 0.95);
    bg.fillRoundedRect(b.x - padX, b.y - padY, b.width + padX * 2, b.height + padY * 2, 10);
    bg.lineStyle(2, 0x6a4a6e, 0.9);
    bg.strokeRoundedRect(b.x - padX, b.y - padY, b.width + padX * 2, b.height + padY * 2, 10);
    // Tail pointing to cloud
    bg.fillStyle(0xfff6dc, 0.95);
    bg.fillTriangle(cx - 6, b.y + b.height + padY - 1,
                    cx + 6, b.y + b.height + padY - 1,
                    cx, b.y + b.height + padY + 10);

    // Hold then dismiss
    scene.time.delayedCall(2600, () => {
      scene.tweens.add({
        targets: [text, bg], alpha: 0, duration: 350,
        onComplete: () => { text.destroy(); bg.destroy(); if (onDone) onDone(); },
      });
    });
  }
}
