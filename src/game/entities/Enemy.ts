import Phaser from 'phaser';
import { ENEMY_CONFIG, ARENA_BOUNDS } from '../utils/constants';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public maxHealth: number;
  public health: number;
  public speed: number;
  public damage: number;
  public scoreValue: number;
  public isFrozen: boolean = false;
  private isDying: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, isFast: boolean = false) {
    super(scene, x, y, 'enemy_basic');

    const config = isFast ? ENEMY_CONFIG.fast : ENEMY_CONFIG.basic;
    this.maxHealth = config.health;
    this.health = config.health;
    this.speed = config.speed;
    this.damage = config.damage;
    this.scoreValue = config.scoreValue;

    this.setScale(isFast ? 0.62 : 0.68);
    this.setTintFill(isFast ? 0xB9783E : 0x8B8171);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Match the visible zombie silhouette more generously than the original icon bounds.
    body.setCircle(16, 8, 8);
  }

  restoreAppearance() {
    this.setTintFill(this.speed === ENEMY_CONFIG.fast.speed ? 0xB9783E : 0x8B8171);
  }

  update(playerX: number, playerY: number) {
    if (this.isDying || !this.active) return;

    if (this.isFrozen) {
      this.setVelocity(0, 0);
      return;
    }

    // Move toward player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    // The zombie icon faces down by default, so align that direction with its chase angle.
    this.setRotation(angle - Math.PI / 2);

    const vx = Math.cos(angle) * this.speed;
    const vy = Math.sin(angle) * this.speed;
    this.setVelocity(vx, vy);
  }

  takeDamage(amount: number): boolean {
    if (this.isDying) return false;

    this.health -= amount;

    // Visual hit flash
    this.setTintFill(0xFFFFFF);
    this.scene.time.delayedCall(60, () => {
      if (!this.active) return;
      if (this.isFrozen) this.setTint(0x00D9FF);
      else this.restoreAppearance();
    });

    // Small impact particle
    const emitter = this.scene.add.particles(this.x, this.y, 'particle_enemy', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 140,
      quantity: 3,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    emitter.explode(3);
    this.scene.time.delayedCall(160, () => emitter.destroy());

    if (this.health <= 0) {
      this.die();
      return true; // Enemy killed
    }
    return false;
  }

  private die() {
    if (this.isDying) return;
    this.isDying = true;
    this.setActive(false);

    // Death explosion
    const emitter = this.scene.add.particles(this.x, this.y, 'particle_enemy', {
      speed: { min: 60, max: 180 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 280,
      quantity: 12,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0xFF3B5C,
      emitting: false,
    });
    emitter.explode(12);
    this.scene.time.delayedCall(300, () => emitter.destroy());

    // Notify scene to drop collectible and award score
    this.scene.events.emit('enemy-destroyed', {
      x: this.x,
      y: this.y,
      score: this.scoreValue,
    });

    this.destroy();
  }
}

