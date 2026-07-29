#version 300 es
precision highp float;

layout (location = 0) out vec4 depthColor;

#include "../common/shadowDefines.glsl"
#include "../common/computeShadowMoments.glsl"

void main() {
    #if VARIANCE_SHADOW_ENABLED == 1
    vec2 moments = computeShadowMoments(gl_FragCoord.z);
    depthColor = vec4(moments, 0.0, 1.0);
    #else
    depthColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
    #endif
}
