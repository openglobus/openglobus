#version 300 es

uniform int isOutlinePass;

precision highp float;

#include "../common/weightedOIT.glsl"

const int MAX_SIZE = 11;

uniform highp sampler2DArray fontTextureArr;
uniform vec4 sdfParamsArr[MAX_SIZE];

flat in int v_fontIndex;
in vec2 v_uv;
in vec4 v_rgba;
flat in float v_outline;

layout(location = 0) out vec4 accumColor;
layout(location = 1) out float accumAlpha;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float getDistance() {
    vec3 msdf = texture(fontTextureArr, vec3(v_uv, float(v_fontIndex))).rgb;
    return median(msdf.r, msdf.g, msdf.b);
}

void main() {
    if (v_fontIndex == -1) {
        accumColor = vec4(0.0);
        accumAlpha = 0.0;
        return;
    }

    vec4 sdfParams = sdfParamsArr[v_fontIndex];
    float sd = getDistance();
    vec2 dxdy = fwidth(v_uv) * sdfParams.xy;

    float fillDist = sd + min(0.001, 0.5 - 1.0 / sdfParams.w) - 0.5;
    float fillOpacity = clamp(fillDist * sdfParams.w / length(dxdy) + 0.5, 0.0, 1.0);

    float opacity = fillOpacity;
    if (isOutlinePass != 0) {
        float outlineWidth = max(v_outline, 0.0);
        float outlineDist = sd + min(outlineWidth, 0.5 - 1.0 / sdfParams.w) - 0.5;
        float outlineOpacity = clamp(outlineDist * sdfParams.w / length(dxdy) + 0.5, 0.0, 1.0) * step(1e-6, v_outline);
        opacity = max(0.0, outlineOpacity - fillOpacity);
    }

    float alpha = opacity * v_rgba.a;

    if (alpha <= 1e-5) {
        discard;
    }

    vec4 color = vec4(v_rgba.rgb, alpha);
    weightedOITAccumulate(color, accumColor, accumAlpha);
}
