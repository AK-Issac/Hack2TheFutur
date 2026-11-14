import Phaser from 'phaser';
import playerIconUrl from '../ui/player&enemy/player_icon.svg?url&no-inline';
import enemyIconUrl from '../ui/player&enemy/enemy_icon.svg?url&no-inline';
import psmWorldUrl from '../ui/player&enemy/psm_world.svg?url&no-inline';
import badlanderWorldUrl from '../ui/player&enemy/badlander_world.svg?url&no-inline';
import badlanderDropUrl from '../ui/player&enemy/badlander.svg?url&no-inline';
import cityMapUrl from '../../../public/city-map.png?url&no-inline';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.load.image('city_map', cityMapUrl);
    // Load the user-provided character icons; keep combat textures procedural.
    this.load.svg('player', playerIconUrl, { width: 64, height: 64 });
    this.load.svg('enemy_basic', enemyIconUrl, { width: 48, height: 48 });
    this.load.svg('weapon_psm', psmWorldUrl, { width: 100, height: 29 });
    this.load.svg('weapon_badlander', badlanderWorldUrl, { width: 100, height: 22 });
    this.load.svg('collectible_badlander', badlanderDropUrl, { width: 50, height: 50 });
    this.createProjectileTexture();
    this.createCollectibleTexture();
    this.createTimeCollectibleTexture();
    this.createHazardTexture();
    this.createBossTexture();
    this.createBossProjectileTexture();
    this.createGridTexture();
    this.createParticleTexture();
    this.createEnemyParticleTexture();
  }

  create() {
    // Immediately start the GameScene
    this.scene.start('GameScene');
  }

  private createPlayerTexture() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Outer glow aura
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, 14);
    gradient.addColorStop(0, 'rgba(0, 217, 255, 0.9)');
    gradient.addColorStop(0.6, 'rgba(0, 217, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 217, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 14, 0, Math.PI * 2);
    ctx.fill();

    // Digital Core - diamond shape oriented to the right (angle 0)
    ctx.fillStyle = '#00D9FF';
    ctx.beginPath();
    ctx.moveTo(26, 16);  // Front tip
    ctx.lineTo(10, 8);   // Top wing
    ctx.lineTo(14, 16);  // Center indent
    ctx.lineTo(10, 24);  // Bottom wing
    ctx.closePath();
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(22, 16);
    ctx.lineTo(13, 12);
    ctx.lineTo(15, 16);
    ctx.lineTo(13, 20);
    ctx.closePath();
    ctx.fill();

    // Circuit edge lines
    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 1;
    ctx.stroke();

    this.textures.addCanvas('player', canvas);
  }

  private createEnemyTexture() {
    const size = 28;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Corrupted red/magenta glow aura
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 3, size / 2, size / 2, 13);
    gradient.addColorStop(0, 'rgba(255, 59, 92, 0.9)');
    gradient.addColorStop(0.6, 'rgba(167, 139, 250, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 59, 92, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 13, 0, Math.PI * 2);
    ctx.fill();

    // Jagged corrupted glitch diamond/bug shape
    ctx.fillStyle = '#FF3B5C';
    ctx.beginPath();
    ctx.moveTo(size / 2, 3);
    ctx.lineTo(size - 4, size / 2 - 2);
    ctx.lineTo(size - 2, size / 2 + 3);
    ctx.lineTo(size / 2 + 3, size - 3);
    ctx.lineTo(size / 2, size - 5);
    ctx.lineTo(size / 2 - 3, size - 3);
    ctx.lineTo(2, size / 2 + 3);
    ctx.lineTo(4, size / 2 - 2);
    ctx.closePath();
    ctx.fill();

    // Inner dark corrupted core
    ctx.fillStyle = '#171D2B';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Malicious eye/node
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(size / 2 - 2, size / 2 - 2, 4, 4);

    this.textures.addCanvas('enemy_basic', canvas);
  }

  private createProjectileTexture() {
    const width = 18;
    const height = 8;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, width, height);

    // Outer glow
    ctx.fillStyle = 'rgba(0, 217, 255, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // Laser body
    ctx.fillStyle = '#00D9FF';
    ctx.fillRect(2, 2, width - 4, height - 4);

    // Intense center core
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(4, 3, width - 8, height - 6);

    this.textures.addCanvas('projectile_player', canvas);
  }

  private createCollectibleTexture() {
    const size = 18;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Purple neon glow
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, 8);
    gradient.addColorStop(0, 'rgba(167, 139, 250, 0.9)');
    gradient.addColorStop(1, 'rgba(167, 139, 250, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // Data chip diamond shape
    ctx.fillStyle = '#A78BFA';
    ctx.beginPath();
    ctx.moveTo(size / 2, 3);
    ctx.lineTo(size - 3, size / 2);
    ctx.lineTo(size / 2, size - 3);
    ctx.lineTo(3, size / 2);
    ctx.closePath();
    ctx.fill();

    // Center bright data node
    ctx.fillStyle = '#00D9FF';
    ctx.fillRect(size / 2 - 2, size / 2 - 2, 4, 4);

    this.textures.addCanvas('collectible_data', canvas);
  }

  private createTimeCollectibleTexture() {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Cyan/electric glow aura
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 3, size / 2, size / 2, 11);
    gradient.addColorStop(0, 'rgba(0, 217, 255, 0.95)');
    gradient.addColorStop(0.5, 'rgba(163, 255, 18, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 217, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 11, 0, Math.PI * 2);
    ctx.fill();

    // Outer clock ring
    ctx.strokeStyle = '#00D9FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Inner clock face
    ctx.fillStyle = '#080914';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Clock needles pointing to 11:59
    ctx.strokeStyle = '#A3FF12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size / 2 - 1, size / 2 - 5); // Hour hand pointing to 11
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size / 2 + 3, size / 2 - 4); // Minute hand pointing near 12
    ctx.stroke();

    // Center pivot
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(size / 2 - 1, size / 2 - 1, 2, 2);

    this.textures.addCanvas('collectible_time', canvas);
  }

  private createHazardTexture() {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Dark red glitch background
    ctx.fillStyle = 'rgba(255, 59, 92, 0.25)';
    ctx.fillRect(0, 0, size, size);

    // Hazard warning stripes
    ctx.strokeStyle = 'rgba(255, 59, 92, 0.6)';
    ctx.lineWidth = 3;
    for (let i = -size; i < size * 2; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#FF3B5C';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    this.textures.addCanvas('hazard_zone', canvas);
  }

  private createBossTexture() {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Deep purple/red glowing aura
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, 46);
    gradient.addColorStop(0, 'rgba(255, 59, 92, 0.9)');
    gradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 59, 92, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 46, 0, Math.PI * 2);
    ctx.fill();

    // Outer octagonal mainframe chassis
    ctx.fillStyle = '#10152A';
    ctx.strokeStyle = '#FF3B5C';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const r = 36;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x = size / 2 + Math.cos(angle) * r;
      const y = size / 2 + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Spiky glitch heat-sinks
    ctx.fillStyle = '#FF3B5C';
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const x1 = size / 2 + Math.cos(angle) * 36;
      const y1 = size / 2 + Math.sin(angle) * 36;
      const x2 = size / 2 + Math.cos(angle) * 44;
      const y2 = size / 2 + Math.sin(angle) * 44;
      ctx.fillRect(x2 - 3, y2 - 3, 6, 6);
      ctx.strokeStyle = '#A78BFA';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Inner pulsating reactor core
    const coreGrad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, 20);
    coreGrad.addColorStop(0, '#FFFFFF');
    coreGrad.addColorStop(0.3, '#FF3B5C');
    coreGrad.addColorStop(0.8, '#A78BFA');
    coreGrad.addColorStop(1, '#171D2B');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 20, 0, Math.PI * 2);
    ctx.fill();

    // Digital crosshair in core
    ctx.strokeStyle = '#00D9FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size / 2 - 12, size / 2);
    ctx.lineTo(size / 2 + 12, size / 2);
    ctx.moveTo(size / 2, size / 2 - 12);
    ctx.lineTo(size / 2, size / 2 + 12);
    ctx.stroke();

    this.textures.addCanvas('boss_core', canvas);
  }

  private createBossProjectileTexture() {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Glowing red plasma orb
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, 7);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.4, '#FF3B5C');
    gradient.addColorStop(0.8, 'rgba(167, 139, 250, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 59, 92, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 7, 0, Math.PI * 2);
    ctx.fill();

    this.textures.addCanvas('projectile_boss', canvas);
  }

  private createGridTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#080914';
    ctx.fillRect(0, 0, size, size);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(16, 21, 42, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

    // Small corner circuit dots
    ctx.fillStyle = 'rgba(0, 217, 255, 0.2)';
    ctx.fillRect(0, 0, 2, 2);
    ctx.fillRect(size - 2, 0, 2, 2);
    ctx.fillRect(0, size - 2, 2, 2);
    ctx.fillRect(size - 2, size - 2, 2, 2);

    this.textures.addCanvas('grid_tile', canvas);
  }

  private createParticleTexture() {
    const size = 8;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#00D9FF';
    ctx.fillRect(2, 2, 4, 4);

    this.textures.addCanvas('particle', canvas);
  }

  private createEnemyParticleTexture() {
    const size = 8;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#FF3B5C';
    ctx.fillRect(2, 2, 4, 4);

    this.textures.addCanvas('particle_enemy', canvas);
  }
}

