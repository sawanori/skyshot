/**
 * HUDManager.ts - HUD element management and updates
 *
 * Handles:
 * - HUD element references
 * - Real-time HUD updates (altitude, speed, heading, etc.)
 * - Radar blip rendering
 * - FPS and time displays
 */

import * as pc from 'playcanvas';
import { InputManager } from '../managers/InputManager';

interface HUDElements {
  altitudePointer: HTMLElement | null;
  altitudeValue: HTMLElement | null;
  speedPointer: HTMLElement | null;
  speedValue: HTMLElement | null;
  attitudeHorizon: HTMLElement | null;
  headingValue: HTMLElement | null;
  pitchValue: HTMLElement | null;
  targetCount: HTMLElement | null;
  fpsDisplay: HTMLElement | null;
  timeDisplay: HTMLElement | null;
}

interface PlayerState {
  position: pc.Vec3;
  yaw: number;
  pitch: number;
}

export class HUDManager {
  private elements: HUDElements;
  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private currentFps: number = 0;
  private gameStartTime: number = 0;
  private app: pc.Application;

  constructor(app: pc.Application) {
    this.app = app;
    this.elements = {
      altitudePointer: null,
      altitudeValue: null,
      speedPointer: null,
      speedValue: null,
      attitudeHorizon: null,
      headingValue: null,
      pitchValue: null,
      targetCount: null,
      fpsDisplay: null,
      timeDisplay: null,
    };
    this.lastFpsTime = performance.now();
  }

  /**
   * Initialize HUD element references
   */
  public initialize(): void {
    this.elements.altitudePointer = document.getElementById('altitude-pointer');
    this.elements.altitudeValue = document.getElementById('altitude-value');
    this.elements.speedPointer = document.getElementById('speed-pointer');
    this.elements.speedValue = document.getElementById('speed-value');
    this.elements.attitudeHorizon = document.getElementById('attitude-horizon');
    this.elements.headingValue = document.getElementById('heading-value');
    this.elements.pitchValue = document.getElementById('pitch-value');
    this.elements.targetCount = document.getElementById('target-count');
    this.elements.fpsDisplay = document.getElementById('fps-display');
    this.elements.timeDisplay = document.getElementById('time-display');
  }

  /**
   * Set the game start time for time display
   */
  public setGameStartTime(time: number): void {
    this.gameStartTime = time;
  }

  /**
   * Update all HUD elements
   */
  public update(playerState: PlayerState | null): void {
    this.updateFPS();
    this.updateGameTime();

    if (!playerState) return;

    this.updateAltitude(playerState.position.y);
    this.updateSpeed();
    this.updateAttitude(playerState.pitch);
    this.updateHeading(playerState.yaw);
    this.updatePitch(playerState.pitch);
    this.updateTargetCount();
    // 3D Radar is now handled by Radar3DSystem
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
      if (this.elements.fpsDisplay) {
        this.elements.fpsDisplay.textContent = String(this.currentFps);
      }
    }
  }

  private updateGameTime(): void {
    if (!this.elements.timeDisplay) return;

    const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
    const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    this.elements.timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
  }

  private updateAltitude(altitude: number): void {
    const minHeight = 1;
    const maxHeight = 50;
    const altitudePercent = ((maxHeight - altitude) / (maxHeight - minHeight)) * 100;

    if (this.elements.altitudePointer) {
      this.elements.altitudePointer.style.top = `${Math.max(0, Math.min(100, altitudePercent))}%`;
    }
    if (this.elements.altitudeValue) {
      this.elements.altitudeValue.textContent = `ALT ${Math.round(altitude)}`;
    }
  }

  private updateSpeed(): void {
    const input = InputManager.getInstance().getInputState();
    const speed = Math.sqrt(input.moveVector.x ** 2 + input.moveVector.y ** 2) * 100;
    const speedPercent = 50 - speed * 0.4;

    if (this.elements.speedPointer) {
      this.elements.speedPointer.style.top = `${Math.max(10, Math.min(90, speedPercent))}%`;
    }
    if (this.elements.speedValue) {
      this.elements.speedValue.textContent = `SPD ${Math.round(speed)}`;
    }
  }

  private updateAttitude(pitch: number): void {
    if (this.elements.attitudeHorizon) {
      const pitchOffset = pitch * 0.5;
      this.elements.attitudeHorizon.style.transform = `translateY(${pitchOffset}px)`;
    }
  }

  private updateHeading(yaw: number): void {
    const heading = ((yaw % 360) + 360) % 360;
    if (this.elements.headingValue) {
      this.elements.headingValue.textContent = `${Math.round(heading).toString().padStart(3, '0')}°`;
    }
  }

  private updatePitch(pitch: number): void {
    if (this.elements.pitchValue) {
      this.elements.pitchValue.textContent = `${Math.round(pitch)}°`;
    }
  }

  private updateTargetCount(): void {
    const enemies = this.app.root.findByTag('Enemy');
    if (this.elements.targetCount) {
      this.elements.targetCount.textContent = String(enemies.length);
    }
  }
}
