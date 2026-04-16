#version 300 es
precision highp float;

#include "../common/shadeMode.glsl"
#include "../common/normals.glsl"

uniform sampler2D uColorTexture;
uniform sampler2D uNormalTexture;
uniform float uUseColorTexture;
uniform float uUseNormalTexture;
uniform vec3 materialProperties;
uniform float shadeMode;
uniform mat4 viewMatrix;

in vec3 v_viewPosition;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout (location = 0) out vec4 diffuseColor;
layout (location = 1) out vec4 materials;
layout (location = 2) out vec4 normalColor;
layout (location = 3) out vec4 positionColor;

void main(void) {
    // R = ambient occlusion, G = roughness, B = metallic
    materials = vec4(materialProperties, 1.0);
    positionColor = vec4(v_viewPosition, 0.0);
    vec3 normal = normalize(vNormal);

    if (uUseNormalTexture > 0.0) {
        normal = getNormalWorldFromTexture(uNormalTexture, vTexCoords, normal, v_viewPosition, viewMatrix);
    }

    normalColor = vec4(normal * 0.5 + 0.5, encodeShadeModeUint(shadeModeToUint(shadeMode)));

    if (uUseColorTexture > 0.0) {
        diffuseColor = texture(uColorTexture, vTexCoords);
    } else {
        diffuseColor = vColor;
    }
}
