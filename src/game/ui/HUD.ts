import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../utils/constants';
import { PhaseInfo, PHASE_CONFIG, CountdownPhase } from '../systems/CountdownSystem';

export class HUD {
  private scene: Phaser.Scene;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthBarFill!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private enemiesText!: Phaser.GameObjects.Text;
  private damageFlashOverlay!: Phaser.GameObjects.Rectangle;

  // Countdown & Phase
  private countdownContainer!: Phaser.GameObjects.Container;
  private countdownText!: Phaser.GameObjects.Text;
  private phaseLabelText!: Phaser.GameObjects.Text;
  private phaseSubText!: Phaser.GameObjects.Text;

  // Temporal Freeze Indicator
  private freezeContainer!: Phaser.GameObjects.Container;
  private freezeStatusText!: Phaser.GameObjects.Text;
  private freezeBarBg!: Phaser.GameObjects.Graphics;
  private freezeBarFill!: Phaser.GameObjects.Graphics;

  // System Warning Alert Banner
  private alertBannerContainer!: Phaser.GameObjects.Container;
  private alertBannerText!: Phaser.GameObjects.Text;
  private alertBannerSub!: Phaser.GameObjects.Text;

  // Boss Health Bar
  private bossHealthContainer!: Phaser.GameObjects.Container;
  private bossHealthFill!: Phaser.GameObjects.Graphics;
  private bossHpText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI() {
    // Damage Flash Overlay
    this.damageFlashOverlay = this.scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0xFF3B5C,
      0
    ).setDepth(100).setScrollFactor(0);

    // --- TOP LEFT: HEALTH & INTEGRITY ---
    const hpX = 50;
    const hpY = 16;

    this.scene.add.text(hpX, hpY, 'SYSTEM INTEGRITY', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      color: '#9299A8',
      fontStyle: 'bold',
    }).setDepth(90);

    this.healthBarBg = this.scene.add.graphics().setDepth(90);
    this.healthBarBg.fillStyle(0x171D2B, 0.9);
    this.healthBarBg.fillRect(hpX, hpY + 14, 160, 12);
    this.healthBarBg.lineStyle(1, 0x00D9FF, 0.5);
    this.healthBarBg.strokeRect(hpX, hpY + 14, 160, 12);

    this.healthBarFill = this.scene.add.graphics().setDepth(91);
    this.updateHealthBar(100, 100);

    this.healthText = this.scene.add.text(hpX + 168, hpY + 13, '100%', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#00D9FF',
      fontStyle: 'bold',
    }).setDepth(90);

    // --- TOP CENTER: THE COUNTDOWN TIMER & PHASE ---
    const cx = GAME_WIDTH / 2;
    const cy = 28;

    // Countdown Box Backdrop
    const cdBg = this.scene.add.rectangle(0, 0, 220, 48, 0x10152A, 0.9);
    const cdBorder = this.scene.add.graphics();
    cdBorder.lineStyle(1, COLORS.blueElectric, 0.8);
    cdBorder.strokeRect(-110, -24, 220, 48);

    // Monospace Retro Digital Clock
    this.countdownText = this.scene.add.text(0, -6, '01:30', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '24px',
      color: '#00D9FF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Phase Sub-Label
    this.phaseLabelText = this.scene.add.text(0, 14, 'PHASE 1 // STABLE SYSTEM', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '9px',
      color: '#A78BFA',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.countdownContainer = this.scene.add.container(cx, cy, [
      cdBg,
      cdBorder,
      this.countdownText,
      this.phaseLabelText,
    ]).setDepth(90);

    // --- TOP RIGHT: SCORE & PURGED ---
    const scoreX = GAME_WIDTH - 50;
    this.scoreText = this.scene.add.text(scoreX, hpY, 'SCORE: 000000', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      color: '#00D9FF',
      fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(90);

    this.enemiesText = this.scene.add.text(scoreX, hpY + 16, 'PURGED: 0', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#A78BFA',
      fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(90);

    // --- BOTTOM: TEMPORAL FREEZE STATUS ---
    this.createFreezeHUD();

    // --- SYSTEM ALERT BANNER ---
    this.createAlertBanner();

    // --- BOSS HEALTH BAR ---
    this.createBossHealthUI();
  }

  private createBossHealthUI() {
    const cx = GAME_WIDTH / 2;
    const cy = 68;

    const bg = this.scene.add.rectangle(0, 0, 420, 28, 0x10152A, 0.95);
    const border = this.scene.add.graphics();
    border.lineStyle(1, 0xFF3B5C, 0.9);
    border.strokeRect(-210, -14, 420, 28);

    const title = this.scene.add.text(-200, -9, 'Y2K-CORE // PROTOCOL COLLAPSE', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#FF3B5C',
      fontStyle: 'bold',
    });

    this.bossHpText = this.scene.add.text(200, -9, '1000 / 1000 HP', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#F3F4F6',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.bossHealthFill = this.scene.add.graphics();

    this.bossHealthContainer = this.scene.add.container(cx, cy, [
      bg,
      border,
      this.bossHealthFill,
      title,
      this.bossHpText,
    ]).setDepth(92);

    this.bossHealthContainer.setVisible(false);
  }

  showBossHealthBar() {
    this.bossHealthContainer.setVisible(true);
    this.bossHealthContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.bossHealthContainer,
      alpha: 1,
      duration: 500,
    });
    this.updateBossHealthBar(1000, 1000);
  }

  updateBossHealthBar(health: number, maxHealth: number) {
    this.bossHealthFill.clear();
    const ratio = Math.max(0, Math.min(1, health / maxHealth));
    const width = 416 * ratio;

    // Background track
    this.bossHealthFill.fillStyle(0x25101E, 0.9);
    this.bossHealthFill.fillRect(-208, 3, 416, 9);

    // Glowing fill
    this.bossHealthFill.fillStyle(0xFF3B5C, 0.95);
    this.bossHealthFill.fillRect(-208, 3, width, 9);

    this.bossHpText.setText(`${health} / ${maxHealth} HP`);
  }

  hideBossHealthBar() {
    this.bossHealthContainer.setVisible(false);
  }

  private createFreezeHUD() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT - 32;

    const bg = this.scene.add.rectangle(0, 0, 280, 26, 0x10152A, 0.9);
    const border = this.scene.add.graphics();
    border.lineStyle(1, 0x00D9FF, 0.5);
    border.strokeRect(-140, -13, 280, 26);

    this.freezeBarBg = this.scene.add.graphics();
    this.freezeBarFill = this.scene.add.graphics();

    this.freezeStatusText = this.scene.add.text(0, 0, '[ SPACE ] TEMPORAL FREEZE (-5s)', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#00D9FF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.freezeContainer = this.scene.add.container(cx, cy, [
      bg,
      border,
      this.freezeBarBg,
      this.freezeBarFill,
      this.freezeStatusText,
    ]).setDepth(90);
  }

  private createAlertBanner() {
    const cx = GAME_WIDTH / 2;
    const cy = 95;

    const bannerBg = this.scene.add.rectangle(0, 0, 560, 42, 0x080914, 0.95);
    const bannerBorder = this.scene.add.graphics();
    bannerBorder.lineStyle(2, COLORS.redWarning, 0.9);
    bannerBorder.strokeRect(-280, -21, 560, 42);

    this.alertBannerText = this.scene.add.text(0, -7, 'WARNING: SYSTEM ALERT', {
      fontFamily: 'Space Grotesk, sans-serif',
      fontSize: '14px',
      color: '#FF3B5C',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.alertBannerSub = this.scene.add.text(0, 10, 'SYSTEM INTEGRITY DEGRADATION', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      color: '#C8D2E8',
    }).setOrigin(0.5);

    this.alertBannerContainer = this.scene.add.container(cx, cy, [
      bannerBg,
      bannerBorder,
      this.alertBannerText,
      this.alertBannerSub,
    ]).setDepth(150);

    this.alertBannerContainer.setAlpha(0);
  }

  updateCountdown(timeStr: string, phase: PhaseInfo, timeRemaining: number) {
    this.countdownText.setText(timeStr);
    this.countdownText.setColor(phase.color);
    this.phaseLabelText.setText(phase.name);
    this.phaseLabelText.setColor(phase.color);

    // Pulse red if under 15 seconds
    if (timeRemaining <= 15 && timeRemaining > 0) {
      const pulse = Math.sin(this.scene.time.now / 100) > 0;
      this.countdownText.setColor(pulse ? '#FF3B5C' : '#FFFFFF');
    }
  }

  updateFreezeStatus(isFrozen: boolean, freezeTimeLeft: number, cooldownRatio: number, canActivate: boolean, reason?: string, isBossPhase: boolean = false) {
    this.freezeBarFill.clear();

    if (isFrozen) {
      this.freezeStatusText.setText(`SYSTEM FROZEN: ${freezeTimeLeft.toFixed(1)}s`);
      this.freezeStatusText.setColor('#A3FF12');
      // Green/cyan active pulse
      this.freezeBarFill.fillStyle(0x00D9FF, 0.3);
      this.freezeBarFill.fillRect(-138, -11, 276, 22);
    } else if (cooldownRatio > 0) {
      const remainingSec = (cooldownRatio * 8.0).toFixed(1);
      this.freezeStatusText.setText(`RECHARGING: ${remainingSec}s`);
      this.freezeStatusText.setColor('#9299A8');

      // Cooldown progress bar filling up from left
      const fillW = 276 * (1 - cooldownRatio);
      this.freezeBarFill.fillStyle(0x171D2B, 0.8);
      this.freezeBarFill.fillRect(-138, -11, fillW, 22);
    } else if (!canActivate) {
      this.freezeStatusText.setText(`[ SPACE ] ${reason || 'LOCKED'}`);
      this.freezeStatusText.setColor('#FF3B5C');
    } else {
      const label = isBossPhase ? '[ SPACE ] TEMPORAL FREEZE [ READY ]' : '[ SPACE ] TEMPORAL FREEZE (-5s) [ READY ]';
      this.freezeStatusText.setText(label);
      this.freezeStatusText.setColor('#00D9FF');
    }
  }

  showPhaseAlert(phase: PhaseInfo) {
    this.alertBannerText.setText(phase.name);
    this.alertBannerText.setColor(phase.color);
    this.alertBannerSub.setText(phase.subName);

    // Fade-in, hold, fade-out
    this.alertBannerContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.alertBannerContainer,
      alpha: 1,
      y: 95,
      duration: 250,
      hold: 2400,
      yoyo: true,
      ease: 'Power2',
    });

    // Screen glitch flash
    this.scene.cameras.main.shake(180, 0.008);
  }

  showTimePopup(text: string, isSacrifice: boolean) {
    const cx = GAME_WIDTH / 2;
    const popup = this.scene.add.text(cx, 65, text, {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      color: isSacrifice ? '#FF3B5C' : '#00D9FF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(110);

    this.scene.tweens.add({
      targets: popup,
      y: isSacrifice ? 80 : 50,
      alpha: 0,
      duration: 900,
      onComplete: () => popup.destroy(),
    });
  }

  updateHealthBar(health: number, maxHealth: number) {
    this.healthBarFill.clear();
    const ratio = Math.max(0, Math.min(1, health / maxHealth));
    const width = 156 * ratio;

    let barColor = 0x00D9FF;
    if (ratio < 0.3) {
      barColor = 0xFF3B5C;
    } else if (ratio < 0.6) {
      barColor = 0xA3FF12;
    }

    this.healthBarFill.fillStyle(barColor, 0.9);
    this.healthBarFill.fillRect(52, 32, width, 8);

    if (this.healthText) {
      this.healthText.setText(`${Math.round(ratio * 100)}%`);
      this.healthText.setColor(ratio < 0.3 ? '#FF3B5C' : '#00D9FF');
    }
  }

  triggerDamageFlash() {
    this.damageFlashOverlay.setAlpha(0.35);
    this.scene.tweens.add({
      targets: this.damageFlashOverlay,
      alpha: 0,
      duration: 250,
      ease: 'Power2',
    });
    this.scene.cameras.main.shake(120, 0.005);
  }

  updateScore(score: number) {
    const formatted = score.toString().padStart(6, '0');
    this.scoreText.setText(`SCORE: ${formatted}`);
  }

  updateEnemiesCount(count: number) {
    this.enemiesText.setText(`PURGED: ${count}`);
  }
}
