#version 300 es

precision highp float;

const int MAX_SIZE = 11;

// x - ATLAS_WIDTH = 512.0;
// y - ATLAS_HEIGHT = 512.0;
// z - ATLAS_GLYPH_SIZE = 32.0;
// w - ATLAS_FIELD_RANGE = 8.0;

uniform highp sampler2DArray fontTextureArr;
uniform vec4 sdfParamsArr[MAX_SIZE];
uniform int isOutlinePass;

flat in int v_fontIndex;
in vec2 v_uv;
in vec4 v_rgba;

flat in float v_outline;

in vec3 v_pickingColor;

layout (location = 0) out vec4 outScreen;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float getDistance() {
    vec3 msdf = texture(fontTextureArr, vec3(v_uv, float(v_fontIndex))).rgb;
    return median(msdf.r, msdf.g, msdf.b);
}

void main() {

    if (v_fontIndex == -1) {
        outScreen = vec4(0.0);
        return;
    }

    float sourceAlpha = v_rgba.a;

    if (isOutlinePass != 0 && v_outline < 1e-6) {
        discard;
    }

    vec4 sdfParams = sdfParamsArr[v_fontIndex];
    float sd = getDistance();
    vec2 dxdy = fwidth(v_uv) * sdfParams.xy;
    float invDist = inversesqrt(max(dot(dxdy, dxdy), 1e-12));
    float distScale = sdfParams.w * invDist;
    float sdfEdge = 0.5 - 1.0 / sdfParams.w;

    float fillDist = sd + min(0.001, sdfEdge) - 0.5;
    float fillOpacity = clamp(fillDist * distScale + 0.5, 0.0, 1.0);

    float alpha;
    if (isOutlinePass == 0) {
        alpha = fillOpacity * sourceAlpha;
    } else {
        float outlineWidth = max(v_outline, 0.0);
        float outlineDist = sd + min(outlineWidth, sdfEdge) - 0.5;
        float outlineOpacity = clamp(outlineDist * distScale + 0.5, 0.0, 1.0) * step(1e-6, v_outline);
        float strokeOpacity = max(0.0, outlineOpacity - fillOpacity);
        alpha = strokeOpacity * sourceAlpha;
    }

    if (alpha <= 1e-5) {
        discard;
    }

    outScreen = vec4(v_rgba.rgb, alpha);
}
