#version 300 es
precision highp float;

#include "../common/weightedOIT.glsl"

uniform vec4 uColor;
uniform float uOpacity;

layout(location=0) out vec4 accumColor;
layout(location=1) out float accumAlpha;


void main(void) {
    vec4 color = vec4(uColor.rgb, uColor.a * uOpacity);

    weightedOITAccumulate(color, accumColor, accumAlpha);
}
