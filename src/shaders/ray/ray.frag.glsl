precision highp float;

uniform sampler2D texAtlas;

varying vec4 v_rgba;
varying vec4 v_texCoord;

void main() {

    float repeat = 2.0;

    vec4 color = texture2D(texAtlas, v_texCoord.xy);

    gl_FragColor = v_rgba * color;
}