#version 300 es

precision highp float;

in vec3 aVertexPositionHigh;
in vec3 aVertexPositionLow;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform vec3 rtcEyePositionHigh;
uniform vec3 rtcEyePositionLow;
uniform float height;

void main(void) {

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    mat4 m = projectionMatrix * viewMatrixRTE;

    vec3 highDiff = aVertexPositionHigh - rtcEyePositionHigh;
    vec3 lowDiff = aVertexPositionLow - rtcEyePositionLow;
    vec3 worldPosition = highDiff + lowDiff + cameraPosition;
    vec3 nh = height * normalize(worldPosition);
    lowDiff += nh;

    gl_Position = m * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);
}
