/**
 * UIManager.ts - UI element management
 *
 * Handles:
 * - HUD elements (health, score, ammo)
 * - Menu screens
 * - In-game notifications
 *
 * TODO: Implement full UI system
 */

import * as pc from 'playcanvas';

export class UIManager {
  private static instance: UIManager;

  private _app: pc.Application | null = null;

  private constructor() {}

  public static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  public initialize(app: pc.Application): void {
    this._app = app;
    this.createHUD();
  }

  private createHUD(): void {
    // TODO: Create HUD entity with screen component
    // TODO: Add health bar
    // TODO: Add score display
    // TODO: Add ammo counter
    // TODO: Add radar container
  }

  public updateScore(score: number): void {
    // TODO: Update score text element
    console.log(`Score: ${score}`);
  }

  public updateHealth(health: number, maxHealth: number): void {
    // TODO: Update health bar width
    console.log(`Health: ${health}/${maxHealth}`);
  }

  public showNotification(message: string, duration: number = 2000): void {
    // TODO: Show floating notification
    console.log(`Notification: ${message}`);
    setTimeout(() => {
      // TODO: Hide notification
    }, duration);
  }

  public showGameOver(stats: { score: number; time: number }): void {
    // TODO: Show game over screen with stats
    console.log(`Game Over! Score: ${stats.score}, Time: ${stats.time}s`);
  }
}
