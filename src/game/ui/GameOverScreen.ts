import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../utils/constants';

export interface GameOverStats {
  score: number;
  enemiesKilled: number;
  dataCollected: number;
}

export class GameOverScreen {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private keyR?: Phaser.Input.Keyboard.Key;
  private keySpace?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(stats: GameOverStats) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Background Dimmer
    const bg = this.scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x080914, 0.85);

    // Glitch / Alert box
    const boxW = 520;
    const boxH = 340;
    const boxBg = this.scene.add.rectangle(cx, cy, boxW, boxH, 0x10152A, 0.95);
    const boxBorder = this.scene.add.graphics();
    boxBorder.lineStyle(2, COLORS.redWarning, 0.9);
    boxBorder.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

    // Title
    const title = this.scene.add.text(cx, cy - 120, 'SYSTEM FAILURE', {
      fontFamily: 'Space Grotesk, sans-serif',
      fontSize: '32px',
      color: '#FF3B5C',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.scene.add.text(cx, cy - 80, 'MILLENNIUM TRANSITION ABORTED // CRITICAL MEMORY CORRUPTION', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#9299A8',
    }).setOrigin(0.5);

    // Stats
    const formattedScore = stats.score.toString().padStart(6, '0');
    const statsText = this.scene.add.text(cx, cy - 10, [
      `FINAL SCORE: ${formattedScore}`,
      `ENTITIES PURGED: ${stats.enemiesKilled}`,
      `DATA PACKETS SALVAGED: ${stats.dataCollected}`,
    ].join('\n\n'), {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '14px',
      color: '#F3F4F6',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Restart Button
    const btnW = 240;
    const btnH = 42;
    const btnY = cy + 105;
    const btnBg = this.scene.add.rectangle(cx, btnY, btnW, btnH, 0x171D2B)
      .setInteractive({ useHandCursor: true });
    
    const btnBorder = this.scene.add.graphics();
    btnBorder.lineStyle(1, COLORS.blueElectric, 0.8);
    btnBorder.strokeRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);

    const btnText = this.scene.add.text(cx, btnY, 'REBOOT SYSTEM [ R ]', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px',
      color: '#00D9FF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hover effects
    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x252e42);
      btnText.setColor('#FFFFFF');
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x171D2B);
      btnText.setColor('#00D9FF');
    });

    const triggerRestart = () => {
      this.cleanup();
      this.scene.scene.restart();
    };

    btnBg.on('pointerdown', triggerRestart);

    if (this.scene.input.keyboard) {
      this.keyR = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      this.keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyR.once('down', triggerRestart);
      this.keySpace.once('down', triggerRestart);
    }

    this.container = this.scene.add.container(0, 0, [
      bg,
      boxBg,
      boxBorder,
      title,
      subtitle,
      statsText,
      btnBg,
      btnBorder,
      btnText,
    ]).setDepth(200);

    // Animate box entrance
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }

  private cleanup() {
    if (this.keyR) {
      this.keyR.removeAllListeners();
    }
    if (this.keySpace) {
      this.keySpace.removeAllListeners();
    }
    if (this.container) {
      this.container.destroy();
    }
  }
}

