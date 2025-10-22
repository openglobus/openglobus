precision highp float;

uniform sampler2D texAtlas;

varying vec4 v_rgba;
varying vec4 v_texCoord;

void main() {

    float repeat = 10.0;
    float offset = 0.0;

    vec2 uv = v_texCoord.xy;
    float min = v_texCoord.z;
    float height = v_texCoord.w;

    float EPS = 0.5 / 1024.0; //Atlas height

    float localY = fract((uv.y + offset - min) / height * repeat);
    uv.y = clamp(min + localY * height, min + EPS, min + height - EPS);

    vec4 color = texture2D(texAtlas, uv);
    gl_FragColor = v_rgba * color;
}