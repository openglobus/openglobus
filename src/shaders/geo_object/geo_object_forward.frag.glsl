#version 300 es
precision highp float;

#include "../common/lighting.glsl"

uniform vec3 lightPosition;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec4 lightSpecular;
uniform vec3 materialProperties;
uniform sampler2D uTexture;
uniform float uUseTexture;
uniform float useLighting;

in vec3 cameraPosition;
in vec3 v_vertex;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout (location = 0) out vec4 fragColor;

void main(void) {

    vec4 baseColor;

    if (uUseTexture > 0.0) {
        vec4 texColor = texture(uTexture, vTexCoords);
        baseColor = vec4(texColor.rgb * vColor.rgb, texColor.a * vColor.a);
    } else {
        baseColor = vColor;
    }

    if (useLighting != 0.0) {
        float metallic = clamp(materialProperties[0], 0.0, 1.0);

        vec3 vertex = v_vertex;
        vec3 normal = normalize(vNormal);
        float specularMask = metallic;

        vec4 lightWeighting;
        vec3 specularWeighting;

        getPhongLighting(
        vertex,
        normal,
        cameraPosition,
        lightPosition,
        lightAmbient,
        lightDiffuse,
        lightSpecular,
        specularMask,
        specularWeighting,
        lightWeighting
        );

        fragColor = baseColor * lightWeighting + vec4(specularWeighting, 0.0);
    } else {
        fragColor = baseColor;
    }
}
