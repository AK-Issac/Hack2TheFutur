import Phaser from 'phaser';
import { COLLECTIBLE_CONFIG } from '../utils/constants';

export type CollectibleType = 'data' | 'time' | 'weapon';

export class Collectible extends Phaser.Physics.Arcade.Sprite {
  public type: CollectibleType;
  private spawnTime: number = 0;
  private isCollected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: CollectibleType = 'data') {
    const textureKey = type === 'data' ? 'collectible_data' : type === 'time' ? 'collectible_time' : 'collectible_badlander';
    super(scene, x, y, textureKey);

    this.type = type;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const radius = type === 'data' ? 7 : type === 'time' ? 10 : 16;
    const offset = type === 'data' ? 2 : 2;
    body.setCircle(radius, offset, offset);

    this.spawnTime = scene.time.now;

    // Gentle pulse tween
    scene.tweens.add({
      targets: this,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  update(playerX: number, playerY: number, time: number) {
    if (this.isCollected || !this.active) return;

    // Magnetism toward player
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (dist < COLLECTIBLE_CONFIG.magnetRange) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const speed = COLLECTIBLE_CONFIG.magnetSpeed;
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    } else {
      this.setVelocity(0, 0);
    }

    // Lifetime expiration
    const age = time - this.spawnTime;
    if (age > COLLECTIBLE_CONFIG.lifetimeMs - 3000) {
      // Blink before despawn
      this.setAlpha(Math.sin(time / 80) * 0.4 + 0.6);
    }
    if (age > COLLECTIBLE_CONFIG.lifetimeMs) {
      this.destroy();
    }
  }

  collect(): { type: CollectibleType; value: number } {
    if (this.isCollected) return { type: this.type, value: 0 };
    this.isCollected = true;

    // Floating text feedback
    const label = this.type === 'data' ? `+${COLLECTIBLE_CONFIG.dataValue} DATA` : this.type === 'time' ? '+5s SECONDS' : 'BADLANDER // 7 SHOTS';
    const textColor = this.type === 'data' ? '#A78BFA' : this.type === 'time' ? '#00D9FF' : '#f0c08a';

    const popup = this.scene.add.text(this.x, this.y - 10, label, {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: textColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: popup,
      y: popup.y - 25,
      alpha: 0,
      duration: 650,
      onComplete: () => popup.destroy(),
    });

    // Particle burst
    const emitter = this.scene.add.particles(this.x, this.y, 'particle', {
      speed: { min: 40, max: 100 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 200,
      blendMode: Phaser.BlendModes.ADD,
      tint: this.type === 'data' ? 0xA78BFA : this.type === 'time' ? 0x00D9FF : 0xf0c08a,
      quantity: 6,
      emitting: false,
    });
    emitter.explode(6);
    this.scene.time.delayedCall(250, () => emitter.destroy());

    this.destroy();
    return {
      type: this.type,
      value: this.type === 'data' ? COLLECTIBLE_CONFIG.dataValue : this.type === 'weapon' ? 5 : 5,
    };
  }
}

