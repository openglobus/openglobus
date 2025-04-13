precision highp float;

varying vec3 v_rgb;

void main() {
    gl_FragColor = vec4(v_rgb, 1.0);
}