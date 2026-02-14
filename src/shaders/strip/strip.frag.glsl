#version 300 es
precision highp float;

uniform vec4 uColor;
uniform float uOpacity;

layout(location=0) out vec4 accumColor;
layout(location=1) out float accumAlpha;

float weight(float z, float a) {
    return clamp(pow(min(1.0, a * 10.0) + 0.01, 3.0) * 3e3 * pow(1.0 - z, 3.0), 1e-6, 3e3);
    //return clamp(pow(min(1.0, a * 10.0) + 0.01, 3.0) * 1e8 * pow(1.0 - z * 0.9, 3.0), 1e-2, 3e3);
}

void main(void) {
    //gl_FragColor = vec4(uColor.rgb, uColor.a * uOpacity);

    vec4 color = vec4(uColor.rgb, uColor.a * uOpacity);
    color.rgb *= color.a;
    float w = weight(gl_FragCoord.z, color.a);
    accumColor = vec4(color.rgb * w, color.a);
    accumAlpha = color.a * w;
}
