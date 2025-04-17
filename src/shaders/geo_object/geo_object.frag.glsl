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
        vec3 normal = normalize(vNormal);
        vec3 light_dir = normalize(sunPosition);
        vec3 look_dir = normalize(cameraPosition - v_vertex);

        float diffuse = max(dot(normal, light_dir), 0.0);

        vec3 refl_dir = reflect(-light_dir, normal);
        float refl = max(dot(refl_dir, look_dir), 0.0);
        float specular = pow(refl, materialShininess) * step(1e-4, diffuse);

        lightWeighting = vColor.rgb * materialParams[0]
        + materialParams[1] * diffuse
        + materialParams[2] * specular;
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