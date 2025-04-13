precision highp float;

#include "./common.glsl"

uniform vec4 tileOffsetArr[SLICE_SIZE];
uniform float layerOpacityArr[SLICE_SIZE];
uniform sampler2D defaultTexture;
uniform sampler2D samplerArr[SLICE_SIZE];
uniform int samplerCount;
varying vec2 vTextureCoord;

void main(void) {
    gl_FragColor = texture2D(defaultTexture, vTextureCoord);
    if (samplerCount == 0) return;

    vec4 src;

    blend(gl_FragColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
    if (samplerCount == 1) return;

    blend(gl_FragColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
    if (samplerCount == 2) return;

    blend(gl_FragColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
    if (samplerCount == 3) return;

    blend(gl_FragColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
    if (samplerCount == 4) return;

    blend(gl_FragColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
}