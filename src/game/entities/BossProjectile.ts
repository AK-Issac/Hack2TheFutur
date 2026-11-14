import Phaser from 'phaser';
import { ARENA_BOUNDS } from '../utils/constants';

export class BossProjectile extends Phaser.Physics.Arcade.Sprite {
  public damage: number = 20;
  private spawnTime: number = 0;
  private lifetimeMs: number = 4500;
  public isFrozen: boolean = false;
  private savedVelocity: { x: number; y: number } = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'projectile_boss');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(6, 2, 2);
  }

  fire(x: number, y: number, angle: number, speed: number = 260) {
    this.setPosition(x, y);
    this.setRotation(angle);
    this.setActive(true);
    this.setVisible(true);
    this.spawnTime = this.scene.time.now;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    this.setVelocity(vx, vy);
    this.savedVelocity = { x: vx, y: vy };
  }

  setFreeze(frozen: boolean) {
    this.isFrozen = frozen;
    if (frozen) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.savedVelocity = { x: body.velocity.x, y: body.velocity.y };
      this.setVelocity(0, 0);
      this.setTint(0x00D9FF);
    } else {
      this.setVelocity(this.savedVelocity.x, this.savedVelocity.y);
      this.clearTint();
    }
  }

  update(time: number) {
    if (!this.active) return;

    if (this.isFrozen) return;

    if (time - this.spawnTime > this.lifetimeMs) {
      this.destroyWithSparks();
      return;
    }

    if (
      this.x < ARENA_BOUNDS.x - 30 ||
      this.x > ARENA_BOUNDS.x + ARENA_BOUNDS.width + 30 ||
      this.y < ARENA_BOUNDS.y - 30 ||
      this.y > ARENA_BOUNDS.y + ARENA_BOUNDS.height + 30
    ) {
      this.destroyWithSparks();
    }
  }

  destroyWithSparks() {
    const emitter = this.scene.add.particles(this.x, this.y, 'particle_enemy', {
      speed: { min: 30, max: 80 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 120,
      quantity: 4,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    emitter.explode(4);
    this.scene.time.delayedCall(150, () => emitter.destroy());
    this.destroy();
  }
}

