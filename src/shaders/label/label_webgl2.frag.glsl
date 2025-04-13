#version 300 es

uniform int isOutlinePass;

precision highp float;

const int MAX_SIZE = 11;

// x - ATLAS_WIDTH = 512.0;
// y - ATLAS_HEIGHT = 512.0;
// z - ATLAS_GLYPH_SIZE = 32.0;
// w - ATLAS_FIELD_RANGE = 8.0;

uniform sampler2D fontTextureArr[MAX_SIZE];
uniform vec4 sdfParamsArr[MAX_SIZE];

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
        return;
    }

    vec4 sdfParams = sdfParamsArr[v_fontIndex];
    float sd = getDistance();
    vec2 dxdy = fwidth(v_uv) * sdfParams.xy;

    if (isOutlinePass == 0) {
        float dist = sd + min(0.001, 0.5 - 1.0 / sdfParams.w) - 0.5;
        float opacity = clamp(dist * sdfParams.w / length(dxdy) + 0.5, 0.0, 1.0);
        if (opacity <= 0.1) {
            discard;
        }
        outScreen = vec4(v_rgba.rgb, opacity * v_rgba.a);
    } else {
        float dist = sd + min(v_outline, 0.5 - 1.0 / sdfParams.w) - 0.5;
        float opacity = clamp(dist * sdfParams.w / length(dxdy) + 0.5, 0.0, 1.0);
        if (opacity <= 0.1) {
            discard;
        }
        outScreen = vec4(v_rgba.rgb, opacity * v_rgba.a);
        //outScreen = v_rgba * strokeAlpha * (0.5 - opacity) * 2.0;
    }
}