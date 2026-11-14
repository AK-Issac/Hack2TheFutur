import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Boss } from '../entities/Boss';
import { BossProjectile } from '../entities/BossProjectile';
import { Collectible } from '../entities/Collectible';
import { HazardZone } from '../entities/HazardZone';
import { HUD } from '../ui/HUD';
import { GameOverScreen } from '../ui/GameOverScreen';
import { VictoryScreen } from '../ui/VictoryScreen';
import { PauseMenu } from '../ui/PauseMenu';
import { CountdownSystem, CountdownPhase, PhaseInfo } from '../systems/CountdownSystem';
import { audioSystem } from '../systems/AudioSystem';
import { ARENA_BOUNDS, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';

export class GameScene extends Phaser.Scene {
  public player!: Player;
  private gridBackground!: Phaser.GameObjects.TileSprite;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private arenaBorderGraphics!: Phaser.GameObjects.Graphics;
  private hud!: HUD;
  private gameOverScreen!: GameOverScreen;
  private victoryScreen!: VictoryScreen;
  private pauseMenu!: PauseMenu;
  private countdownSystem!: CountdownSystem;

  // Boss
  private boss?: Boss;
  private bossProjectiles!: Phaser.Physics.Arcade.Group;
  private isBossEncounter: boolean = false;

  // Physics Groups
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private hazardZones: HazardZone[] = [];

  // Spawners & Timers
  private enemySpawnTimer?: Phaser.Time.TimerEvent;
  private timeItemSpawnTimer?: Phaser.Time.TimerEvent;
  private hazardSpawnTimer?: Phaser.Time.TimerEvent;
  private currentSpawnIntervalMs: number = 950;
  private currentHazardIntervalMs: number = 4200;

  // Keyboard controls
  private spaceKey?: Phaser.Input.Keyboard.Key;

  // Score & Gameplay Stats
  private score: number = 0;
  private enemiesKilled: number = 0;
  private dataCollected: number = 0;
  private isGameOver: boolean = false;
  private isTransitioning: boolean = false;
  private transitionProceeded: boolean = false;
  private transitionPromptReady: boolean = false;
  private transitionObjects: Phaser.GameObjects.GameObject[] = [];
  private gameplayStarted: boolean = false;
  private waitingForStart: boolean = true;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Reset state
    this.score = 0;
    this.enemiesKilled = 0;
    this.dataCollected = 0;
    this.isGameOver = false;
    this.isTransitioning = false;
    this.isBossEncounter = false;
    this.transitionPromptReady = false;
    this.boss = undefined;
    this.hazardZones = [];
    this.currentSpawnIntervalMs = 950;
    this.currentHazardIntervalMs = 4200;
    this.gameplayStarted = false;

    // Check if title screen already dismissed (e.g. on restart)
    this.waitingForStart = !(window as any).__MILLENNIUM_STARTED;

    // Create Arena
    this.createArena();

    // Create Physics Groups
    this.projectiles = this.physics.add.group({
      classType: Projectile,
      runChildUpdate: true,
      maxSize: 60,
    });

    this.enemies = this.physics.add.group({
      classType: Enemy,
      runChildUpdate: false,
    });

    this.bossProjectiles = this.physics.add.group({
      classType: BossProjectile,
      runChildUpdate: true,
      maxSize: 80,
    });

    this.collectibles = this.physics.add.group({
      classType: Collectible,
      runChildUpdate: false,
    });

    // Create Player
    this.createPlayer();

    // Initialize Countdown System & UI
    this.countdownSystem = new CountdownSystem(this);
    this.hud = new HUD(this);
    this.gameOverScreen = new GameOverScreen(this);
    this.victoryScreen = new VictoryScreen(this);
    this.pauseMenu = new PauseMenu(
      this,
      () => {
        this.physics.resume();
        this.countdownSystem.resume();
      },
      () => {
        this.scene.restart();
      }
    );

    // Collisions
    this.setupCollisions();

    // Events
    this.setupEvents();

    // Keyboard Controls
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.spaceKey.on('down', () => {
        if (!this.gameplayStarted) return;
        if (this.isTransitioning) {
          this.advanceToBossFight();
          return;
        }
        if (!this.isGameOver && !this.pauseMenu.isPaused) {
          this.triggerTemporalFreeze();
        }
      });

      // ENTER key to advance past transition
      const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      enterKey.on('down', () => {
        if (this.isTransitioning) {
          this.advanceToBossFight();
        }
      });

      // Debug test key 'T' (jumps directly to 0:00 transition)
      const testKeyT = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
      testKeyT.on('down', () => {
        if (!this.isGameOver && !this.isTransitioning && !this.isBossEncounter) {
          this.triggerMillenniumTransition();
        }
      });

      // ESC key to Pause / Resume
      const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      escKey.on('down', () => {
        if (!this.isGameOver && !this.isTransitioning && this.gameplayStarted) {
          const paused = this.pauseMenu.toggle();
          if (paused) {
            this.physics.pause();
            this.countdownSystem.pause();
          } else {
            this.physics.resume();
            this.countdownSystem.resume();
          }
        }
      });

      // Global click handler to advance transition
      this.input.on('pointerdown', () => {
        if (this.isTransitioning) {
          this.advanceToBossFight();
        }
      });
    }

    // If restart, begin immediately; otherwise wait for title screen button
    if (!this.waitingForStart) {
      this.beginGameplay();
    }
  }

  private beginGameplay() {
    if (this.gameplayStarted) return;
    this.gameplayStarted = true;
    this.waitingForStart = false;

    // Audio init & start
    audioSystem.init();
    audioSystem.startMusic(false);

    // Start spawners
    this.startSpawners();
  }

  private createArena() {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'city_map').setDepth(-10);
    this.obstacles = this.physics.add.staticGroup();
    const blocks = [
      [160, 360, 58, 112], [840, 485, 76, 120],
      [436, 273, 70, 100], [583, 145, 88, 70],
      [110, 44, 14, 46], [110, 290, 14, 48], [110, 548, 14, 48],
      [335, 770, 14, 50], [575, 770, 14, 50], [862, 770, 14, 50],
    ];
    for (const [x, y, width, height] of blocks) {
      const blocker = this.add.rectangle(x, y, width, height, 0x000000, 0).setDepth(1);
      this.physics.add.existing(blocker, true);
      this.obstacles.add(blocker);
    }

    this.arenaBorderGraphics = this.add.graphics();
    this.renderArenaBorders(COLORS.blueElectric);

    const cx = ARENA_BOUNDS.x + ARENA_BOUNDS.width / 2;
    const cy = ARENA_BOUNDS.y + ARENA_BOUNDS.height / 2;
    const radar = this.add.graphics();
    radar.lineStyle(1, 0x171D2B, 0.6);
    radar.strokeCircle(cx, cy, 70);
    radar.strokeCircle(cx, cy, 140);
  }

  private renderArenaBorders(color: number) {
    this.arenaBorderGraphics.clear();

    this.arenaBorderGraphics.lineStyle(4, 0x10152A, 0.8);
    this.arenaBorderGraphics.strokeRect(ARENA_BOUNDS.x - 2, ARENA_BOUNDS.y - 2, ARENA_BOUNDS.width + 4, ARENA_BOUNDS.height + 4);

    this.arenaBorderGraphics.lineStyle(2, color, 0.9);
    this.arenaBorderGraphics.strokeRect(ARENA_BOUNDS.x, ARENA_BOUNDS.y, ARENA_BOUNDS.width, ARENA_BOUNDS.height);

    const bracketLen = 24;
    this.arenaBorderGraphics.lineStyle(3, COLORS.purpleNeon, 1);

    const rx = ARENA_BOUNDS.x + ARENA_BOUNDS.width;
    const by = ARENA_BOUNDS.y + ARENA_BOUNDS.height;

    // Top-Left
    this.arenaBorderGraphics.strokeLineShape(new Phaser.Geom.Line(ARENA_BOUNDS.x - 4, ARENA_BOUNDS.y - 4, ARENA_BOUNDS.x + bracketLen, ARENA_BOUNDS.y - 4));
    this.arenaBorderGraphics.strokeLineShape(new Phaser.Geom.Line(ARENA_BOUNDS.x - 4, ARENA_BOUNDS.y - 4, ARENA_BOUNDS.x - 4, ARENA_BOUNDS.y + bracketLen));

    // Top-Right
    this.arenaBorderGraphics.strokeLineShape(new Phaser.Geom.Line(rx + 4, ARENA_BOUNDS.y - 4, rx - bracketLen, ARENA_BOUNDS.y - 4));
    this.arenaBorderGraphics.strokeLineShape(new Phaser.Geom.Line(rx + 4, ARENA_BOUNDS.y - 4, rx + 4, ARENA_BOUNDS.y + bracketLen));

    // Bottom-Left
    this.arenaBorderGraphics.strokeLineShape(new Phaser.Geom.Line(ARENA_BOUNDS.x - 4, by + 4, ARENA_BOUNDS.x + bracketLen, by + 4));
    this.arenaBorderGraphics.strokeLineShape(new Phaser.Geom.Line(ARENA_BOUNDS.x - 4, by + 4, ARENA_BOUNDS.x - 4, by - bracketLen));

    // Bottom-Right
    this.arenaBorderGraphics.strokeLineShape(new Phaser.Geom.Line(rx + 4, by + 4, rx - bracketLen, by + 4));
    this.arenaBorderGraphics.strokeLineShape(new Phaser.Geom.Line(rx + 4, by + 4, rx + 4, by - bracketLen));
  }

  private createPlayer() {
    const cx = ARENA_BOUNDS.x + ARENA_BOUNDS.width / 2;
    const cy = ARENA_BOUNDS.y + ARENA_BOUNDS.height / 2;
    this.player = new Player(this, cx, cy);
  }

  private setupCollisions() {
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
    // Player Projectiles vs Regular Enemies
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      (projObj, enemyObj) => {
        const projectile = projObj as Projectile;
        const enemy = enemyObj as Enemy;
        if (!projectile.active || !enemy.active) return;

        projectile.destroyWithSparks();
        audioSystem.playHit();
        const killed = enemy.takeDamage(projectile.oneShotRegularEnemy ? enemy.health : projectile.damage);
        if (killed) {
          audioSystem.playExplosion();
          this.enemiesKilled++;
          this.score += enemy.scoreValue;
          this.hud.updateScore(this.score);
          this.hud.updateEnemiesCount(this.enemiesKilled);
        }
      }
    );

    // Boss Projectiles vs Player
    this.physics.add.overlap(
      this.player,
      this.bossProjectiles,
      (_, projObj) => {
        const proj = projObj as BossProjectile;
        if (!proj.active || this.isGameOver || this.player.isInvulnerable) return;

        proj.destroyWithSparks();
        audioSystem.playHit();
        const isDead = this.player.takeDamage(proj.damage);
        this.hud.triggerDamageFlash();
        this.hud.updateHealthBar(this.player.health, this.player.maxHealth);

        if (isDead) {
          this.triggerGameOver();
        }
      }
    );

    // Regular Enemies vs Player
    this.physics.add.overlap(
      this.player,
      this.enemies,
      () => {
        if (this.isGameOver || this.isTransitioning || this.player.isInvulnerable) return;

        audioSystem.playHit();
        const isDead = this.player.takeDamage(15);
        this.hud.triggerDamageFlash();
        this.hud.updateHealthBar(this.player.health, this.player.maxHealth);

        if (isDead) {
          this.triggerGameOver();
        }
      }
    );

    // Player collects Collectibles
    this.physics.add.overlap(
      this.player,
      this.collectibles,
      (_, itemObj) => {
        const item = itemObj as Collectible;
        if (!item.active) return;

        const result = item.collect();
        if (result.type === 'data') {
          audioSystem.playCollectData();
          this.dataCollected++;
          this.score += result.value;
          this.hud.updateScore(this.score);
        } else if (result.type === 'time') {
          audioSystem.playCollectTime();
          this.countdownSystem.addTime(5);
          this.hud.showTimePopup('+5 SECONDS', false);
        } else if (result.type === 'weapon') {
          audioSystem.playCollectData();
          this.player.equipBadlander();
        }
      }
    );

    // Enemy vs Enemy
    this.physics.add.collider(this.enemies, this.enemies);
  }

  private setupEvents() {
    // Player Firing
    this.events.on('player-fired', (data: { x: number; y: number; angle: number; oneShotRegularEnemy?: boolean }) => {
      if (this.isGameOver || this.isTransitioning || !this.gameplayStarted) return;
      audioSystem.playShoot();
      const proj = new Projectile(this, data.x, data.y);
      proj.oneShotRegularEnemy = data.oneShotRegularEnemy ?? false;
      this.projectiles.add(proj);
      proj.fire(data.x, data.y, data.angle);
    });

    // Boss Firing
    this.events.on('boss-fired', (data: { x: number; y: number; angle: number; speed: number }) => {
      if (this.isGameOver || !this.isBossEncounter) return;
      audioSystem.playBossShoot();
      const proj = new BossProjectile(this, data.x, data.y);
      this.bossProjectiles.add(proj);
      proj.fire(data.x, data.y, data.angle, data.speed);
      if (this.countdownSystem.isFrozen()) {
        proj.setFreeze(true);
      }
    });

    // Enemy destroyed -> Drop collectibles
    this.events.on('enemy-destroyed', (data: { x: number; y: number }) => {
      const roll = Math.random();
      if (roll < 0.10) {
        const weaponDrop = new Collectible(this, data.x, data.y, 'weapon');
        this.collectibles.add(weaponDrop);
      } else if (roll < 0.90) {
        const dataItem = new Collectible(this, data.x, data.y, 'data');
        this.collectibles.add(dataItem);
      }
    });

    // Phase Changed
    this.events.on('phase-changed', (phase: PhaseInfo) => {
      audioSystem.playAlert();
      this.hud.showPhaseAlert(phase);

      if (phase.phase === CountdownPhase.CORRUPTION) {
        // Wave 2: more regular enemies and frequent danger zones.
        this.currentSpawnIntervalMs = 720;
        this.currentHazardIntervalMs = 3500;
        this.restartEnemySpawner();
        this.startHazardSpawner();
        this.renderArenaBorders(COLORS.purpleNeon);
      } else if (phase.phase === CountdownPhase.CRITICAL) {
        // Wave 3: fast enemies plus faster, more frequent zones.
        this.currentSpawnIntervalMs = 520;
        this.currentHazardIntervalMs = 2100;
        this.restartEnemySpawner();
        this.startHazardSpawner();
        this.renderArenaBorders(COLORS.redWarning);
      } else if (phase.phase === CountdownPhase.FINAL_WARNING) {
        this.currentSpawnIntervalMs = 440;
        this.currentHazardIntervalMs = 1700;
        this.restartEnemySpawner();
        this.startHazardSpawner();
      }
    });

    // Freeze events
    this.events.on('freeze-started', () => {
      audioSystem.playFreeze();
      this.hud.showTimePopup(this.isBossEncounter ? 'TEMPORAL FREEZE: 3.0s' : 'TIME SACRIFICED: -5s', !this.isBossEncounter);

      this.enemies.getChildren().forEach((child) => {
        const enemy = child as Enemy;
        enemy.isFrozen = true;
        enemy.setTint(0x00D9FF);
      });

      if (this.boss && this.boss.active) {
        this.boss.setFreeze(true);
      }
      this.bossProjectiles.getChildren().forEach((child) => {
        const bp = child as BossProjectile;
        bp.setFreeze(true);
      });

      this.triggerShockwavePulse();
    });

    this.events.on('freeze-ended', () => {
      this.enemies.getChildren().forEach((child) => {
        const enemy = child as Enemy;
        enemy.isFrozen = false;
        enemy.restoreAppearance();
      });

      if (this.boss && this.boss.active) {
        this.boss.setFreeze(false);
      }
      this.bossProjectiles.getChildren().forEach((child) => {
        const bp = child as BossProjectile;
        bp.setFreeze(false);
      });
    });

    // Boss damage updates HUD
    this.events.on('boss-damaged', (data: { health: number; maxHealth: number }) => {
      audioSystem.playHit();
      this.hud.updateBossHealthBar(data.health, data.maxHealth);
    });

    // Boss Defeated
    this.events.once('boss-defeated', () => {
      audioSystem.stopMusic();
      audioSystem.playVictory();
      this.score += 10000;
      this.hud.updateScore(this.score);
      this.hud.hideBossHealthBar();
      this.time.delayedCall(800, () => {
        this.victoryScreen.show({
          score: this.score,
          enemiesKilled: this.enemiesKilled + 1,
          dataCollected: this.dataCollected,
        });
      });
    });

    // Millennium Transition Start (Timer = 0:00)
    this.events.once('millennium-transition-start', () => {
      this.triggerMillenniumTransition();
    });

    // Player Died
    this.events.once('player-died', () => {
      this.triggerGameOver();
    });

    // Scene Shutdown Cleanup
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      audioSystem.stopMusic();
      this.events.off('player-fired');
      this.events.off('boss-fired');
      this.events.off('enemy-destroyed');
      this.events.off('phase-changed');
      this.events.off('freeze-started');
      this.events.off('freeze-ended');
      this.events.off('boss-damaged');
      this.events.off('boss-defeated');
      this.events.off('start-boss-encounter');
      if (this.enemySpawnTimer) this.enemySpawnTimer.destroy();
      if (this.timeItemSpawnTimer) this.timeItemSpawnTimer.destroy();
      if (this.hazardSpawnTimer) this.hazardSpawnTimer.destroy();
      if (this.spaceKey) this.spaceKey.removeAllListeners();
      if (this.input.keyboard) this.input.keyboard.removeAllKeys();
      this.input.removeAllListeners();
    });
  }

  private startSpawners() {
    this.restartEnemySpawner();

  }

  private restartEnemySpawner() {
    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.destroy();
    }
    this.enemySpawnTimer = this.time.addEvent({
      delay: this.currentSpawnIntervalMs,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });
  }

  private startHazardSpawner() {
    if (this.hazardSpawnTimer) this.hazardSpawnTimer.destroy();
    this.hazardSpawnTimer = this.time.addEvent({
      delay: this.currentHazardIntervalMs,
      callback: this.spawnHazardZone,
      callbackScope: this,
      loop: true,
    });
  }

  private spawnEnemy() {
    if (this.isGameOver || this.isTransitioning || this.isBossEncounter || !this.player.active) return;

    const phase = this.countdownSystem.getCurrentPhase().phase;
    const enemiesThisWave = phase >= CountdownPhase.CRITICAL ? 3 : phase >= CountdownPhase.CORRUPTION ? 2 : 2;
    for (let i = 0; i < enemiesThisWave; i++) this.spawnSingleEnemy(phase);
  }

  private spawnSingleEnemy(phase: CountdownPhase) {
    let spawnX = 0;
    let spawnY = 0;
    const edge = Phaser.Math.Between(0, 3);

    switch (edge) {
      case 0:
        spawnX = Phaser.Math.Between(ARENA_BOUNDS.x, ARENA_BOUNDS.x + ARENA_BOUNDS.width);
        spawnY = ARENA_BOUNDS.y + 10;
        break;
      case 1:
        spawnX = ARENA_BOUNDS.x + ARENA_BOUNDS.width - 10;
        spawnY = Phaser.Math.Between(ARENA_BOUNDS.y, ARENA_BOUNDS.y + ARENA_BOUNDS.height);
        break;
      case 2:
        spawnX = Phaser.Math.Between(ARENA_BOUNDS.x, ARENA_BOUNDS.x + ARENA_BOUNDS.width);
        spawnY = ARENA_BOUNDS.y + 10;
        break;
      case 3:
        spawnX = ARENA_BOUNDS.x + 10;
        spawnY = Phaser.Math.Between(ARENA_BOUNDS.y, ARENA_BOUNDS.y + ARENA_BOUNDS.height);
        break;
    }

    const distToPlayer = Phaser.Math.Distance.Between(spawnX, spawnY, this.player.x, this.player.y);
    if (distToPlayer < 180) {
      spawnX = (spawnX < GAME_WIDTH / 2) ? ARENA_BOUNDS.x + 20 : ARENA_BOUNDS.x + ARENA_BOUNDS.width - 20;
    }

    // Wave 1 has only regular enemies. Wave 3 introduces fast enemies.
    const fastChance = phase >= CountdownPhase.CRITICAL ? 0.55 : 0;
    const isFast = Math.random() < fastChance;

    const enemy = new Enemy(this, spawnX, spawnY, isFast);
    if (this.countdownSystem.isFrozen()) {
      enemy.isFrozen = true;
      enemy.setTint(0x00D9FF);
    }
    this.enemies.add(enemy);
  }

  private spawnTimeFragment() {
    if (this.isGameOver || this.isTransitioning || this.isBossEncounter) return;

    const tx = Phaser.Math.Between(ARENA_BOUNDS.x + 60, ARENA_BOUNDS.x + ARENA_BOUNDS.width - 60);
    const ty = Phaser.Math.Between(ARENA_BOUNDS.y + 60, ARENA_BOUNDS.y + ARENA_BOUNDS.height - 60);

    const timeItem = new Collectible(this, tx, ty, 'time');
    this.collectibles.add(timeItem);
  }

  private spawnHazardZone() {
    if (this.isGameOver || this.isTransitioning || this.isBossEncounter) return;

    // Place the warning directly below the player. It gives a short telegraph window
    // before arming, forcing movement without dealing instant damage.
    const phase = this.countdownSystem.getCurrentPhase().phase;
    const warningDuration = phase >= CountdownPhase.CRITICAL ? 420 : 750;
    const zone = new HazardZone(this, this.player.x, this.player.y, 230, 170, warningDuration);
    this.hazardZones.push(zone);
  }

  private triggerTemporalFreeze() {
    const success = this.countdownSystem.activateTemporalFreeze();
    if (!success) {
      const check = this.countdownSystem.canActivateFreeze();
      this.hud.showTimePopup(check.reason || 'FREEZE UNAVAILABLE', true);
    }
  }

  private triggerShockwavePulse() {
    const cx = this.player.x;
    const cy = this.player.y;

    const ring = this.add.graphics();
    ring.setDepth(80);

    let currentRadius = 10;
    const maxRadius = 600;

    const timer = this.time.addEvent({
      delay: 16,
      repeat: 30,
      callback: () => {
        ring.clear();
        currentRadius += (maxRadius - currentRadius) * 0.15;
        const alpha = Math.max(0, 1 - currentRadius / maxRadius);
        ring.lineStyle(3, 0x00D9FF, alpha);
        ring.strokeCircle(cx, cy, currentRadius);

        if (currentRadius >= maxRadius - 10) {
          ring.destroy();
          timer.destroy();
        }
      },
    });

    this.cameras.main.shake(150, 0.006);
  }

  private triggerMillenniumTransition() {
    if (this.isTransitioning || this.isBossEncounter) return;

    // 1. Mark transition active and grant invulnerability
    this.isTransitioning = true;
    this.transitionProceeded = false;
    this.transitionPromptReady = false;
    this.player.isInvulnerable = true;

    // 2. Stop and destroy all standard spawners
    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.destroy();
      this.enemySpawnTimer = undefined;
    }
    if (this.timeItemSpawnTimer) {
      this.timeItemSpawnTimer.destroy();
      this.timeItemSpawnTimer = undefined;
    }
    if (this.hazardSpawnTimer) {
      this.hazardSpawnTimer.destroy();
      this.hazardSpawnTimer = undefined;
    }

    // 3. Clear hazards
    this.hazardZones.forEach(z => z.destroy());
    this.hazardZones = [];

    // 4. Instant clean purge of regular enemies and stray bullets
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);

    // 5. Sound alert
    audioSystem.playAlert();

    // 6. Build the Dramatic Millennium Transition Screen
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x080914, 0.94).setDepth(180);

    const clockText = this.add.text(cx, cy - 80, '12/31/1999 11:59:59 PM', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '24px',
      color: '#FF3B5C',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(181);

    const rebootText = this.add.text(cx, cy - 25, 'SYSTEM REBOOTING...', {
      fontFamily: 'Space Grotesk, sans-serif',
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(181);

    const welcomeText = this.add.text(cx, cy + 30, 'WELCOME TO THE YEAR 2000.', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '20px',
      color: '#A3FF12',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(181);

    const promptText = this.add.text(cx, cy + 85, '>>> PRESS SPACE TO START <<<', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      color: '#00D9FF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(181).setVisible(false);

    // The prompt remains locked for a breathing pause after the timer reaches zero.
    const promptTween = this.tweens.add({
      targets: promptText,
      alpha: 0.3,
      duration: 350,
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    this.transitionObjects = [overlay, clockText, rebootText, welcomeText, promptText];

    // Input is deliberately ignored until the 2.5-second pause completes.
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.advanceToBossFight());

    this.time.delayedCall(2500, () => {
      if (!this.isTransitioning || this.transitionProceeded) return;
      this.transitionPromptReady = true;
      promptText.setVisible(true);
      promptTween.play();
    });
  }

  public advanceToBossFight() {
    if (!this.transitionPromptReady || this.transitionProceeded) return;
    this.transitionProceeded = true;

    // Stop active repeating tweens before fade out
    this.tweens.killTweensOf(this.transitionObjects);

    this.tweens.add({
      targets: this.transitionObjects,
      alpha: 0,
      duration: 350,
      onComplete: () => {
        this.transitionObjects.forEach(obj => {
          if (obj && (obj as any).active) obj.destroy();
        });
        this.transitionObjects = [];

        this.isTransitioning = false;
        this.player.isInvulnerable = false;
        this.startBossFight();
      },
    });
  }

  private startBossFight() {
    this.isBossEncounter = true;
    this.countdownSystem.isBossPhase = true;
    this.player.equipBossShotgun();

    // Switch music to intense Boss theme
    audioSystem.startMusic(true);

    // Reset arena borders to menacing red/purple
    this.renderArenaBorders(COLORS.redWarning);

    // Spawn Boss descending from above
    const cx = GAME_WIDTH / 2;
    this.boss = new Boss(this, cx, -60);

    // Show Boss Health Bar in HUD
    this.hud.showBossHealthBar();

    // Setup collision between projectiles and boss (can hit at any time!)
    this.physics.add.overlap(
      this.projectiles,
      this.boss,
      (obj1: any, obj2: any) => {
        const b = obj1 === this.boss ? (obj1 as Boss) : (obj2 === this.boss ? (obj2 as Boss) : null);
        const proj = obj1 === this.boss ? (obj2 as Projectile) : (obj1 as Projectile);
        if (!b || !b.active || !proj || !proj.active) return;

        proj.destroyWithSparks();
        b.takeDamage(proj.damage);
        this.score += 25;
        this.hud.updateScore(this.score);
      }
    );

    // Alert banner
    this.hud.showPhaseAlert({
      phase: CountdownPhase.MILLENNIUM,
      name: 'FINAL BOSS: Y2K-CORE',
      subName: 'DEFEAT THE MALWARE TO RESTORE SYSTEM 2000',
      integrity: 0,
      color: '#FF3B5C',
    });
  }

  private triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    audioSystem.stopMusic();
    audioSystem.playDefeat();

    if (this.enemySpawnTimer) this.enemySpawnTimer.paused = true;
    if (this.timeItemSpawnTimer) this.timeItemSpawnTimer.paused = true;
    if (this.hazardSpawnTimer) this.hazardSpawnTimer.paused = true;

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Enemy;
      if (enemy.body) enemy.setVelocity(0, 0);
    });

    if (this.boss) {
      this.boss.setVelocity(0, 0);
    }

    this.gameOverScreen.show({
      score: this.score,
      enemiesKilled: this.enemiesKilled,
      dataCollected: this.dataCollected,
    });
  }

  update(time: number, delta: number) {
    if (this.pauseMenu && this.pauseMenu.isPaused) return;

    if (this.gridBackground) {
      this.gridBackground.tilePositionX += 0.08;
      this.gridBackground.tilePositionY += 0.04;
    }

    // Check if player clicked START on the title screen
    if (!this.gameplayStarted) {
      if ((window as any).__MILLENNIUM_STARTED) {
        this.beginGameplay();
      }
      return;
    }

    if (this.isGameOver) return;

    // Update Countdown System (always update freeze and timers)
    if (!this.isTransitioning) {
      this.countdownSystem.update(delta);
    }

    // Update HUD Countdown & Freeze status
    const formattedTime = this.isBossEncounter ? '00:00' : this.countdownSystem.getFormattedTime();
    const phase = this.countdownSystem.getCurrentPhase();
    const timeRemaining = this.countdownSystem.getTimeRemaining();
    this.hud.updateCountdown(formattedTime, phase, timeRemaining);

    const freezeCheck = this.countdownSystem.canActivateFreeze();
    this.hud.updateFreezeStatus(
      this.countdownSystem.isFrozen(),
      this.countdownSystem.getFreezeActiveTimeRemaining(),
      this.countdownSystem.getFreezeCooldownRatio(),
      freezeCheck.canActivate,
      freezeCheck.reason,
      this.isBossEncounter
    );

    // Update Player
    if (this.player && this.player.active) {
      this.player.update(time);

      // Check Hazard Zone collisions (only when not in transition or boss fight)
      if (!this.isTransitioning && !this.isBossEncounter) {
        for (let i = this.hazardZones.length - 1; i >= 0; i--) {
          const zone = this.hazardZones[i];
          if (!zone.active) {
            this.hazardZones.splice(i, 1);
          } else {
            zone.checkPlayerCollision(this.player, () => {
              if (!this.player.isInvulnerable) {
                const dead = this.player.takeDamage(10);
                this.hud.triggerDamageFlash();
                this.hud.updateHealthBar(this.player.health, this.player.maxHealth);
                if (dead) this.triggerGameOver();
              }
            });
          }
        }
      }
    }

    // Update Enemies (only if not transitioning)
    if (!this.isTransitioning) {
      const px = this.player.x;
      const py = this.player.y;
      this.enemies.getChildren().forEach((child) => {
        const enemy = child as Enemy;
        if (enemy.active) {
          enemy.update(px, py);
        }
      });
    }

    // Update Boss
    if (this.boss && this.boss.active) {
      this.boss.update(time, delta);
    }

    // Update Collectibles
    this.collectibles.getChildren().forEach((child) => {
      const item = child as Collectible;
      if (item.active) {
        item.update(this.player.x, this.player.y, time);
      }
    });
  }
}
