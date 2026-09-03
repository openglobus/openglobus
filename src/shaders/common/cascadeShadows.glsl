const int MAX_CASCADE_COUNT = 4;

// Fraction of the shadow distance at which shadows start fading out.
#ifndef CASCADE_SHADOW_FADE_START
#define CASCADE_SHADOW_FADE_START 0.85
#endif

// u_cascadeShadowParams layout:
// x = depthBiasWorld   // occlusion bias in meters
// y = normalBiasWorld  // bias along receiver normal in RTC/world units, usually meters
// z = texelWorld       // world size of one cascade texel in meters; a cascade is always
//                      // orthographic, so it does not change with distance
// w = depthRange       // far - near of the cascade, meters per unit of stored depth
//
// u_cascadeShadowSplits layout:
// x = main camera split near distance
// y = main camera split far distance
// z,w reserved

uniform mat4 u_cascadeShadowViewProjRTE[MAX_CASCADE_COUNT];
uniform vec4 u_cascadeShadowParams[MAX_CASCADE_COUNT];
uniform vec4 u_cascadeShadowSplits[MAX_CASCADE_COUNT];
uniform vec3 u_cascadeShadowEyeRel[MAX_CASCADE_COUNT];
uniform int u_cascadeShadowLayer[MAX_CASCADE_COUNT];
uniform int u_cascadeShadowCount;
uniform vec3 u_cascadeShadowViewForward;

uniform highp sampler2DArray u_cascadeShadowDepthArray;

float sampleCascadeShadowDepth(int index, vec2 uv) {
    return texture(u_cascadeShadowDepthArray, vec3(uv, float(u_cascadeShadowLayer[index]))).r;
}

vec3 getCascadeShadowLightDirection(int index) {
    vec3 orthographicForward = normalize(vec3(
        u_cascadeShadowViewProjRTE[index][0].z,
        u_cascadeShadowViewProjRTE[index][1].z,
        u_cascadeShadowViewProjRTE[index][2].z
    ));
    return -orthographicForward;
}

float getCascadeShadowSlopeBias(float ndotl, float texelWorld) {
    float slopeTexels = min(
        (1.0 - ndotl) / max(ndotl, 0.05) * SHADOW_MAP_SLOPE_DEPTH_BIAS,
        SHADOW_MAP_MAX_SLOPE_DEPTH_BIAS
    );

    return slopeTexels * texelWorld;
}

float getCascadeShadowReceiverPlaneDepth(
    float receiverDepth,
    vec2 tapOffset,
    vec2 uvDx,
    vec2 uvDy,
    float zDx,
    float zDy
) {
    float det = uvDx.x * uvDy.y - uvDx.y * uvDy.x;

    if (abs(det) < 1e-8) {
        return receiverDepth;
    }

    vec2 screenDelta = vec2(
        (tapOffset.x * uvDy.y - tapOffset.y * uvDy.x) / det,
        (uvDx.x * tapOffset.y - uvDx.y * tapOffset.x) / det
    );

    return receiverDepth + dot(vec2(zDx, zDy), screenDelta);
}

vec2 getCascadeShadowVisibilityData(int cascadeIndex, vec3 rtcPos, vec3 normal) {
    vec3 N = normalize(normal);

    float depthBiasWorld = u_cascadeShadowParams[cascadeIndex].x;
    float normalBiasWorld = u_cascadeShadowParams[cascadeIndex].y;
    float texelWorld = u_cascadeShadowParams[cascadeIndex].z;
    float depthRange = u_cascadeShadowParams[cascadeIndex].w;
    vec3 lightDir = getCascadeShadowLightDirection(cascadeIndex);
    float ndotl = max(dot(N, lightDir), 0.0);
    float depthThresholdWorld = depthBiasWorld + getCascadeShadowSlopeBias(ndotl, texelWorld);

    vec3 biasedRtcPos = rtcPos + N * (normalBiasWorld + texelWorld * SHADOW_MAP_NORMAL_TEXEL_BIAS);
    vec3 shadowRelPos = biasedRtcPos - u_cascadeShadowEyeRel[cascadeIndex];

    vec4 clip = u_cascadeShadowViewProjRTE[cascadeIndex] * vec4(shadowRelPos, 1.0);

    if (clip.w <= 1e-6) {
        return vec2(0.0, 0.0);
    }

    vec3 ndc = clip.xyz / clip.w;
    vec2 uv = ndc.xy * 0.5 + 0.5;
    float receiverDepth = ndc.z * 0.5 + 0.5;

    #if SHADOW_MAP_PCF > 0
    vec2 texSize = vec2(textureSize(u_cascadeShadowDepthArray, 0).xy);
    vec2 texelSize = 1.0 / texSize;

    vec2 uvInTexels = uv * texSize;
    float footprintX = length(dFdx(uvInTexels));
    float footprintY = length(dFdy(uvInTexels));
    float footprint = max(footprintX, footprintY);

    float receiverDepthFwidth = fwidth(receiverDepth);
    vec2 uvDx = dFdx(uv);
    vec2 uvDy = dFdy(uv);
    float zDx = dFdx(receiverDepth);
    float zDy = dFdy(receiverDepth);
    #endif

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec2(0.0, 0.0);
    }

    if (receiverDepth < 0.0 || receiverDepth > 1.0) {
        return vec2(0.0, 0.0);
    }

    #if SHADOW_MAP_PCF > 0
    float aliasingBoost = clamp((footprint - 1.0) * 0.75, 0.0, 2.0);
    float pcfScale = 1.0 + aliasingBoost;

    // Stored depth is linear for an orthographic cascade, so meters are one multiply away.
    float transitionWidth = max(
        receiverDepthFwidth * depthRange * float(SHADOW_MAP_PCF) * pcfScale,
        texelWorld * SHADOW_MAP_MIN_TRANSITION_TEXELS
    );

    float visibility = 0.0;
    float coverage = 0.0;
    float sampleCount = 0.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 tapOffset = vec2(float(x), float(y)) * texelSize * pcfScale;
            vec2 uvOffset = uv + tapOffset;

            float inside =
            step(0.0, uvOffset.x) *
            step(uvOffset.x, 1.0) *
            step(0.0, uvOffset.y) *
            step(uvOffset.y, 1.0);

            vec2 safeUv = clamp(uvOffset, vec2(0.0), vec2(1.0));
            float mapDepth = sampleCascadeShadowDepth(cascadeIndex, safeUv);
            float sampleCoverage = step(1e-8, mapDepth);
            float tapReceiverDepth = getCascadeShadowReceiverPlaneDepth(receiverDepth, tapOffset, uvDx, uvDy, zDx, zDy);
            float compareDelta = (mapDepth - tapReceiverDepth) * depthRange + depthThresholdWorld;
            float sampleVisibility = smoothstep(-transitionWidth, transitionWidth, compareDelta);
            sampleVisibility *= sampleCoverage;

            float wx = 2.0 - abs(float(x));
            float wy = 2.0 - abs(float(y));
            float w = wx * wy;

            visibility += sampleVisibility * w * inside;
            coverage += sampleCoverage * w * inside;
            sampleCount += w * inside;
        }
    }

    float invSampleCount = 1.0 / max(sampleCount, 0.0001);
    return vec2(visibility * invSampleCount, coverage * invSampleCount);
    #else
    float mapDepth = sampleCascadeShadowDepth(cascadeIndex, uv);
    if (mapDepth <= 1e-8) {
        return vec2(0.0, 0.0);
    }
    return vec2(step((receiverDepth - mapDepth) * depthRange, depthThresholdWorld), 1.0);
    #endif
}

int getCascadeShadowIndex(float viewDepth) {
    for (int i = 0; i < MAX_CASCADE_COUNT; i++) {
        if (i >= u_cascadeShadowCount) {
            break;
        }

        if (viewDepth >= u_cascadeShadowSplits[i].x && viewDepth <= u_cascadeShadowSplits[i].y) {
            return i;
        }
    }

    return -1;
}

float getCascadeShadowDirectVisibility(vec3 rtcPos, vec3 normal, float viewDepth) {
    int cascadeIndex = getCascadeShadowIndex(viewDepth);
    if (cascadeIndex < 0) {
        return 1.0;
    }

    vec2 visibilityData = getCascadeShadowVisibilityData(cascadeIndex, rtcPos, normal);
    float visibility = clamp(visibilityData.x, 0.0, 1.0);
    float coverage = clamp(visibilityData.y, 0.0, 1.0);

    // Faded out over the tail of the last cascade; stopping abruptly draws an arc across the ground.
    float shadowDistance = u_cascadeShadowSplits[u_cascadeShadowCount - 1].y;
    float fadeStart = shadowDistance * CASCADE_SHADOW_FADE_START;
    float distanceFade = 1.0 - clamp((viewDepth - fadeStart) / max(shadowDistance - fadeStart, 1e-6), 0.0, 1.0);

    return clamp(mix(1.0, visibility, coverage * SHADOW_MAP_INTENSITY * distanceFade), 0.0, 1.0);
}

float getCascadeShadowDirectVisibility(vec3 rtcPos, vec3 normal) {
    float viewDepth = dot(rtcPos, normalize(u_cascadeShadowViewForward));
    return getCascadeShadowDirectVisibility(rtcPos, normal, viewDepth);
}
