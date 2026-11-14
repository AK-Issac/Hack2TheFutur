import Phaser from 'phaser';
import { PLAYER_CONFIG, ARENA_BOUNDS } from '../utils/constants';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public maxHealth: number = PLAYER_CONFIG.maxHealth;
  public health: number = PLAYER_CONFIG.health;
  public isInvulnerable: boolean = false;
  public isDead: boolean = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private moveSpeed: number = PLAYER_CONFIG.speed;
  private thrusterEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastFiredTime: number = 0;
  private weaponSprite!: Phaser.GameObjects.Image;
  private badlanderShots = 0;
  private wasFireHeld = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    this.setScale(0.55);
    this.setTint(0x00D9FF);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.weaponSprite = scene.add.image(x, y, 'weapon_psm').setOrigin(0.12, 0.5).setScale(0.42).setDepth(this.depth + 1);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(10, 6, 6);
    body.setCollideWorldBounds(false);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    this.createThrusters();
  }

  private createThrusters() {
    this.thrusterEmitter = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 20, max: 50 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 180,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0x00D9FF,
      follow: this,
      followOffset: { x: -10, y: 0 },
      frequency: 40,
    });
  }

  update(time: number) {
    if (this.isDead) return;

    this.handleMovement();
    this.handleRotation();
    this.constrainToArena();
    this.handleShooting(time);
  }

  private handleMovement() {
    let dx = 0;
    let dy = 0;

    const left = this.cursors?.left?.isDown || this.wasdKeys?.A?.isDown;
    const right = this.cursors?.right?.isDown || this.wasdKeys?.D?.isDown;
    const up = this.cursors?.up?.isDown || this.wasdKeys?.W?.isDown;
    const down = this.cursors?.down?.isDown || this.wasdKeys?.S?.isDown;

    if (left) dx -= 1;
    if (right) dx += 1;
    if (up) dy -= 1;
    if (down) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const factor = Math.SQRT1_2;
      this.setVelocity(dx * this.moveSpeed * factor, dy * this.moveSpeed * factor);
    } else {
      this.setVelocity(dx * this.moveSpeed, dy * this.moveSpeed);
    }

    const isMoving = dx !== 0 || dy !== 0;
    if (this.thrusterEmitter) {
      if (isMoving && !this.thrusterEmitter.emitting) {
        this.thrusterEmitter.start();
      } else if (!isMoving && this.thrusterEmitter.emitting) {
        this.thrusterEmitter.stop();
      }
    }
  }

  private handleRotation() {
    const pointer = this.scene.input.activePointer;
    if (pointer) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.x, pointer.y);
      // The character icon's face points up in its source art; aim angle 0 is right.
      this.setRotation(angle + Math.PI / 2);
      const weaponDistance = 7;
      this.weaponSprite
        .setPosition(this.x + Math.cos(angle) * weaponDistance, this.y + Math.sin(angle) * weaponDistance)
        .setRotation(angle);

      if (this.thrusterEmitter) {
        const offsetDist = 12;
        const oppAngle = angle + Math.PI;
        this.thrusterEmitter.followOffset.x = Math.cos(oppAngle) * offsetDist;
        this.thrusterEmitter.followOffset.y = Math.sin(oppAngle) * offsetDist;
      }
    }
  }

  private handleShooting(time: number) {
    const pointer = this.scene.input.activePointer;
    const firing = !!pointer && pointer.isDown && pointer.leftButtonDown();
    const usingBadlander = this.badlanderShots !== 0;
    const canFire = usingBadlander ? firing && !this.wasFireHeld : firing;
    if (canFire) {
      if (time - this.lastFiredTime >= PLAYER_CONFIG.fireRateMs) {
        this.lastFiredTime = time;
        this.fireProjectile(pointer.x, pointer.y);
      }
    }
    this.wasFireHeld = firing;
  }

  private fireProjectile(targetX: number, targetY: number) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    // Offset spawn position slightly forward along barrel
    const spawnX = this.x + Math.cos(angle) * 16;
    const spawnY = this.y + Math.sin(angle) * 16;

    if (this.badlanderShots !== 0) {
      // One trigger pull spends one shell and fires four spread projectiles.
      for (const spread of [-0.22, -0.073, 0.073, 0.22]) {
        this.scene.events.emit('player-fired', { x: spawnX, y: spawnY, angle: angle + spread, oneShotRegularEnemy: true });
      }
      if (this.badlanderShots > 0) {
        this.badlanderShots--;
        if (this.badlanderShots === 0) this.setWeapon('weapon_psm');
        else this.showWeaponStatus();
      }
      return;
    }

    this.scene.events.emit('player-fired', { x: spawnX, y: spawnY, angle });
  }

  equipBadlander() {
    this.badlanderShots = 7;
    this.setWeapon('weapon_badlander');
    this.showWeaponStatus();
  }

  equipBossShotgun() {
    // -1 represents the dedicated, unlimited boss-fight loadout.
    this.badlanderShots = -1;
    this.setWeapon('weapon_badlander');
    const label = this.scene.add.text(this.x, this.y - 30, 'BOSS LOADOUT // BADLANDER', {
      fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#f0c08a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scene.tweens.add({ targets: label, y: label.y - 14, alpha: 0, duration: 1100, onComplete: () => label.destroy() });
  }

  private setWeapon(texture: string) {
    this.weaponSprite.setTexture(texture);
    this.weaponSprite.setScale(texture === 'weapon_badlander' ? 0.42 : 0.42);
  }

  private showWeaponStatus() {
    const label = this.scene.add.text(this.x, this.y - 30, `BADLANDER // ${this.badlanderShots} SHOTS`, {
      fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#f0c08a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scene.tweens.add({ targets: label, y: label.y - 14, alpha: 0, duration: 900, onComplete: () => label.destroy() });
  }

  takeDamage(amount: number): boolean {
    if (this.isInvulnerable || this.isDead) return false;

    this.health = Math.max(0, this.health - amount);
    this.isInvulnerable = true;

    // Red damage flash & invulnerability blink
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.setAlpha(1);
        this.isInvulnerable = false;
      },
    });

    this.scene.events.emit('player-damaged', {
      health: this.health,
      maxHealth: this.maxHealth,
    });

    if (this.health <= 0) {
      this.die();
      return true;
    }

    return false;
  }

  private die() {
    if (this.isDead) return;
    this.isDead = true;
    this.setVelocity(0, 0);
    this.setVisible(false);

    if (this.thrusterEmitter) {
      this.thrusterEmitter.stop();
    }
    this.weaponSprite?.setVisible(false);

    // Death explosion
    const emitter = this.scene.add.particles(this.x, this.y, 'particle', {
      speed: { min: 80, max: 240 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 24,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0x00D9FF,
      emitting: false,
    });
    emitter.explode(24);
    this.scene.time.delayedCall(450, () => emitter.destroy());

    this.scene.events.emit('player-died');
  }

  private constrainToArena() {
    const minX = ARENA_BOUNDS.x + 16;
    const maxX = ARENA_BOUNDS.x + ARENA_BOUNDS.width - 16;
    const minY = ARENA_BOUNDS.y + 16;
    const maxY = ARENA_BOUNDS.y + ARENA_BOUNDS.height - 16;

    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;
    if (this.y < minY) this.y = minY;
    if (this.y > maxY) this.y = maxY;
  }
}
