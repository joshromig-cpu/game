// Phaser game configuration

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
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
  },
};

const game = new Phaser.Game(config);
window.game = game; // debug access

// Ensure Phaser recomputes canvas size and pointer offsets on resize / orientation change
window.addEventListener('resize', () => game.scale.refresh());
window.addEventListener('orientationchange', () => {
  setTimeout(() => game.scale.refresh(), 100);
});
