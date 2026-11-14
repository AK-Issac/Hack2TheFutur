import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../utils/constants';
import { audioSystem } from '../systems/AudioSystem';

export class PauseMenu {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  public isPaused: boolean = false;
  private onResumeCallback?: () => void;
  private onRestartCallback?: () => void;

  constructor(scene: Phaser.Scene, onResume?: () => void, onRestart?: () => void) {
    this.scene = scene;
    this.onResumeCallback = onResume;
    this.onRestartCallback = onRestart;
    this.createUI();
  }

  private createUI() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x080914, 0.85);

    const boxW = 460;
    const boxH = 360;
    const boxBg = this.scene.add.rectangle(cx, cy, boxW, boxH, 0x10152A, 0.95);
    const boxBorder = this.scene.add.graphics();
    boxBorder.lineStyle(2, COLORS.blueElectric, 0.85);
    boxBorder.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

    const title = this.scene.add.text(cx, cy - 125, 'SYSTEM PAUSED', {
      fontFamily: 'Space Grotesk, sans-serif',
      fontSize: '28px',
      color: '#00D9FF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.scene.add.text(cx, cy - 90, 'PRESS ESC TO RESUME SIMULATION', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#9299A8',
    }).setOrigin(0.5);

    // Button 1: Resume
    const btnResume = this.createButton(cx, cy - 35, 'RESUME [ ESC ]', () => {
      this.toggle();
      if (this.onResumeCallback) this.onResumeCallback();
    });

    // Button 2: Audio Toggle
    const btnAudio = this.createButton(cx, cy + 20, 'TOGGLE AUDIO', () => {
      const muted = audioSystem.toggleMute();
      btnAudio.text.setText(muted ? 'AUDIO: MUTED 🔇' : 'AUDIO: ON 🔊');
    });

    // Button 3: Restart
    const btnRestart = this.createButton(cx, cy + 75, 'REBOOT SYSTEM [ R ]', () => {
      this.toggle();
      if (this.onRestartCallback) this.onRestartCallback();
    });

    // Controls footer
    const footer = this.scene.add.text(cx, cy + 140, 'WASD: MOVE | MOUSE: AIM & SHOOT | SPACE: FREEZE (-5s)', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      color: '#A78BFA',
    }).setOrigin(0.5);

    this.container = this.scene.add.container(0, 0, [
      bg,
      boxBg,
      boxBorder,
      title,
      subtitle,
      btnResume.container,
      btnAudio.container,
      btnRestart.container,
      footer,
    ]).setDepth(300);

    this.container.setVisible(false);
  }

  private createButton(x: number, y: number, label: string, onClick: () => void) {
    const w = 260;
    const h = 38;

    const bg = this.scene.add.rectangle(0, 0, w, h, 0x171D2B)
      .setInteractive({ useHandCursor: true });
    
    const border = this.scene.add.graphics();
    border.lineStyle(1, 0x00D9FF, 0.6);
    border.strokeRect(-w / 2, -h / 2, w, h);

    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      color: '#00D9FF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x252e42);
      text.setColor('#FFFFFF');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x171D2B);
      text.setColor('#00D9FF');
    });
    bg.on('pointerdown', onClick);

    const container = this.scene.add.container(x, y, [bg, border, text]);
    return { container, text };
  }

  public toggle(): boolean {
    this.isPaused = !this.isPaused;
    this.container.setVisible(this.isPaused);
    return this.isPaused;
  }

  public destroy() {
    this.container.destroy();
  }
}

