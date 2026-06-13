#version 300 es
precision highp float;

#include "../common/weightedOIT.glsl"
#include "../common/shadeMode.glsl"
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

in vec3 cameraPosition;
in vec3 v_vertex;
in vec3 v_rtcPos;
in vec3 v_viewPosition;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout(location=0) out vec4 accumColor;
layout(location=1) out float accumAlpha;

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
    float receiveProjectors = ((receiveMask & RECEIVE_PROJECTORS) != 0) ? 1.0 : 0.0;
    float receiveShadows = ((receiveMask & RECEIVE_SHADOWS) != 0) ? 1.0 : 0.0;
    projectorEmission *= receiveProjectors;
    projectorLight *= receiveProjectors;
    vec3 shadowLight = applyShadowMaps(v_rtcPos, normal) * receiveShadows;

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

    if (shade < SHADE_PBR) {
        float metallic = material.b;
        float roughness = material.g;
        float ao = material.r;

        vec3 vertex = v_vertex;
        float specularMask = metallic * (1.0 - roughness);

        vec4 lightWeighting;
        vec3 specularWeighting;

        // PHONG mode in no-atmos WOIT pass.
        getPhongLighting(
        vertex,
        normal,
        cameraPosition,
        lightPosition,
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
        float metallic = material.b;
        float roughness = material.g;
        float ao = material.r;

        vec3 vertex = v_vertex;
        float specularMask = metallic * (1.0 - roughness);

        vec4 lightWeighting;
        vec3 specularWeighting;

        // TODO: Real PBR WOIT(no-atmos) is not implemented yet. Keep PBR as Phong for now.
        getPhongLighting(
        vertex,
        normal,
        cameraPosition,
        lightPosition,
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
    }

    weightedOITAccumulate(color, accumColor, accumAlpha);
}
