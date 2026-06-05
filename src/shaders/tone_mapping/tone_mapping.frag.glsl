#version 300 es

precision highp float;

#ifndef saturate
#define saturate(a) clamp(a, 0.0, 1.0)
#endif

#define TONE_MAPPING_LINEAR 0
#define TONE_MAPPING_REINHARD_WHITE 1
#define TONE_MAPPING_KHRONOS_PBR_NEUTRAL 2
#define TONE_MAPPING_UNCHARTED2 3
#define TONE_MAPPING_OPTIMIZED_CINEON 4
#define TONE_MAPPING_ACES_FILMIC 5

#ifndef TONE_MAPPING_OPERATOR
#define TONE_MAPPING_OPERATOR TONE_MAPPING_REINHARD_WHITE
#endif

uniform sampler2D hdrBuffer;

uniform float whitepoint;
uniform float exposure;
uniform float gamma;

// Interleaved gradient noise for temporal-stable dithering in 8-bit targets.
float interleavedGradientNoise(vec2 uv) {
    return fract(52.9829189 * fract(dot(uv, vec2(0.06711056, 0.00583715))));
}

vec3 LinearToneMapping(vec3 color) {
    return exposure * color;
}

vec3 reinhardWhite(vec3 color, float whitePoint) {
    float w2 = whitePoint * whitePoint;
    return (color * (1.0 + color / w2)) / (1.0 + color);
}

vec3 ReinhardWhiteToneMapping(vec3 color) {
    color *= exposure;
    return saturate(reinhardWhite(color, max(whitepoint, 0.0001)));
}

// Khronos PBR Neutral Tone Mapper.
// Input/output are linear Rec. 709; output is compressed to [0, 1].
vec3 KhronosPBRNeutralToneMapping(vec3 color) {
    const float startCompression = 0.8 - 0.04;
    const float desaturation = 0.15;

    color = max(color * exposure, vec3(0.0));

    float x = min(color.r, min(color.g, color.b));
    float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
    color -= offset;

    float peak = max(color.r, max(color.g, color.b));
    if (peak < startCompression) {
        return color;
    }

    const float d = 1.0 - startCompression;
    float newPeak = 1.0 - d * d / (peak + d - startCompression);
    color *= newPeak / peak;

    float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
    return mix(color, vec3(newPeak), g);
}

#define Uncharted2Helper(x) max(((x * (0.15 * x + 0.10 * 0.50) + 0.20 * 0.02) / (x * (0.15 * x + 0.50) + 0.20 * 0.30)) - 0.02 / 0.30, vec3(0.0))

vec3 Uncharted2ToneMapping(vec3 color) {
    color *= exposure;
    return saturate(Uncharted2Helper(color) / Uncharted2Helper(vec3(whitepoint)));
}

vec3 OptimizedCineonToneMapping(vec3 color) {
    color *= exposure;
    color = max(vec3(0.0), color - 0.004);
    return pow((color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06), vec3(2.2));
}

vec3 ACESFilmicToneMapping(vec3 color) {
    color *= exposure;
    return saturate((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14));
}

vec3 ApplyToneMapping(vec3 color) {
#if TONE_MAPPING_OPERATOR == TONE_MAPPING_LINEAR
    return LinearToneMapping(color);
#elif TONE_MAPPING_OPERATOR == TONE_MAPPING_REINHARD_WHITE
    return ReinhardWhiteToneMapping(color);
#elif TONE_MAPPING_OPERATOR == TONE_MAPPING_KHRONOS_PBR_NEUTRAL
    return KhronosPBRNeutralToneMapping(color);
#elif TONE_MAPPING_OPERATOR == TONE_MAPPING_UNCHARTED2
    return Uncharted2ToneMapping(color);
#elif TONE_MAPPING_OPERATOR == TONE_MAPPING_OPTIMIZED_CINEON
    return OptimizedCineonToneMapping(color);
#elif TONE_MAPPING_OPERATOR == TONE_MAPPING_ACES_FILMIC
    return ACESFilmicToneMapping(color);
#else
    return ReinhardWhiteToneMapping(color);
#endif
}

layout (location = 0) out vec4 fragColor;

void main(void) {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 hdrColor = texelFetch(hdrBuffer, fragCoord, 0);

    vec3 mapped = ApplyToneMapping(hdrColor.rgb);

    mapped = pow(mapped, vec3(1.0 / gamma));

    // Remove visible color banding in dark gradients when writing to RGBA8 buffers.
    float dither = interleavedGradientNoise(gl_FragCoord.xy) - 0.5;
    mapped = clamp(mapped + dither / 255.0, 0.0, 1.0);

    fragColor = vec4(mapped, hdrColor.a);
}
