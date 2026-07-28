#version 300 es

precision highp float;
precision highp sampler2DArray;

#include "../common/projectors.glsl"
#include "../common/shadeMode.glsl"
#include "../common/materialFlags.glsl"

const int RECEIVE_PROJECTORS = 1;

uniform sampler2D u_baseTexture;
uniform sampler2D u_materialsTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_viewPositionTexture;
uniform mat3 u_normalMatrix;
uniform float frameOpacity;

layout(location = 0) out vec4 fragColor;

void main(void) {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);

    vec4 materials = texelFetch(u_materialsTexture, fragCoord, 0);
    uint materialFlags = uint(materials.a + 0.5);
    int receiveMask = int(materials.a + 0.5);
    float receiveProjectors = float(receiveMask & RECEIVE_PROJECTORS) / float(RECEIVE_PROJECTORS);

    if (!materialReceivesProjectors(materialFlags)) discard;

    vec4 viewPositionData = texelFetch(u_viewPositionTexture, fragCoord, 0);
    vec4 normalColor = texelFetch(u_normalTexture, fragCoord, 0);
    vec4 baseColor = texelFetch(u_baseTexture, fragCoord, 0);

    vec3 viewPos = viewPositionData.xyz;
    vec3 rtcPos = u_normalMatrix * viewPos;
    vec3 normal = normalize(normalColor.rgb * 2.0 - 1.0);
    float litMask = step(0.001, normalColor.a);

    vec3 projectorEmission;
    vec3 projectorLight;
    applyProjectors(rtcPos, normal, projectorEmission, projectorLight);

    float frameTransparency = materialReceivesFrameTransparencyMask(materialFlags);
    float receiverOpacity = mix(1.0, frameOpacity, frameTransparency);
    vec3 contribution = (projectorEmission + baseColor.rgb * projectorLight * litMask) * receiverOpacity;

    fragColor = vec4(contribution, 0.0);
}
