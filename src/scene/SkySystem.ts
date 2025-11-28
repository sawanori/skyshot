/**
 * SkySystem.ts - Dynamic cinematic sky rendering system
 *
 * Creates an immersive atmospheric sky with:
 * - Volumetric clouds that drift and evolve
 * - Dynamic sun with god rays
 * - Atmospheric scattering gradient
 * - Distant cloud layers for depth
 */

import * as pc from 'playcanvas';

// Sky configuration
const SKY_CONFIG = {
  // Gradient colors for sky (top to bottom)
  skyColors: {
    zenith: new pc.Color(0.15, 0.35, 0.65),      // Deep blue at top
    horizon: new pc.Color(0.6, 0.8, 1.0),         // Light blue at horizon
    sunGlow: new pc.Color(1.0, 0.95, 0.8),        // Warm sun color
  },

  // Sun settings
  sun: {
    position: new pc.Vec3(200, 150, -300),
    size: 30,
    glowSize: 80,
    color: new pc.Color(1.0, 0.98, 0.9),
    intensity: 2.0,
  },

  // Cloud layers
  clouds: {
    // High altitude wispy clouds
    highLayer: {
      count: 25,
      minHeight: 80,
      maxHeight: 150,
      minDistance: 100,
      maxDistance: 400,
      minScale: 30,
      maxScale: 80,
      speed: 2,
      opacity: 0.6,
    },
    // Mid-level cumulus clouds
    midLayer: {
      count: 15,
      minHeight: 40,
      maxHeight: 80,
      minDistance: 80,
      maxDistance: 250,
      minScale: 20,
      maxScale: 50,
      speed: 4,
      opacity: 0.8,
    },
    // Distant horizon clouds
    distantLayer: {
      count: 20,
      minHeight: 20,
      maxHeight: 60,
      minDistance: 300,
      maxDistance: 500,
      minScale: 50,
      maxScale: 150,
      speed: 1,
      opacity: 0.4,
    },
  },
};

/**
 * Sky System Manager - Creates and manages the dynamic sky
 */
class SkySystemManager {
  private static instance: SkySystemManager;
  private app: pc.Application | null = null;
  private player: pc.Entity | null = null;

  private skyDome: pc.Entity | null = null;
  private sunEntity: pc.Entity | null = null;
  private sunGlow: pc.Entity | null = null;
  private clouds: pc.Entity[] = [];
  private godRays: pc.Entity[] = [];

  private elapsedTime: number = 0;

  private constructor() {}

  public static getInstance(): SkySystemManager {
    if (!SkySystemManager.instance) {
      SkySystemManager.instance = new SkySystemManager();
    }
    return SkySystemManager.instance;
  }

  public initialize(app: pc.Application): void {
    this.app = app;

    // Create sky elements
    this.createSkyGradient();
    this.createSun();
    this.createGodRays();
    this.createCloudLayers();

    // Set up update loop
    app.on('update', this.update.bind(this));
  }

  public setPlayer(player: pc.Entity): void {
    this.player = player;
  }

  /**
   * Create the sky gradient dome
   */
  private createSkyGradient(): void {
    if (!this.app) return;

    // Create a large sphere for the sky dome
    this.skyDome = new pc.Entity('SkyDome');
    this.skyDome.addComponent('render', { type: 'sphere' });

    // Create sky material with emissive gradient
    const skyMaterial = new pc.StandardMaterial();
    skyMaterial.diffuse = new pc.Color(0, 0, 0);
    skyMaterial.emissive = SKY_CONFIG.skyColors.horizon;
    skyMaterial.emissiveIntensity = 1.0;
    skyMaterial.cull = pc.CULLFACE_FRONT; // Render inside of sphere
    skyMaterial.depthWrite = false;
    skyMaterial.update();

    if (this.skyDome.render) {
      this.skyDome.render.meshInstances[0].material = skyMaterial;
    }

    this.skyDome.setLocalScale(1000, 1000, 1000);
    this.skyDome.setPosition(0, 0, 0);
    this.app.root.addChild(this.skyDome);
  }

  /**
   * Create the sun with glow effect
   */
  private createSun(): void {
    if (!this.app) return;

    const sunPos = SKY_CONFIG.sun.position;

    // Main sun disc
    this.sunEntity = new pc.Entity('Sun');
    this.sunEntity.addComponent('render', { type: 'sphere' });

    const sunMaterial = new pc.StandardMaterial();
    sunMaterial.diffuse = new pc.Color(0, 0, 0);
    sunMaterial.emissive = SKY_CONFIG.sun.color;
    sunMaterial.emissiveIntensity = SKY_CONFIG.sun.intensity;
    sunMaterial.blendType = pc.BLEND_ADDITIVE;
    sunMaterial.depthWrite = false;
    sunMaterial.update();

    if (this.sunEntity.render) {
      this.sunEntity.render.meshInstances[0].material = sunMaterial;
    }

    this.sunEntity.setLocalScale(SKY_CONFIG.sun.size, SKY_CONFIG.sun.size, SKY_CONFIG.sun.size);
    this.sunEntity.setPosition(sunPos.x, sunPos.y, sunPos.z);
    this.app.root.addChild(this.sunEntity);

    // Sun glow (larger, more transparent)
    this.sunGlow = new pc.Entity('SunGlow');
    this.sunGlow.addComponent('render', { type: 'sphere' });

    const glowMaterial = new pc.StandardMaterial();
    glowMaterial.diffuse = new pc.Color(0, 0, 0);
    glowMaterial.emissive = new pc.Color(1.0, 0.9, 0.7);
    glowMaterial.emissiveIntensity = 0.5;
    glowMaterial.blendType = pc.BLEND_ADDITIVE;
    glowMaterial.depthWrite = false;
    glowMaterial.opacity = 0.3;
    glowMaterial.update();

    if (this.sunGlow.render) {
      this.sunGlow.render.meshInstances[0].material = glowMaterial;
    }

    this.sunGlow.setLocalScale(SKY_CONFIG.sun.glowSize, SKY_CONFIG.sun.glowSize, SKY_CONFIG.sun.glowSize);
    this.sunGlow.setPosition(sunPos.x, sunPos.y, sunPos.z);
    this.app.root.addChild(this.sunGlow);
  }

  /**
   * Create god rays emanating from the sun
   */
  private createGodRays(): void {
    if (!this.app) return;

    const sunPos = SKY_CONFIG.sun.position;
    const rayCount = 8;

    for (let i = 0; i < rayCount; i++) {
      const ray = new pc.Entity(`GodRay_${i}`);
      ray.addComponent('render', { type: 'box' });

      const rayMaterial = new pc.StandardMaterial();
      rayMaterial.diffuse = new pc.Color(0, 0, 0);
      rayMaterial.emissive = new pc.Color(1.0, 0.95, 0.8);
      rayMaterial.emissiveIntensity = 0.3;
      rayMaterial.blendType = pc.BLEND_ADDITIVE;
      rayMaterial.depthWrite = false;
      rayMaterial.opacity = 0.15;
      rayMaterial.update();

      if (ray.render) {
        ray.render.meshInstances[0].material = rayMaterial;
      }

      // Create elongated ray
      const angle = (i / rayCount) * Math.PI * 2;
      const rayLength = 150 + Math.random() * 100;
      const rayWidth = 3 + Math.random() * 4;

      ray.setLocalScale(rayWidth, rayWidth, rayLength);
      ray.setPosition(sunPos.x, sunPos.y, sunPos.z);

      // Rotate ray outward from sun
      ray.setEulerAngles(
        Math.cos(angle) * 30,
        angle * (180 / Math.PI),
        Math.sin(angle) * 30
      );

      this.app.root.addChild(ray);
      this.godRays.push(ray);
    }
  }

  /**
   * Create volumetric cloud layers
   */
  private createCloudLayers(): void {
    if (!this.app) return;

    // Create high altitude clouds
    this.createCloudLayer(SKY_CONFIG.clouds.highLayer, 'high');

    // Create mid-level clouds
    this.createCloudLayer(SKY_CONFIG.clouds.midLayer, 'mid');

    // Create distant horizon clouds
    this.createCloudLayer(SKY_CONFIG.clouds.distantLayer, 'distant');
  }

  /**
   * Create a single layer of clouds
   */
  private createCloudLayer(config: typeof SKY_CONFIG.clouds.highLayer, layerName: string): void {
    if (!this.app) return;

    for (let i = 0; i < config.count; i++) {
      const cloud = this.createCloud(config, layerName, i);
      if (cloud) {
        this.clouds.push(cloud);
        this.app.root.addChild(cloud);
      }
    }
  }

  /**
   * Create a single cloud entity composed of multiple spheres
   */
  private createCloud(
    config: typeof SKY_CONFIG.clouds.highLayer,
    layerName: string,
    index: number
  ): pc.Entity | null {
    if (!this.app) return null;

    const cloudGroup = new pc.Entity(`Cloud_${layerName}_${index}`);

    // Random position around origin
    const angle = Math.random() * Math.PI * 2;
    const distance = config.minDistance + Math.random() * (config.maxDistance - config.minDistance);
    const height = config.minHeight + Math.random() * (config.maxHeight - config.minHeight);

    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    cloudGroup.setPosition(x, height, z);

    // Create cloud material
    const cloudMaterial = new pc.StandardMaterial();
    cloudMaterial.diffuse = new pc.Color(0.95, 0.97, 1.0);
    cloudMaterial.emissive = new pc.Color(0.9, 0.95, 1.0);
    cloudMaterial.emissiveIntensity = 0.3;
    cloudMaterial.opacity = config.opacity * (0.5 + Math.random() * 0.5);
    cloudMaterial.blendType = pc.BLEND_NORMAL;
    cloudMaterial.depthWrite = false;
    cloudMaterial.update();

    // Create multiple spheres to form a cloud
    const puffCount = 3 + Math.floor(Math.random() * 4);
    const baseScale = config.minScale + Math.random() * (config.maxScale - config.minScale);

    for (let p = 0; p < puffCount; p++) {
      const puff = new pc.Entity(`CloudPuff_${p}`);
      puff.addComponent('render', { type: 'sphere' });

      if (puff.render) {
        puff.render.meshInstances[0].material = cloudMaterial;
      }

      // Random offset within cloud
      const puffScale = baseScale * (0.5 + Math.random() * 0.5);
      const offsetX = (Math.random() - 0.5) * baseScale * 0.8;
      const offsetY = (Math.random() - 0.5) * baseScale * 0.3;
      const offsetZ = (Math.random() - 0.5) * baseScale * 0.8;

      puff.setLocalPosition(offsetX, offsetY, offsetZ);
      puff.setLocalScale(puffScale, puffScale * 0.6, puffScale);

      cloudGroup.addChild(puff);
    }

    // Store cloud data for animation
    (cloudGroup as any).cloudData = {
      baseAngle: angle,
      distance: distance,
      height: height,
      speed: config.speed * (0.5 + Math.random() * 0.5),
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 0.5 + Math.random() * 0.5,
      bobAmount: 1 + Math.random() * 2,
    };

    return cloudGroup;
  }

  /**
   * Update sky system each frame
   */
  private update(dt: number): void {
    this.elapsedTime += dt;

    // Update sky dome position to follow player
    if (this.player && this.skyDome) {
      const playerPos = this.player.getPosition();
      this.skyDome.setPosition(playerPos.x, playerPos.y - 100, playerPos.z);
    }

    // Update sun position relative to player
    if (this.player && this.sunEntity && this.sunGlow) {
      const playerPos = this.player.getPosition();
      const sunOffset = SKY_CONFIG.sun.position;

      this.sunEntity.setPosition(
        playerPos.x + sunOffset.x,
        sunOffset.y,
        playerPos.z + sunOffset.z
      );

      this.sunGlow.setPosition(
        playerPos.x + sunOffset.x,
        sunOffset.y,
        playerPos.z + sunOffset.z
      );

      // Animate sun glow pulsing
      const glowScale = SKY_CONFIG.sun.glowSize * (1 + Math.sin(this.elapsedTime * 0.5) * 0.1);
      this.sunGlow.setLocalScale(glowScale, glowScale, glowScale);
    }

    // Update god rays position and rotation
    if (this.player) {
      const playerPos = this.player.getPosition();
      const sunOffset = SKY_CONFIG.sun.position;

      this.godRays.forEach((ray, i) => {
        ray.setPosition(
          playerPos.x + sunOffset.x,
          sunOffset.y,
          playerPos.z + sunOffset.z
        );

        // Slowly rotate rays
        const currentAngles = ray.getLocalEulerAngles();
        ray.setLocalEulerAngles(
          currentAngles.x,
          currentAngles.y + dt * 2,
          currentAngles.z
        );
      });
    }

    // Update clouds
    this.updateClouds(dt);
  }

  /**
   * Update cloud positions and animations
   */
  private updateClouds(dt: number): void {
    if (!this.player) return;

    const playerPos = this.player.getPosition();

    this.clouds.forEach((cloud) => {
      const data = (cloud as any).cloudData;
      if (!data) return;

      // Move cloud around player in a circle
      data.baseAngle += dt * data.speed * 0.01;

      const x = playerPos.x + Math.cos(data.baseAngle) * data.distance;
      const z = playerPos.z + Math.sin(data.baseAngle) * data.distance;

      // Gentle bobbing motion
      const bob = Math.sin(this.elapsedTime * data.bobSpeed + data.bobPhase) * data.bobAmount;

      cloud.setPosition(x, data.height + bob, z);
    });
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.skyDome) this.skyDome.destroy();
    if (this.sunEntity) this.sunEntity.destroy();
    if (this.sunGlow) this.sunGlow.destroy();

    this.godRays.forEach((ray) => ray.destroy());
    this.clouds.forEach((cloud) => cloud.destroy());

    this.godRays = [];
    this.clouds = [];
  }
}

// Export singleton instance
export const skySystemManager = SkySystemManager.getInstance();

/**
 * Initialize the sky system
 */
export function createSkySystem(app: pc.Application): void {
  skySystemManager.initialize(app);
}

/**
 * Set the player for sky system to follow
 */
export function setSkyPlayer(player: pc.Entity): void {
  skySystemManager.setPlayer(player);
}
