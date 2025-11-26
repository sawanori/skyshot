/**
 * WeaponSystem.ts - Weapon and shooting mechanics
 *
 * Features:
 * - Fire projectiles on input
 * - Raycast hit detection
 * - Apply knockback force to hit objects
 * - Visual effects (muzzle flash, tracers)
 */

import * as pc from 'playcanvas';
import { InputManager } from '../managers/InputManager';
import { PlayerController } from './PlayerController';

export interface WeaponConfig {
  fireRate: number;        // Shots per second
  damage: number;          // Damage per hit
  range: number;           // Maximum range
  knockbackForce: number;  // Force applied to hit objects
  projectileSpeed: number; // Projectile velocity (for visual tracer)
  tracerColor: pc.Color;   // Tracer line color
}

interface Projectile {
  entity: pc.Entity;
  velocity: pc.Vec3;
  lifetime: number;
}

export class WeaponSystem {
  private entity: pc.Entity;
  private app: pc.Application;
  private config: WeaponConfig;
  private inputManager: InputManager;
  private lastFireTime: number = 0;
  private projectiles: Projectile[] = [];

  // Reusable vectors
  private rayStart: pc.Vec3 = new pc.Vec3();
  private rayEnd: pc.Vec3 = new pc.Vec3();
  private knockbackDir: pc.Vec3 = new pc.Vec3();

  // Muzzle flash
  private muzzleFlash: pc.Entity | null = null;
  private muzzleFlashTimer: number = 0;

  // Camera shake
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeElapsed: number = 0;

  // Reference to player controller for camera shake
  private playerController: PlayerController | null = null;

  // Sound effects (Web Audio API for low latency)
  private audioContext: AudioContext | null = null;
  private gunSoundBuffer: AudioBuffer | null = null;
  private reloadSoundBuffer: AudioBuffer | null = null;
  private reloadTimeoutId: number | null = null;
  private readonly RELOAD_DELAY: number = 0.3; // Seconds after last shot to play reload

  constructor(entity: pc.Entity, app: pc.Application, config?: Partial<WeaponConfig>) {
    this.entity = entity;
    this.app = app;
    this.inputManager = InputManager.getInstance();
    this.config = {
      fireRate: 8,
      damage: 25,
      range: 200,
      knockbackForce: 50,
      projectileSpeed: 100,
      tracerColor: new pc.Color(0, 1, 1, 1), // Cyan
      ...config
    };

    this.createMuzzleFlash();
    this.loadGunSound();
  }

  private loadGunSound(): void {
    // Use Web Audio API for lower latency
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Load gun sound
    fetch('/assets/GunSound.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => this.audioContext!.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        this.gunSoundBuffer = audioBuffer;
      })
      .catch(err => {
        console.warn('Failed to load gun sound:', err);
      });

    // Load reload sound
    fetch('/assets/reload.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => this.audioContext!.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        this.reloadSoundBuffer = audioBuffer;
      })
      .catch(err => {
        console.warn('Failed to load reload sound:', err);
      });
  }

  private playGunSound(): void {
    if (this.audioContext && this.gunSoundBuffer) {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Create buffer source for immediate playback
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.gunSoundBuffer;
      gainNode.gain.value = 0.5;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Play immediately
      source.start(0);

      // Cancel any pending reload sound (we're still firing)
      if (this.reloadTimeoutId !== null) {
        window.clearTimeout(this.reloadTimeoutId);
        this.reloadTimeoutId = null;
      }

      // Schedule reload sound after firing stops
      this.reloadTimeoutId = window.setTimeout(() => {
        this.playReloadSound();
        this.reloadTimeoutId = null;
      }, this.RELOAD_DELAY * 1000);
    }
  }

  private playReloadSound(delay: number = 0): void {
    if (this.audioContext && this.reloadSoundBuffer) {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.reloadSoundBuffer;
      gainNode.gain.value = 0.4;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Play with delay (in seconds)
      source.start(this.audioContext.currentTime + delay);
    }
  }

  /**
   * Create muzzle flash effect entity
   */
  private createMuzzleFlash(): void {
    this.muzzleFlash = new pc.Entity('MuzzleFlash');

    // Create a simple sphere for muzzle flash
    this.muzzleFlash.addComponent('render', {
      type: 'sphere'
    });

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = new pc.Color(1, 0.8, 0);
    material.emissiveIntensity = 3;
    material.blendType = pc.BLEND_ADDITIVE;
    material.depthWrite = false;
    material.update();

    if (this.muzzleFlash.render) {
      this.muzzleFlash.render.meshInstances[0].material = material;
    }

    this.muzzleFlash.setLocalScale(0.3, 0.3, 0.3);
    this.muzzleFlash.setLocalPosition(0, -0.2, -1);
    this.muzzleFlash.enabled = false;

    this.entity.addChild(this.muzzleFlash);
  }

  /**
   * Update weapon system (called every frame)
   */
  public update(dt: number): void {
    const input = this.inputManager.getInputState();

    // Check for fire input (single shot on press, or continuous on hold)
    if (input.firePressed || input.fireHeld) {
      this.tryFire();
    }

    // Update muzzle flash
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0 && this.muzzleFlash) {
        this.muzzleFlash.enabled = false;
      }
    }

    // Update camera shake
    this.updateCameraShake(dt);

    // Update projectiles
    this.updateProjectiles(dt);
  }

  /**
   * Attempt to fire the weapon
   */
  private tryFire(): void {
    const now = performance.now();
    const cooldown = 1000 / this.config.fireRate;

    if (now - this.lastFireTime < cooldown) {
      return;
    }

    this.lastFireTime = now;
    this.fire();
  }

  /**
   * Fire the weapon
   */
  public fire(): void {
    // Play gun sound effect
    this.playGunSound();

    // Show muzzle flash
    if (this.muzzleFlash) {
      this.muzzleFlash.enabled = true;
      this.muzzleFlashTimer = 0.05;
    }

    // Trigger camera shake for recoil effect (stronger shake on player controller)
    if (this.playerController) {
      this.playerController.triggerShake(2.5, 0.15);
    }
    this.triggerCameraShake(0.8, 0.08);

    // Raycast from camera center
    this.rayStart.copy(this.entity.getPosition());
    const forward = this.entity.forward.clone();
    this.rayEnd.copy(forward).mulScalar(this.config.range).add(this.rayStart);

    let targetPoint: pc.Vec3 = this.rayEnd.clone();
    let hitEntity: pc.Entity | null = null;

    // Simple distance-based hit detection for enemies (no physics engine required)
    const enemies = this.app.root.findByTag('Enemy');
    let closestDist = this.config.range;

    for (const enemy of enemies) {
      const hitResult = this.checkRayEntityIntersection(enemy as pc.Entity, this.rayStart, forward);
      if (hitResult && hitResult.distance < closestDist) {
        closestDist = hitResult.distance;
        hitEntity = enemy as pc.Entity;
        targetPoint = hitResult.point;
      }
    }

    if (hitEntity) {
      this.onHit(hitEntity, targetPoint, forward);
    }

    // Spawn tracer
    this.spawnTracer(this.rayStart.clone(), targetPoint);
  }

  /**
   * Simple ray-box intersection check
   */
  private checkRayEntityIntersection(
    entity: pc.Entity,
    rayOrigin: pc.Vec3,
    rayDir: pc.Vec3
  ): { point: pc.Vec3; distance: number } | null {
    const entityPos = entity.getPosition();
    const scale = entity.getLocalScale();
    const halfSize = Math.max(scale.x, scale.y, scale.z) / 2;

    // Vector from ray origin to entity center
    const toEntity = new pc.Vec3().sub2(entityPos, rayOrigin);

    // Project onto ray direction
    const projLength = toEntity.dot(rayDir);

    if (projLength < 0) return null; // Behind the ray

    // Closest point on ray to entity center
    const closestPoint = new pc.Vec3().copy(rayDir).mulScalar(projLength).add(rayOrigin);

    // Distance from closest point to entity center
    const distToCenter = closestPoint.distance(entityPos);

    // Check if within bounding sphere
    if (distToCenter <= halfSize * 1.5) {
      return {
        point: closestPoint,
        distance: projLength
      };
    }

    return null;
  }

  /**
   * Handle hit on an entity
   */
  private onHit(entity: pc.Entity, point: pc.Vec3, direction: pc.Vec3): void {
    // Calculate knockback direction
    this.knockbackDir.copy(direction);
    this.knockbackDir.y += 0.5; // Add upward force
    this.knockbackDir.normalize();

    // Animate knockback (no physics engine needed)
    this.animateKnockback(entity, this.knockbackDir.clone());

    // Spawn hit effect
    this.spawnHitEffect(point);

    // Check for Enemy tag and apply damage
    if (entity.tags.has('Enemy')) {
      // Trigger damage event (can be handled by EnemyAI)
      entity.fire('damage', this.config.damage);
    }
  }

  /**
   * Animate knockback effect without physics engine
   */
  private animateKnockback(entity: pc.Entity, direction: pc.Vec3): void {
    const startPos = entity.getPosition().clone();
    const knockbackDistance = 5;
    const duration = 0.3;
    let elapsed = 0;

    // Random rotation speeds
    const rotSpeedX = (Math.random() - 0.5) * 720;
    const rotSpeedY = (Math.random() - 0.5) * 720;
    const rotSpeedZ = (Math.random() - 0.5) * 720;

    const updateHandler = (dt: number) => {
      elapsed += dt;
      const t = Math.min(elapsed / duration, 1);

      // Easing function (ease out)
      const easeOut = 1 - Math.pow(1 - t, 3);

      // Calculate position with arc
      const progress = easeOut * knockbackDistance;
      const height = Math.sin(t * Math.PI) * 3; // Arc height

      const newPos = new pc.Vec3(
        startPos.x + direction.x * progress,
        startPos.y + height,
        startPos.z + direction.z * progress
      );

      entity.setPosition(newPos);

      // Rotate
      entity.rotate(rotSpeedX * dt, rotSpeedY * dt, rotSpeedZ * dt);

      if (t >= 1) {
        this.app.off('update', updateHandler);

        // Bounce back down if above ground
        this.animateFall(entity);
      }
    };

    this.app.on('update', updateHandler);
  }

  /**
   * Animate falling back to ground
   */
  private animateFall(entity: pc.Entity): void {
    const groundY = 1; // Ground level + half cube size
    let velocity = 0;
    const gravity = 30;
    const bounceFactor = 0.4;
    let bounces = 0;
    const maxBounces = 3;

    const updateHandler = (dt: number) => {
      const pos = entity.getPosition();

      if (pos.y > groundY || velocity !== 0) {
        velocity -= gravity * dt;
        pos.y += velocity * dt;

        // Continue rotating while falling
        entity.rotate(
          (Math.random() - 0.5) * 100 * dt,
          (Math.random() - 0.5) * 100 * dt,
          (Math.random() - 0.5) * 100 * dt
        );

        if (pos.y <= groundY) {
          pos.y = groundY;

          if (Math.abs(velocity) > 1 && bounces < maxBounces) {
            velocity = -velocity * bounceFactor;
            bounces++;
          } else {
            velocity = 0;
            this.app.off('update', updateHandler);
          }
        }

        entity.setPosition(pos);
      } else {
        this.app.off('update', updateHandler);
      }
    };

    this.app.on('update', updateHandler);
  }

  /**
   * Spawn a tracer projectile visual
   */
  private spawnTracer(start: pc.Vec3, end: pc.Vec3): void {
    const tracer = new pc.Entity('Tracer');

    // Calculate tracer properties - use forward direction from camera
    const forward = this.entity.forward.clone();

    // Create elongated box for tracer
    tracer.addComponent('render', {
      type: 'box'
    });

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = this.config.tracerColor;
    material.emissiveIntensity = 2;
    material.blendType = pc.BLEND_ADDITIVE;
    material.depthWrite = false;
    material.cull = pc.CULLFACE_NONE;
    material.update();

    if (tracer.render) {
      tracer.render.meshInstances[0].material = material;
    }

    // Start tracer from slightly in front of camera (center of screen)
    const offsetStart = new pc.Vec3().copy(forward).mulScalar(2).add(start);

    // Calculate distance to target
    const tracerLength = offsetStart.distance(end);

    // Position at midpoint between offset start and end
    const midpoint = new pc.Vec3().add2(offsetStart, end).mulScalar(0.5);
    tracer.setPosition(midpoint);

    // Scale: thin and long (from offset start to end)
    tracer.setLocalScale(0.05, 0.05, tracerLength);

    // Rotate to face the end point (target direction)
    tracer.lookAt(end);

    this.app.root.addChild(tracer);

    // Add to projectiles for cleanup
    this.projectiles.push({
      entity: tracer,
      velocity: new pc.Vec3(),
      lifetime: 0.15 // Short lifetime for instant tracer
    });
  }

  /**
   * Spawn hit effect at point
   */
  private spawnHitEffect(point: pc.Vec3): void {
    const effect = new pc.Entity('HitEffect');

    effect.addComponent('render', {
      type: 'sphere'
    });

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = new pc.Color(1, 0.5, 0);
    material.emissiveIntensity = 5;
    material.blendType = pc.BLEND_ADDITIVE;
    material.depthWrite = false;
    material.update();

    if (effect.render) {
      effect.render.meshInstances[0].material = material;
    }

    effect.setPosition(point);
    effect.setLocalScale(0.5, 0.5, 0.5);

    this.app.root.addChild(effect);

    // Animate and destroy
    let lifetime = 0.2;
    const startScale = 0.5;
    const endScale = 1.5;

    const updateHandler = (dt: number) => {
      lifetime -= dt;
      if (lifetime <= 0) {
        effect.destroy();
        this.app.off('update', updateHandler);
      } else {
        const t = 1 - (lifetime / 0.2);
        const scale = startScale + (endScale - startScale) * t;
        effect.setLocalScale(scale, scale, scale);

        // Fade out
        if (effect.render) {
          const mat = effect.render.meshInstances[0].material as pc.StandardMaterial;
          mat.opacity = 1 - t;
          mat.update();
        }
      }
    };

    this.app.on('update', updateHandler);
  }

  /**
   * Update active projectiles
   */
  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.lifetime -= dt;

      if (proj.lifetime <= 0) {
        proj.entity.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  /**
   * Trigger camera shake effect
   * @param intensity How strong the shake is (in degrees)
   * @param duration How long the shake lasts (in seconds)
   */
  private triggerCameraShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeElapsed = 0;
  }

  /**
   * Update camera shake effect
   */
  private updateCameraShake(dt: number): void {
    if (this.shakeElapsed >= this.shakeDuration) {
      return;
    }

    this.shakeElapsed += dt;
    const progress = this.shakeElapsed / this.shakeDuration;

    // Ease out - shake decreases over time
    const currentIntensity = this.shakeIntensity * (1 - progress);

    // Random shake offset
    const shakeX = (Math.random() - 0.5) * 2 * currentIntensity;
    const shakeY = (Math.random() - 0.5) * 2 * currentIntensity;

    // Apply shake to camera rotation temporarily via CSS transform on HUD
    // This creates a visual shake effect without affecting gameplay
    const hud = document.getElementById('hud');
    if (hud) {
      if (progress < 1) {
        hud.style.transform = `translate(${shakeX * 3}px, ${shakeY * 3}px)`;
      } else {
        hud.style.transform = '';
      }
    }

    // Also shake the game container for more impact
    const container = document.getElementById('game-container');
    if (container) {
      if (progress < 1) {
        container.style.transform = `translate(${shakeX * 2}px, ${shakeY * 2}px)`;
      } else {
        container.style.transform = '';
      }
    }
  }

  /**
   * Clean up
   */
  /**
   * Set reference to player controller for camera shake
   */
  public setPlayerController(controller: PlayerController): void {
    this.playerController = controller;
  }

  public destroy(): void {
    for (const proj of this.projectiles) {
      proj.entity.destroy();
    }
    this.projectiles = [];

    if (this.muzzleFlash) {
      this.muzzleFlash.destroy();
    }
  }
}
