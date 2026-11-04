const int MAX_CASCADE_COUNT = 4;

// Tail of a cascade, as a fraction of its depth range, blended into the next one.
#ifndef CASCADE_SHADOW_BLEND
#define CASCADE_SHADOW_BLEND 0.15
#endif

// u_cascadeShadowParams layout:
// x = depthBiasWorld   // occlusion bias in meters
// y = normalBiasWorld  // bias along receiver normal in RTC/world units, usually meters
// z = texelWorld       // world size of one cascade texel in meters; a cascade is always
//                      // orthographic, so it does not change with distance
// w = depthRange       // far - near of the cascade, meters per unit of stored depth

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

// dPdx, dPdy are the screen derivatives of rtcPos. A cascade is orthographic, its projection is affine, so the
// derivatives in it are exact from them, and a pixel quad across a cascade split gets no mixed values.
vec2 getCascadeShadowVisibilityData(int cascadeIndex, vec3 rtcPos, vec3 normal, vec3 dPdx, vec3 dPdy) {
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

    vec3 clipDx = (u_cascadeShadowViewProjRTE[cascadeIndex] * vec4(dPdx, 0.0)).xyz * 0.5;
    vec3 clipDy = (u_cascadeShadowViewProjRTE[cascadeIndex] * vec4(dPdy, 0.0)).xyz * 0.5;
    vec2 uvDx = clipDx.xy;
    vec2 uvDy = clipDy.xy;
    float zDx = clipDx.z;
    float zDy = clipDy.z;
    float receiverDepthFwidth = abs(zDx) + abs(zDy);
    #endif

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec2(0.0, 0.0);
    }

    if (receiverDepth < 0.0 || receiverDepth > 1.0) {
        return vec2(0.0, 0.0);
    }

    #if SHADOW_MAP_PCF > 0
    // Stored depth is linear for an orthographic cascade, so meters are one multiply away.
    float transitionWidth = max(
        receiverDepthFwidth * depthRange * float(SHADOW_MAP_PCF),
        texelWorld * SHADOW_MAP_MIN_TRANSITION_TEXELS
    );

    float visibility = 0.0;
    float coverage = 0.0;
    float sampleCount = 0.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 tapOffset = vec2(float(x), float(y)) * texelSize;
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

            // The band is all on the occluded side: a receiver at the stored depth plus the bias is fully lit.
            float sampleVisibility = smoothstep(-2.0 * transitionWidth, 0.0, compareDelta);
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

float getCascadeShadowDirectVisibility(vec3 rtcPos, vec3 normal, float viewDepth, vec3 dPdx, vec3 dPdy) {
    int cascadeIndex = getCascadeShadowIndex(viewDepth);
    if (cascadeIndex < 0) {
        return 1.0;
    }

    vec2 visibilityData = getCascadeShadowVisibilityData(cascadeIndex, rtcPos, normal, dPdx, dPdy);

    float splitNear = u_cascadeShadowSplits[cascadeIndex].x;
    float splitFar = u_cascadeShadowSplits[cascadeIndex].y;
    float blendStart = splitFar - (splitFar - splitNear) * CASCADE_SHADOW_BLEND;

    if (cascadeIndex + 1 < u_cascadeShadowCount && viewDepth > blendStart) {
        vec2 nextVisibilityData = getCascadeShadowVisibilityData(cascadeIndex + 1, rtcPos, normal, dPdx, dPdy);
        float blend = smoothstep(blendStart, splitFar, viewDepth) * step(0.5, nextVisibilityData.y);
        visibilityData = mix(visibilityData, nextVisibilityData, blend);
    }

    float visibility = clamp(visibilityData.x, 0.0, 1.0);
    float coverage = clamp(visibilityData.y, 0.0, 1.0);

    return clamp(mix(1.0, visibility, coverage * SHADOW_MAP_INTENSITY), 0.0, 1.0);
}

float getCascadeShadowDirectVisibility(vec3 rtcPos, vec3 normal) {
    vec3 dPdx = dFdx(rtcPos);
    vec3 dPdy = dFdy(rtcPos);
    float viewDepth = dot(rtcPos, normalize(u_cascadeShadowViewForward));
    return getCascadeShadowDirectVisibility(rtcPos, normal, viewDepth, dPdx, dPdy);
}
