/**
 * EnemyAI.ts - Enemy behavior and AI
 *
 * Features:
 * - Basic patrol behavior
 * - Player tracking
 * - Attack patterns
 *
 * TODO: Implement full enemy AI system
 */

import * as pc from 'playcanvas';

export interface EnemyConfig {
  health: number;
  speed: number;
  attackRange: number;
  detectionRange: number;
}

export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack';

export class EnemyAI {
  private entity: pc.Entity;
  private _app: pc.Application;
  private config: EnemyConfig;
  private state: EnemyState = 'idle';
  private _target: pc.Entity | null = null;

  constructor(entity: pc.Entity, app: pc.Application, config?: Partial<EnemyConfig>) {
    this.entity = entity;
    this._app = app;
    this.config = {
      health: 100,
      speed: 5,
      attackRange: 10,
      detectionRange: 30,
      ...config
    };

    // Tag entity as Enemy for radar detection
    this.entity.tags.add('Enemy');
  }

  public update(_dt: number): void {
    // TODO: Implement state machine
    switch (this.state) {
      case 'idle':
        this.updateIdle();
        break;
      case 'patrol':
        this.updatePatrol();
        break;
      case 'chase':
        this.updateChase();
        break;
      case 'attack':
        this.updateAttack();
        break;
    }
  }

  private updateIdle(): void {
    // TODO: Transition to patrol after delay
  }

  private updatePatrol(): void {
    // TODO: Follow patrol path
  }

  private updateChase(): void {
    // TODO: Move towards player
  }

  private updateAttack(): void {
    // TODO: Execute attack pattern
  }

  public takeDamage(amount: number): void {
    this.config.health -= amount;
    if (this.config.health <= 0) {
      this.die();
    }
  }

  private die(): void {
    // TODO: Play death effect
    // TODO: Drop items
    this.entity.destroy();
  }

  public setTarget(target: pc.Entity | null): void {
    this._target = target;
  }
}
