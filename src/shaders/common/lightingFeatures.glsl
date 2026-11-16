// Projectors and shadows compiled in only when a program variant asks for them
// (shaderFeatureParams() in uniforms.ts fills these in). Code that is compiled in
// costs fragment throughput on some GPUs even when no projector or shadow is active,
// so programs without them use a variant that leaves it out.
#define USE_PROJECTORS ${ USE_PROJECTORS }
#define USE_SHADOW_MAPS ${ USE_SHADOW_MAPS }
#define USE_CASCADE_SHADOWS ${ USE_CASCADE_SHADOWS }

#if USE_PROJECTORS
#include "./projectors.glsl"
#else
vec3 applyProjectorDecal(vec3 surfaceColor, vec4 projectorDecal) {
    return surfaceColor;
}
#endif

// cascadeShadows.glsl takes its defines from shadows.glsl
#if USE_SHADOW_MAPS || USE_CASCADE_SHADOWS
#include "./shadows.glsl"
#endif

#if USE_CASCADE_SHADOWS
#include "./cascadeShadows.glsl"
#endif

void applyLightingFeatureProjectors(vec3 rtcPos, vec3 normal, out vec4 projectorDecal, out vec3 projectorLight) {
#if USE_PROJECTORS
    applyProjectors(rtcPos, normal, projectorDecal, projectorLight);
#else
    projectorDecal = vec4(0.0);
    projectorLight = vec3(0.0);
#endif
}

float getLightingFeatureShadowVisibility(vec3 rtcPos, vec3 normal) {
    float visibility = 1.0;
#if USE_SHADOW_MAPS
    visibility *= getShadowMapsDirectVisibility(rtcPos, normal);
#endif
#if USE_CASCADE_SHADOWS
    visibility *= getCascadeShadowDirectVisibility(rtcPos, normal);
#endif
    return visibility;
}
