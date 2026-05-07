#version 300 es
precision highp float;

#include "../common/weightedOIT.glsl"

uniform sampler2D u_texture;

in vec2 v_texCoords;
in vec4 v_rgba;

layout(location = 0) out vec4 accumColor;
layout(location = 1) out float accumAlpha;

void main() {
    vec4 color = texture(u_texture, v_texCoords) * v_rgba;
//    if (color.a < 0.1) {
//        discard;
//    }
    weightedOITAccumulate(color, accumColor, accumAlpha);
}
