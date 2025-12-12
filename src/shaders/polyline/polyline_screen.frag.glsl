#version 300 es
precision highp float;

uniform sampler2D texAtlas;
uniform vec4 visibleSphere;

in vec3 uCamPos;
in vec4 v_rgba;
in vec3 vPos;
in vec4 vTexCoord;
flat in float repeat;

out vec4 fragColor;

//${UTILS}

void main() {

    if (visibleSphere.w != 0.0) {
        vec3 cam_dir = normalize(vPos - uCamPos);
        vec3 sph_dir = normalize(vPos - visibleSphere.xyz);
        if (dot(cam_dir, sph_dir) > 0.11) {
            discard;
        }
    }

    vec2 uv = vTexCoord.xy;
    float min = vTexCoord.z;
    float height = vTexCoord.w;

    float v_texOffset = 0.0;

    float EPS = 0.5 / 1024.0; //Atlas height

    float localY = fract((uv.y + v_texOffset - min) / height * repeat);
    uv.y = clamp(min + localY * height, min + EPS, min + height - EPS);

    vec4 color = texture(texAtlas, uv);
    //fragColor = vec4(v_rgba.rgb, v_rgba.a);
    fragColor = color;
}