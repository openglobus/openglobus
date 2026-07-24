#version 300 es
precision highp float;

#include "../common/shadeMode.glsl"
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

in vec3 cameraPosition;
in vec3 v_vertex;
in vec3 v_viewPosition;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout (location = 0) out vec4 fragColor;

void main(void) {

    vec4 baseColor;

    if (uUseColorTexture > 0.0) {
        vec4 texColor = texture(uColorTexture, vTexCoords);
        baseColor = vec4(texColor.rgb * vColor.rgb, texColor.a * vColor.a);
    } else {
        baseColor = vColor;
    }

    float shade = shadeMode;

    if (shade == SHADE_UNLIT) {
        fragColor = baseColor;
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

    if (shade < SHADE_PBR) {
        float metallic = material.b;
        float roughness = material.g;
        float ao = material.r;

        vec3 vertex = v_vertex;
        float specularMask = metallic * (1.0 - roughness);

        vec4 lightWeighting;
        vec3 specularWeighting;

        // PHONG mode in no-atmos pass.
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
        fragColor = baseColor * lightWeighting + vec4(specularWeighting, 0.0);
    } else {
        float metallic = material.b;
        float roughness = material.g;
        float ao = material.r;

        vec3 vertex = v_vertex;
        float specularMask = metallic * (1.0 - roughness);

        vec4 lightWeighting;
        vec3 specularWeighting;

        // TODO: Real PBR forward(no-atmos) is not implemented yet. Keep PBR as Phong for now.
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
        fragColor = baseColor * lightWeighting + vec4(specularWeighting, 0.0);
    }
}
