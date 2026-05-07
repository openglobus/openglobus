#version 300 es
precision highp float;

uniform vec4 visibleSphere;

in vec3 uCamPos;
in vec4 v_rgba;
in vec3 vPos;

out vec4 fragColor;

void main() {
    if (visibleSphere.w != 0.0) {
        vec3 cam_dir = normalize(vPos - uCamPos);
        vec3 sph_dir = normalize(vPos - visibleSphere.xyz);
        if (dot(cam_dir, sph_dir) > 0.11) {
            discard;
        }
    }

    fragColor = vec4(v_rgba.rgb, v_rgba.a);
}
