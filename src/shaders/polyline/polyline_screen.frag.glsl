precision highp float;

uniform sampler2D texAtlas;
uniform vec4 visibleSphere;

varying vec3 uCamPos;
varying vec4 v_rgba;
varying vec3 vPos;
varying vec2 vTexCoord;

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
    //float min = v_texCoord.z;
    //float height = v_texCoord.w;

    vec4 color = texture2D(texAtlas, uv);
    //gl_FragColor = vec4(v_rgba.rgb, v_rgba.a);
    gl_FragColor = color;
}