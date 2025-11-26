/**
 * retro_grid.frag - Retro neon grid floor shader
 *
 * Creates a glowing grid effect for the floor
 * Based on PS1 low-poly aesthetic with modern neon effects
 */

precision mediump float;

varying vec2 vUv;
varying vec3 vWorldPosition;

uniform float uTime;
uniform vec3 uGridColor;
uniform float uGridSpacing;
uniform float uGridThickness;
uniform float uGlowIntensity;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec3 uFogColor;

// Grid line function
float gridLine(float coord, float spacing, float thickness) {
    float grid = abs(fract(coord / spacing - 0.5) - 0.5);
    return smoothstep(thickness, thickness * 2.0, grid);
}

// Glow effect
float glow(float dist, float intensity) {
    return intensity / (dist * dist + 0.01);
}

void main() {
    // Calculate grid
    float gridX = gridLine(vWorldPosition.x, uGridSpacing, uGridThickness);
    float gridZ = gridLine(vWorldPosition.z, uGridSpacing, uGridThickness);
    float grid = min(gridX, gridZ);

    // Invert for line visibility
    float lineIntensity = 1.0 - grid;

    // Add animated pulse
    float pulse = sin(uTime * 2.0 + length(vWorldPosition.xz) * 0.1) * 0.2 + 0.8;
    lineIntensity *= pulse;

    // Calculate glow
    float glowAmount = lineIntensity * uGlowIntensity;

    // Base color
    vec3 color = mix(vec3(0.0), uGridColor, lineIntensity);

    // Add glow
    color += uGridColor * glowAmount * 0.5;

    // Apply distance fog
    float dist = length(vWorldPosition.xz);
    float fogFactor = smoothstep(uFogStart, uFogEnd, dist);
    color = mix(color, uFogColor, fogFactor);

    // Alpha based on line intensity
    float alpha = max(lineIntensity * 0.8, 0.1);

    gl_FragColor = vec4(color, alpha);
}
