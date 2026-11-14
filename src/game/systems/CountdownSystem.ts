import Phaser from 'phaser';

export enum CountdownPhase {
  STABLE = 1,          // 90s - 60s
  CORRUPTION = 2,      // 60s - 30s
  CRITICAL = 3,        // 30s - 15s
  FINAL_WARNING = 4,   // 15s - 0s
  MILLENNIUM = 5,      // 0s (Transition)
}

export interface PhaseInfo {
  phase: CountdownPhase;
  name: string;
  subName: string;
  integrity: number;
  color: string;
}

export const PHASE_CONFIG: Record<CountdownPhase, PhaseInfo> = {
  [CountdownPhase.STABLE]: {
    phase: CountdownPhase.STABLE,
    name: 'PHASE 1 // STABLE SYSTEM',
    subName: 'SYSTEM STATUS: OPERATIONAL',
    integrity: 100,
    color: '#00D9FF',
  },
  [CountdownPhase.CORRUPTION]: {
    phase: CountdownPhase.CORRUPTION,
    name: 'PHASE 2 // DATA CORRUPTION',
    subName: 'WARNING: CORRUPTED SECTORS SPREADING',
    integrity: 67,
    color: '#FFA500',
  },
  [CountdownPhase.CRITICAL]: {
    phase: CountdownPhase.CRITICAL,
    name: 'PHASE 3 // CRITICAL FAILURE',
    subName: 'CRITICAL FAILURE: MILLENNIUM IMMINENT',
    integrity: 33,
    color: '#FF3B5C',
  },
  [CountdownPhase.FINAL_WARNING]: {
    phase: CountdownPhase.FINAL_WARNING,
    name: 'PHASE 4 // FINAL WARNING',
    subName: 'FINAL WARNING: SYSTEM REBOOT IN PROGRESS',
    integrity: 12,
    color: '#FF3B5C',
  },
  [CountdownPhase.MILLENNIUM]: {
    phase: CountdownPhase.MILLENNIUM,
    name: 'THE MILLENNIUM EVENT',
    subName: '12/31/1999 11:59:59 PM // REBOOTING...',
    integrity: 0,
    color: '#A3FF12',
  },
};

export class CountdownSystem {
  private scene: Phaser.Scene;
  private timeRemaining: number = 90.0;
  private currentPhase: CountdownPhase = CountdownPhase.STABLE;
  private isPaused: boolean = false;
  private isTransitioningToMillennium: boolean = false;
  public isBossPhase: boolean = false;

  // Temporal Freeze
  private freezeDurationSec: number = 3.0;
  private freezeCooldownSec: number = 8.0;
  private freezeActiveTimeRemaining: number = 0;
  private freezeCooldownRemaining: number = 0;

  // Track phase triggers so they fire only once
  private triggeredThresholds = {
    60: false,
    30: false,
    15: false,
    0: false,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(deltaMs: number) {
    if (this.isPaused) return;

    const deltaSec = deltaMs / 1000;

    // Decrement main countdown only before the millennium transition
    if (this.timeRemaining > 0 && !this.isTransitioningToMillennium) {
      this.timeRemaining = Math.max(0, this.timeRemaining - deltaSec);
      this.checkPhaseThresholds();
    }

    // Update Freeze active duration (ALWAYS counts down, even during Boss fight)
    if (this.freezeActiveTimeRemaining > 0) {
      this.freezeActiveTimeRemaining = Math.max(0, this.freezeActiveTimeRemaining - deltaSec);
      if (this.freezeActiveTimeRemaining <= 0) {
        this.freezeActiveTimeRemaining = 0;
        this.scene.events.emit('freeze-ended');
      }
    }

    // Update Freeze cooldown (ALWAYS counts down)
    if (this.freezeCooldownRemaining > 0) {
      this.freezeCooldownRemaining = Math.max(0, this.freezeCooldownRemaining - deltaSec);
    }
  }

  private checkPhaseThresholds() {
    if (this.timeRemaining <= 0 && !this.triggeredThresholds[0]) {
      this.triggeredThresholds[0] = true;
      this.currentPhase = CountdownPhase.MILLENNIUM;
      this.isTransitioningToMillennium = true;
      this.scene.events.emit('phase-changed', PHASE_CONFIG[CountdownPhase.MILLENNIUM]);
      this.scene.events.emit('millennium-transition-start');
    } else if (this.timeRemaining <= 15 && !this.triggeredThresholds[15]) {
      this.triggeredThresholds[15] = true;
      this.currentPhase = CountdownPhase.FINAL_WARNING;
      this.scene.events.emit('phase-changed', PHASE_CONFIG[CountdownPhase.FINAL_WARNING]);
    } else if (this.timeRemaining <= 30 && !this.triggeredThresholds[30]) {
      this.triggeredThresholds[30] = true;
      this.currentPhase = CountdownPhase.CRITICAL;
      this.scene.events.emit('phase-changed', PHASE_CONFIG[CountdownPhase.CRITICAL]);
    } else if (this.timeRemaining <= 60 && !this.triggeredThresholds[60]) {
      this.triggeredThresholds[60] = true;
      this.currentPhase = CountdownPhase.CORRUPTION;
      this.scene.events.emit('phase-changed', PHASE_CONFIG[CountdownPhase.CORRUPTION]);
    }
  }

  addTime(seconds: number) {
    if (this.isTransitioningToMillennium) return;

    this.timeRemaining += seconds;
    this.scene.events.emit('time-added', { amount: seconds, total: this.timeRemaining });
  }

  canActivateFreeze(): { canActivate: boolean; reason?: string } {
    if (this.freezeCooldownRemaining > 0) {
      return { canActivate: false, reason: `COOLDOWN: ${this.freezeCooldownRemaining.toFixed(1)}s` };
    }
    if (this.isTransitioningToMillennium && !this.isBossPhase) {
      return { canActivate: false, reason: 'SYSTEM TRANSITIONING' };
    }
    if (!this.isBossPhase && this.timeRemaining < 5.0) {
      return { canActivate: false, reason: 'INSUFFICIENT TIME (<5s)' };
    }
    return { canActivate: true };
  }

  activateTemporalFreeze(): boolean {
    const check = this.canActivateFreeze();
    if (!check.canActivate) return false;

    // Deduct 5 seconds only during standard countdown phase
    if (!this.isBossPhase) {
      this.timeRemaining = Math.max(0, this.timeRemaining - 5.0);
      this.scene.events.emit('time-sacrificed', { amount: 5, total: this.timeRemaining });
      this.checkPhaseThresholds();
    }

    this.freezeActiveTimeRemaining = this.freezeDurationSec;
    this.freezeCooldownRemaining = this.freezeCooldownSec;

    this.scene.events.emit('freeze-started', { duration: this.freezeDurationSec });
    return true;
  }

  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  getFormattedTime(): string {
    const totalSeconds = Math.ceil(this.timeRemaining);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const minStr = minutes.toString().padStart(2, '0');
    const secStr = seconds.toString().padStart(2, '0');
    return `${minStr}:${secStr}`;
  }

  getCurrentPhase(): PhaseInfo {
    return PHASE_CONFIG[this.currentPhase];
  }

  isFrozen(): boolean {
    return this.freezeActiveTimeRemaining > 0;
  }

  getFreezeActiveTimeRemaining(): number {
    return this.freezeActiveTimeRemaining;
  }

  getFreezeCooldownRemaining(): number {
    return this.freezeCooldownRemaining;
  }

  getFreezeCooldownRatio(): number {
    if (this.freezeCooldownRemaining <= 0) return 0;
    return this.freezeCooldownRemaining / this.freezeCooldownSec;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }
}
