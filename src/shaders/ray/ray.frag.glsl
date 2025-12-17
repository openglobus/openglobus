#version 300 es
precision highp float;

uniform sampler2D texAtlas;

in vec4 v_rgba;
in vec4 v_texCoord;
in float v_texOffset;
flat in float repeat;

out vec4 fragColor;

void main() {
    vec2 uv = v_texCoord.xy;
    float min = v_texCoord.z;
    float height = v_texCoord.w;

    if(height == 0.0){
        fragColor = v_rgba;
    }else {
        float EPS = 0.5 / 1024.0; //Atlas height

        float localY = fract((uv.y + v_texOffset - min) / height * repeat);
        uv.y = clamp(min + localY * height, min + EPS, min + height - EPS);

        vec4 color = texture(texAtlas, uv);
        fragColor = v_rgba * color;
    }
}