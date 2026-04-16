#version 300 es

precision highp float;

#include "../common/shadeMode.glsl"
#include "../common/lighting.glsl"

uniform sampler2D baseTexture;
uniform sampler2D materialsTexture;
uniform sampler2D normalTexture;
uniform sampler2D viewPositionTexture;

uniform mat3 normalMatrix;
uniform vec3 lightPosition;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec4 lightSpecular;

layout (location = 0) out vec4 fragColor;

void main(void) {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 baseColor = texelFetch(baseTexture, fragCoord, 0);

    if (baseColor.a <= 1e-4) discard;

    vec4 materials = texelFetch(materialsTexture, fragCoord, 0);
    vec4 normalColor = texelFetch(normalTexture, fragCoord, 0);
    vec4 viewPositionData = texelFetch(viewPositionTexture, fragCoord, 0);
    vec3 viewPos = viewPositionData.xyz;
    vec3 emission = unpackEmissionColor(viewPositionData.a);
    vec3 normal = normalize(normalColor.rgb * 2.0 - 1.0);
    uint shade = decodeShadeMode(normalColor.a);

    if (shade == SHADE_MODE_UNLIT) {
        fragColor = baseColor;
        return;
    }

    vec3 cameraRelWorld = normalMatrix * viewPos;
    float specularMask = materials.b;

    vec4 lightWeighting;
    vec3 specularWeighting;

    // SHADE_MODE_PHONG and SHADE_MODE_PBR: PBR deferred not implemented yet
    getPhongLighting(
    cameraRelWorld,
    normal,
    vec3(0.0),
    lightPosition,
    lightAmbient,
    lightDiffuse,
    lightSpecular,
    specularMask,
    specularWeighting,
    lightWeighting
    );

    fragColor = vec4(baseColor.rgb * lightWeighting.rgb + specularWeighting + emission, baseColor.a);
}
