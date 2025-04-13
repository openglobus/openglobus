#extension GL_OES_standard_derivatives: enable

precision highp float;
precision highp int;

const int MAX_SIZE = 11;

// x - ATLAS_WIDTH = 512.0;
// y - ATLAS_HEIGHT = 512.0;
// z - ATLAS_GLYPH_SIZE = 32.0;
// w - ATLAS_FIELD_RANGE = 8.0;

uniform sampler2D fontTextureArr[MAX_SIZE];
uniform vec4 sdfParamsArr[MAX_SIZE];
uniform int isOutlinePass;

varying float v_outline;
varying vec2 v_uv;
varying vec4 v_rgba;
varying float v_fontIndex;

float fontIndex;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float getDistance() {
    vec3 msdf;
    if (fontIndex >= 0.0 && fontIndex < 1.0) {
        msdf = texture2D(fontTextureArr[0], v_uv).rgb;
    } else if (fontIndex >= 1.0 && fontIndex < 2.0) {
        msdf = texture2D(fontTextureArr[1], v_uv).rgb;
    } else if (fontIndex >= 2.0 && fontIndex < 3.0) {
        msdf = texture2D(fontTextureArr[2], v_uv).rgb;
    } else if (fontIndex >= 3.0 && fontIndex < 4.0) {
        msdf = texture2D(fontTextureArr[3], v_uv).rgb;
    } else if (fontIndex >= 4.0 && fontIndex < 5.0) {
        msdf = texture2D(fontTextureArr[4], v_uv).rgb;
    } else if (fontIndex >= 5.0 && fontIndex < 6.0) {
        msdf = texture2D(fontTextureArr[5], v_uv).rgb;
    } else if (fontIndex >= 6.0 && fontIndex < 7.0) {
        msdf = texture2D(fontTextureArr[6], v_uv).rgb;
    } else if (fontIndex >= 7.0 && fontIndex < 8.0) {
        msdf = texture2D(fontTextureArr[7], v_uv).rgb;
    } else if (fontIndex >= 8.0 && fontIndex < 9.0) {
        msdf = texture2D(fontTextureArr[8], v_uv).rgb;
    } else if (fontIndex >= 9.0 && fontIndex < 10.0) {
        msdf = texture2D(fontTextureArr[9], v_uv).rgb;
    } else if (fontIndex >= 10.0 && fontIndex < 11.0) {
        msdf = texture2D(fontTextureArr[10], v_uv).rgb;
    }
    return median(msdf.r, msdf.g, msdf.b);
}


vec4 getSDFParams() {
    if (fontIndex >= 0.0 && fontIndex < 1.0) {
        return sdfParamsArr[0];
    } else if (fontIndex >= 1.0 && fontIndex < 2.0) {
        return sdfParamsArr[1];
    } else if (fontIndex >= 2.0 && fontIndex < 3.0) {
        return sdfParamsArr[2];
    } else if (fontIndex >= 3.0 && fontIndex < 4.0) {
        return sdfParamsArr[3];
    } else if (fontIndex >= 4.0 && fontIndex < 5.0) {
        return sdfParamsArr[4];
    } else if (fontIndex >= 5.0 && fontIndex < 6.0) {
        return sdfParamsArr[5];
    } else if (fontIndex >= 6.0 && fontIndex < 7.0) {
        return sdfParamsArr[6];
    } else if (fontIndex >= 7.0 && fontIndex < 8.0) {
        return sdfParamsArr[7];
    } else if (fontIndex >= 8.0 && fontIndex < 9.0) {
        return sdfParamsArr[8];
    } else if (fontIndex >= 9.0 && fontIndex < 10.0) {
        return sdfParamsArr[9];
    } else if (fontIndex >= 10.0 && fontIndex < 11.0) {
        return sdfParamsArr[10];
    }
}

void main() {

    fontIndex = v_fontIndex + 0.1;

    if (v_fontIndex < 0.0) {
        return;
    }

    vec4 sdfParams = getSDFParams();
    float sd = getDistance();
    vec2 dxdy = fwidth(v_uv) * sdfParams.xy;
    float dist = sd + min(0.001, 0.5 - 1.0 / sdfParams.w) - 0.5;
    float opacity = clamp(dist * sdfParams.w / length(dxdy) + 0.5, 0.0, 1.0);

    if (isOutlinePass == 0) {
        //gl_FragColor = vec4(v_rgba.rgb, opacity * v_rgba.a);
    } else {
        float strokeDist = sd + min(v_outline, 0.5 - 1.0 / sdfParams.w) - 0.5;
        float strokeAlpha = v_rgba.a * clamp(strokeDist * sdfParams.w / length(dxdy) + 0.5, 0.0, 1.0);
        if (strokeAlpha < 0.1) {
            discard;
        }
        //gl_FragColor = v_rgba * strokeAlpha * (0.5 - opacity) * 2.0;
    }
}