const int MAX_PROJECTORS = 16;

// u_projectorParams layout:
// x = depthBias        // bias in normalized projector depth space [0..1]
// y = normalBiasWorld  // bias along receiver normal in RTC/world units, usually meters
// z = renderMode       // 0.0 = projector/decal mode, 1.0 = light mode
// w = depthEpsilon     // minimal depth-space epsilon

uniform mat4 u_projectorViewProjRTE[MAX_PROJECTORS];
uniform vec4 u_projectorColor[MAX_PROJECTORS];
uniform vec4 u_projectorParams[MAX_PROJECTORS];
uniform vec3 u_projectorEyeRel[MAX_PROJECTORS];
uniform int u_projectorLayer[MAX_PROJECTORS];
uniform int u_projectorCount;

uniform highp sampler2DArray u_projectorDepthArray;

#ifndef PROJECTOR_PCF
#define PROJECTOR_PCF 1
#endif

#ifndef PROJECTOR_PCF_SOFTNESS
#define PROJECTOR_PCF_SOFTNESS 3.0
#endif

#ifndef PROJECTOR_GRAZING_FADE_MIN
#define PROJECTOR_GRAZING_FADE_MIN 0.08
#endif

#ifndef PROJECTOR_GRAZING_FADE_MAX
#define PROJECTOR_GRAZING_FADE_MAX 0.24
#endif

float sampleProjectorDepth(int index, vec2 uv) {
    return texture(u_projectorDepthArray, vec3(uv, float(u_projectorLayer[index]))).r;
}

float getProjectorVisibility(int projectorIndex, vec3 rtcPos, vec3 normal) {
    vec3 N = normalize(normal);

    float depthBias = u_projectorParams[projectorIndex].x;
    float normalBiasWorld = u_projectorParams[projectorIndex].y;
    float depthEpsilon = u_projectorParams[projectorIndex].w;

    vec3 biasedRtcPos = rtcPos + N * normalBiasWorld;
    vec3 projectorRelPos = biasedRtcPos - u_projectorEyeRel[projectorIndex];

    vec4 clip = u_projectorViewProjRTE[projectorIndex] * vec4(projectorRelPos, 1.0);

    if (clip.w <= 1e-6) {
        return 0.0;
    }

    vec3 ndc = clip.xyz / clip.w;
    vec2 uv = ndc.xy * 0.5 + 0.5;
    float receiverDepth = ndc.z * 0.5 + 0.5;

    #if PROJECTOR_PCF
    vec2 texSize = vec2(textureSize(u_projectorDepthArray, 0).xy);
    vec2 texelSize = 1.0 / texSize;

    vec2 uvInTexels = uv * texSize;

    float footprintX = length(dFdx(uvInTexels));
    float footprintY = length(dFdy(uvInTexels));
    float footprint = max(footprintX, footprintY);

    float receiverDepthFwidth = fwidth(receiverDepth);
    #endif

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return 0.0;
    }

    if (receiverDepth < 0.0 || receiverDepth > 1.0) {
        return 0.0;
    }

    float depthThreshold = depthBias + depthEpsilon;

    #if PROJECTOR_PCF
    float aliasingBoost = clamp((footprint - 1.0) * 0.75, 0.0, 2.0);
    float pcfScale = 1.0 + aliasingBoost;

    float transitionWidth = max(
    max(receiverDepthFwidth * PROJECTOR_PCF_SOFTNESS, depthEpsilon * (1.0 + aliasingBoost)),
    depthEpsilon
    );

    float visibility = 0.0;
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

            float mapDepth = sampleProjectorDepth(projectorIndex, safeUv);

            float compareDelta = (mapDepth + depthThreshold) - receiverDepth;
            float sampleVisibility = smoothstep(-transitionWidth, transitionWidth, compareDelta);

            float wx = 2.0 - abs(float(x));
            float wy = 2.0 - abs(float(y));
            float w = wx * wy;

            visibility += sampleVisibility * w * inside;
            sampleCount += w * inside;
        }
    }

    return visibility / max(sampleCount, 0.0001);
    #else
    float mapDepth = sampleProjectorDepth(projectorIndex, uv);
    return step(receiverDepth, mapDepth + depthThreshold);
    #endif
}

vec3 applyProjector(int projectorIndex, vec3 rtcPos, vec3 normal) {
    vec3 N = normalize(normal);

    float visibility = getProjectorVisibility(projectorIndex, rtcPos, N);

    vec4 colorIntensity = u_projectorColor[projectorIndex];

    vec3 color = colorIntensity.rgb;

    float opacity = colorIntensity.a;

    float renderMode = u_projectorParams[projectorIndex].z;
    float lightMode = step(0.5, renderMode);

    vec3 lightDir = normalize(u_projectorEyeRel[projectorIndex] - rtcPos);
    float ndotl = max(dot(N, lightDir), 0.0);
    float grazingFade = smoothstep(PROJECTOR_GRAZING_FADE_MIN, PROJECTOR_GRAZING_FADE_MAX, ndotl);
    float strength = mix(1.0, ndotl, lightMode);

    return color * opacity * visibility * strength * grazingFade;
}

vec3 applyProjectors(vec3 rtcPos, vec3 normal) {
    vec3 contribution = vec3(0.0);

    for (int i = 0; i < MAX_PROJECTORS; i++) {
        if (i >= u_projectorCount) {
            break;
        }

        contribution += applyProjector(i, rtcPos, normal);
    }

    return contribution;
}
