#version 300 es
precision highp float;

in vec3 aVertexPositionHigh;
in vec3 aVertexPositionLow;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;

void main(void) {

    vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
    vec3 lowDiff = aVertexPositionLow - eyePositionLow;

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);
}
