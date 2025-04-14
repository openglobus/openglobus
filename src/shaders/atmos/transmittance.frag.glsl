precision highp float;

#include "./common.glsl"

uniform vec2 iResolution;

void main(void)
{
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float height = uv.y * ATMOS_HEIGHT;
    float angle = uv.x * 2.0 - 1.0;
    gl_FragColor = vec4(transmittance(height, angle), 1.0);
}