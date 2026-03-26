#version 300 es

precision highp float;

#include "../common/lighting.glsl"

uniform sampler2D baseTexture;
uniform sampler2D materialsTexture;
uniform sampler2D normalTexture;
uniform sampler2D depthTexture;

uniform vec3 lightPosition;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec4 lightSpecular;
uniform vec3 cameraPosition;
uniform mat4 inverseProjectionViewMatrix;

layout (location = 0) out vec4 fragColor;

vec3 reconstructWorldPosition(in ivec2 fragCoord, in float depth)
{
    vec2 framebufferSize = vec2(textureSize(depthTexture, 0));
    vec2 uv = (vec2(fragCoord) + 0.5) / framebufferSize;
    vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 world = inverseProjectionViewMatrix * ndc;
    return world.xyz / max(world.w, 1e-6);
}

void main(void) {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 baseColor = texelFetch(baseTexture, fragCoord, 0);
    float depth = texelFetch(depthTexture, fragCoord, 0).r;

    if (baseColor.a <= 1e-4) discard;

    vec4 materials = texelFetch(materialsTexture, fragCoord, 0);
    vec4 normalColor = texelFetch(normalTexture, fragCoord, 0);

    vec3 vertex = reconstructWorldPosition(fragCoord, depth);
    vec3 normal = normalize(normalColor.rgb * 2.0 - 1.0);

    float shininess = materials.r;
    float roughness = materials.g;

    vec4 lightWeighting;
    vec3 spec;

    getPhongLighting(
    vertex,
    normal,
    cameraPosition,
    lightPosition,
    lightAmbient,
    lightDiffuse,
    lightSpecular,
    shininess,
    spec,
    lightWeighting
    );

    fragColor = baseColor * lightWeighting + vec4(spec, 0.0);

    //fragColor = vec4(baseColor.rgb + vec3(keepAlive), 1.0);
}
