precision highp float;

uniform sampler2D texAtlas;
uniform vec4 visibleSphere;

varying vec3 uCamPos;
varying vec4 v_rgba;
varying vec3 vPos;
varying vec4 vTexCoord;

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

    float repeat = 10.0;

    float localY = fract((uv.y - min) / height * repeat);
    uv.y = clamp(min + localY * height, min, min + height);

    vec4 color = texture2D(texAtlas, uv);
    //gl_FragColor = vec4(v_rgba.rgb, v_rgba.a);
    gl_FragColor = color;
}