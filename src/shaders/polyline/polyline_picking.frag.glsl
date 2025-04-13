precision highp float;

uniform vec4 visibleSphere;

varying vec3 uCamPos;
varying vec4 vColor;
varying vec3 vPos;

void main() {
    if(visibleSphere.w != 0.0) {
        vec3 cam_dir = normalize(vPos - uCamPos);
        vec3 sph_dir = normalize(vPos - visibleSphere.xyz);
        if( dot(cam_dir, sph_dir) > 0.11 ){
            discard;
        }
    }
    gl_FragColor = vec4(vColor.rgb, vColor.a);
}