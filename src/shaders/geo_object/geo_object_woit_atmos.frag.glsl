#version 300 es
precision highp float;

#include "../common/weightedOIT.glsl"
#include "../common/shadeMode.glsl"
#include "../atmos/common.glsl"
#include "../common/lighting.glsl"
#include "../common/normals.glsl"

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
uniform mat3 normalMatrix;

uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;
uniform vec2 atmosFadeDist;
uniform vec2 atmosMaxMinOpacity;

#include "../atmos/lut_helpers.glsl"
#include "../atmos/atmosGroundColor.glsl"

in vec3 cameraPosition;
in vec3 v_vertex;
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

    if (shade == SHADE_UNLIT) {
        color = baseColor;
        weightedOITAccumulate(color, accumColor, accumAlpha);
        return;
    }

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

    vec3 material = materialProperties;
    if (uUseAOTexture > 0.0) {
        material.r = texture(uAOTexture, vTexCoords).r;
    }
    if (uUseMetallicRoughnessTexture > 0.0) {
        vec4 mr = texture(uMetallicRoughnessTexture, vTexCoords);
        material.g = mr.g;
        material.b = mr.b;
    }
    vec3 vertex = v_vertex;
    vec3 sunPos = lightPosition;

    if (shade < SHADE_PBR) {
        float metallic = material.b;
        float roughness = material.g;
        float specularMask = metallic * (1.0 - roughness);
        vec4 lightWeighting;
        vec3 specularWeighting;

        // PHONG mode in atmosphere pass: apply only Phong lighting without atmospheric contribution.
        getPhongLighting(
        vertex,
        normal,
        cameraPosition,
        sunPos,
        lightAmbient,
        lightDiffuse,
        lightSpecular,
        specularMask,
        specularWeighting,
        lightWeighting
        );

        color = baseColor * lightWeighting + vec4(specularWeighting, 0.0);
    } else {
        float metallic = material.b;
        float roughness = material.g;
        float specularMask = metallic * (1.0 - roughness);
        vec3 lightDir = normalize(sunPos);
        vec3 viewDir = normalize(cameraPosition - vertex);
        vec3 sunIlluminance;
        vec4 lightWeighting;
        vec3 specularWeighting;

        // TODO: Real PBR lighting is not implemented yet. Keep Phong + atmosphere for PBR mode.
        getSunIlluminance(vertex * SPHERE_TO_ELLIPSOID_SCALE, lightDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);
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
        getAtmosFadingOpacity(vertex, cameraPosition, atmosFadeDist, atmosMaxMinOpacity, fadingOpacity);

        color = mix(baseColor * lightWeighting, atmosColor * baseColor.a, fadingOpacity) + vec4(specularWeighting, 0.0);
    }

    weightedOITAccumulate(color, accumColor, accumAlpha);
}
