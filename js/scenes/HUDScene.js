// HUD overlay — coins, controls hint

class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' });
  }

  create() {
    // Coin display
    this.coinIcon = this.add.circle(40, 30, 8, COLORS.COIN, 0.8);
    this.coinText = this.add.text(56, 22, '0', {
      fontSize: '18px',
      fontFamily: 'sans-serif',
      color: '#ffd84f',
      fontStyle: 'bold',
    });

    // HP bar (top-left, below coins)
    const barX = 24, barY = 52, barW = 160, barH = 14;
    this.add.rectangle(barX, barY, barW, barH, 0x000000, 0.35).setOrigin(0, 0);
    this.hpBar = this.add.rectangle(barX + 2, barY + 2, barW - 4, barH - 4, 0xff6a8a, 1).setOrigin(0, 0);
    this.hpBarMaxW = barW - 4;
    this.add.text(barX + barW + 8, barY - 1, 'HP', {
      fontSize: '12px', fontFamily: 'sans-serif', color: '#fff6e8',
    });

    // Controls hint (fades out after a few seconds)
    const isDesktop = this.sys.game.device.os.desktop;
    const hintText = isDesktop
      ? 'Arrow Keys / WASD — Move    Space — Jump    Shift — Sprint    X — Backstep    Z — Shoot'
      : 'Touch controls below';

    this.hint = this.add.text(
      this.cameras.main.centerX, this.cameras.main.height - 30,
      hintText,
      {
        fontSize: '12px',
        fontFamily: 'sans-serif',
        color: '#f0eeff',
        align: 'center',
        alpha: 0.5,
      }
    ).setOrigin(0.5);

    // Fade hint after 5 seconds
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: this.hint,
        alpha: 0,
        duration: 2000,
      });
    });

    // Listen for updates from the game scene
    const level1 = this.scene.get('Level1Scene');

    level1.events.on('playerHpChanged', (hp, maxHp) => {
      const pct = Math.max(0, hp / maxHp);
      this.tweens.add({
        targets: this.hpBar,
        scaleX: pct,
        duration: 180,
        ease: 'Quad.easeOut',
      });
    });

    level1.events.on('coinCollected', (count) => {
      this.coinText.setText(count.toString());

      // Brief scale pop on collect
      if (count > 0) {
        this.tweens.add({
          targets: [this.coinIcon, this.coinText],
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 100,
          yoyo: true,
        });
      }
    });
  }
}
