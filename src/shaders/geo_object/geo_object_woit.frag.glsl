#version 300 es
precision highp float;

#include "../common/weightedOIT.glsl"

uniform vec3 sunPosition;
uniform vec3 materialProperties;
uniform sampler2D uTexture;
uniform float uUseTexture;
uniform float useLighting;

in vec3 cameraPosition;
in vec3 v_vertex;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout(location=0) out vec4 accumColor;
layout(location=1) out float accumAlpha;

void main(void) {

    vec3 lightWeighting = vec3(1.0);

    if (useLighting != 0.0) {
        vec3 normal = normalize(vNormal);
        vec3 light_dir = normalize(sunPosition);
        vec3 look_dir = normalize(cameraPosition - v_vertex);

        float diffuse = max(dot(normal, light_dir), 0.0);

        vec3 refl_dir = reflect(-light_dir, normal);
        float refl = max(dot(refl_dir, look_dir), 0.0);
        float specular = pow(refl, 0.0) * step(1e-4, diffuse);

        lightWeighting = vColor.rgb * diffuse + materialProperties[0] + materialProperties[1] + materialProperties[2];
    } else {
        lightWeighting = vColor.rgb;
    }

    vec4 color;

    if (uUseTexture > 0.0) {
        vec4 texColor = texture(uTexture, vTexCoords);
        color = vec4(texColor.rgb * lightWeighting, texColor.a * vColor.a);
    } else {
        color = vec4(lightWeighting, vColor.a);
    }

    weightedOITAccumulate(color, accumColor, accumAlpha);
}
