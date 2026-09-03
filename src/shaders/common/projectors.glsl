// Maximum number of projectors processed in one draw call.
// 16 processes projectors 0-15; additional projectors require another pass.
const int MAX_PROJECTORS = 16;

// u_projectorParams layout:
// x = depthBiasWorld   // occlusion bias in meters, from DepthCamera.depthBiasWorld
// y = normalBiasWorld  // bias along receiver normal in RTC/world units, usually meters
// z = renderMode       // 0.0 = projector/decal mode, 1.0 = light mode
// w = isOrthographic   // 0.0 = perspective, 1.0 = orthographic

// u_projectorDepthRange layout:
// x = near, y = far    // projector clip planes in meters, turn stored depth back into meters
// z = texelScale       // world size of one depth texel: absolute for an orthographic
//                      // projector, per meter of distance for a perspective one

uniform mat4 u_projectorViewProjRTE[MAX_PROJECTORS];
uniform vec4 u_projectorColor[MAX_PROJECTORS];
uniform vec4 u_projectorParams[MAX_PROJECTORS];
uniform vec3 u_projectorDepthRange[MAX_PROJECTORS];
uniform vec3 u_projectorEyeRel[MAX_PROJECTORS];
uniform int u_projectorLayer[MAX_PROJECTORS];
uniform int u_projectorCount;

uniform highp sampler2DArray u_projectorDepthArray;

// Enables 3x3 depth filtering.
// 1 = smoother occlusion edges; 0 = faster, hard depth comparison.
#ifndef PROJECTOR_PCF
#define PROJECTOR_PCF 1
#endif

// Controls PCF transition softness.
// 1.0 = sharper; 3.0 = moderate; 6.0 = softer but may cause light bleeding.
// Has no effect when PROJECTOR_PCF is 0.
#ifndef PROJECTOR_PCF_SOFTNESS
#define PROJECTOR_PCF_SOFTNESS 3.0
#endif

// Fades projection when the beam is nearly parallel to the surface.
// With 0.0/0.05, ndotl=0 is hidden and ndotl>=0.05 is fully visible.
// Raising MAX to 0.2 fades a wider range of grazing angles.
#ifndef PROJECTOR_GRAZING_FADE_MIN
#define PROJECTOR_GRAZING_FADE_MIN 0.0
#endif

#ifndef PROJECTOR_GRAZING_FADE_MAX
#define PROJECTOR_GRAZING_FADE_MAX 0.05
#endif

// Controls angular falloff in light mode.
// 0.0 = Lambert; with 0.5, ndotl=0.1 produces 0.4 instead of 0.1,
// making surfaces viewed at shallow angles brighter.
#ifndef PROJECTOR_LIGHT_WRAP
#define PROJECTOR_LIGHT_WRAP 0.5
#endif

// Adds depth bias as the surface turns away from the projector, counted in depth map
// texels: one texel covers more range with distance, and so does the error it hides.
// 0.0 disables it; larger values reduce shadow acne but may cause light leaking.
#ifndef PROJECTOR_SLOPE_DEPTH_BIAS
#define PROJECTOR_SLOPE_DEPTH_BIAS 1.0
#endif

// Limits the slope-dependent depth bias, in depth map texels.
// 4.0 means the added bias never exceeds four texel widths.
// Lower values reduce leaking; higher values suppress more grazing-angle acne.
#ifndef PROJECTOR_MAX_SLOPE_DEPTH_BIAS
#define PROJECTOR_MAX_SLOPE_DEPTH_BIAS 4.0
#endif

// Offsets the sampled point along the receiver normal by this many depth map texels,
// on top of DepthCamera.normalBias. Kills acne with less leaking than a depth bias.
#ifndef PROJECTOR_NORMAL_TEXEL_BIAS
#define PROJECTOR_NORMAL_TEXEL_BIAS 1.0
#endif

// Floor of the PCF comparison band, in meters, for surfaces facing the projector head on,
// where the depth derivative is near zero.
#ifndef PROJECTOR_MIN_TRANSITION
#define PROJECTOR_MIN_TRANSITION 0.05
#endif

// Stored depth is the window depth of the projector camera, wildly non-linear for a
// perspective frustum: a fixed threshold there is centimeters near the eye and kilometers
// far from it. Everything below compares meters instead.
float linearizeProjectorDepth(int index, float depth) {
    float near = u_projectorDepthRange[index].x;
    float far = u_projectorDepthRange[index].y;
    float ndc = depth * 2.0 - 1.0;
    float perspective = (2.0 * near * far) / max(far + near - ndc * (far - near), 1e-6);
    float orthographic = near + depth * (far - near);

    return mix(perspective, orthographic, step(0.5, u_projectorParams[index].w));
}

float sampleProjectorDepth(int index, vec2 uv) {
    return texture(u_projectorDepthArray, vec3(uv, float(u_projectorLayer[index]))).r;
}

float getProjectorVisibility(int projectorIndex, vec3 rtcPos, vec3 normal) {
    vec3 N = normalize(normal);

    float depthBiasWorld = u_projectorParams[projectorIndex].x;
    float normalBiasWorld = u_projectorParams[projectorIndex].y;
    vec3 toProjector = u_projectorEyeRel[projectorIndex] - rtcPos;
    vec3 projectorLightDir = normalize(toProjector);
    float ndotl = max(dot(N, projectorLightDir), 0.0);

    // A texel of the depth map covers this much of the world right here, and the depth
    // inside it varies by about as much, which is exactly what the comparison has to allow.
    float texelScale = u_projectorDepthRange[projectorIndex].z;
    float texelWorld = mix(length(toProjector) * texelScale, texelScale, step(0.5, u_projectorParams[projectorIndex].w));

    float slopeTexels = min((1.0 - ndotl) / max(ndotl, 0.05) * PROJECTOR_SLOPE_DEPTH_BIAS, PROJECTOR_MAX_SLOPE_DEPTH_BIAS);
    float slopeBiasWorld = slopeTexels * texelWorld;

    vec3 biasedRtcPos = rtcPos + N * (normalBiasWorld + texelWorld * PROJECTOR_NORMAL_TEXEL_BIAS);
    vec3 projectorRelPos = biasedRtcPos - u_projectorEyeRel[projectorIndex];

    vec4 clip = u_projectorViewProjRTE[projectorIndex] * vec4(projectorRelPos, 1.0);

    if (clip.w <= 1e-6) {
        return 0.0;
    }

    vec3 ndc = clip.xyz / clip.w;
    vec2 uv = ndc.xy * 0.5 + 0.5;
    float receiverDepth = ndc.z * 0.5 + 0.5;
    float receiverLinear = linearizeProjectorDepth(projectorIndex, receiverDepth);

    #if PROJECTOR_PCF
    vec2 texSize = vec2(textureSize(u_projectorDepthArray, 0).xy);
    vec2 texelSize = 1.0 / texSize;

    vec2 uvInTexels = uv * texSize;

    float footprintX = length(dFdx(uvInTexels));
    float footprintY = length(dFdy(uvInTexels));
    float footprint = max(footprintX, footprintY);

    float receiverLinearFwidth = fwidth(receiverLinear);
    #endif

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return 0.0;
    }

    if (receiverDepth < 0.0 || receiverDepth > 1.0) {
        return 0.0;
    }

    float depthThreshold = depthBiasWorld + slopeBiasWorld;

    #if PROJECTOR_PCF
    float aliasingBoost = clamp((footprint - 1.0) * 0.75, 0.0, 2.0);
    float pcfScale = 1.0 + aliasingBoost;

    float transitionWidth = max(receiverLinearFwidth * PROJECTOR_PCF_SOFTNESS * pcfScale, PROJECTOR_MIN_TRANSITION);

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
            float mapLinear = linearizeProjectorDepth(projectorIndex, mapDepth);

            float compareDelta = (mapLinear + depthThreshold) - receiverLinear;
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
    float mapLinear = linearizeProjectorDepth(projectorIndex, mapDepth);
    return step(receiverLinear, mapLinear + depthThreshold);
    #endif
}

void applyProjector(int projectorIndex, vec3 rtcPos, vec3 normal, out vec3 projectorEmission, out vec3 projectorLight) {
    vec3 N = normalize(normal);

    float visibility = getProjectorVisibility(projectorIndex, rtcPos, N);

    vec4 colorIntensity = u_projectorColor[projectorIndex];

    vec3 color = colorIntensity.rgb;

    float opacity = colorIntensity.a;

    float renderMode = u_projectorParams[projectorIndex].z;
    float lightMode = step(0.5, renderMode);
    float colorMode = 1.0 - lightMode;

    vec3 lightDir = normalize(u_projectorEyeRel[projectorIndex] - rtcPos);
    float signedNdotl = dot(N, lightDir);
    float ndotl = max(signedNdotl, 0.0);
    float grazingFade = smoothstep(PROJECTOR_GRAZING_FADE_MIN, PROJECTOR_GRAZING_FADE_MAX, ndotl);
    float wrappedNdotl = clamp((signedNdotl + PROJECTOR_LIGHT_WRAP) / (1.0 + PROJECTOR_LIGHT_WRAP), 0.0, 1.0);
    vec3 projectedColor = color * opacity * visibility * grazingFade;

    projectorEmission = projectedColor * colorMode;
    projectorLight = projectedColor * wrappedNdotl * lightMode;
}

void applyProjectors(vec3 rtcPos, vec3 normal, out vec3 projectorEmission, out vec3 projectorLight) {
    projectorEmission = vec3(0.0);
    projectorLight = vec3(0.0);

    for (int i = 0; i < MAX_PROJECTORS; i++) {
        if (i >= u_projectorCount) {
            break;
        }

        vec3 projectorEmissionPart;
        vec3 projectorLightPart;
        applyProjector(i, rtcPos, normal, projectorEmissionPart, projectorLightPart);
        projectorEmission += projectorEmissionPart;
        projectorLight += projectorLightPart;
    }
}
