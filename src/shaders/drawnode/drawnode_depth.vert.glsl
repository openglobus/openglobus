#version 300 es

precision highp float;

in vec3 aVertexPositionHigh;
in vec3 aVertexPositionLow;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;
uniform float height;

void main(void) {

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    mat4 m = projectionMatrix * viewMatrixRTE;

    vec3 nh = height * normalize(aVertexPositionHigh + aVertexPositionLow);

    vec3 eyePosition = eyePositionHigh + eyePositionLow;
    vec3 vertexPosition = aVertexPositionHigh + aVertexPositionLow;

    vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
    vec3 lowDiff = aVertexPositionLow - eyePositionLow + nh;

    gl_Position = m * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);
}