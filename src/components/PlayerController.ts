/**
 * PlayerController.ts - 3D movement controller for the player entity
 *
 * Handles:
 * - Planar movement (XZ plane) based on forward/right vectors
 * - Yaw rotation (camera look)
 * - Vertical movement (altitude) with clamping
 * - Camera lag for weight feeling (TPS style)
 */

import * as pc from 'playcanvas';
import { InputManager } from '../managers/InputManager';

export interface PlayerControllerConfig {
  /** Movement speed in units per second */
  speed: number;
  /** Vertical movement speed in units per second */
  ascendSpeed: number;
  /** Look sensitivity multiplier */
  lookSensitivity: number;
  /** Minimum Y position */
  minHeight: number;
  /** Maximum Y position */
  maxHeight: number;
  /** Minimum pitch angle (looking down) in degrees */
  minPitch: number;
  /** Maximum pitch angle (looking up) in degrees */
  maxPitch: number;
  /** Camera lag factor (0 = no lag, 1 = max lag) */
  cameraLag: number;
}

const DEFAULT_CONFIG: PlayerControllerConfig = {
  speed: 25,
  ascendSpeed: 15,
  lookSensitivity: 0.15,
  minHeight: 1,
  maxHeight: 50,
  minPitch: -60,
  maxPitch: 60,
  cameraLag: 0.1
};

// Constant forward speed for fighter jet feel
const AUTO_FORWARD_SPEED = 15;

export class PlayerController {
  private entity: pc.Entity;
  private _app: pc.Application;
  private config: PlayerControllerConfig;
  private inputManager: InputManager;

  // Camera rotation state
  private yaw: number = 0;
  private pitch: number = 0;
  private roll: number = 0;  // Player-controlled roll

  // Smoothed values for camera lag
  private targetPosition: pc.Vec3 = new pc.Vec3();
  private smoothedPosition: pc.Vec3 = new pc.Vec3();

  // Reusable vectors for calculations
  private forward: pc.Vec3 = new pc.Vec3();
  private right: pc.Vec3 = new pc.Vec3();
  private moveDir: pc.Vec3 = new pc.Vec3();
  private tempVec: pc.Vec3 = new pc.Vec3();

  // Turbulence/vibration system
  private turbulenceTime: number = 0;
  private turbulenceOffset: { pitch: number; yaw: number; roll: number } = { pitch: 0, yaw: 0, roll: 0 };

  // Camera shake from firing
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeElapsed: number = 0;

  /**
   * Create a new PlayerController
   * @param entity The entity to control (typically the camera)
   * @param app The PlayCanvas application
   * @param config Optional configuration overrides
   */
  constructor(
    entity: pc.Entity,
    app: pc.Application,
    config: Partial<PlayerControllerConfig> = {}
  ) {
    this.entity = entity;
    this._app = app;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.inputManager = InputManager.getInstance();

    // Initialize position
    this.targetPosition.copy(entity.getPosition());
    this.smoothedPosition.copy(entity.getPosition());

    // Initialize rotation from entity
    const rotation = entity.getEulerAngles();
    this.yaw = rotation.y;
    this.pitch = rotation.x;
  }

  /**
   * Update the player controller (called every frame)
   * @param dt Delta time in seconds
   */
  public update(dt: number): void {
    const input = this.inputManager.getInputState();

    // Update rotation based on gyro or touch/mouse
    if (input.gyroActive) {
      // Use gyroscope for camera orientation
      this.updateGyroRotation(input);
    } else {
      // Use touch/mouse delta for camera rotation
      this.updateRotation(input.lookDelta, dt);
    }

    // Update roll (Z/C keys for barrel roll, or gyro roll)
    if (input.gyroActive) {
      // Slight roll from phone tilt
      this.roll = input.gyroRoll;
    } else {
      this.updateRoll(input.rollInput, dt);
    }

    // Update position
    this.updatePosition(input.moveVector, input.altitudeInput, dt);

    // Apply camera lag
    this.applyCameraLag(dt);

    // Update turbulence (constant fighter jet vibration)
    this.updateTurbulence(dt);

    // Update camera shake (from firing)
    this.updateCameraShake(dt);

    // Apply final transform
    this.applyTransform();
  }

  /**
   * Update camera rotation based on gyroscope
   */
  private updateGyroRotation(input: import('../managers/InputManager').InputState): void {
    // Gyro provides absolute orientation relative to initial position
    // Smooth transition to gyro values
    const smoothFactor = 0.15;

    // Target yaw and pitch from gyro
    const targetYaw = input.gyroYaw;
    const targetPitch = pc.math.clamp(input.gyroPitch, this.config.minPitch, this.config.maxPitch);

    // Smooth interpolation
    this.yaw = this.yaw + (targetYaw - this.yaw) * smoothFactor;
    this.pitch = this.pitch + (targetPitch - this.pitch) * smoothFactor;
  }

  /**
   * Update camera rotation based on look input
   */
  private updateRotation(lookDelta: pc.Vec2, _dt: number): void {
    // Apply yaw (horizontal rotation)
    this.yaw -= lookDelta.x * this.config.lookSensitivity;

    // Apply pitch (vertical rotation) with clamping
    this.pitch -= lookDelta.y * this.config.lookSensitivity;
    this.pitch = pc.math.clamp(
      this.pitch,
      this.config.minPitch,
      this.config.maxPitch
    );
  }

  /**
   * Update roll based on input (barrel roll)
   */
  private updateRoll(rollInput: number, dt: number): void {
    const ROLL_SPEED = 180;  // Degrees per second
    const ROLL_RETURN_SPEED = 90;  // Speed to return to neutral

    if (Math.abs(rollInput) > 0.01) {
      // Apply roll input
      this.roll += rollInput * ROLL_SPEED * dt;
    } else {
      // Gradually return to neutral when no input
      if (Math.abs(this.roll) > 0.5) {
        const returnDir = this.roll > 0 ? -1 : 1;
        this.roll += returnDir * ROLL_RETURN_SPEED * dt;

        // Snap to zero if close enough
        if (Math.abs(this.roll) < 1) {
          this.roll = 0;
        }
      } else {
        this.roll = 0;
      }
    }

    // Clamp roll to prevent excessive spinning
    this.roll = pc.math.clamp(this.roll, -360, 360);
  }

  /**
   * Update position based on movement input
   */
  private updatePosition(
    moveVector: pc.Vec2,
    altitudeInput: number,
    dt: number
  ): void {
    // Get forward vector (use full 3D forward for fighter jet movement)
    this.forward.copy(this.entity.forward);

    // Get right vector projected onto XZ plane for strafing
    this.right.copy(this.entity.right);
    this.right.y = 0;
    if (this.right.length() > 0.001) {
      this.right.normalize();
    }

    // === AUTO FORWARD MOVEMENT (Fighter jet style) ===
    // Always move forward in the direction the camera is facing
    this.tempVec.copy(this.forward).mulScalar(AUTO_FORWARD_SPEED * dt);
    this.targetPosition.add(this.tempVec);

    // === ADDITIONAL MOVEMENT from input ===
    // Calculate additional movement direction
    // moveVector.y = speed boost/brake, moveVector.x = strafe left/right
    this.moveDir.set(0, 0, 0);

    // Forward/backward boost (W/S adds to or reduces forward speed)
    const forwardXZ = this.forward.clone();
    forwardXZ.y = 0;
    if (forwardXZ.length() > 0.001) {
      forwardXZ.normalize();
    }
    this.tempVec.copy(forwardXZ).mulScalar(moveVector.y);
    this.moveDir.add(this.tempVec);

    // Right/left strafe (A/D)
    this.tempVec.copy(this.right).mulScalar(moveVector.x);
    this.moveDir.add(this.tempVec);

    // Normalize if moving diagonally
    if (this.moveDir.length() > 1) {
      this.moveDir.normalize();
    }

    // Apply additional horizontal movement
    this.tempVec.copy(this.moveDir).mulScalar(this.config.speed * dt);
    this.targetPosition.add(this.tempVec);

    // Apply vertical movement (Space/Shift)
    this.targetPosition.y += altitudeInput * this.config.ascendSpeed * dt;

    // Clamp height
    this.targetPosition.y = pc.math.clamp(
      this.targetPosition.y,
      this.config.minHeight,
      this.config.maxHeight
    );
  }

  /**
   * Apply camera lag for smooth movement feel
   */
  private applyCameraLag(dt: number): void {
    const lagFactor = 1 - Math.pow(this.config.cameraLag, dt * 60);

    this.smoothedPosition.lerp(
      this.smoothedPosition,
      this.targetPosition,
      lagFactor
    );
  }

  /**
   * Update turbulence effect (constant fighter jet vibration)
   */
  private updateTurbulence(dt: number): void {
    this.turbulenceTime += dt;

    // Base turbulence intensity
    const baseIntensity = 0.15;

    // Multiple sine waves at different frequencies for organic feel
    const freq1 = 8.0;  // High frequency small vibration
    const freq2 = 3.5;  // Medium frequency
    const freq3 = 1.2;  // Low frequency sway

    // Pitch turbulence (up/down)
    this.turbulenceOffset.pitch =
      Math.sin(this.turbulenceTime * freq1 * 2 * Math.PI) * baseIntensity * 0.3 +
      Math.sin(this.turbulenceTime * freq2 * 2 * Math.PI + 1.3) * baseIntensity * 0.5 +
      Math.sin(this.turbulenceTime * freq3 * 2 * Math.PI + 2.7) * baseIntensity * 0.2;

    // Yaw turbulence (left/right)
    this.turbulenceOffset.yaw =
      Math.sin(this.turbulenceTime * freq1 * 2 * Math.PI + 0.7) * baseIntensity * 0.2 +
      Math.sin(this.turbulenceTime * freq2 * 2 * Math.PI + 2.1) * baseIntensity * 0.4 +
      Math.cos(this.turbulenceTime * freq3 * 2 * Math.PI) * baseIntensity * 0.15;

    // Roll turbulence (tilt)
    this.turbulenceOffset.roll =
      Math.sin(this.turbulenceTime * freq1 * 2 * Math.PI + 1.5) * baseIntensity * 0.4 +
      Math.cos(this.turbulenceTime * freq2 * 2 * Math.PI + 0.5) * baseIntensity * 0.6;
  }

  /**
   * Update camera shake effect (from firing)
   */
  private updateCameraShake(dt: number): void {
    if (this.shakeElapsed >= this.shakeDuration) {
      return;
    }

    this.shakeElapsed += dt;
  }

  /**
   * Trigger camera shake (called from WeaponSystem)
   */
  public triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeElapsed = 0;
  }

  /**
   * Apply the final transform to the entity
   */
  private applyTransform(): void {
    // Set position
    this.entity.setPosition(this.smoothedPosition);

    // Calculate total shake offset
    let shakeOffsetPitch = 0;
    let shakeOffsetYaw = 0;
    let shakeOffsetRoll = 0;

    if (this.shakeElapsed < this.shakeDuration) {
      const progress = this.shakeElapsed / this.shakeDuration;
      const currentIntensity = this.shakeIntensity * (1 - progress);

      // Random shake
      shakeOffsetPitch = (Math.random() - 0.5) * 2 * currentIntensity;
      shakeOffsetYaw = (Math.random() - 0.5) * 2 * currentIntensity;
      shakeOffsetRoll = (Math.random() - 0.5) * 2 * currentIntensity * 0.5;
    }

    // Combine: player rotation + turbulence + shake
    // Player roll is the main roll, turbulence and shake add to it
    const finalPitch = this.pitch + this.turbulenceOffset.pitch + shakeOffsetPitch;
    const finalYaw = this.yaw + this.turbulenceOffset.yaw + shakeOffsetYaw;
    const finalRoll = this.roll + this.turbulenceOffset.roll + shakeOffsetRoll;

    // Set rotation (pitch, yaw, roll)
    this.entity.setEulerAngles(finalPitch, finalYaw, finalRoll);
  }

  /**
   * Set player position immediately (teleport)
   */
  public setPosition(position: pc.Vec3): void {
    this.targetPosition.copy(position);
    this.smoothedPosition.copy(position);
    this.entity.setPosition(position);
  }

  /**
   * Get current player position
   */
  public getPosition(): pc.Vec3 {
    return this.smoothedPosition.clone();
  }

  /**
   * Set rotation immediately
   */
  public setRotation(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = pc.math.clamp(pitch, this.config.minPitch, this.config.maxPitch);
    this.entity.setEulerAngles(this.pitch, this.yaw, 0);
  }

  /**
   * Get current yaw angle
   */
  public getYaw(): number {
    return this.yaw;
  }

  /**
   * Get current pitch angle
   */
  public getPitch(): number {
    return this.pitch;
  }

  /**
   * Get the forward direction vector (normalized, XZ plane)
   */
  public getForwardXZ(): pc.Vec3 {
    const forward = this.entity.forward.clone();
    forward.y = 0;
    if (forward.length() > 0.001) {
      forward.normalize();
    }
    return forward;
  }

  /**
   * Update configuration at runtime
   */
  public setConfig(config: Partial<PlayerControllerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): PlayerControllerConfig {
    return { ...this.config };
  }
}
