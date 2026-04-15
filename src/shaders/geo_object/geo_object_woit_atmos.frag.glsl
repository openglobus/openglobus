#version 300 es
precision highp float;

#include "../common/weightedOIT.glsl"
#include "../atmos/common.glsl"
#include "../common/lighting.glsl"

uniform vec3 lightPosition;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec4 lightSpecular;
uniform vec3 materialProperties;
uniform sampler2D uTexture;
uniform float uUseTexture;
uniform float shadeMode;

uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;
uniform vec2 atmosFadeDist;

#include "../atmos/lut_helpers.glsl"
#include "../atmos/atmosGroundColor.glsl"

in vec3 cameraPosition;
in vec3 v_vertex;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout(location = 0) out vec4 accumColor;
layout(location = 1) out float accumAlpha;

void main(void) {

    vec4 baseColor;

    if (uUseTexture > 0.0) {
        vec4 texColor = texture(uTexture, vTexCoords);
        baseColor = vec4(texColor.rgb * vColor.rgb, texColor.a * vColor.a);
    } else {
        baseColor = vColor;
    }

    vec3 vertex = v_vertex;
    vec3 normal = normalize(vNormal);
    vec3 sunPos = lightPosition;
    vec4 color;

    if (shadeMode < 0.5) {
        color = baseColor;
    } else {
        float metallic = clamp(materialProperties[0], 0.0, 1.0);
        float specularMask = metallic;
        vec3 lightDir = normalize(sunPos);
        vec3 viewDir = normalize(cameraPosition - vertex);
        vec3 sunIlluminance;
        getSunIlluminance(vertex * SPHERE_TO_ELLIPSOID_SCALE, lightDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);

        vec4 lightWeighting;
        vec3 specularWeighting;

        // shadeMode 1 Phong, 2 PBR — PBR forward not implemented yet
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

        color = mix(baseColor * lightWeighting, atmosColor * baseColor.a, fadingOpacity) + vec4(specularWeighting, 0.0);
    }

    weightedOITAccumulate(color, accumColor, accumAlpha);
}
