precision highp float;

uniform sampler2D texAtlas;

varying vec4 v_rgba;
varying vec4 v_texCoord;

void main() {


    float repeat = 5.0;

    vec2 uv = v_texCoord.xy;
    float min = v_texCoord.z;
    float height = v_texCoord.w;

    float localY = fract((uv.y - min) / height * repeat);
    uv.y = min + localY * height;

    vec4 color = texture2D(texAtlas, uv);

    gl_FragColor = v_rgba * color;
}