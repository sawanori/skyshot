/**
 * MathHelpers.ts - Math utility functions
 *
 * Common math operations for game development
 */

import * as pc from 'playcanvas';

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smooth step interpolation (ease in/out)
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate distance between two points on XZ plane (ignoring Y)
 */
export function distanceXZ(a: pc.Vec3, b: pc.Vec3): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Calculate angle between two points on XZ plane
 * Returns angle in radians
 */
export function angleXZ(from: pc.Vec3, to: pc.Vec3): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return Math.atan2(dx, dz);
}

/**
 * Normalize an angle to the range [-PI, PI]
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/**
 * Calculate shortest angle difference between two angles
 */
export function angleDifference(from: number, to: number): number {
  let diff = normalizeAngle(to - from);
  return diff;
}

/**
 * Random float between min and max (inclusive)
 */
export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random point within a circle on XZ plane
 */
export function randomPointInCircle(center: pc.Vec3, radius: number): pc.Vec3 {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return new pc.Vec3(
    center.x + Math.cos(angle) * r,
    center.y,
    center.z + Math.sin(angle) * r
  );
}

/**
 * Exponential decay (useful for smooth following)
 */
export function expDecay(a: number, b: number, decay: number, dt: number): number {
  return b + (a - b) * Math.exp(-decay * dt);
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}
