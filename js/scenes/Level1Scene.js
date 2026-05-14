// Level 1 — Whispering Plains
// Visual direction: Ghibli-warmth + Gris color restoration.
// All graphics drawn procedurally as placeholders (Phase 1).

class Level1Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level1Scene' });
  }

  create() {
    // --- Sky: warm multi-stop gradient (blue → cream → peach) ---
    // Phaser's fillGradientStyle only supports 4 corners, so we paint
    // two stacked gradients for a smoother 3-stop feel.
    const skyTop = this.add.graphics();
    skyTop.fillGradientStyle(
      COLORS.SKY_TOP, COLORS.SKY_TOP,
      COLORS.SKY_MID, COLORS.SKY_MID,
      1
    );
    skyTop.fillRect(0, 0, LEVEL.WIDTH, LEVEL.HEIGHT * 0.55);
    skyTop.setScrollFactor(0.05);

    const skyBot = this.add.graphics();
    skyBot.fillGradientStyle(
      COLORS.SKY_MID, COLORS.SKY_MID,
      COLORS.SKY_HORIZON, COLORS.SKY_LOW,
      1
    );
    skyBot.fillRect(0, LEVEL.HEIGHT * 0.55 - 1, LEVEL.WIDTH, LEVEL.HEIGHT * 0.5);
    skyBot.setScrollFactor(0.05);

    // --- Big stacked cumulus clouds (far background) ---
    this._drawCloudField(0.12, 120, 160, 8, 0.9);  // far clouds
    this._drawCloudField(0.22, 180, 110, 10, 1.0); // mid clouds

    // --- Distant colorful buildings (coral/lavender/mint silhouettes) ---
    this._drawDistantBuildings();

    // --- Rolling hills — 3 layers for depth ---
    const farHills = this.add.graphics();
    farHills.fillStyle(COLORS.HILLS_FAR, 0.85);
    this._drawHills(farHills, 540, 50, 4, 0.0018);
    farHills.setScrollFactor(0.3);

    const midHills = this.add.graphics();
    midHills.fillStyle(COLORS.HILLS_MID, 0.95);
    this._drawHills(midHills, 560, 75, 6, 0.0024);
    midHills.setScrollFactor(0.5);

    const nearHills = this.add.graphics();
    nearHills.fillStyle(COLORS.HILLS_NEAR, 1);
    this._drawHills(nearHills, 590, 60, 8, 0.0032);
    // highlight ridge
    nearHills.lineStyle(3, COLORS.GROUND_GRASS_HI, 0.5);
    this._traceHills(nearHills, 590, 60, 8, 0.0032);
    nearHills.setScrollFactor(0.7);

    // --- Observation zones (F12) — declared up here so enemy spawns can
    // be filtered out of these bands. Sauna lives inside the first zone.
    this.observationZones = [
      { xStart: 2200, xEnd: 2900, sauna: true,  saunaOffset: 0.55, slowMul: 0.55 },
      { xStart: 6300, xEnd: 6900, sauna: false, slowMul: 0.65 },
    ];
    const _inAnyZone = (x) => this.observationZones.some(z => x >= z.xStart && x <= z.xEnd);

    // --- Cloud enemies (aerial, spotlight beams) ---
    this.enemies = [];
    const cloudSpawns = [
      { x: 780,  y: 200, scale: 0.9 },
      { x: 1300, y: 170, scale: 1.0, golden: true },
      { x: 1900, y: 210, scale: 0.85 },
      { x: 2550, y: 180, scale: 1.0 },
      { x: 3100, y: 160, scale: 0.9, golden: true },
      { x: 3700, y: 190, scale: 1.0 },
      { x: 4350, y: 170, scale: 0.9 },
      { x: 4950, y: 200, scale: 0.95, golden: true },
      { x: 5550, y: 170, scale: 1.0 },
      { x: 6150, y: 190, scale: 0.9 },
      { x: 6800, y: 175, scale: 1.0, golden: true },
      { x: 7400, y: 200, scale: 0.9 },
      { x: 8100, y: 180, scale: 1.0 },
      { x: 8700, y: 200, scale: 0.9, golden: true },
      { x: 9400, y: 170, scale: 1.0 },
      { x: 10100, y: 190, scale: 0.95 },
      { x: 10800, y: 200, scale: 0.9, golden: true },
      { x: 11500, y: 170, scale: 1.0 },
    ];
    cloudSpawns.forEach(s => {
      if (_inAnyZone(s.x)) return; // F12 — peaceful zones get no enemies
      // Apply F11 tuning: scale up cloud enemies a bit so they feel more imposing.
      const scaled = Object.assign({}, s, { scale: (s.scale || 1.0) * TUNING.CLOUD_ENEMY_SCALE });
      this.enemies.push(new CloudEnemy(this, s.x, s.y, scaled));
    });

    // --- Ground enemies (Spangerells — patrol + charge) ---
    this.groundEnemies = [];
    const spangerellSpawns = [
      { x: 850,  y: LEVEL.GROUND_Y - 30, range: 150 },
      { x: 1400, y: LEVEL.GROUND_Y - 30, range: 180 },
      { x: 2050, y: LEVEL.GROUND_Y - 30, range: 150 },
      { x: 2850, y: LEVEL.GROUND_Y - 30, range: 200 },
      { x: 3450, y: LEVEL.GROUND_Y - 30, range: 160 },
      { x: 4150, y: LEVEL.GROUND_Y - 30, range: 180 },
      { x: 4750, y: LEVEL.GROUND_Y - 30, range: 160 },
      { x: 5450, y: LEVEL.GROUND_Y - 30, range: 200 },
      { x: 6050, y: LEVEL.GROUND_Y - 30, range: 170 },
      { x: 6700, y: LEVEL.GROUND_Y - 30, range: 200 },
      { x: 7300, y: LEVEL.GROUND_Y - 30, range: 180 },
      { x: 8000, y: LEVEL.GROUND_Y - 30, range: 200 },
      { x: 8650, y: LEVEL.GROUND_Y - 30, range: 160 },
      { x: 9300, y: LEVEL.GROUND_Y - 30, range: 180 },
      { x: 9950, y: LEVEL.GROUND_Y - 30, range: 200 },
      { x: 10600, y: LEVEL.GROUND_Y - 30, range: 180 },
      { x: 11250, y: LEVEL.GROUND_Y - 30, range: 200 },
    ];
    spangerellSpawns.forEach(s => {
      if (_inAnyZone(s.x)) return; // F12 — no Spangerells in observation zones
      this.groundEnemies.push(new Spangerell(this, s.x, s.y, { patrolRange: s.range }));
    });

    // Instantiate observation zones (also creates the sauna inside the first one).
    this._zones = this.observationZones.map(z => new ObservationZone(this, z.xStart, z.xEnd, z));

    // --- Ground: dirt body + grass cap ---
    this.platforms = this.physics.add.staticGroup();

    // Dirt under-layer
    const dirt = this.add.rectangle(
      LEVEL.WIDTH / 2, LEVEL.GROUND_Y + 60,
      LEVEL.WIDTH, 140,
      COLORS.GROUND_DIRT
    );
    // Grass top
    const groundGrass = this.add.rectangle(
      LEVEL.WIDTH / 2, LEVEL.GROUND_Y + 10,
      LEVEL.WIDTH, 24,
      COLORS.GROUND_GRASS
    );
    // Bright grass highlight line
    this.add.rectangle(
      LEVEL.WIDTH / 2, LEVEL.GROUND_Y - 2,
      LEVEL.WIDTH, 4,
      COLORS.GROUND_GRASS_HI
    );

    // Physics body tracks the grass surface
    const ground = this.add.rectangle(
      LEVEL.WIDTH / 2, LEVEL.GROUND_Y + 50,
      LEVEL.WIDTH, 100,
      0x000000, 0 // invisible collider
    );
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // --- Floating grass-topped platforms ---
    const platformData = [
      [400, 500, 160], [650, 420, 120], [900, 480, 140], [1150, 380, 100],
      [1400, 450, 180], [1700, 350, 120], [1950, 420, 160], [2200, 300, 100],
      [2450, 480, 200], [2700, 380, 140], [3000, 320, 120], [3250, 450, 160],
      [3500, 280, 100], [3750, 400, 180], [4000, 350, 120], [4300, 480, 200],
      [4600, 300, 140], [4900, 420, 160], [5200, 350, 100], [5500, 480, 180],
      [5800, 280, 120], [6100, 400, 160], [6400, 350, 140], [6700, 450, 200],
      [7000, 320, 120], [7400, 400, 160], [7700, 480, 180], [8000, 340, 120],
      [8300, 400, 160], [8600, 280, 100], [8900, 460, 200], [9200, 350, 140],
      [9500, 400, 120], [9800, 300, 160], [10100, 450, 180], [10400, 340, 100],
      [10700, 400, 160], [11000, 280, 120], [11300, 440, 200], [11600, 360, 140],
    ];

    platformData.forEach(([px, py, pw]) => {
      this._drawGrassPlatform(px, py, pw);

      // Invisible physics collider at the grass surface
      const col = this.add.rectangle(px, py, pw, 16, 0x000000, 0);
      this.physics.add.existing(col, true);
      this.platforms.add(col);
    });

    // --- Coins (hover + glow) ---
    this.coins = this.physics.add.staticGroup();
    this.coinCount = 0;
    const coinPositions = [
      [300, 560], [500, 460], [700, 380], [950, 440],
      [1200, 340], [1500, 400], [1800, 310], [2100, 380],
      [2500, 440], [2800, 340], [3100, 280], [3400, 410],
      [3700, 240], [4000, 310], [4400, 440], [4700, 260],
      [5000, 380], [5300, 310], [5600, 440], [5900, 240],
      [6200, 360], [6500, 310], [6800, 410], [7100, 280],
    ];

    coinPositions.forEach(([cx, cy]) => {
      // Outer glow
      const glow = this.add.circle(cx, cy, 16, COLORS.COIN, 0.18);
      // Core
      const coin = this.add.circle(cx, cy, 9, COLORS.COIN, 1);
      coin.setStrokeStyle(2, 0xffffff, 0.5);
      this.physics.add.existing(coin, true);
      this.coins.add(coin);

      // Gentle hover tween
      this.tweens.add({
        targets: [coin, glow],
        y: cy - 6,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Tell shared GAME_STATE which level we're on (drives F5/F10 gating).
    setCurrentLevelFromScene(this);

    // --- Player ---
    this.player = new Player(this, 100, LEVEL.GROUND_Y - 60);
    this.physics.add.collider(this.player.sprite, this.platforms);

    // F10 — per-level visual sprite upgrade (tint + halo orb + aura).
    this.playerAura = new PlayerAura(this);

    // --- Ally Clouds (Features 2-6) ---
    // Spec is level-aware: levels [1,3] = appears in Level 1 and Level 3.
    // Level 2 receives nothing because no entry lists "2".
    this.allyManager = new AllyCloudManager(this);
    this.allyManager.spawnForCurrentLevel([
      { type: 'shooter', x: 1100, y: LEVEL.GROUND_Y - 200, levels: [1, 3] },
      { type: 'lift',    x: 3300, y: LEVEL.GROUND_Y - 220, levels: [1, 3] },
      { type: 'bubble',  x: 5400, y: LEVEL.GROUND_Y - 200, levels: [1, 3] },
      // Second pass further into the level
      { type: 'shooter', x: 7800, y: LEVEL.GROUND_Y - 220, levels: [1, 3] },
      { type: 'lift',    x: 9400, y: LEVEL.GROUND_Y - 240, levels: [1, 3] },
      { type: 'bubble',  x: 11000, y: LEVEL.GROUND_Y - 200, levels: [1, 3] },
    ]);

    this.physics.add.overlap(this.player.sprite, this.coins, (player, coin) => {
      coin.destroy();
      this.coinCount++;
      this.events.emit('coinCollected', this.coinCount);
      this._coinBurst(coin.x, coin.y);
    });

    // --- Heart projectiles (manually moved — no physics group needed) ---
    this.heartBullets = []; // plain array, updated in update()

    // Ground enemies collide with platforms
    this.groundEnemies.forEach(enemy => {
      this.physics.add.collider(enemy.body, this.platforms);
    });

    // --- Camera with facing-based lookahead ---
    // Manual camera — do NOT use startFollow, we scroll manually for lookahead control
    this.cameras.main.setBounds(0, 0, LEVEL.WIDTH, LEVEL.HEIGHT);
    this.cameras.main.setZoom(TUNING.CAMERA_ZOOM); // F11 — slight zoom-out
    this.physics.world.setBounds(0, 0, LEVEL.WIDTH, LEVEL.HEIGHT + 200);

    // Camera state
    this._camTargetX = this.player.sprite.x - GAME_WIDTH / 2;
    this._camTargetY = this.player.sprite.y - GAME_HEIGHT / 2;
    this._camLookaheadX = 0; // lerps toward +200 (right) or -200 (left)

    // --- Input ---
    this.cursors = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      backstep: Phaser.Input.Keyboard.KeyCodes.X,
      shoot: Phaser.Input.Keyboard.KeyCodes.Z,
    });
    this.wasd = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
    });

    // Debug warp: press B to jump straight to the boss fight
    this.input.keyboard.on('keydown-B', () => {
      this.scene.stop('HUDScene');
      this.scene.start('Level3BossScene');
    });

    this.touchControls = new TouchControls(this);

    // --- HUD ---
    this.scene.launch('HUDScene');
    this.events.emit('coinCollected', 0);

    // --- Ambient floating particles (pollen / light motes) ---
    this._createAmbientParticles();
  }

  update(time, delta) {
    const mergedCursors = {
      left: { isDown: this.cursors.left.isDown || this.wasd.left.isDown },
      right: { isDown: this.cursors.right.isDown || this.wasd.right.isDown },
      up: { isDown: this.cursors.up.isDown || this.wasd.up.isDown },
      shift: { isDown: this.cursors.shift.isDown },
      backstep: this.cursors.backstep,
      shoot: this.cursors.shoot,
    };

    this.touchControls.update();
    this.player.update(mergedCursors, this.touchControls.active ? this.touchControls : null);

    // Enemy updates (new signature: time, delta, player)
    this.enemies.forEach(e => e.update(time, delta, this.player));
    this.groundEnemies.forEach(e => e.update(time, delta, this.player));

    // Ally Cloud manager (F2-F6) — handles intros, activation, lift/shoot/bubble logic.
    if (this.allyManager) this.allyManager.update(time, delta);

    // Per-level player aura (F10) — follows the player.
    if (this.playerAura) this.playerAura.update(time);

    // F10 — egg-crack narrative when the player reaches the world edge.
    // One-shot trigger using a flag so it can't repeat. Visual + dialogue
    // only; actual stat buffs are layered via GAME_STATE flags (read by
    // the next scene's aura tier).
    if (!this._eggCracked && this.player.sprite.x > LEVEL.WIDTH - 240) {
      this._eggCracked = true;
      this._playEggCrackNarrative();
    }

    // Observation zones / Sauna stations (F8, F12).
    let zoneSlow = 1;
    if (this._zones) {
      for (const z of this._zones) {
        z.update(time);
        if (z.contains(this.player)) zoneSlow = z.slowMul;
      }
    }
    this._cameraSlowMul = zoneSlow;

    // Stomp-to-kill (F9). Resolved BEFORE the side-contact damage check so a
    // landing on top is interpreted as a stomp, not a side hit. We never touch
    // Player.update or any enemy class — we just read positions/velocity and
    // call the existing takeDamage / setVelocityY on instances.
    this._resolveStomps();

    // Contact damage for cloud bodies (player touches cloud → small damage)
    this.enemies.forEach(e => {
      if (!e.alive) return;
      const dx = Math.abs(this.player.sprite.x - e.container.x);
      const dy = Math.abs(this.player.sprite.y - e.container.y);
      if (dx < 40 && dy < 30) {
        this.player.takeDamage(e.cfg.CONTACT_DAMAGE);
      }
    });

    // --- Manual camera with lookahead ---
    const cam = this.cameras.main;
    const LOOKAHEAD = 200;
    const VERT_OFFSET = -40; // keep player slightly below center

    // Account for zoom (F11). visibleW/H = GAME_W/H / zoom.
    const z = cam.zoom || 1;
    const visibleW = GAME_WIDTH / z;
    const visibleH = GAME_HEIGHT / z;

    // Lerp lookahead toward facing direction
    const targetLookahead = this.player.facingRight ? LOOKAHEAD : -LOOKAHEAD;
    this._camLookaheadX += (targetLookahead - this._camLookaheadX) * 0.04;

    // Target scroll position: center on player + lookahead
    const targetScrollX = this.player.sprite.x + this._camLookaheadX - visibleW / 2;
    const targetScrollY = this.player.sprite.y + VERT_OFFSET - visibleH / 2;

    // Smooth follow (lerp) — same feel as startFollow(sprite, true, 0.08, 0.08)
    // Optional slowdown applied by observation zones (F12).
    const lerpBase = 0.08;
    const lerpScale = (this._cameraSlowMul != null) ? this._cameraSlowMul : 1;
    const lerpX = lerpBase * lerpScale;
    const lerpY = lerpBase * lerpScale;
    cam.scrollX += (targetScrollX - cam.scrollX) * lerpX;
    cam.scrollY += (targetScrollY - cam.scrollY) * lerpY;

    // Clamp to world bounds (account for zoomed visible area)
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, Math.max(0, LEVEL.WIDTH - visibleW));
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, Math.max(0, LEVEL.HEIGHT - visibleH));

    // --- Manual heart bullet update ---
    const speed = WEAPONS.HEART_GUN.BULLET_SPEED;
    const dt = delta / 1000;
    for (let i = this.heartBullets.length - 1; i >= 0; i--) {
      const h = this.heartBullets[i];
      h.x += h.dir * speed * dt;
      h.lifespan -= delta;

      // Redraw heart graphic at new position
      if (h.heartG && h.heartG.active) {
        h.drawHeart(h.heartG, h.x, h.y);
      }

      // Hit check vs cloud enemies
      let hit = false;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.abs(h.x - e.container.x) < 50 && Math.abs(h.y - e.container.y) < 35) {
          e.takeDamage(WEAPONS.HEART_GUN.DAMAGE);
          hit = true; break;
        }
      }
      // Hit check vs ground enemies
      if (!hit) {
        for (const e of this.groundEnemies) {
          if (!e.alive) continue;
          if (Math.abs(h.x - e.body.x) < 32 && Math.abs(h.y - e.body.y) < 26) {
            e.takeDamage(WEAPONS.HEART_GUN.DAMAGE);
            hit = true; break;
          }
        }
      }

      if (hit || h.lifespan <= 0) {
        if (h.heartG && h.heartG.active) h.heartG.destroy();
        if (h.glow && h.glow.active) h.glow.destroy();
        this.heartBullets.splice(i, 1);
      }
    }

    // Respawn if fallen off world
    if (this.player.sprite.y > LEVEL.HEIGHT + 100) {
      this.player.sprite.setPosition(100, LEVEL.GROUND_Y - 60);
      this.player.body.setVelocity(0, 0);
    }

    // Death respawn
    if (this.player.hp <= 0) {
      this.player.sprite.setPosition(100, LEVEL.GROUND_Y - 60);
      this.player.body.setVelocity(0, 0);
      this.player.hp = this.player.maxHp;
      this.events.emit('playerHpChanged', this.player.hp, this.player.maxHp);
    }
  }

  spawnHeart(x, y, dir) {
    // Muzzle flash — quick burst at fire point
    const flash = this.add.graphics();
    flash.setDepth(7);
    flash.fillStyle(COLORS.HEART, 0.9);
    // Star-burst: 4 short lines radiating outward
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + (dir > 0 ? 0 : Math.PI);
      const len = 10 + Math.random() * 6;
      flash.fillRect(
        x + Math.cos(a) * 4 - 1.5,
        y + Math.sin(a) * 4 - 1.5,
        3, 3
      );
    }
    // Bright core circle
    flash.fillStyle(0xffffff, 1);
    flash.fillCircle(x, y, 4);
    flash.fillStyle(COLORS.HEART, 0.8);
    flash.fillCircle(x, y, 7);
    this.tweens.add({
      targets: flash,
      scaleX: dir > 0 ? 1.8 : -1.8, scaleY: 1.8,
      alpha: 0,
      x: x + dir * 12,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });

    // Heart visuals — graphics object drawn at current bullet position each frame
    const heartG = this.add.graphics().setDepth(6);
    const drawHeart = (gfx, hx, hy) => {
      gfx.clear();
      gfx.fillStyle(COLORS.HEART, 1);
      gfx.fillCircle(hx - 3.5, hy - 3, 5.5);
      gfx.fillCircle(hx + 3.5, hy - 3, 5.5);
      gfx.fillTriangle(hx - 8, hy, hx + 8, hy, hx, hy + 8);
      gfx.fillStyle(0xffffff, 0.4);
      gfx.fillCircle(hx - 4, hy - 5, 2.5);
    };
    drawHeart(heartG, x, y);

    // Glow halo
    const glow = this.add.circle(x, y, 13, COLORS.HEART, 0.22).setDepth(5);

    // Plain data object — updated manually in update()
    const bulletData = { x, y, dir, lifespan: 1400, heartG, glow, drawHeart };
    this.heartBullets.push(bulletData);

    // Trail of fading dots (reads from bulletData.x/y)
    const trailTimer = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!heartG.active) { trailTimer.destroy(); return; }
        glow.setPosition(bulletData.x, bulletData.y);
        const t = this.add.circle(
          bulletData.x - dir * 8,
          bulletData.y + Phaser.Math.Between(-3, 3),
          Phaser.Math.FloatBetween(2, 4), COLORS.HEART, 0.55
        ).setDepth(5);
        this.tweens.add({
          targets: t, alpha: 0, scale: 0,
          duration: 160, ease: 'Quad.easeOut',
          onComplete: () => t.destroy(),
        });
      },
    });
  }

  // --- F10: egg-crack narrative when the player completes the level.
  // Shows a full-screen overlay + dialogue, records an upgrade on
  // GAME_STATE.upgrades that future levels can read. We never modify the
  // existing weapon system here — buffs are layered, not in-place edits.
  _playEggCrackNarrative() {
    const text = (typeof PLAYER_AURA_NARRATIVE !== 'undefined' && PLAYER_AURA_NARRATIVE[GAME_STATE.currentLevel])
      ? PLAYER_AURA_NARRATIVE[GAME_STATE.currentLevel]
      : "You crack the egg. A warmth settles into your shoulders.";

    // Record an upgrade tier on GAME_STATE — used as a hook for future
    // shoot-system tuning without editing the current shooting code.
    GAME_STATE.upgrades = GAME_STATE.upgrades || { tier: 0, names: [] };
    GAME_STATE.upgrades.tier = Math.max(GAME_STATE.upgrades.tier, GAME_STATE.currentLevel);
    GAME_STATE.upgrades.names.push('Garment-' + GAME_STATE.currentLevel);

    // Full-screen dimmer.
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x000010, 0).setScrollFactor(0).setDepth(300);
    this.tweens.add({ targets: dim, alpha: 0.7, duration: 600 });

    // Cracking egg illustration
    const egg = this.add.graphics().setScrollFactor(0).setDepth(301);
    const ex = GAME_WIDTH / 2, ey = GAME_HEIGHT / 2 - 60;
    egg.fillStyle(0xfff6dc, 1);
    egg.fillEllipse(ex, ey, 110, 140);
    egg.lineStyle(2, 0xc8a060, 0.9);
    egg.strokeEllipse(ex, ey, 110, 140);
    egg.lineStyle(2, 0x6a3a20, 1);
    egg.beginPath();
    egg.moveTo(ex - 40, ey - 10);
    egg.lineTo(ex - 20, ey + 4);
    egg.lineTo(ex - 5, ey - 8);
    egg.lineTo(ex + 12, ey + 6);
    egg.lineTo(ex + 35, ey - 4);
    egg.strokePath();

    // Burst of light
    const burst = this.add.circle(ex, ey, 30, 0xfff6dc, 0.9).setScrollFactor(0).setDepth(302);
    this.tweens.add({
      targets: burst, scale: 6, alpha: 0, duration: 1400, ease: 'Quad.easeOut',
    });

    // Narrative
    const dialogue = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, text, {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#fff6e8',
      align: 'center', wordWrap: { width: GAME_WIDTH * 0.7 },
      stroke: '#1a0a20', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(302).setAlpha(0);
    this.tweens.add({ targets: dialogue, alpha: 1, duration: 800, delay: 400 });

    const press = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60,
      'press SPACE to continue', {
        fontFamily: 'Georgia, serif', fontSize: '14px', color: '#ffe0a8',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(302).setAlpha(0);
    this.tweens.add({ targets: press, alpha: 0.8, duration: 800, delay: 1600 });

    // Dismiss handler — clears everything but keeps the upgrade.
    const dismiss = () => {
      this.input.keyboard.off('keydown-SPACE', dismiss);
      this.input.off('pointerdown', dismiss);
      [dim, egg, burst, dialogue, press].forEach(o => {
        if (o && o.active) {
          this.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() });
        }
      });
    };
    this.time.delayedCall(1600, () => {
      this.input.keyboard.once('keydown-SPACE', dismiss);
      this.input.once('pointerdown', dismiss);
    });
  }

  // --- F9: stomp-to-kill resolution. Self-contained, runs before contact
  // damage. If the player is moving downward and their feet land on top of
  // an enemy this frame, the enemy dies and the player bounces upward.
  _resolveStomps() {
    const p = this.player;
    if (!p || !p.body) return;
    const vy = p.body.velocity.y;
    // Must be moving downward fast enough to count as a stomp.
    if (vy < 80) return;

    const feetY = p.sprite.y + PLAYER.HEIGHT / 2;
    const STOMP_BAND = 18; // forgiveness above enemy top
    const BOUNCE_VY = -360;
    const STOMP_DAMAGE = 999; // one-shot

    const tryStomp = (e, halfW, topY) => {
      if (!e.alive) return false;
      const cx = e.container ? e.container.x : (e.body ? e.body.x : null);
      if (cx == null) return false;
      const dx = Math.abs(p.sprite.x - cx);
      if (dx > halfW + PLAYER.WIDTH / 2 - 6) return false;
      const dy = feetY - topY;
      if (dy < -STOMP_BAND || dy > STOMP_BAND + 18) return false;
      // Squish + die
      this._stompSquish(e);
      if (typeof e.takeDamage === 'function') e.takeDamage(STOMP_DAMAGE);
      // Bounce player
      p.body.setVelocityY(BOUNCE_VY);
      return true;
    };

    // Cloud enemies — top of cloud body sits ~14 px above container center.
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const halfW = 36 * (e.scaleFactor || 1);
      const topY = (e.container ? e.container.y : 0) - 16 * (e.scaleFactor || 1);
      if (tryStomp(e, halfW, topY)) break;
    }
    // Ground enemies (Spangerells).
    for (const e of this.groundEnemies) {
      if (!e.alive) continue;
      const halfW = ENEMIES.SPANGERELL.WIDTH / 2;
      const topY = e.body.y - ENEMIES.SPANGERELL.HEIGHT / 2;
      if (tryStomp(e, halfW, topY)) break;
    }
  }

  _stompSquish(enemy) {
    const target = enemy.container;
    if (!target) return;
    // Quick squash without affecting the enemy's existing tweens.
    const startY = target.scaleY;
    this.tweens.add({
      targets: target,
      scaleY: startY * 0.4,
      scaleX: (target.scaleX || 1) * 1.3,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    // Stars
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const s = this.add.circle(target.x, target.y, 3, 0xffffff, 0.95).setDepth(11);
      this.tweens.add({
        targets: s, x: target.x + Math.cos(a) * 40, y: target.y + Math.sin(a) * 40,
        alpha: 0, duration: 320,
        onComplete: () => s.destroy(),
      });
    }
  }

  // --- Drawing helpers ---

  _drawHills(g, baseY, amplitude, segments, freq) {
    g.beginPath();
    g.moveTo(0, LEVEL.HEIGHT);
    const step = 20;
    for (let x = 0; x <= LEVEL.WIDTH; x += step) {
      const y = baseY
        + Math.sin(x * freq * segments) * amplitude
        + Math.sin(x * freq * 0.5) * amplitude * 0.5
        + Math.sin(x * freq * 2.3) * amplitude * 0.2;
      g.lineTo(x, y);
    }
    g.lineTo(LEVEL.WIDTH, LEVEL.HEIGHT);
    g.closePath();
    g.fillPath();
  }

  _traceHills(g, baseY, amplitude, segments, freq) {
    g.beginPath();
    const step = 20;
    let first = true;
    for (let x = 0; x <= LEVEL.WIDTH; x += step) {
      const y = baseY
        + Math.sin(x * freq * segments) * amplitude
        + Math.sin(x * freq * 0.5) * amplitude * 0.5
        + Math.sin(x * freq * 2.3) * amplitude * 0.2;
      if (first) { g.moveTo(x, y); first = false; }
      else g.lineTo(x, y);
    }
    g.strokePath();
  }

  _drawCloudField(scrollFactor, yCenter, yVariance, count, alpha) {
    const g = this.add.graphics();
    g.setScrollFactor(scrollFactor);
    const spacing = LEVEL.WIDTH / count;
    for (let i = 0; i < count; i++) {
      const cx = i * spacing + Phaser.Math.Between(-80, 80) + spacing / 2;
      const cy = yCenter + Phaser.Math.Between(-yVariance / 2, yVariance / 2);
      const scale = Phaser.Math.FloatBetween(0.9, 1.6);
      this._drawCumulus(g, cx, cy, scale, alpha);
    }
  }

  _drawCumulus(g, cx, cy, scale, alpha) {
    // Layered puffy cloud — shadow base, mid, light, highlight
    const puffs = [
      { dx: -60, dy: 10, r: 38 },
      { dx: -25, dy: -8, r: 48 },
      { dx: 15,  dy: -18, r: 54 },
      { dx: 55,  dy: -6, r: 44 },
      { dx: 85,  dy: 14, r: 34 },
      { dx: 30,  dy: 16, r: 40 },
      { dx: -10, dy: 22, r: 36 },
    ];

    // Soft shadow (warm taupe)
    g.fillStyle(COLORS.CLOUD_SHADOW, alpha * 0.55);
    puffs.forEach(p => g.fillCircle(cx + p.dx * scale, cy + (p.dy + 10) * scale, p.r * scale));

    // Mid
    g.fillStyle(COLORS.CLOUD_MID, alpha * 0.85);
    puffs.forEach(p => g.fillCircle(cx + p.dx * scale, cy + p.dy * scale, p.r * scale * 0.95));

    // Light
    g.fillStyle(COLORS.CLOUD_LIGHT, alpha);
    puffs.slice(1, 6).forEach(p =>
      g.fillCircle(cx + p.dx * scale, cy + (p.dy - 8) * scale, p.r * scale * 0.8)
    );

    // Highlight
    g.fillStyle(COLORS.CLOUD_HI, alpha);
    puffs.slice(2, 4).forEach(p =>
      g.fillCircle(cx + p.dx * scale, cy + (p.dy - 14) * scale, p.r * scale * 0.55)
    );
  }

  _drawDistantBuildings() {
    // Pastel silhouettes in the middle distance, with rounded domed tops
    const g = this.add.graphics();
    g.setScrollFactor(0.4);

    const buildings = [
      { x: 40,   w: 90,  h: 220, color: COLORS.BUILDING_CORAL },
      { x: 180,  w: 60,  h: 170, color: COLORS.BUILDING_LAVENDER },
      { x: 1100, w: 80,  h: 200, color: COLORS.BUILDING_MINT },
      { x: 1240, w: 60,  h: 150, color: COLORS.BUILDING_LAVENDER },
      { x: 2300, w: 100, h: 240, color: COLORS.BUILDING_CORAL },
      { x: 2440, w: 70,  h: 180, color: COLORS.BUILDING_MINT },
      { x: 3500, w: 90,  h: 220, color: COLORS.BUILDING_LAVENDER },
      { x: 4600, w: 80,  h: 200, color: COLORS.BUILDING_CORAL },
      { x: 4720, w: 60,  h: 160, color: COLORS.BUILDING_MINT },
      { x: 5700, w: 100, h: 240, color: COLORS.BUILDING_LAVENDER },
      { x: 6800, w: 80,  h: 210, color: COLORS.BUILDING_CORAL },
      { x: 7400, w: 90,  h: 220, color: COLORS.BUILDING_MINT },
      { x: 8500, w: 80,  h: 200, color: COLORS.BUILDING_LAVENDER },
      { x: 9200, w: 100, h: 240, color: COLORS.BUILDING_CORAL },
      { x: 9350, w: 60,  h: 160, color: COLORS.BUILDING_MINT },
      { x: 10300, w: 90, h: 220, color: COLORS.BUILDING_LAVENDER },
      { x: 11100, w: 80, h: 200, color: COLORS.BUILDING_CORAL },
      { x: 11700, w: 100, h: 240, color: COLORS.BUILDING_MINT },
    ];

    buildings.forEach(b => {
      const topY = 570 - b.h;
      // Body
      g.fillStyle(b.color, 0.9);
      g.fillRect(b.x, topY + b.w * 0.35, b.w, b.h - b.w * 0.35);
      // Rounded dome top
      g.fillCircle(b.x + b.w / 2, topY + b.w * 0.35, b.w / 2);
      // Roof tint
      g.fillStyle(COLORS.BUILDING_ROOF, 0.4);
      g.fillCircle(b.x + b.w / 2, topY + b.w * 0.35, b.w / 2);
      g.fillRect(b.x, topY + b.w * 0.35, b.w, 6);
    });
  }

  _drawGrassPlatform(cx, cy, w) {
    const halfW = w / 2;

    // Wood body (trapezoidal — wider at top, slightly tapered bottom)
    const wood = this.add.graphics();
    wood.fillStyle(COLORS.PLATFORM_WOOD, 1);
    wood.beginPath();
    wood.moveTo(cx - halfW, cy);
    wood.lineTo(cx + halfW, cy);
    wood.lineTo(cx + halfW - 12, cy + 28);
    wood.lineTo(cx - halfW + 12, cy + 28);
    wood.closePath();
    wood.fillPath();

    // Dark wood underside
    wood.fillStyle(COLORS.PLATFORM_WOOD_DARK, 1);
    wood.fillRect(cx - halfW + 12, cy + 24, w - 24, 6);

    // Grass top
    const grass = this.add.graphics();
    grass.fillStyle(COLORS.PLATFORM_GRASS, 1);
    grass.fillRoundedRect(cx - halfW, cy - 10, w, 18, { tl: 8, tr: 8, bl: 0, br: 0 });

    // Grass highlight
    grass.fillStyle(COLORS.PLATFORM_GRASS_HI, 1);
    grass.fillRect(cx - halfW + 6, cy - 10, w - 12, 3);

    // Little grass tufts
    for (let i = 0; i < Math.floor(w / 40); i++) {
      const tx = cx - halfW + 20 + i * 36 + Phaser.Math.Between(-4, 4);
      grass.fillStyle(COLORS.PLATFORM_GRASS_HI, 0.9);
      grass.fillTriangle(tx, cy - 10, tx - 3, cy - 16, tx + 3, cy - 16);
    }
  }

  _coinBurst(x, y) {
    for (let i = 0; i < 8; i++) {
      const particle = this.add.circle(x, y, 3, COLORS.COIN, 0.9);
      const angle = (Math.PI * 2 / 8) * i;
      const speed = 90;
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 450,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  _createAmbientParticles() {
    // Warm pollen/light motes drifting up — Ghibli atmosphere
    this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        const camBounds = this.cameras.main.worldView;
        const px = Phaser.Math.Between(camBounds.x, camBounds.x + camBounds.width);
        const py = camBounds.y + camBounds.height + 10;
        const size = Phaser.Math.FloatBetween(1.5, 3.5);
        const colors = [0xfff6dc, 0xffe4a8, 0xffd070, 0xfff0d0];
        const color = Phaser.Utils.Array.GetRandom(colors);

        const particle = this.add.circle(px, py, size, color, 0.5);
        this.tweens.add({
          targets: particle,
          y: py - Phaser.Math.Between(300, 600),
          x: px + Phaser.Math.Between(-80, 80),
          alpha: 0,
          duration: Phaser.Math.Between(3500, 6500),
          ease: 'Sine.easeInOut',
          onComplete: () => particle.destroy(),
        });
      }
    });
  }
}
