// On-device debug overlay.
// Tap the top-right corner of the canvas 3 times within 1.5s to toggle.
// Shows scene name, FPS, player x/y, active object count, last error.
//
// Designed to be attached from any scene's create():
//   DebugOverlay.attach(this);

const DebugOverlay = {
  attach(scene) {
    // Don't attach twice if a previous scene already created one in the same
    // Phaser game — the overlay lives on each scene's own UI camera.
    if (scene._debugOverlay) return scene._debugOverlay;

    const overlay = {};
    overlay.taps = [];
    overlay.visible = false;

    const txt = scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#7cffb2',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 },
    });
    txt.setScrollFactor(0).setDepth(99999).setVisible(false);
    overlay.txt = txt;

    // Position the overlay top-left of the camera view, refreshed each frame.
    const placeOverlay = () => {
      const w = scene.scale ? scene.scale.width  : scene.cameras.main.width;
      txt.x = 8;
      txt.y = 8;
      // Stop spurious widget overflow on tiny screens.
      txt.setWordWrapWidth(w - 16);
    };

    // The hit-zone for the 3-tap toggle is the top-right 20% / 15% of the
    // camera. Pinned via scrollFactor so it stays in place when the world
    // scrolls.
    const installZone = () => {
      const w = scene.cameras.main.width;
      const h = scene.cameras.main.height;
      const zone = scene.add.zone(w * 0.85, 0, w * 0.15, h * 0.15)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(99998)
        .setInteractive();
      zone.on('pointerdown', () => {
        const now = scene.time.now;
        overlay.taps.push(now);
        overlay.taps = overlay.taps.filter(t => now - t < 1500);
        if (overlay.taps.length >= 3) {
          overlay.taps = [];
          overlay.visible = !overlay.visible;
          txt.setVisible(overlay.visible);
        }
      });
      overlay.zone = zone;
    };
    installZone();

    scene.events.on('update', () => {
      placeOverlay();
      if (!overlay.visible) return;
      const fps = Math.round(scene.game.loop.actualFps);
      const player = scene.player;
      const px = player && player.sprite ? Math.round(player.sprite.x) : '—';
      const py = player && player.sprite ? Math.round(player.sprite.y) : '—';
      let active = 0;
      if (scene.children && scene.children.list) active = scene.children.list.length;
      const sw = scene.scale ? scene.scale.width  : '?';
      const sh = scene.scale ? scene.scale.height : '?';
      const dpr = window.devicePixelRatio || 1;
      const err = window.__lastError || '';
      txt.setText(
        `scene: ${scene.scene.key}\n` +
        `fps:   ${fps}\n` +
        `player:${px},${py}\n` +
        `active:${active}\n` +
        `scale: ${sw}x${sh}  dpr:${dpr}\n` +
        (err ? `err: ${err.slice(0, 120)}` : '')
      );
    });

    // Clean up when the scene shuts down so we don't leak listeners.
    scene.events.once('shutdown', () => {
      if (overlay.zone && overlay.zone.scene) overlay.zone.destroy();
      if (overlay.txt && overlay.txt.scene)  overlay.txt.destroy();
    });

    scene._debugOverlay = overlay;
    return overlay;
  },
};

window.DebugOverlay = DebugOverlay;
