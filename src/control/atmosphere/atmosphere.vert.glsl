attribute vec2 corners;

void main(void) {
    gl_Position = vec4(corners, 0.0, 1.0);
}