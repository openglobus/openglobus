#version 300 es
precision highp float;

in vec3 v_rgb;

out vec4 outColor;

void main() {
    outColor = vec4(v_rgb, 1.0);
}
