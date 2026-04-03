#version 300 es

precision highp float;
precision highp sampler2D;

#include "../common/shadeMode.glsl"
#include "../atmos/common.glsl"
#include "../common/lighting.glsl"

uniform sampler2D baseTexture;
uniform sampler2D materialsTexture;
uniform sampler2D normalTexture;
uniform sampler2D positionTexture;

uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;

#include "../atmos/lut_helpers.glsl"
#include "../atmos/atmosGroundColor.glsl"

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
    vec4 positionData = texelFetch(positionTexture, fragCoord, 0);
    vec3 vertex = positionData.xyz;
    vec3 emission = unpackEmissionColor(positionData.a);
    vec3 normal = normalize(normalColor.rgb * 2.0 - 1.0);
    uint shade = decodeShadeMode(normalColor.a);

    if (shade == SHADE_MODE_UNLIT) {
        fragColor = baseColor;
        return;
    }

    float specularMask = materials.r;

    vec3 sunPos = lightPosition;
    vec3 lightDir = normalize(sunPos);
    vec3 viewDir = normalize(cameraPosition - vertex);
    vec3 sunIlluminance;
    getSunIlluminance(vertex * SPHERE_TO_ELLIPSOID_SCALE, lightDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);

    vec4 lightWeighting;
    vec3 specularWeighting;

    // SHADE_MODE_PHONG and SHADE_MODE_PBR: PBR deferred not implemented yet
    getPhongLighting(
        vertex,
        normal,
        cameraPosition,
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
    atmosGroundColor(vertex, normal, cameraPosition, sunPos, atmosColor);

    getSunIlluminance(cameraPosition, viewDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);
    specularWeighting *= sunIlluminance;

    float fadingOpacity;
    getAtmosFadingOpacity(vertex, cameraPosition, atmosFadeDist, fadingOpacity);

    fragColor = mix(baseColor * (lightWeighting + vec4(emission, 0.0)), atmosColor * baseColor.a, fadingOpacity) + vec4(specularWeighting, 0.0);
}
