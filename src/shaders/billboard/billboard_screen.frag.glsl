precision highp float;

uniform sampler2D u_texture;

varying vec2 v_texCoords;
varying vec4 v_rgba;

void main () {
    vec4 color = texture2D(u_texture, v_texCoords);
    if(color.a < 0.1)
    discard;
    gl_FragColor = color * v_rgba;
}