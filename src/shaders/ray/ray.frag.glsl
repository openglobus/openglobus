precision highp float;

uniform sampler2D texAtlas;

varying vec4 v_rgba;
varying vec4 v_texCoord;
varying float v_texOffset;
varying float repeat;

void main() {
    vec2 uv = v_texCoord.xy;
    float min = v_texCoord.z;
    float height = v_texCoord.w;

    if(height == 0.0){
        gl_FragColor = v_rgba;
    }else {
        float EPS = 0.5 / 1024.0; //Atlas height

        float localY = fract((uv.y + v_texOffset - min) / height * repeat);
        uv.y = clamp(min + localY * height, min + EPS, min + height - EPS);

        vec4 color = texture2D(texAtlas, uv);
        gl_FragColor = v_rgba * color;
    }
}