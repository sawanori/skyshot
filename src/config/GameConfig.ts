/**
 * GameConfig.ts - Centralized game configuration
 *
 * All game constants and configuration values are defined here
 * to enable easy tuning and maintain consistency across the codebase.
 */

import * as pc from 'playcanvas';

// ============================================================================
// Scene Configuration
// ============================================================================
export const SCENE_CONFIG = {
  // Deep azure sky gradient background
  clearColor: new pc.Color(0.15, 0.35, 0.65),
  ambientLight: new pc.Color(0.6, 0.7, 0.85),
  fog: {
    type: pc.FOG_LINEAR,
    // Atmospheric haze - light blue fading to white at horizon
    color: new pc.Color(0.6, 0.75, 0.95),
    start: 250,
    end: 600,
  },
} as const;

// ============================================================================
// Camera Configuration
// ============================================================================
export const CAMERA_CONFIG = {
  fov: 60,
  nearClip: 0.1,
  farClip: 1000,
  initialPosition: { x: 0, y: 5, z: 15 },
} as const;

// ============================================================================
// Lighting Configuration
// ============================================================================
export const LIGHT_CONFIG = {
  directional: {
    color: new pc.Color(1, 0.9, 0.8),
    intensity: 1.0,
    castShadows: true,
    shadowBias: 0.2,
    shadowDistance: 100,
    shadowResolution: 2048,
    eulerAngles: { x: 45, y: 135, z: 0 },
  },
} as const;

// ============================================================================
// Grid Floor Configuration
// ============================================================================
export const GRID_CONFIG = {
  size: 500,
  divisions: 50,
  lineColor: new pc.Color(0, 1, 1),
  position: { x: 0, y: 0, z: -200 },
} as const;

// ============================================================================
// Enemy Configuration
// ============================================================================
export const ENEMY_CONFIG = {
  cubeSize: 2,
  emissiveIntensity: 1.5,
  hitFlashIntensity: 4,
  hitFlashDuration: 100,
  colors: [
    new pc.Color(1, 0, 0),     // Red (high contrast against blue sky)
    new pc.Color(1, 0, 0.5),   // Pink
    new pc.Color(0.8, 0, 0.8), // Magenta
    new pc.Color(1, 0.3, 0),   // Orange-Red
    new pc.Color(0.6, 0, 1),   // Purple
    new pc.Color(1, 0.8, 0),   // Gold/Yellow
    new pc.Color(0.2, 0.2, 0.2), // Dark gray/black
    new pc.Color(1, 0.5, 0.5), // Light Red
    new pc.Color(0.5, 0, 0.5), // Dark Purple
    new pc.Color(0.8, 0.4, 0), // Dark Orange
  ],
  waves: {
    wave1: { count: 5, xSpread: 30, yMin: 3, yMax: 18, zStart: -20, zRange: 30 },
    wave2: { count: 8, xSpread: 50, yMin: 5, yMax: 30, zStart: -60, zRange: 60 },
    wave3: { count: 10, xSpread: 60, yMin: 5, yMax: 40, zStart: -130, zRange: 70 },
    wave4: { count: 12, xSpread: 80, yMin: 3, yMax: 43, zStart: -220, zRange: 130 },
    wave5: { count: 15, xSpread: 100, yMin: 5, yMax: 50, zStart: -400, zRange: 200 },
  },
  formations: {
    v1: { y: 15, zBase: -80, spacing: 10 },
    v2: { y: 30, zBase: -180, spacing: 12 },
    line: { y: 20, z: -280, spacing: 15, count: 7 },
  },
  highAltitudeTargets: [
    { x: 0, y: 45, z: -150 },
    { x: -30, y: 40, z: -250 },
    { x: 30, y: 42, z: -300 },
    { x: 0, y: 48, z: -400 },
    { x: -20, y: 44, z: -500 },
    { x: 20, y: 46, z: -550 },
  ],
} as const;

// ============================================================================
// Radar Configuration
// ============================================================================
export const RADAR_CONFIG = {
  maxDistance: 300,
  updateInterval: 100, // ms
} as const;

// ============================================================================
// HUD Configuration
// ============================================================================
export const HUD_CONFIG = {
  fpsUpdateInterval: 500, // ms
} as const;

// ============================================================================
// Player Configuration
// ============================================================================
export const PLAYER_CONFIG = {
  startPosition: { x: 0, y: 5, z: 15 },
  autoForwardSpeed: 15,
  moveSpeed: 20,
  lookSensitivity: 0.3,
  maxPitch: 85,
  verticalSpeed: 10,
  rotationSpeed: 45,
} as const;

// ============================================================================
// Weapon Configuration
// ============================================================================
export const WEAPON_CONFIG = {
  damage: 25,
  range: 500,
  fireRate: 0.15,
  knockbackForce: 15,
  knockbackDuration: 0.3,
  tracer: {
    color: new pc.Color(0, 1, 1),
    width: 0.05,
    duration: 0.1,
  },
  cameraShake: {
    intensity: 0.08,
    duration: 0.1,
  },
} as const;

// ============================================================================
// Input Zone Configuration (for touch controls)
// ============================================================================
export const INPUT_ZONES = {
  joystick: 0.4,   // Left 40% of screen
  camera: 0.45,    // Middle 45% of screen
  altitude: 0.15,  // Right 15% of screen
} as const;
