#version 300 es
precision highp float;

#include "../common/shadeMode.glsl"
#include "../common/normals.glsl"

uniform sampler2D uColorTexture;
uniform sampler2D uNormalTexture;
uniform sampler2D uMetallicTexture;
uniform sampler2D uRoughnessTexture;
uniform float uUseColorTexture;
uniform float uUseNormalTexture;
uniform float uUseMetallicTexture;
uniform float uUseRoughnessTexture;
uniform vec3 materialProperties;
uniform float shadeMode;
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
    vec3 resolvedMaterialProperties = materialProperties;

    if (uUseRoughnessTexture > 0.0) {
        // glTF metallic-roughness convention: G = roughness.
        float roughness = texture(uRoughnessTexture, vTexCoords).g;
        resolvedMaterialProperties.g = clamp(roughness, 0.0, 1.0);
    }

    if (uUseMetallicTexture > 0.0) {
        // glTF metallic-roughness convention: B = metallic.
        float metallic = texture(uMetallicTexture, vTexCoords).b;
        resolvedMaterialProperties.b = clamp(metallic, 0.0, 1.0);
    }

    // R = ambient occlusion, G = roughness, B = metallic
    materials = vec4(resolvedMaterialProperties, 1.0);
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
