/**
 * RadarSystem.ts - 360-degree radar display
 *
 * Features:
 * - Displays all entities tagged 'Enemy' on radar
 * - Relative position calculation (ignoring Y axis)
 * - Distance-based dot sizing
 * - Edge clamping for out-of-range enemies
 *
 * TODO: Implement radar rendering
 */

import * as pc from 'playcanvas';

export interface RadarConfig {
  size: number;           // Radar diameter in pixels
  range: number;          // Maximum detection range in world units
  dotSize: number;        // Enemy dot size
  backgroundColor: string;
  borderColor: string;
  dotColor: string;
  playerColor: string;
}

export class RadarSystem {
  private app: pc.Application;
  private player: pc.Entity;
  private config: RadarConfig;
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(app: pc.Application, player: pc.Entity, config?: Partial<RadarConfig>) {
    this.app = app;
    this.player = player;
    this.config = {
      size: 150,
      range: 100,
      dotSize: 6,
      backgroundColor: 'rgba(0, 20, 20, 0.8)',
      borderColor: 'rgba(0, 255, 255, 0.6)',
      dotColor: '#ff0066',
      playerColor: '#00ffff',
      ...config
    };

    this.createRadarElement();
  }

  private createRadarElement(): void {
    // Create container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: ${this.config.size}px;
      height: ${this.config.size}px;
      pointer-events: none;
    `;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.size;
    this.canvas.height = this.config.size;
    this.canvas.style.cssText = 'width: 100%; height: 100%;';

    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    // Add to HUD
    const hud = document.getElementById('hud');
    if (hud) {
      hud.appendChild(this.container);
    }
  }

  public update(): void {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const size = this.config.size;
    const center = size / 2;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fillStyle = this.config.backgroundColor;
    ctx.fill();
    ctx.strokeStyle = this.config.borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw range rings
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(center, center, (center - 2) * (i / 3), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw crosshairs
    ctx.beginPath();
    ctx.moveTo(center, 5);
    ctx.lineTo(center, size - 5);
    ctx.moveTo(5, center);
    ctx.lineTo(size - 5, center);
    ctx.stroke();

    // Draw player marker at center
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fillStyle = this.config.playerColor;
    ctx.fill();

    // Draw player direction indicator
    ctx.beginPath();
    ctx.moveTo(center, center - 8);
    ctx.lineTo(center - 4, center);
    ctx.lineTo(center + 4, center);
    ctx.closePath();
    ctx.fill();

    // Find and draw enemies
    this.drawEnemies(ctx, center);
  }

  private drawEnemies(ctx: CanvasRenderingContext2D, center: number): void {
    const enemies = this.app.root.findByTag('Enemy');
    const playerPos = this.player.getPosition();
    const playerForward = this.player.forward;

    // Calculate player's yaw for rotating radar
    const playerYaw = Math.atan2(playerForward.x, playerForward.z);

    for (const enemy of enemies) {
      const enemyPos = enemy.getPosition();

      // Calculate relative position (XZ plane only)
      const relX = enemyPos.x - playerPos.x;
      const relZ = enemyPos.z - playerPos.z;
      const distance = Math.sqrt(relX * relX + relZ * relZ);

      // Skip if out of range
      if (distance > this.config.range) continue;

      // Calculate angle relative to player's forward direction
      const angle = Math.atan2(relX, relZ) - playerYaw;

      // Convert to radar coordinates
      const radarDistance = (distance / this.config.range) * (center - 10);
      const radarX = center + Math.sin(angle) * radarDistance;
      const radarY = center - Math.cos(angle) * radarDistance;

      // Draw enemy dot
      ctx.beginPath();
      ctx.arc(radarX, radarY, this.config.dotSize, 0, Math.PI * 2);
      ctx.fillStyle = this.config.dotColor;
      ctx.fill();

      // Add glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.config.dotColor;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  public destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
