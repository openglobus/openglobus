#version 300 es
precision highp float;

#include "../common/weightedOIT.glsl"
#include "../common/lighting.glsl"

uniform vec3 lightPosition;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec4 lightSpecular;
uniform vec3 materialProperties;
uniform sampler2D uTexture;
uniform float uUseTexture;
uniform float shadeMode;

in vec3 cameraPosition;
in vec3 v_vertex;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout(location=0) out vec4 accumColor;
layout(location=1) out float accumAlpha;

void main(void) {

    vec4 baseColor;

    if (uUseTexture > 0.0) {
        vec4 texColor = texture(uTexture, vTexCoords);
        baseColor = vec4(texColor.rgb * vColor.rgb, texColor.a * vColor.a);
    } else {
        baseColor = vColor;
    }

    vec4 color;

    if (shadeMode < 0.5) {
        color = baseColor;
    } else {
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

        color = baseColor * lightWeighting + vec4(specularWeighting, 0.0);
    }

    weightedOITAccumulate(color, accumColor, accumAlpha);
}
