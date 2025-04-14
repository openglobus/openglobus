precision highp float;

varying vec4 v_rgba;

varying vec3 v_pickingColor;

void main() {

    vec4 color = v_rgba;
    if (color.a < 0.05) {
        return;
    }

    gl_FragColor = vec4(v_rgba.rgb, v_rgba.a);
}