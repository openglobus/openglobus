const int MAX_CASCADE_SHADOW_MAPS = 4;

// u_cascadeShadowParams layout:
// x = depthBias        // normalized shadow depth bias, applied to receiver depth
// y = normalBiasWorld  // bias along receiver normal in RTC/world units
// z = orthoTexelDepthSize // orthographic texel size in normalized shadow depth units
// w = depthEpsilon     // normalized shadow depth transition width
//
// u_cascadeShadowSplits layout:
// x = main camera split near distance
// y = main camera split far distance
// z,w reserved

uniform mat4 u_cascadeShadowViewProjRTE[MAX_CASCADE_SHADOW_MAPS];
uniform vec4 u_cascadeShadowParams[MAX_CASCADE_SHADOW_MAPS];
uniform vec4 u_cascadeShadowSplits[MAX_CASCADE_SHADOW_MAPS];
uniform vec3 u_cascadeShadowEyeRel[MAX_CASCADE_SHADOW_MAPS];
uniform int u_cascadeShadowLayer[MAX_CASCADE_SHADOW_MAPS];
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

float getCascadeShadowSlopeBias(int index, float ndotl) {
    float slope = (1.0 - ndotl) / max(ndotl, 0.05);
    float texelDepthSize = max(u_cascadeShadowParams[index].z, 1e-12);
    return min(
        slope * texelDepthSize * SHADOW_MAP_ORTHO_SLOPE_TEXEL_FACTOR,
        texelDepthSize * SHADOW_MAP_ORTHO_MAX_SLOPE_TEXELS
    );
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

    float depthBias = u_cascadeShadowParams[cascadeIndex].x;
    float normalBiasWorld = u_cascadeShadowParams[cascadeIndex].y;
    float depthEpsilon = u_cascadeShadowParams[cascadeIndex].w;
    vec3 lightDir = getCascadeShadowLightDirection(cascadeIndex);
    float ndotl = max(dot(N, lightDir), 0.0);
    float slopeBias = getCascadeShadowSlopeBias(cascadeIndex, ndotl);

    vec3 biasedRtcPos = rtcPos + N * normalBiasWorld;
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

    float depthThreshold = depthBias + depthEpsilon + slopeBias;

    #if SHADOW_MAP_PCF > 0
    float aliasingBoost = clamp((footprint - 1.0) * 0.75, 0.0, 2.0);
    float pcfScale = 1.0 + aliasingBoost;

    float transitionWidth = max(
        max(receiverDepthFwidth * float(SHADOW_MAP_PCF), depthEpsilon * (1.0 + aliasingBoost)),
        depthEpsilon
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
            float compareDelta = (mapDepth + depthThreshold) - tapReceiverDepth;
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
    return vec2(step(receiverDepth, mapDepth + depthThreshold), 1.0);
    #endif
}

int getCascadeShadowIndex(float viewDepth) {
    for (int i = 0; i < MAX_CASCADE_SHADOW_MAPS; i++) {
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

    return clamp(mix(1.0, visibility, coverage * SHADOW_MAP_INTENSITY), 0.0, 1.0);
}

float getCascadeShadowDirectVisibility(vec3 rtcPos, vec3 normal) {
    float viewDepth = dot(rtcPos, normalize(u_cascadeShadowViewForward));
    return getCascadeShadowDirectVisibility(rtcPos, normal, viewDepth);
}
