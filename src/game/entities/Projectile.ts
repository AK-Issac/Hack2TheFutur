import Phaser from 'phaser';
import { PROJECTILE_CONFIG, ARENA_BOUNDS } from '../utils/constants';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  public damage: number = PROJECTILE_CONFIG.damage;
  /** Badlander pellets instantly destroy standard enemies without changing boss damage. */
  public oneShotRegularEnemy: boolean = false;
  private spawnTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'projectile_player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Wider collision circle so the visual laser reliably connects with a target.
    body.setCircle(7, 2, -3);
  }

  fire(x: number, y: number, angle: number) {
    this.setPosition(x, y);
    this.setRotation(angle);
    this.setActive(true);
    this.setVisible(true);
    this.spawnTime = this.scene.time.now;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);

    const speed = PROJECTILE_CONFIG.speed;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    this.setVelocity(vx, vy);
  }

  update(time: number) {
    if (!this.active) return;

    // Check lifetime
    if (time - this.spawnTime > PROJECTILE_CONFIG.lifespanMs) {
      this.destroyWithSparks();
      return;
    }

    // Check bounds
    if (
      this.x < ARENA_BOUNDS.x - 20 ||
      this.x > ARENA_BOUNDS.x + ARENA_BOUNDS.width + 20 ||
      this.y < ARENA_BOUNDS.y - 20 ||
      this.y > ARENA_BOUNDS.y + ARENA_BOUNDS.height + 20
    ) {
      this.destroyWithSparks();
    }
  }

  destroyWithSparks() {
    // Small cyan impact spark
    const emitter = this.scene.add.particles(this.x, this.y, 'particle', {
      speed: { min: 30, max: 90 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 120,
      quantity: 4,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0x00D9FF,
      emitting: false,
    });
    emitter.explode(4);

    this.scene.time.delayedCall(150, () => emitter.destroy());
    this.destroy();
  }
}

