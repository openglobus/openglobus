const int MAX_SHADOW_MAPS = 4;

// u_shadowMapParams layout:
// x = depthBiasWorld   // occlusion bias in meters, from DepthCamera.depthBiasWorld
// y = normalBiasWorld  // bias along receiver normal in RTC/world units, usually meters
// z = reserved
// w = isOrthographic   // 0.0 = perspective, 1.0 = orthographic

// u_shadowMapDepthRange layout:
// x = near, y = far    // light clip planes in meters, turn stored depth back into meters
// z = texelScale       // world size of one shadow texel: absolute for an orthographic
//                      // light, per meter of distance for a perspective one

uniform mat4 u_shadowMapViewProjRTE[MAX_SHADOW_MAPS];
uniform vec4 u_shadowMapParams[MAX_SHADOW_MAPS];
uniform vec3 u_shadowMapDepthRange[MAX_SHADOW_MAPS];
uniform vec3 u_shadowMapEyeRel[MAX_SHADOW_MAPS];
uniform int u_shadowMapLayer[MAX_SHADOW_MAPS];
uniform int u_shadowMapCount;

uniform highp sampler2DArray u_shadowMapDepthArray;

#include "./shadowDefines.glsl"

vec4 sampleShadowMapData(int index, vec2 uv) {
    return texture(u_shadowMapDepthArray, vec3(uv, float(u_shadowMapLayer[index])));
}

float sampleShadowMapDepth(int index, vec2 uv) {
    return sampleShadowMapData(index, uv).r;
}

float linstep(float minValue, float maxValue, float v) {
    return clamp((v - minValue) / (maxValue - minValue), 0.0, 1.0);
}

float reduceShadowMapLightBleeding(float pMax) {
    return linstep(SHADOW_MAP_LIGHT_BLEEDING_REDUCTION, 1.0, pMax);
}

float getShadowMapVsmVisibility(vec2 moments, float receiverDepth) {
    float lit = step(receiverDepth, moments.x);
    float variance = max(moments.y - moments.x * moments.x, SHADOW_MAP_MIN_VARIANCE);
    float d = receiverDepth - moments.x;
    float pMax = variance / (variance + d * d);
    return max(lit, reduceShadowMapLightBleeding(pMax));
}

float getShadowMapIsOrthographic(int index) {
    return step(0.5, u_shadowMapParams[index].w);
}

// Stored depth is the window depth of the light camera, wildly non-linear for a
// perspective frustum. Everything below compares meters instead.
float linearizeShadowMapDepth(int index, float depth) {
    float near = u_shadowMapDepthRange[index].x;
    float far = u_shadowMapDepthRange[index].y;
    float ndc = depth * 2.0 - 1.0;
    float perspective = (2.0 * near * far) / max(far + near - ndc * (far - near), 1e-6);
    float orthographic = near + depth * (far - near);

    return mix(perspective, orthographic, getShadowMapIsOrthographic(index));
}

// The way back, so the variance path can keep comparing its moments in stored depth.
float delinearizeShadowMapDepth(int index, float distance) {
    float near = u_shadowMapDepthRange[index].x;
    float far = u_shadowMapDepthRange[index].y;
    float range = max(far - near, 1e-6);
    float z = max(distance, 1e-6);
    float perspective = ((far + near - (2.0 * near * far) / z) / range) * 0.5 + 0.5;
    float orthographic = (z - near) / range;

    return clamp(mix(perspective, orthographic, getShadowMapIsOrthographic(index)), 0.0, 1.0);
}

// World size of one shadow texel where the receiver sits: the depth inside a texel varies
// by about as much, which is exactly what the comparison has to allow.
float getShadowMapTexelWorld(int index, vec3 rtcPos) {
    float texelScale = u_shadowMapDepthRange[index].z;
    float lightDistance = length(u_shadowMapEyeRel[index] - rtcPos);

    return mix(lightDistance * texelScale, texelScale, getShadowMapIsOrthographic(index));
}

// Border over which a map hands over to the next one.
#ifndef SHADOW_MAP_EDGE_FADE_TEXELS
#define SHADOW_MAP_EDGE_FADE_TEXELS 4.0
#endif

// Above this nothing was rendered along the ray.
// Needs the map cleared to far, see DepthCamera.frame.
#ifndef SHADOW_MAP_EMPTY_DEPTH
#define SHADOW_MAP_EMPTY_DEPTH 0.999
#endif

float getShadowMapEdgeFade(vec2 uv) {
    vec2 texSize = vec2(textureSize(u_shadowMapDepthArray, 0).xy);
    vec2 toEdgeInTexels = min(uv, vec2(1.0) - uv) * texSize;

    return smoothstep(0.0, SHADOW_MAP_EDGE_FADE_TEXELS, min(toEdgeInTexels.x, toEdgeInTexels.y));
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

float getShadowMapSlopeBias(float ndotl, float texelWorld) {
    float slopeTexels = min(
        (1.0 - ndotl) / max(ndotl, 0.05) * SHADOW_MAP_SLOPE_DEPTH_BIAS,
        SHADOW_MAP_MAX_SLOPE_DEPTH_BIAS
    );

    return slopeTexels * texelWorld;
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

#if VARIANCE_SHADOW_ENABLED == 1
vec2 getShadowMapVisibilityData(int shadowMapIndex, vec3 rtcPos, vec3 normal) {
    vec3 N = normalize(normal);

    float depthBiasWorld = u_shadowMapParams[shadowMapIndex].x;
    float normalBiasWorld = u_shadowMapParams[shadowMapIndex].y;
    vec3 lightDir = getShadowMapLightDirection(shadowMapIndex, rtcPos);
    float ndotl = max(dot(N, lightDir), 0.0);
    float texelWorld = getShadowMapTexelWorld(shadowMapIndex, rtcPos);
    float slopeBiasWorld = getShadowMapSlopeBias(ndotl, texelWorld);
    float depthThresholdWorld = depthBiasWorld + slopeBiasWorld;

    vec3 biasedRtcPos = rtcPos + N * (normalBiasWorld + texelWorld * SHADOW_MAP_NORMAL_TEXEL_BIAS);
    vec3 shadowRelPos = biasedRtcPos - u_shadowMapEyeRel[shadowMapIndex];

    vec4 clip = u_shadowMapViewProjRTE[shadowMapIndex] * vec4(shadowRelPos, 1.0);

    if (clip.w <= 1e-6) {
        return vec2(0.0, 0.0);
    }

    vec3 ndc = clip.xyz / clip.w;
    vec2 uv = ndc.xy * 0.5 + 0.5;
    float receiverDepth = ndc.z * 0.5 + 0.5;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec2(0.0, 0.0);
    }

    if (receiverDepth < 0.0 || receiverDepth > 1.0) {
        return vec2(0.0, 0.0);
    }

    vec4 shadowMapData = sampleShadowMapData(shadowMapIndex, uv);
    float coverage = shadowMapData.a;
    if (coverage <= 0.0) {
        return vec2(0.0, 0.0);
    }

    vec2 moments = shadowMapData.rg / coverage;
    float receiverLinear = linearizeShadowMapDepth(shadowMapIndex, receiverDepth);
    float receiverDepthWithBias = delinearizeShadowMapDepth(shadowMapIndex, receiverLinear - depthThresholdWorld);
    float visibility = getShadowMapVsmVisibility(moments, receiverDepthWithBias);
    return vec2(visibility, getShadowMapEdgeFade(uv));
}
#else
vec2 getShadowMapVisibilityData(int shadowMapIndex, vec3 rtcPos, vec3 normal) {
    vec3 N = normalize(normal);

    float depthBiasWorld = u_shadowMapParams[shadowMapIndex].x;
    float normalBiasWorld = u_shadowMapParams[shadowMapIndex].y;
    vec3 lightDir = getShadowMapLightDirection(shadowMapIndex, rtcPos);
    float ndotl = max(dot(N, lightDir), 0.0);
    float texelWorld = getShadowMapTexelWorld(shadowMapIndex, rtcPos);
    float slopeBiasWorld = getShadowMapSlopeBias(ndotl, texelWorld);
    float depthThresholdWorld = depthBiasWorld + slopeBiasWorld;

    vec3 biasedRtcPos = rtcPos + N * (normalBiasWorld + texelWorld * SHADOW_MAP_NORMAL_TEXEL_BIAS);
    vec3 shadowRelPos = biasedRtcPos - u_shadowMapEyeRel[shadowMapIndex];

    vec4 clip = u_shadowMapViewProjRTE[shadowMapIndex] * vec4(shadowRelPos, 1.0);

    if (clip.w <= 1e-6) {
        return vec2(0.0, 0.0);
    }

    vec3 ndc = clip.xyz / clip.w;
    vec2 uv = ndc.xy * 0.5 + 0.5;
    float receiverDepth = ndc.z * 0.5 + 0.5;
    float receiverLinear = linearizeShadowMapDepth(shadowMapIndex, receiverDepth);

    #if SHADOW_MAP_PCF > 0
    vec2 texSize = vec2(textureSize(u_shadowMapDepthArray, 0).xy);
    vec2 texelSize = 1.0 / texSize;

    vec2 uvInTexels = uv * texSize;
    float footprintX = length(dFdx(uvInTexels));
    float footprintY = length(dFdy(uvInTexels));
    float footprint = max(footprintX, footprintY);

    float receiverLinearFwidth = fwidth(receiverLinear);
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

    float transitionWidth = max(receiverLinearFwidth * float(SHADOW_MAP_PCF) * pcfScale, SHADOW_MAP_MIN_TRANSITION);

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
            float sampleCoverage = step(mapDepth, SHADOW_MAP_EMPTY_DEPTH);
            float tapReceiverDepth = getShadowMapReceiverPlaneDepth(receiverDepth, tapOffset, uvDx, uvDy, zDx, zDy);
            float tapReceiverLinear = linearizeShadowMapDepth(shadowMapIndex, tapReceiverDepth);
            float mapLinear = linearizeShadowMapDepth(shadowMapIndex, mapDepth);
            float compareDelta = (mapLinear + depthThresholdWorld) - tapReceiverLinear;
            float sampleVisibility = mix(1.0, smoothstep(-transitionWidth, transitionWidth, compareDelta), sampleCoverage);

            float wx = 2.0 - abs(float(x));
            float wy = 2.0 - abs(float(y));
            float w = wx * wy;

            visibility += sampleVisibility * w * inside;
            coverage += w * inside;
            sampleCount += w;
        }
    }

    // y is the handover weight: share of the kernel inside the map.
    return vec2(visibility / max(coverage, 0.0001), (coverage / max(sampleCount, 0.0001)) * getShadowMapEdgeFade(uv));
    #else
    float mapDepth = sampleShadowMapDepth(shadowMapIndex, uv);
    // Empty texel means lit, not unknown - see the PCF branch.
    float mapLinear = linearizeShadowMapDepth(shadowMapIndex, mapDepth);
    float visibility = mapDepth > SHADOW_MAP_EMPTY_DEPTH
        ? 1.0
        : step(receiverLinear, mapLinear + depthThresholdWorld);
    return vec2(visibility, getShadowMapEdgeFade(uv));
    #endif
}
#endif

// Maps in order, finest first: each takes only the coverage the ones before it left.
float getShadowMapsDirectVisibility(vec3 rtcPos, vec3 normal) {
    float remaining = 1.0;
    float shadow = 0.0;

    for (int i = 0; i < MAX_SHADOW_MAPS; i++) {
        if (i >= u_shadowMapCount || remaining <= 0.001) {
            break;
        }

        vec2 visibilityData = getShadowMapVisibilityData(i, rtcPos, normal);
        float visibility = clamp(visibilityData.x, 0.0, 1.0);
        float weight = clamp(visibilityData.y, 0.0, 1.0) * remaining;

        shadow += (1.0 - visibility) * weight;
        remaining -= weight;
    }

    return clamp(1.0 - shadow * SHADOW_MAP_INTENSITY, 0.0, 1.0);
}
