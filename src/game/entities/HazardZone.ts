import Phaser from 'phaser';

export class HazardZone extends Phaser.GameObjects.Sprite {
  public isArmed: boolean = false;
  private lifetimeMs: number = 11000;
  private spawnTime: number = 0;
  private lastDamageTime: number = 0;
  private warningGraphics!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number = 120, height: number = 80, warningDurationMs: number = 750) {
    super(scene, x, y, 'hazard_zone');

    this.setDisplaySize(width, height);
    this.setAlpha(0.2);
    scene.add.existing(this);

    // Setup warning telegraph
    this.warningGraphics = scene.add.graphics();
    this.warningGraphics.lineStyle(2, 0xFFA500, 0.9);
    this.warningGraphics.strokeRect(x - width / 2, y - height / 2, width, height);

    // Warning telegraph gives the player time to escape before damage begins.
    scene.tweens.add({
      targets: this.warningGraphics,
      alpha: 0.2,
      duration: warningDurationMs / 5,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.armZone();
      },
    });

    this.spawnTime = scene.time.now;
  }

  private armZone() {
    if (!this.active || !this.scene) return;
    this.isArmed = true;
    this.setAlpha(0.85);
    if (this.warningGraphics) {
      this.warningGraphics.destroy();
    }

    // Armed border
    const border = this.scene.add.graphics();
    border.lineStyle(2, 0xFF3B5C, 0.9);
    border.strokeRect(this.x - this.displayWidth / 2, this.y - this.displayHeight / 2, this.displayWidth, this.displayHeight);

    // Fade out near end of life
    const scene = this.scene;
    scene.time.delayedCall(this.lifetimeMs - 2000, () => {
      // The game can clear zones during the boss transition before this timer fires.
      if (!this.active || !scene.sys.isActive()) {
        border.destroy();
        return;
      }
      scene.tweens.add({
        targets: [this, border],
        alpha: 0,
        duration: 2000,
        onComplete: () => {
          border.destroy();
          this.destroy();
        },
      });
    });
  }

  checkPlayerCollision(player: Phaser.GameObjects.Components.Transform & { x: number; y: number }, onDamage: () => void) {
    if (!this.isArmed || !this.active) return;

    const bounds = this.getBounds();
    if (bounds.contains(player.x, player.y)) {
      const now = this.scene.time.now;
      if (now - this.lastDamageTime >= 800) {
        this.lastDamageTime = now;
        onDamage();
      }
    }
  }

  destroy(fromScene?: boolean) {
    if (this.warningGraphics && this.warningGraphics.active) {
      this.warningGraphics.destroy();
    }
    super.destroy(fromScene);
  }
}

