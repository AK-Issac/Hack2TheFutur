import Phaser from 'phaser';
import { BossProjectile } from './BossProjectile';
import { ARENA_BOUNDS, GAME_WIDTH } from '../utils/constants';

export enum BossState {
  ENTERING,
  COMBAT,
  DYING,
}

export class Boss extends Phaser.Physics.Arcade.Sprite {
  public maxHealth: number = 3000;
  public health: number = 3000;
  public bossState: BossState = BossState.ENTERING;
  public isFrozen: boolean = false;

  private attackTimer?: Phaser.Time.TimerEvent;
  private targetedAttackTimer?: Phaser.Time.TimerEvent;
  private floatAngle: number = 0;
  private targetY: number = 200;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boss_core');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(42, 6, 6);
    body.setImmovable(true);
    body.moves = false;

    this.playEntranceAnimation();
  }

  private playEntranceAnimation() {
    this.scene.tweens.add({
      targets: this,
      y: this.targetY,
      duration: 2200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.bossState = BossState.COMBAT;
        this.startAttackRoutines();
      },
    });

    // Pulse scale while entering
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startAttackRoutines() {
    // Dense radial spread every 1.2s.
    this.attackTimer = this.scene.time.addEvent({
      delay: 1200,
      callback: this.fireRadialSpread,
      callbackScope: this,
      loop: true,
    });

    // Rapid targeted burst every 0.9s.
    this.targetedAttackTimer = this.scene.time.addEvent({
      delay: 900,
      callback: this.fireTargetedBurst,
      callbackScope: this,
      loop: true,
    });
  }

  private fireRadialSpread() {
    if (this.bossState !== BossState.COMBAT || this.isFrozen || !this.active) return;

    const count = 18;
    const baseAngle = this.floatAngle;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i * Math.PI * 2) / count;
      this.scene.events.emit('boss-fired', {
        x: this.x,
        y: this.y,
        angle: angle,
        speed: 280,
      });
    }

    // Boss recoil shake
    this.scene.cameras.main.shake(100, 0.005);
  }

  private fireTargetedBurst() {
    if (this.bossState !== BossState.COMBAT || this.isFrozen || !this.active) return;

    const player = (this.scene as any).player;
    if (!player || !player.active) return;

    // Fire 5 staggered rounds.
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 100, () => {
        if (this.bossState !== BossState.COMBAT || this.isFrozen || !this.active) return;
        const currentAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        // Slight spread deviation
        const spread = (i - 2) * 0.12;
        this.scene.events.emit('boss-fired', {
          x: this.x,
          y: this.y,
          angle: currentAngle + spread,
          speed: 380,
        });
      });
    }
  }

  update(time: number, delta: number) {
    if (this.bossState === BossState.DYING || !this.active) return;

    // Keep physics body position locked to sprite position
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.reset(this.x, this.y);
    }

    // Slow rotation
    this.rotation += this.isFrozen ? 0.002 : 0.01;

    // Smooth floating drift around arena center
    if (this.bossState === BossState.COMBAT && !this.isFrozen) {
      this.floatAngle += 0.045;
      const targetX = GAME_WIDTH / 2 + Math.cos(this.floatAngle * 0.7) * 310;
      const targetY = 210 + Math.sin(this.floatAngle * 1.3) * 110;
      this.x += (targetX - this.x) * 0.09;
      this.y += (targetY - this.y) * 0.09;
    }
  }

  takeDamage(amount: number): boolean {
    if (this.bossState === BossState.DYING || !this.active) return false;

    this.health = Math.max(0, this.health - amount);

    // Hit flash
    this.setTintFill(0xFFFFFF);
    this.scene.time.delayedCall(80, () => {
      if (this.active) {
        if (this.isFrozen) {
          this.setTint(0x00D9FF);
        } else {
          this.clearTint();
        }
      }
    });

    // Small floating damage number
    const dmgText = this.scene.add.text(
      this.x + Phaser.Math.Between(-20, 20),
      this.y - 30 + Phaser.Math.Between(-10, 10),
      `-${amount}`,
      {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        color: '#FF3B5C',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);

    this.scene.tweens.add({
      targets: dmgText,
      y: dmgText.y - 20,
      alpha: 0,
      duration: 450,
      onComplete: () => dmgText.destroy(),
    });

    // Impact sparks
    const emitter = this.scene.add.particles(this.x + Phaser.Math.Between(-25, 25), this.y + Phaser.Math.Between(-25, 25), 'particle_enemy', {
      speed: { min: 40, max: 140 },
      scale: { start: 0.9, end: 0 },
      lifespan: 160,
      quantity: 4,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    emitter.explode(4);
    this.scene.time.delayedCall(180, () => emitter.destroy());

    this.scene.events.emit('boss-damaged', {
      health: this.health,
      maxHealth: this.maxHealth,
    });

    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  setFreeze(frozen: boolean) {
    this.isFrozen = frozen;
    if (frozen) {
      this.setTint(0x00D9FF);
    } else {
      this.clearTint();
    }
  }

  private die() {
    if (this.bossState === BossState.DYING) return;
    this.bossState = BossState.DYING;

    if (this.attackTimer) this.attackTimer.destroy();
    if (this.targetedAttackTimer) this.targetedAttackTimer.destroy();

    // Staggered multi-explosion sequence
    const expCount = 10;
    for (let i = 0; i < expCount; i++) {
      this.scene.time.delayedCall(i * 220, () => {
        const ox = this.x + Phaser.Math.Between(-40, 40);
        const oy = this.y + Phaser.Math.Between(-40, 40);

        const expEmitter = this.scene.add.particles(ox, oy, 'particle_enemy', {
          speed: { min: 80, max: 260 },
          scale: { start: 1.4, end: 0 },
          lifespan: 400,
          quantity: 16,
          blendMode: Phaser.BlendModes.ADD,
          tint: 0xFF3B5C,
          emitting: false,
        });
        expEmitter.explode(16);
        this.scene.time.delayedCall(450, () => expEmitter.destroy());
        this.scene.cameras.main.shake(120, 0.008);
      });
    }

    // Final blast and dispatch event
    this.scene.time.delayedCall(expCount * 220 + 200, () => {
      this.scene.cameras.main.flash(600, 255, 255, 255);
      this.scene.events.emit('boss-defeated');
      this.destroy();
    });
  }

  destroy(fromScene?: boolean) {
    if (this.attackTimer) this.attackTimer.destroy();
    if (this.targetedAttackTimer) this.targetedAttackTimer.destroy();
    super.destroy(fromScene);
  }
}

