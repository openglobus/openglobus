#version 300 es
precision highp float;

uniform sampler2D u_texture;

in vec2 v_texCoords;
in vec4 v_rgba;

out vec4 outScreen;

void main () {
    vec4 color = texture(u_texture, v_texCoords);
    if (color.a < 0.1) {
        discard;
    }
    outScreen = color * v_rgba;
}
