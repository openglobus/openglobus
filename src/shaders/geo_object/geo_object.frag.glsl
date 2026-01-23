#version 300 es
precision highp float;

uniform vec3 sunPosition;
uniform vec3 materialParams[3];
uniform float materialShininess;
uniform sampler2D uTexture;
uniform float uUseTexture;
uniform float useLighting;

in vec3 cameraPosition;
in vec3 v_vertex;
in vec4 vColor;
in vec3 vNormal;
in vec2 vTexCoords;

layout (location = 0) out vec4 diffuseColor;
layout (location = 1) out vec4 normalColor;

void main(void) {

    vec3 lightWeighting = vec3(1.0);

    if (useLighting != 0.0) {
        vec3 normal = normalize(vNormal);
        vec3 light_dir = normalize(sunPosition);
        vec3 look_dir = normalize(cameraPosition - v_vertex);

        float diffuse = max(dot(normal, light_dir), 0.0);

        vec3 refl_dir = reflect(-light_dir, normal);
        float refl = max(dot(refl_dir, look_dir), 0.0);
        float specular = pow(refl, materialShininess) * step(1e-4, diffuse);

        lightWeighting = vColor.rgb * materialParams[0] + materialParams[1] * diffuse + materialParams[2] * specular;
    } else {
        lightWeighting = vColor.rgb;
    }

    lightWeighting = vec3(1.0);
    normalColor = vec4(normalize(vNormal) * 0.5 + 0.5, 1.0);

    if (uUseTexture > 0.0) {
        vec4 texColor = texture(uTexture, vTexCoords);
        diffuseColor = vec4(texColor.rgb * lightWeighting, texColor.a);
    } else {
        diffuseColor = vec4(lightWeighting, vColor.a);
    }
}