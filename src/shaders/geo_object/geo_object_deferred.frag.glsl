#version 300 es
precision highp float;

#include "../common/shadeMode.glsl"
#include "../common/normals.glsl"

uniform sampler2D uColorTexture;
uniform sampler2D uNormalTexture;
uniform sampler2D uMetallicRoughnessTexture;
uniform sampler2D uAOTexture;
uniform float uUseColorTexture;
uniform float uUseNormalTexture;
uniform float uUseMetallicRoughnessTexture;
uniform float uUseAOTexture;
uniform vec3 materialProperties;
uniform float shadeMode;
uniform float uReceiveMask;
uniform mat3 normalMatrix;

in vec3 v_viewPosition;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout (location = 0) out vec4 diffuseColor;
layout (location = 1) out vec4 materials;
layout (location = 2) out vec4 normalColor;
layout (location = 3) out vec4 positionColor;

void main(void) {
    vec3 material = materialProperties;
    if (uUseAOTexture > 0.0) {
        material.r = texture(uAOTexture, vTexCoords).r;
    }
    if (uUseMetallicRoughnessTexture > 0.0) {
        vec4 mr = texture(uMetallicRoughnessTexture, vTexCoords);
        material.g = mr.g;
        material.b = mr.b;
    }

    // R = ambient occlusion, G = roughness, B = metallic, A = projector/shadow receive bit mask
    materials = vec4(material, uReceiveMask);
    positionColor = vec4(v_viewPosition, 0.0);
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

    normalColor = vec4(normal * 0.5 + 0.5, shadeMode);

    if (uUseColorTexture > 0.0) {
        diffuseColor = texture(uColorTexture, vTexCoords);
    } else {
        diffuseColor = vColor;
    }
}
