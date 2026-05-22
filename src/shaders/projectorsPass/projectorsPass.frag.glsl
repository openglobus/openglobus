#version 300 es

precision highp float;
precision highp sampler2DArray;

#include "../common/projectors.glsl"

uniform sampler2D u_materialsTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_viewPositionTexture;
uniform mat3 u_normalMatrix;

layout(location = 0) out vec4 fragColor;

void main(void) {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);

    vec4 materials = texelFetch(u_materialsTexture, fragCoord, 0);
    float receiveProjectors = materials.a;

    if (receiveProjectors < 0.001) discard;

    vec4 viewPositionData = texelFetch(u_viewPositionTexture, fragCoord, 0);
    vec4 normalColor = texelFetch(u_normalTexture, fragCoord, 0);

    vec3 viewPos = viewPositionData.xyz;
    vec3 rtcPos = u_normalMatrix * viewPos;
    vec3 normal = normalize(normalColor.rgb * 2.0 - 1.0);

    vec3 contribution = applyProjectors(rtcPos, normal) * receiveProjectors;
    fragColor = vec4(contribution, 0.0);
}
