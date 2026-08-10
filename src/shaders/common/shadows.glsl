const int MAX_SHADOW_MAPS = 4;

// u_shadowMapParams layout:
// x = depthBias        // normalized shadow depth bias, applied to receiver depth
// y = normalBiasWorld  // bias along receiver normal in RTC/world units
// z = orthoTexelDepthSize // 0.0 for perspective; orthographic texel size in normalized shadow depth units
// w = depthEpsilon     // normalized shadow depth transition width

uniform mat4 u_shadowMapViewProjRTE[MAX_SHADOW_MAPS];
uniform vec4 u_shadowMapParams[MAX_SHADOW_MAPS];
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
    return step(1e-12, u_shadowMapParams[index].z);
}

// Border, in texels of the map, over which a map hands its authority to the next one in order. Deliberately
// a handful of texels and not a fraction of the map: the finer map has to win outright wherever it reaches,
// because inside a wide handover its sharp shadow is averaged with the coarse one's blocky verdict and the
// result reads as smeared. A few texels keep the boundary from aliasing into a hard line without letting the
// two verdicts mix anywhere it matters. Texels rather than UV also makes the width independent of how much
// ground the map covers - the same fraction of UV is metres on the near band and kilometres on the far one.
#ifndef SHADOW_MAP_EDGE_FADE_TEXELS
#define SHADOW_MAP_EDGE_FADE_TEXELS 4.0
#endif

// Depth above which a texel counts as empty - nothing was rendered along that ray, so it casts nothing.
// The map is cleared to the far plane rather than to zero for this, see DepthCamera.frame: a texel meaning
// "far" survives LINEAR filtering against a real caster as something still farther than the caster, which
// reads as lit, whereas a texel meaning "near" turns every border between geometry and empty map into a
// thin dark line. The threshold sits just below one so that filtering against the cleared value still
// registers as empty over most of the blend.
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

#if VARIANCE_SHADOW_ENABLED == 1
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
    float receiverDepthWithBias = receiverDepth - depthBias - slopeBias - depthEpsilon;
    float visibility = getShadowMapVsmVisibility(moments, receiverDepthWithBias);
    // Same contract as the PCF branch: visibility as it is, and a purely geometric handover weight.
    return vec2(visibility, getShadowMapEdgeFade(uv));
}
#else
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
            float sampleCoverage = step(mapDepth, SHADOW_MAP_EMPTY_DEPTH);
            float tapReceiverDepth = getShadowMapReceiverPlaneDepth(receiverDepth, tapOffset, uvDx, uvDy, zDx, zDy);
            float compareDelta = (mapDepth + depthThreshold) - tapReceiverDepth;
            // An empty texel means nothing was rendered along that ray, so the tap is lit. Reading it as
            // no-data instead - which is what excluding it from the average amounts to - makes the map ask
            // the next one in order about ground it has already answered for, and the coarser map then
            // paints its blocky verdict over everything that is merely unshadowed, not just over the seams.
            float sampleVisibility = mix(1.0, smoothstep(-transitionWidth, transitionWidth, compareDelta), sampleCoverage);

            float wx = 2.0 - abs(float(x));
            float wy = 2.0 - abs(float(y));
            float w = wx * wy;

            visibility += sampleVisibility * w * inside;
            coverage += w * inside;
            sampleCount += w;
        }
    }

    // The second component is now purely geometric: how much of the tap kernel fell inside this map, tapered
    // towards its border. It is what the combiner hands over to the next map, and it no longer depends on
    // what the depth texture happens to hold.
    return vec2(visibility / max(coverage, 0.0001), (coverage / max(sampleCount, 0.0001)) * getShadowMapEdgeFade(uv));
    #else
    float mapDepth = sampleShadowMapDepth(shadowMapIndex, uv);
    // Empty texel means lit, not unknown - see the PCF branch.
    float visibility = mapDepth > SHADOW_MAP_EMPTY_DEPTH ? 1.0 : step(receiverDepth, mapDepth + depthThreshold);
    return vec2(visibility, getShadowMapEdgeFade(uv));
    #endif
}
#endif

// Maps are consumed in order, finest first, each taking only the coverage the ones before it left. Where
// several maps describe the same ground - which is the normal case for maps fitted to bands of one view,
// since their orthographic boxes are axis aligned and overlap freely - the finest one that reaches a
// fragment decides it, and the coarser ones only fill in what it could not reach.
//
// Multiplying instead, as this used to, is a logical OR over shadowing: an overlap where two maps agree on
// shadow comes out darker than either alone, and a coarse map claiming shadow overrides a fine one claiming
// light. Those are the two seams that make banded maps look stitched together.
//
// For a single map the result is unchanged: remaining is one, so this reduces to
// 1 - (1 - visibility) * coverage * intensity, which is exactly what the old mix computed.
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
