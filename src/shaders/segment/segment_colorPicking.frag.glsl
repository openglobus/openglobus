precision highp float;

#include "./common.glsl"

uniform vec4 tileOffsetArr[SLICE_SIZE];
uniform vec4 pickingColorArr[SLICE_SIZE];
uniform sampler2D samplerArr[SLICE_SIZE];
uniform sampler2D pickingMaskArr[SLICE_SIZE];
uniform int samplerCount;
varying vec2 vTextureCoord;

void main(void) {

    gl_FragColor = vec4(0.0);

    if (samplerCount == 0) return;

    vec2 tc;
    vec4 t;
    vec4 p;

    blendPicking(gl_FragColor, tileOffsetArr[0], samplerArr[0], pickingMaskArr[0], pickingColorArr[0], 1.0);
    if (samplerCount == 1) return;

    blendPicking(gl_FragColor, tileOffsetArr[1], samplerArr[1], pickingMaskArr[1], pickingColorArr[1], 1.0);
    if (samplerCount == 2) return;

    blendPicking(gl_FragColor, tileOffsetArr[2], samplerArr[2], pickingMaskArr[2], pickingColorArr[2], 1.0);
    if (samplerCount == 3) return;

    blendPicking(gl_FragColor, tileOffsetArr[3], samplerArr[3], pickingMaskArr[3], pickingColorArr[3], 1.0);
    if (samplerCount == 4) return;

    blendPicking(gl_FragColor, tileOffsetArr[4], samplerArr[4], pickingMaskArr[4], pickingColorArr[4], 1.0);
}