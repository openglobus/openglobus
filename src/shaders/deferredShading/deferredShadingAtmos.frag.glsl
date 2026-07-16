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

uniform mat3 normalMatrix;
uniform vec3 lightPosition;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec4 lightSpecular;
uniform vec3 cameraPosition;
uniform vec3 cameraForward;
uniform float isOrthographic;
uniform vec2 atmosFadeDist;
uniform vec3 atmosMaxMinOpacity;

layout (location = 0) out vec4 fragColor;

void main(void) {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 baseColor = texelFetch(baseTexture, fragCoord, 0);

    if (baseColor.a <= 1e-4) discard;

    vec4 normalColor = texelFetch(normalTexture, fragCoord, 0);
    float shadeMode = normalColor.a;

    vec4 materials = texelFetch(materialsTexture, fragCoord, 0);
    vec4 viewPositionData = texelFetch(viewPositionTexture, fragCoord, 0);
    vec3 viewPos = viewPositionData.xyz;
    vec3 emission = unpackEmissionColor(viewPositionData.a);
    vec3 normal = normalize(normalColor.rgb * 2.0 - 1.0);

    vec3 rtcPos = normalMatrix * viewPos;
    vec3 worldVertex = rtcPos + cameraPosition;

    if (shadeMode == SHADE_UNLIT) {
        fragColor = vec4(baseColor.rgb, baseColor.a);
        return;
    }

    float ao = materials.r;
    float specularMask = materials.b;

    vec3 sunPos = lightPosition;

    vec4 lightWeighting;
    vec3 specularWeighting;

    if (shadeMode < SHADE_PBR) {
        // PHONG mode in atmosphere pass: apply only Phong lighting without atmospheric contribution.
        getPhongLighting(
        rtcPos,
        normal,
        vec3(0.0),
        sunPos,
        lightAmbient,
        lightDiffuse,
        lightSpecular,
        specularMask,
        ao,
        specularWeighting,
        lightWeighting
        );
        fragColor = vec4(baseColor.rgb * lightWeighting.rgb + specularWeighting + emission, baseColor.a);
    } else {
        vec3 lightDir = normalize(sunPos);
        vec3 rayOrigin;
        vec3 rayDirection;
        getAtmosViewRay(worldVertex, cameraPosition, cameraForward, isOrthographic, rayOrigin, rayDirection);
        vec3 viewDir = normalize(-rayDirection);
        vec3 sunIlluminance;
        getSunIlluminance(worldVertex, lightDir, sunIlluminance);

        // TODO: Real PBR deferred is not implemented yet. Keep Phong + atmosphere for PBR mode.
        getPhongLighting(
        rtcPos,
        normal,
        vec3(0.0),
        sunPos,
        lightAmbient,
        lightDiffuse,
        lightSpecular,
        specularMask,
        sunIlluminance,
        ao,
        specularWeighting,
        lightWeighting
        );

        vec4 atmosColor;
        atmosGroundColor(worldVertex, normal, rayOrigin, rayDirection, sunPos, atmosColor);

        getSunIlluminance(cameraPosition, viewDir, sunIlluminance);
        specularWeighting *= mix(vec3(1.0), sunIlluminance, atmosColor.a);

        float fadingOpacity;
        getAtmosFadingOpacity(worldVertex, cameraPosition, atmosFadeDist, atmosMaxMinOpacity, fadingOpacity);
        fadingOpacity *= atmosColor.a;

        fragColor = vec4(
        mix(baseColor.rgb * lightWeighting.rgb + emission, atmosColor.rgb, fadingOpacity) + specularWeighting,
        baseColor.a
        );
    }
}
