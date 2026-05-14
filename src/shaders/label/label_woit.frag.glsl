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

#include "./msdf_common.glsl"

void main() {
    if (v_fontIndex == -1) {
        accumColor = vec4(0.0);
        accumAlpha = 0.0;
        return;
    }

    vec4 sdfParams = sdfParamsArr[v_fontIndex];
    float sd = msdfGetDistance(fontTextureArr, v_uv, v_fontIndex);
    float pxRange = max(sdfParams.w, 1e-6);
    float sdfEdge = max(0.5 - 1.0 / pxRange, 0.0);
    float screenPxRange = msdfGetScreenPxRange(v_uv, sdfParams.xy, pxRange);
    float fillOpacity = clamp((sd - 0.5) * screenPxRange + 0.5, 0.0, 1.0);

    float opacity = fillOpacity;
    if (isOutlinePass != 0) {
//        float outlineWidth = min(max(v_outline, 0.0), sdfEdge);
//        float outlineOpacity = clamp((sd + outlineWidth - 0.5) * screenPxRange + 0.5, 0.0, 1.0) * step(1e-6, v_outline);
        float outlineWidth = clamp(v_outline, 0.0, sdfEdge);
        float outlineOpacity = clamp((sd + outlineWidth - 0.5) * screenPxRange + 0.5, 0.0, 1.0);
        opacity = max(0.0, outlineOpacity - fillOpacity);
    }

    float alpha = opacity * v_rgba.a;

    if (alpha <= 1e-5) {
        discard;
    }

    vec4 color = vec4(v_rgba.rgb, alpha);
    weightedOITAccumulate(color, accumColor, accumAlpha);
}
