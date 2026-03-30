#version 300 es
precision highp float;

#include "../common/shadeMode.glsl"

uniform sampler2D uTexture;
uniform float uUseTexture;
uniform float shadeMode;

in vec3 v_vertex;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout (location = 0) out vec4 diffuseColor;
layout (location = 1) out vec4 materials;
layout (location = 2) out vec4 normalColor;
layout (location = 3) out vec4 positionColor;

void main(void) {

    materials = vec4(0.0, 0.0, 0.0, 1.0);
    positionColor = vec4(v_vertex, 1.0);
    normalColor = vec4(normalize(vNormal) * 0.5 + 0.5, encodeShadeModeUint(shadeModeToUint(shadeMode)));

    if (uUseTexture > 0.0) {
        diffuseColor = texture(uTexture, vTexCoords);
    } else {
        diffuseColor = vColor;
    }
}
