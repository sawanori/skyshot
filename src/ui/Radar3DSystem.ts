/**
 * Radar3DSystem.ts - 3D Holographic Spherical Radar
 *
 * Features:
 * - GLB model as radar base (cockpit hologram style)
 * - Enemies displayed as 3D markers on sphere surface
 * - Full 360° + vertical coverage
 * - Attached to camera for cockpit view
 * - Uses separate camera layer for UI rendering
 */

import * as pc from 'playcanvas';

export interface Radar3DConfig {
  radarRadius: number;      // Radius of the radar sphere for marker placement
  detectionRange: number;   // Maximum detection range in world units
  markerSize: number;       // Enemy marker size
  markerColor: pc.Color;    // Enemy marker color
  glowIntensity: number;    // Marker glow intensity
}

export class Radar3DSystem {
  private app: pc.Application;
  private camera: pc.Entity;
  private config: Radar3DConfig;

  private radarBase: pc.Entity | null = null;
  private radarContainer: pc.Entity | null = null;
  private radarPivot: pc.Entity | null = null;
  private enemyMarkers: pc.Entity[] = [];
  private markerPool: pc.Entity[] = [];
  private markerMaterial: pc.StandardMaterial | null = null;

  constructor(app: pc.Application, camera: pc.Entity, config?: Partial<Radar3DConfig>) {
    this.app = app;
    this.camera = camera;
    this.config = {
      radarRadius: 0.4,       // Radius for marker placement on radar
      detectionRange: 150,
      markerSize: 0.08,       // Marker size
      markerColor: new pc.Color(1, 0, 0),  // Pure red
      glowIntensity: 1,
      ...config
    };

    this.createMarkerMaterial();
    this.loadRadarModel();

    // Listen for window resize to update position
    window.addEventListener('resize', () => this.updatePosition());
  }

  /**
   * Create material for enemy markers
   */
  private createMarkerMaterial(): void {
    this.markerMaterial = new pc.StandardMaterial();
    // Dark red diffuse with red emissive for visibility
    this.markerMaterial.diffuse = new pc.Color(0.5, 0, 0);
    this.markerMaterial.emissive = new pc.Color(1, 0, 0);
    this.markerMaterial.emissiveIntensity = 0.8;
    this.markerMaterial.useLighting = false;
    // Render on top of radar sphere
    this.markerMaterial.depthTest = false;
    this.markerMaterial.depthWrite = false;
    this.markerMaterial.update();
  }

  /**
   * Calculate radar position using screen-to-world conversion
   * This ensures the radar is ALWAYS at horizontal center (same as crosshair)
   */
  private calculateRadarPosition(): { position: pc.Vec3; scale: number } {
    const cameraComponent = this.camera.camera;
    if (!cameraComponent) {
      return { position: new pc.Vec3(0, -0.14, -0.5), scale: 0.045 };
    }

    // Get canvas/screen dimensions
    const canvas = this.app.graphicsDevice.canvas;
    const screenWidth = canvas.clientWidth;
    const screenHeight = canvas.clientHeight;

    // Screen position: exact horizontal center (50%), bottom area (85% down from top)
    const screenX = screenWidth * 0.5;
    const screenY = screenHeight * 0.85;

    // Distance from camera where we want the radar
    const depth = 0.5;

    // Convert screen coordinates to world coordinates
    const worldPos = new pc.Vec3();
    cameraComponent.screenToWorld(screenX, screenY, depth, worldPos);

    // Convert world position to camera local position
    const cameraWorldPos = this.camera.getPosition();
    const cameraWorldRot = this.camera.getRotation();

    // Get relative position in world space
    const relativePos = new pc.Vec3().sub2(worldPos, cameraWorldPos);

    // Transform to camera local space by inverse rotation
    const invRot = new pc.Quat().copy(cameraWorldRot).invert();
    const localPos = invRot.transformVector(relativePos, new pc.Vec3());

    // Calculate scale based on FOV and distance
    const fovRad = (cameraComponent.fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(fovRad / 2) * depth;
    const radarScale = visibleHeight * 0.20;  // 2x larger

    return {
      position: localPos,
      scale: radarScale
    };
  }

  /**
   * Update radar position on window resize
   */
  public updatePosition(): void {
    if (!this.radarContainer) return;

    const { position, scale } = this.calculateRadarPosition();
    this.radarContainer.setLocalPosition(position.x, position.y, position.z);
    this.radarContainer.setLocalScale(scale, scale, scale);
  }

  /**
   * Load the radar GLB model
   */
  private loadRadarModel(): void {
    // Create container entity that will hold the radar
    this.radarContainer = new pc.Entity('RadarContainer');

    // Create pivot entity to center the GLB model
    this.radarPivot = new pc.Entity('RadarPivot');
    this.radarContainer.addChild(this.radarPivot);

    // Calculate position based on camera FOV for consistent placement
    const { position, scale } = this.calculateRadarPosition();
    this.radarContainer.setLocalPosition(position.x, position.y, position.z);
    this.radarContainer.setLocalScale(scale, scale, scale);

    // Add to camera
    this.camera.addChild(this.radarContainer);

    console.log('[Radar3D] Container created at position:', position, 'scale:', scale);

    // Load GLB model
    const asset = new pc.Asset('radar', 'container', {
      url: 'assets/rader.glb'
    });

    asset.on('load', () => {
      console.log('[Radar3D] GLB asset loaded');
      if (asset.resource) {
        // Instantiate the model - container resource has instantiateRenderEntity method
        const containerResource = asset.resource as any;
        if (containerResource.instantiateRenderEntity) {
          this.radarBase = containerResource.instantiateRenderEntity();
          console.log('[Radar3D] Used instantiateRenderEntity');
        } else if (containerResource.instantiate) {
          this.radarBase = containerResource.instantiate();
          console.log('[Radar3D] Used instantiate');
        }

        if (this.radarBase && this.radarPivot) {
          this.radarBase.name = 'RadarBase';

          // Calculate bounding box to center the model
          const renders = this.radarBase.findComponents('render') as pc.RenderComponent[];
          if (renders.length > 0) {
            const aabb = new pc.BoundingBox();
            let first = true;
            for (const render of renders) {
              for (const mi of render.meshInstances) {
                if (first) {
                  aabb.copy(mi.aabb);
                  first = false;
                } else {
                  aabb.add(mi.aabb);
                }
              }
            }
            // Offset the model so its center is at the pivot origin
            const center = aabb.center;
            this.radarBase.setLocalPosition(-center.x, -center.y, -center.z);
            console.log('[Radar3D] Model centered, offset:', -center.x, -center.y, -center.z);
          }

          this.radarPivot.addChild(this.radarBase);
          console.log('[Radar3D] RadarBase added to pivot');

          // Apply holographic material to the model
          this.applyHolographicMaterial(this.radarBase);
        } else {
          console.error('[Radar3D] Failed to instantiate radar model');
          this.createFallbackRadar();
        }
      }
    });

    asset.on('error', (err: string) => {
      console.error('Failed to load radar model:', err);
      // Fallback: create a simple sphere
      this.createFallbackRadar();
    });

    this.app.assets.add(asset);
    this.app.assets.load(asset);
  }

  /**
   * Apply holographic material to radar model
   */
  private applyHolographicMaterial(entity: pc.Entity): void {
    const holoMaterial = new pc.StandardMaterial();
    holoMaterial.diffuse = new pc.Color(0, 0.15, 0.15);
    holoMaterial.emissive = new pc.Color(0, 0.5, 0.5);  // Reduced cyan intensity
    holoMaterial.emissiveIntensity = 1.0;
    holoMaterial.opacity = 0.4;
    holoMaterial.blendType = pc.BLEND_ADDITIVE;
    holoMaterial.depthWrite = false;
    holoMaterial.depthTest = true;
    holoMaterial.useLighting = false;
    holoMaterial.cull = pc.CULLFACE_NONE;
    holoMaterial.update();

    // Apply to all mesh instances and set render order
    const renders = entity.findComponents('render') as pc.RenderComponent[];
    for (const render of renders) {
      for (const meshInstance of render.meshInstances) {
        meshInstance.material = holoMaterial;
        // Lower draw order so markers render on top
        meshInstance.drawOrder = 50;
      }
    }
    console.log('[Radar3D] Applied holographic material to', renders.length, 'render components');
  }

  /**
   * Create fallback radar if GLB fails to load
   */
  private createFallbackRadar(): void {
    if (!this.radarContainer) return;

    this.radarBase = new pc.Entity('RadarBaseFallback');
    this.radarBase.addComponent('render', { type: 'sphere' });

    const fallbackMaterial = new pc.StandardMaterial();
    fallbackMaterial.diffuse = new pc.Color(0, 0.1, 0.1);
    fallbackMaterial.emissive = new pc.Color(0, 0.6, 0.6);
    fallbackMaterial.emissiveIntensity = 0.5;
    fallbackMaterial.opacity = 0.3;
    fallbackMaterial.blendType = pc.BLEND_ADDITIVE;
    fallbackMaterial.depthWrite = false;
    fallbackMaterial.useLighting = false;
    fallbackMaterial.cull = pc.CULLFACE_NONE;
    fallbackMaterial.update();

    if (this.radarBase.render) {
      this.radarBase.render.meshInstances[0].material = fallbackMaterial;
    }

    this.radarBase.setLocalScale(1, 1, 1);
    this.radarContainer.addChild(this.radarBase);
  }

  /**
   * Get or create an enemy marker from pool
   */
  private getMarker(): pc.Entity {
    // Try to reuse from pool
    if (this.markerPool.length > 0) {
      const marker = this.markerPool.pop()!;
      marker.enabled = true;
      return marker;
    }

    // Create new marker
    const marker = new pc.Entity('EnemyMarker');
    marker.addComponent('render', { type: 'sphere' });

    // Create blip material: solid red (no additive blend to avoid color mixing)
    const redMat = new pc.StandardMaterial();
    redMat.diffuse = new pc.Color(0.8, 0, 0);
    redMat.emissive = new pc.Color(1, 0, 0);
    redMat.emissiveIntensity = 1.0;
    redMat.blendType = pc.BLEND_NONE;  // Solid, no blending
    redMat.depthWrite = true;
    redMat.depthTest = false;  // Always render on top
    redMat.useLighting = false;
    redMat.update();

    if (marker.render) {
      marker.render.meshInstances[0].material = redMat;
      marker.render.meshInstances[0].drawOrder = 500;
    }

    marker.setLocalScale(
      this.config.markerSize,
      this.config.markerSize,
      this.config.markerSize
    );

    if (this.radarContainer) {
      // Add to container directly for proper positioning
      this.radarContainer.addChild(marker);
    }

    return marker;
  }

  /**
   * Return marker to pool
   */
  private releaseMarker(marker: pc.Entity): void {
    marker.enabled = false;
    this.markerPool.push(marker);
  }

  /**
   * Update radar display - shows enemies as 3D blips within radar sphere
   * Based on spec: Apply Player's Inverse Rotation to map to local radar space
   */
  public update(): void {
    if (!this.radarContainer || !this.radarPivot) return;

    // 1. Reset all blips in the pool to disabled
    for (const marker of this.enemyMarkers) {
      this.releaseMarker(marker);
    }
    this.enemyMarkers = [];

    // 2. Find all entities with tag 'Enemy'
    const enemies = this.app.root.findByTag('Enemy');
    const playerPos = this.camera.getPosition();
    const playerRot = this.camera.getRotation();

    // Get inverse rotation for coordinate transformation
    const invRot = new pc.Quat().copy(playerRot).invert();

    // 3. Loop through enemies and map to blips
    for (const enemy of enemies) {
      const enemyPos = enemy.getPosition();

      // a. Calculate relative position: (EnemyPos - PlayerPos)
      const relativePos = new pc.Vec3().sub2(enemyPos, playerPos);

      // b. Check distance: If length > scanRange, skip
      const distance = relativePos.length();
      if (distance > this.config.detectionRange) continue;

      // c. Rotate coordinate: Apply Player's Inverse Rotation to match local radar space
      const localPos = invRot.transformVector(relativePos, new pc.Vec3());

      // d. Scale position: (relativePos * (radarRadius / scanRange))
      const scaleFactor = this.config.radarRadius / this.config.detectionRange;
      const radarX = localPos.x * scaleFactor;
      const radarY = localPos.y * scaleFactor;
      const radarZ = localPos.z * scaleFactor;

      // e. Activate a blip and set its local position
      // In radar local space: X=right, Y=up, -Z=forward (towards top of radar display)
      const marker = this.getMarker();
      marker.setLocalPosition(radarX, 0.52 + radarY * 0.5, -radarZ);

      const scale = this.config.markerSize;
      marker.setLocalScale(scale, scale, scale);

      this.enemyMarkers.push(marker);
    }

    // Slow rotation animation for radar base
    if (this.radarBase) {
      const currentRot = this.radarBase.getLocalEulerAngles();
      this.radarBase.setLocalEulerAngles(currentRot.x, currentRot.y + 0.15, currentRot.z);
    }
  }

  /**
   * Set radar visibility
   */
  public setVisible(visible: boolean): void {
    if (this.radarContainer) {
      this.radarContainer.enabled = visible;
    }
  }

  /**
   * Destroy the radar system
   */
  public destroy(): void {
    // Destroy all markers
    for (const marker of this.enemyMarkers) {
      marker.destroy();
    }
    for (const marker of this.markerPool) {
      marker.destroy();
    }
    this.enemyMarkers = [];
    this.markerPool = [];

    // Destroy radar container
    if (this.radarContainer) {
      this.radarContainer.destroy();
      this.radarContainer = null;
    }

    this.radarBase = null;
  }
}
