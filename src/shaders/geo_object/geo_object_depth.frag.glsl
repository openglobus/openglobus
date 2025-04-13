#version 300 es
precision highp float;

uniform float frustumPickingColor;

layout (location = 0) out vec4 frustumColor;
layout (location = 1) out vec4 depthColor;

void main() {
    frustumColor = vec4(frustumPickingColor, frustumPickingColor, frustumPickingColor, 1.0);
    depthColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
}