precision highp float;

uniform sampler2D texAtlas;

varying vec4 v_rgba;
varying vec2 v_texCoord;

void main () {

    vec4 color = texture2D(texAtlas, v_texCoord);

    gl_FragColor = v_rgba + color;
}