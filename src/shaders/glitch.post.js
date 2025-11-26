/**
 * glitch.post.js - Glitch post-processing effect
 *
 * Creates retro-cyber visual effects:
 * - RGB shift/chromatic aberration
 * - Scanlines
 * - Random glitch distortion
 * - VHS-style noise
 */

// Vertex shader
const glitchVert = /* glsl */ `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
    vUv = (aPosition + 1.0) * 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// Fragment shader
const glitchFrag = /* glsl */ `
precision mediump float;

varying vec2 vUv;

uniform sampler2D uColorBuffer;
uniform float uTime;
uniform float uIntensity;
uniform float uScanlineIntensity;
uniform float uRgbShiftAmount;
uniform float uNoiseAmount;
uniform vec2 uResolution;

// Pseudo-random function
float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = vUv;

    // Random glitch offset (occasional)
    float glitchStrength = step(0.99, random(vec2(uTime * 0.1, 0.0))) * uIntensity;

    if (glitchStrength > 0.0) {
        float glitchLine = step(0.5, random(vec2(floor(uv.y * 20.0), uTime)));
        uv.x += glitchLine * (random(vec2(uTime, uv.y)) - 0.5) * 0.1 * glitchStrength;
    }

    // RGB shift (chromatic aberration)
    float rgbShift = uRgbShiftAmount * (1.0 + glitchStrength * 3.0);
    vec2 direction = normalize(uv - 0.5);

    float r = texture2D(uColorBuffer, uv + direction * rgbShift).r;
    float g = texture2D(uColorBuffer, uv).g;
    float b = texture2D(uColorBuffer, uv - direction * rgbShift).b;

    vec3 color = vec3(r, g, b);

    // Scanlines
    float scanline = sin(uv.y * uResolution.y * 2.0) * 0.5 + 0.5;
    scanline = pow(scanline, 1.5);
    color = mix(color, color * scanline, uScanlineIntensity);

    // VHS noise
    float noiseVal = noise(uv * uResolution * 0.5 + uTime * 100.0);
    color += (noiseVal - 0.5) * uNoiseAmount;

    // Vignette
    float vignette = 1.0 - length(uv - 0.5) * 0.5;
    color *= vignette;

    // Slight color grading (cyan/magenta tint)
    color.r *= 0.95;
    color.b *= 1.05;

    gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * GlitchEffect class for PlayCanvas post-processing
 */
class GlitchEffect {
    constructor(app) {
        this.app = app;
        this.intensity = 0.5;
        this.scanlineIntensity = 0.1;
        this.rgbShiftAmount = 0.002;
        this.noiseAmount = 0.02;

        this.shader = null;
        this.vertexBuffer = null;

        this.init();
    }

    init() {
        const device = this.app.graphicsDevice;

        // Create shader
        this.shader = new pc.Shader(device, {
            attributes: {
                aPosition: pc.SEMANTIC_POSITION
            },
            vshader: glitchVert,
            fshader: glitchFrag
        });

        // Create fullscreen quad
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
             1,  1,
            -1,  1
        ]);

        this.vertexBuffer = new pc.VertexBuffer(device, new pc.VertexFormat(device, [
            { semantic: pc.SEMANTIC_POSITION, components: 2, type: pc.TYPE_FLOAT32 }
        ]), 4, pc.BUFFER_STATIC, vertices);
    }

    render(inputTarget, outputTarget, time) {
        const device = this.app.graphicsDevice;

        device.setRenderTarget(outputTarget);
        device.updateBegin();

        device.setBlending(false);
        device.setDepthTest(false);
        device.setDepthWrite(false);
        device.setCullMode(pc.CULLFACE_NONE);

        device.scope.resolve('uColorBuffer').setValue(inputTarget.colorBuffer);
        device.scope.resolve('uTime').setValue(time);
        device.scope.resolve('uIntensity').setValue(this.intensity);
        device.scope.resolve('uScanlineIntensity').setValue(this.scanlineIntensity);
        device.scope.resolve('uRgbShiftAmount').setValue(this.rgbShiftAmount);
        device.scope.resolve('uNoiseAmount').setValue(this.noiseAmount);
        device.scope.resolve('uResolution').setValue([device.width, device.height]);

        device.setShader(this.shader);
        device.setVertexBuffer(this.vertexBuffer, 0);
        device.draw({
            type: pc.PRIMITIVE_TRISTRIP,
            base: 0,
            count: 4,
            indexed: false
        });

        device.updateEnd();
    }

    destroy() {
        if (this.vertexBuffer) {
            this.vertexBuffer.destroy();
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GlitchEffect, glitchVert, glitchFrag };
}
