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

float getScreenPxRange(vec2 uv, vec2 atlasSize, float pxRange) {
    vec2 unitRange = vec2(pxRange) / atlasSize;
    vec2 screenTexSize = vec2(1.0) / max(fwidth(uv), vec2(1e-6));
    return max(0.5 * dot(unitRange, screenTexSize), 1.0);
}

void main() {
    if (v_fontIndex == -1) {
        accumColor = vec4(0.0);
        accumAlpha = 0.0;
        return;
    }

    vec4 sdfParams = sdfParamsArr[v_fontIndex];
    float sd = getDistance();
    float pxRange = max(sdfParams.w, 1e-6);
    float sdfEdge = max(0.5 - 1.0 / pxRange, 0.0);
    float screenPxRange = getScreenPxRange(v_uv, sdfParams.xy, pxRange);
    float fillOpacity = clamp((sd - 0.5) * screenPxRange + 0.5, 0.0, 1.0);

    float opacity = fillOpacity;
    if (isOutlinePass != 0) {
        float outlineWidth = min(max(v_outline, 0.0), sdfEdge);
        float outlineOpacity = clamp((sd + outlineWidth - 0.5) * screenPxRange + 0.5, 0.0, 1.0) * step(1e-6, v_outline);
        opacity = max(0.0, outlineOpacity - fillOpacity);
    }

    float alpha = opacity * v_rgba.a;

    if (alpha <= 1e-5) {
        discard;
    }

    vec4 color = vec4(v_rgba.rgb, alpha);
    weightedOITAccumulate(color, accumColor, accumAlpha);
}
