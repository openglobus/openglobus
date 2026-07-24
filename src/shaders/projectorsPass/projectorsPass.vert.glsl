#version 300 es

precision highp float;

in vec3 a_corners;

void main(void) {
    gl_Position = vec4(a_corners.xy, 0.0, 1.0);
}
