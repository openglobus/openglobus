#version 300 es

in vec2 corners;

out vec2 tc;

void main(void) {
    gl_Position = vec4(corners, 0.0, 1.0);
    tc = corners * 0.5 + 0.5;
}