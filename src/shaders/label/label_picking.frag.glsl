#version 300 es
precision highp float;

in vec4 v_rgba;

out vec4 outColor;

void main() {

    vec4 color = v_rgba;
    if (color.a < 0.05) {
        discard;
    }

    outColor = vec4(v_rgba.rgb, v_rgba.a);
}
