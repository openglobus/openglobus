#version 300 es
precision highp float;

uniform vec4 uColor;
uniform float uOpacity;
uniform float uNear;
uniform float uFar;

layout(location=0) out vec4 accumColor;
layout(location=1) out float accumAlpha;

in float vViewDepth;

float weight(float viewDepth, float a) {
    // Depth term must stay sensitive when far is huge.
    // Log-normalize view depth into [0..1] and use exponential falloff (not flat near 1).
    float n = max(uNear, 1e-3);
    float f = max(uFar, n + 1.0);
    float z = log2(1.0 + clamp(viewDepth, n, f)) / log2(1.0 + f);
    float w = pow(min(1.0, a * 10.0) + 0.01, 3.0) * 3e3 * exp2(-24.0 * z);
    return clamp(w, 1e-6, 3e3);
}

void main(void) {
    //gl_FragColor = vec4(uColor.rgb, uColor.a * uOpacity);

    vec4 color = vec4(uColor.rgb, uColor.a * uOpacity);
    color.rgb *= color.a;
    float w = weight(vViewDepth, color.a);
    accumColor = vec4(color.rgb * w, color.a);
    accumAlpha = color.a * w;
}
