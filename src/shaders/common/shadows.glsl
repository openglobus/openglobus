const int MAX_SHADOW_MAPS = 4;

// u_shadowMapParams layout:
// x = depthBias        // normalized shadow depth bias
// y = normalBiasWorld  // bias along receiver normal in RTC/world units
// z = orthoTexelDepthSize // 0.0 for perspective; orthographic texel size in normalized shadow depth units
// w = depthEpsilon     // normalized shadow depth transition width

uniform mat4 u_shadowMapViewProjRTE[MAX_SHADOW_MAPS];
uniform vec4 u_shadowMapParams[MAX_SHADOW_MAPS];
uniform vec3 u_shadowMapEyeRel[MAX_SHADOW_MAPS];
uniform int u_shadowMapLayer[MAX_SHADOW_MAPS];
uniform int u_shadowMapCount;

uniform highp sampler2DArray u_shadowMapDepthArray;

#ifndef SHADOW_MAP_PCF
#define SHADOW_MAP_PCF 3
#endif

#ifndef SHADOW_MAP_SLOPE_DEPTH_BIAS
#define SHADOW_MAP_SLOPE_DEPTH_BIAS 0.00008
#endif

#ifndef SHADOW_MAP_MAX_SLOPE_DEPTH_BIAS
#define SHADOW_MAP_MAX_SLOPE_DEPTH_BIAS 0.0012
#endif

#ifndef SHADOW_MAP_ORTHO_SLOPE_TEXEL_FACTOR
#define SHADOW_MAP_ORTHO_SLOPE_TEXEL_FACTOR 0.0
#endif

#ifndef SHADOW_MAP_ORTHO_MAX_SLOPE_TEXELS
#define SHADOW_MAP_ORTHO_MAX_SLOPE_TEXELS 8.0
#endif

float sampleShadowMapDepth(int index, vec2 uv) {
    return texture(u_shadowMapDepthArray, vec3(uv, float(u_shadowMapLayer[index]))).r;
}

float getShadowMapIsOrthographic(int index) {
    return step(1e-12, u_shadowMapParams[index].z);
}

vec3 getShadowMapLightDirection(int index, vec3 rtcPos) {
    float isOrthographic = getShadowMapIsOrthographic(index);
    vec3 perspectiveDirection = normalize(u_shadowMapEyeRel[index] - rtcPos);
    vec3 orthographicForward = normalize(vec3(
        u_shadowMapViewProjRTE[index][0].z,
        u_shadowMapViewProjRTE[index][1].z,
        u_shadowMapViewProjRTE[index][2].z
    ));
    vec3 orthographicDirection = -orthographicForward;
    return normalize(mix(perspectiveDirection, orthographicDirection, isOrthographic));
}

float getShadowMapSlopeBias(int index, float ndotl) {
    float isOrthographic = getShadowMapIsOrthographic(index);
    float slope = (1.0 - ndotl) / max(ndotl, 0.05);
    float perspectiveSlopeBias = min(slope * SHADOW_MAP_SLOPE_DEPTH_BIAS, SHADOW_MAP_MAX_SLOPE_DEPTH_BIAS);
    float texelDepthSize = max(u_shadowMapParams[index].z, 1e-12);
    float orthographicSlopeBias = min(
        slope * texelDepthSize * SHADOW_MAP_ORTHO_SLOPE_TEXEL_FACTOR,
        texelDepthSize * SHADOW_MAP_ORTHO_MAX_SLOPE_TEXELS
    );
    return mix(perspectiveSlopeBias, orthographicSlopeBias, isOrthographic);
}

float getShadowMapReceiverPlaneDepth(
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

vec2 getShadowMapVisibilityData(int shadowMapIndex, vec3 rtcPos, vec3 normal) {
    vec3 N = normalize(normal);

    float depthBias = u_shadowMapParams[shadowMapIndex].x;
    float normalBiasWorld = u_shadowMapParams[shadowMapIndex].y;
    float depthEpsilon = u_shadowMapParams[shadowMapIndex].w;
    vec3 lightDir = getShadowMapLightDirection(shadowMapIndex, rtcPos);
    float ndotl = max(dot(N, lightDir), 0.0);
    float slopeBias = getShadowMapSlopeBias(shadowMapIndex, ndotl);

    vec3 biasedRtcPos = rtcPos + N * normalBiasWorld;
    vec3 shadowRelPos = biasedRtcPos - u_shadowMapEyeRel[shadowMapIndex];

    vec4 clip = u_shadowMapViewProjRTE[shadowMapIndex] * vec4(shadowRelPos, 1.0);

    if (clip.w <= 1e-6) {
        return vec2(0.0, 0.0);
    }

    vec3 ndc = clip.xyz / clip.w;
    vec2 uv = ndc.xy * 0.5 + 0.5;
    float receiverDepth = ndc.z * 0.5 + 0.5;

    #if SHADOW_MAP_PCF > 0
    vec2 texSize = vec2(textureSize(u_shadowMapDepthArray, 0).xy);
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
            float mapDepth = sampleShadowMapDepth(shadowMapIndex, safeUv);
            float sampleCoverage = step(1e-8, mapDepth);
            float tapReceiverDepth = getShadowMapReceiverPlaneDepth(receiverDepth, tapOffset, uvDx, uvDy, zDx, zDy);
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
    float mapDepth = sampleShadowMapDepth(shadowMapIndex, uv);
    if (mapDepth <= 1e-8) {
        return vec2(0.0, 0.0);
    }
    return vec2(step(receiverDepth, mapDepth + depthThreshold), 1.0);
    #endif
}

float getShadowMapVisibility(int shadowMapIndex, vec3 rtcPos, vec3 normal) {
    return getShadowMapVisibilityData(shadowMapIndex, rtcPos, normal).x;
}

float getShadowMapsDirectVisibility(vec3 rtcPos, vec3 normal) {
    float directVisibility = 1.0;

    for (int i = 0; i < MAX_SHADOW_MAPS; i++) {
        if (i >= u_shadowMapCount) {
            break;
        }

        vec2 visibilityData = getShadowMapVisibilityData(i, rtcPos, normal);
        float visibility = clamp(visibilityData.x, 0.0, 1.0);
        float coverage = clamp(visibilityData.y, 0.0, 1.0);

        directVisibility *= mix(1.0, visibility, coverage);
    }

    return clamp(directVisibility, 0.0, 1.0);
}
