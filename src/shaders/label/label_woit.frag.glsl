#version 300 es

uniform int isOutlinePass;
uniform int opacityPass;

precision highp float;

#include "../common/weightedOIT.glsl"

const int MAX_SIZE = 11;

uniform sampler2D fontTextureArr[MAX_SIZE];
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
    vec3 msdf;
    if (v_fontIndex == 0) {
        msdf = texture(fontTextureArr[0], v_uv).rgb;
    } else if (v_fontIndex == 1) {
        msdf = texture(fontTextureArr[1], v_uv).rgb;
    } else if (v_fontIndex == 2) {
        msdf = texture(fontTextureArr[2], v_uv).rgb;
    } else if (v_fontIndex == 3) {
        msdf = texture(fontTextureArr[3], v_uv).rgb;
    } else if (v_fontIndex == 4) {
        msdf = texture(fontTextureArr[4], v_uv).rgb;
    } else if (v_fontIndex == 5) {
        msdf = texture(fontTextureArr[5], v_uv).rgb;
    } else if (v_fontIndex == 6) {
        msdf = texture(fontTextureArr[6], v_uv).rgb;
    } else if (v_fontIndex == 7) {
        msdf = texture(fontTextureArr[7], v_uv).rgb;
    } else if (v_fontIndex == 8) {
        msdf = texture(fontTextureArr[8], v_uv).rgb;
    } else if (v_fontIndex == 9) {
        msdf = texture(fontTextureArr[9], v_uv).rgb;
    } else if (v_fontIndex == 10) {
        msdf = texture(fontTextureArr[10], v_uv).rgb;
    }
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
    float sourceAlpha = v_rgba.a;
    float opaqueMask = step(0.999, sourceAlpha);
    float transparentMask = step(1e-6, sourceAlpha) * (1.0 - opaqueMask);
    float passMask = opacityPass == 0 ? opaqueMask : transparentMask;
    alpha *= passMask;

    if (alpha <= 1e-5) {
        discard;
    }

    vec4 color = vec4(v_rgba.rgb, alpha);
    weightedOITAccumulate(color, accumColor, accumAlpha);
}
