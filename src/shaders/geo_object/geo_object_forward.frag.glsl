#version 300 es
precision highp float;

#include "../common/lighting.glsl"
#include "../common/normals.glsl"

uniform vec3 lightPosition;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec4 lightSpecular;
uniform vec3 materialProperties;
uniform sampler2D uColorTexture;
uniform sampler2D uNormalTexture;
uniform float uUseColorTexture;
uniform float uUseNormalTexture;
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

    if (shadeMode < 0.5) {
        fragColor = baseColor;
    } else {
        float metallic = clamp(materialProperties.b, 0.0, 1.0);

        vec3 vertex = v_vertex;
        float specularMask = metallic;

        vec4 lightWeighting;
        vec3 specularWeighting;

        // shadeMode 1 Phong, 2 PBR — PBR forward not implemented yet
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
    }
}
