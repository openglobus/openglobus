#version 300 es

precision highp float;
precision highp sampler2D;

#include "../common/shadeMode.glsl"
#include "../atmos/common.glsl"
#include "../common/lighting.glsl"

uniform sampler2D baseTexture;
uniform sampler2D materialsTexture;
uniform sampler2D normalTexture;
uniform sampler2D viewPositionTexture;

uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;

#include "../atmos/lut_helpers.glsl"
#include "../atmos/atmosGroundColor.glsl"

uniform mat4 viewMatrix;
uniform vec3 lightPosition;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec4 lightSpecular;
uniform vec3 cameraPosition;
uniform vec2 atmosFadeDist;

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

    vec3 cameraRelWorld = transpose(mat3(viewMatrix)) * viewPos;
    vec3 worldVertex = cameraRelWorld + cameraPosition;
    float specularMask = materials.r;

    vec3 sunPos = lightPosition;
    vec3 lightDir = normalize(sunPos);
    vec3 viewDir = normalize(-cameraRelWorld);
    vec3 sunIlluminance;
    getSunIlluminance(worldVertex * SPHERE_TO_ELLIPSOID_SCALE, lightDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);

    vec4 lightWeighting;
    vec3 specularWeighting;

    // SHADE_MODE_PHONG and SHADE_MODE_PBR: PBR deferred not implemented yet
    getPhongLighting(
    cameraRelWorld,
    normal,
    vec3(0.0),
    sunPos,
    lightAmbient,
    lightDiffuse,
    lightSpecular,
    specularMask,
    sunIlluminance,
    specularWeighting,
    lightWeighting
    );

    vec4 atmosColor;
    atmosGroundColor(worldVertex, normal, cameraPosition, sunPos, atmosColor);

    getSunIlluminance(cameraPosition, viewDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);
    specularWeighting *= sunIlluminance;

    float fadingOpacity;
    getAtmosFadingOpacity(worldVertex, cameraPosition, atmosFadeDist, fadingOpacity);

    fragColor = vec4(
    mix(baseColor.rgb * lightWeighting.rgb + emission, atmosColor.rgb, fadingOpacity) + specularWeighting,
    baseColor.a
    );
}
