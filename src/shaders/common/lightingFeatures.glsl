// Projectors and shadows compiled in only when the program variant has their switch on
// (lightingFeatureDefines in uniforms.ts).

#ifdef USE_PROJECTORS
#include "./projectors.glsl"
#else
vec3 applyProjectorDecal(vec3 surfaceColor, vec4 projectorDecal) {
    return surfaceColor;
}
#endif

// cascadeShadows.glsl takes its defines from shadows.glsl
#if defined(USE_SHADOW_MAPS) || defined(USE_CASCADE_SHADOWS)
#include "./shadows.glsl"
#endif

#ifdef USE_CASCADE_SHADOWS
#include "./cascadeShadows.glsl"
#endif

void applyLightingFeatureProjectors(vec3 rtcPos, vec3 normal, out vec4 projectorDecal, out vec3 projectorLight) {
    #ifdef USE_PROJECTORS
    applyProjectors(rtcPos, normal, projectorDecal, projectorLight);
    #else
    projectorDecal = vec4(0.0);
    projectorLight = vec3(0.0);
    #endif
}

float getLightingFeatureShadowVisibility(vec3 rtcPos, vec3 normal) {
    float visibility = 1.0;
    #ifdef USE_SHADOW_MAPS
    visibility *= getShadowMapsDirectVisibility(rtcPos, normal);
    #endif
    #ifdef USE_CASCADE_SHADOWS
    visibility *= getCascadeShadowDirectVisibility(rtcPos, normal);
    #endif
    return visibility;
}
