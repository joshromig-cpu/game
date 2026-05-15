// Phaser game configuration

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  // Use the Scale Manager: design size is GAME_WIDTH x GAME_HEIGHT, which is
  // letter-boxed into whatever viewport the device has. FIT preserves aspect
  // ratio; CENTER_BOTH keeps the game in the middle of the viewport so the
  // notch / home indicator can't crop gameplay.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    // On orientation change, re-fit immediately.
    expandParent: true,
  },
  backgroundColor: '#0a0a1a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // Gravity set per-body for fine control
      debug: false,
    },
  },
  scene: [BootScene, Level1Scene, Level3BossScene, HUDScene],
  input: {
    activePointers: 3, // Support multi-touch for mobile controls
    // Touch must NOT trigger native scrolling on the canvas. Even though the
    // CSS has touch-action:none, telling Phaser to consume the event helps
    // older iOS Safari versions.
    touch: { capture: true },
  },
  // Tell Phaser to render under the safe-area insets correctly.
  fps: { target: 60, forceSetTimeOut: false },
};

const game = new Phaser.Game(config);
window.game = game; // debug access

// One-time audio unlock — iOS won't start the AudioContext until the
// first user gesture, and Phaser only attempts to resume when sound
// is requested. Hooking at the window level catches the gesture
// regardless of which scene the user happens to be in.
if (window.MobileSupport) MobileSupport.installAudioUnlock(game);

// Manually re-trigger scale refresh on orientation change. Phaser's FIT
// mode handles it via its own resize listener, but Safari sometimes
// doesn't fire that fast enough on the first rotation.
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    if (game && game.scale && game.scale.refresh) game.scale.refresh();
  }, 50);
});
