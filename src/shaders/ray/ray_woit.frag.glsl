#version 300 es
precision highp float;

#include "../common/weightedOIT.glsl"

uniform sampler2D texAtlas;

in vec4 v_rgba;
in vec4 v_texCoord;
in float v_texOffset;
flat in float repeat;

layout(location=0) out vec4 accumColor;
layout(location=1) out float accumAlpha;

void main() {
    vec4 color;
    float height = v_texCoord.w;

    if (height == 0.0) {
        color = v_rgba;
    } else {
        vec2 uv = v_texCoord.xy;
        float min = v_texCoord.z;

        float EPS = 0.5 / 1024.0; //Atlas height

        float localY = fract((uv.y + v_texOffset - min) / height * repeat);
        uv.y = clamp(min + localY * height, min + EPS, min + height - EPS);

        color = v_rgba * texture(texAtlas, uv);
    }

    weightedOITAccumulate(color, accumColor, accumAlpha);
}
