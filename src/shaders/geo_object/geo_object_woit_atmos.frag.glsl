#version 300 es
precision highp float;

#include "../common/weightedOIT.glsl"
#include "../common/shadeMode.glsl"
#include "../atmos/common.glsl"
#include "../common/lighting.glsl"
#include "../common/normals.glsl"
#include "../common/projectors.glsl"
#include "../common/shadows.glsl"

uniform vec3 lightPosition;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec4 lightSpecular;
uniform vec3 materialProperties;
uniform sampler2D uColorTexture;
uniform sampler2D uNormalTexture;
uniform sampler2D uMetallicRoughnessTexture;
uniform sampler2D uAOTexture;
uniform float uUseColorTexture;
uniform float uUseNormalTexture;
uniform float uUseMetallicRoughnessTexture;
uniform float uUseAOTexture;
uniform float shadeMode;
uniform float uReceiveMask;
uniform mat3 normalMatrix;

const int RECEIVE_PROJECTORS = 1;
const int RECEIVE_SHADOWS = 2;

uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;
uniform vec2 atmosFadeDist;
uniform vec3 atmosMaxMinOpacity;
uniform vec3 cameraForward;
uniform float isOrthographic;

#include "../atmos/lut_helpers.glsl"
#include "../atmos/atmosGroundColor.glsl"

in vec3 cameraPosition;
in vec3 v_vertex;
in vec3 v_rtcPos;
in vec3 v_viewPosition;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout(location = 0) out vec4 accumColor;
layout(location = 1) out float accumAlpha;

void main(void) {

    vec4 baseColor;

    if (uUseColorTexture > 0.0) {
        vec4 texColor = texture(uColorTexture, vTexCoords);
        baseColor = vec4(texColor.rgb * vColor.rgb, texColor.a * vColor.a);
    } else {
        baseColor = vColor;
    }

    vec4 color;

    float shade = shadeMode;
    vec3 normal = normalize(vNormal);

    if (uUseNormalTexture > 0.0) {
        normal = getNormalWorldFromTexture(
            uNormalTexture,
            vTexCoords,
            normal,
            v_viewPosition,
            normalMatrix
        );
    }

    vec3 projectorEmission;
    vec3 projectorLight;
    applyProjectors(v_rtcPos, normal, projectorEmission, projectorLight);
    int receiveMask = int(uReceiveMask + 0.5);
    float receiveProjectors = float(receiveMask & RECEIVE_PROJECTORS) / float(RECEIVE_PROJECTORS);
    float receiveShadows = float(receiveMask & RECEIVE_SHADOWS) / float(RECEIVE_SHADOWS);
    projectorEmission *= receiveProjectors;
    projectorLight *= receiveProjectors;
    vec3 shadowLight = applyShadowMaps(v_rtcPos, normal, lightDiffuse) * receiveShadows;

    if (shade == SHADE_UNLIT) {
        color = baseColor;
        color.rgb += projectorEmission;
        weightedOITAccumulate(color, accumColor, accumAlpha);
        return;
    }

    vec3 material = materialProperties;
    if (uUseAOTexture > 0.0) {
        material.r = texture(uAOTexture, vTexCoords).r;
    }
    if (uUseMetallicRoughnessTexture > 0.0) {
        vec4 mr = texture(uMetallicRoughnessTexture, vTexCoords);
        material.g = mr.g;
        material.b = mr.b;
    }

    vec3 rtcPos = normalMatrix * v_viewPosition;
    vec3 worldVertex = rtcPos + cameraPosition;
    vec3 sunPos = lightPosition;

    if (shade < SHADE_PBR) {
        float ao = material.r;
        float specularMask = material.b;
        vec4 lightWeighting;
        vec3 specularWeighting;

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

        color = vec4(
            baseColor.rgb * (lightWeighting.rgb + projectorLight + shadowLight) +
            specularWeighting +
            projectorEmission,
            baseColor.a
        );
    } else {
        float ao = material.r;
        float specularMask = material.b;
        vec3 lightDir = normalize(sunPos);
        vec3 rayOrigin;
        vec3 rayDirection;
        getAtmosViewRay(worldVertex, cameraPosition, cameraForward, isOrthographic, rayOrigin, rayDirection);
        vec3 viewDir = normalize(-rayDirection);
        vec3 sunIlluminance;
        vec4 lightWeighting;
        vec3 specularWeighting;

        // TODO: Real PBR lighting is not implemented yet. Keep Phong + atmosphere for PBR mode.
        getSunIlluminance(worldVertex, lightDir, sunIlluminance);
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

        color = vec4(
            mix(
                baseColor.rgb * (lightWeighting.rgb + projectorLight + shadowLight),
                atmosColor.rgb,
                fadingOpacity
            ) + specularWeighting + projectorEmission,
            baseColor.a
        );
    }

    weightedOITAccumulate(color, accumColor, accumAlpha);
}
