precision highp float;

uniform vec3 sunPosition;
uniform vec3 materialParams[3];
uniform float materialShininess;
uniform sampler2D uTexture;
uniform float uUseTexture;
uniform float useLighting;

varying vec3 cameraPosition;
varying vec3 v_vertex;
varying vec4 vColor;
varying vec3 vNormal;
varying vec2 vTexCoords;

void main(void) {

    vec3 lightWeighting = vec3(1.0);

    if (useLighting != 0.0) {
        vec3 normal = vNormal;
        vec3 lightDir = normalize(sunPosition);
        vec3 viewDir = normalize(cameraPosition - v_vertex);
        vec3 reflectionDirection = reflect(-lightDir, normal);
        float reflection = max(dot(reflectionDirection, viewDir), 0.0);
        float specularLightWeighting = pow(reflection, materialShininess);
        float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);
        lightWeighting = vColor.rgb * materialParams[0] + materialParams[1] * diffuseLightWeighting + materialParams[2] * specularLightWeighting;
    } else {
        lightWeighting = vColor.rgb;
    }

    if (uUseTexture > 0.0) {
        vec4 texColor = texture2D(uTexture, vTexCoords);
        gl_FragColor = vec4(texColor.rgb * lightWeighting, texColor.a);
    } else {
        gl_FragColor = vec4(lightWeighting, vColor.a);
    }
}