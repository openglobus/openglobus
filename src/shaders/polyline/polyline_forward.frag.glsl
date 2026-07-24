#version 300 es
precision highp float;

uniform sampler2D texAtlas;
uniform vec4 visibleSphere;

in vec3 uCamPos;
in vec4 v_rgba;
in vec3 vPos;
in vec4 vTexCoord;
flat in float repeat;
flat in float v_texOffset;
flat in float v_pathPhase;
flat in float v_texEnabled;

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

    float texEnabled = step(0.5, v_texEnabled);

    vec2 uv = vTexCoord.xy;

    float min = vTexCoord.z;
    float texHeight = max(vTexCoord.w, 1e-6);

    float EPS = 0.5 / 1024.0; //Atlas height

    float t = (uv.y - min) / texHeight;
    float phaseStart = v_pathPhase - repeat;
    float animatedOffset = v_texOffset * repeat / texHeight;
    float localY = fract(t * repeat + phaseStart + animatedOffset);
    uv.y = clamp(min + localY * texHeight, min + EPS, min + texHeight - EPS);

    vec4 texColor = texture(texAtlas, uv) * v_rgba;

    vec4 baseColor = vec4(v_rgba.rgb, v_rgba.a);
    fragColor = mix(baseColor, texColor, texEnabled);
}
