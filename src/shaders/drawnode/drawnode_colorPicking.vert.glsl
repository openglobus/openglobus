precision highp float;

attribute vec3 aVertexPositionHigh;
attribute vec3 aVertexPositionLow;
attribute vec2 aTextureCoord;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;
uniform float height;

varying vec2 vTextureCoord;

void main(void) {

    vTextureCoord = aTextureCoord;

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    mat4 m = projectionMatrix * viewMatrixRTE;

    vec3 nh = height * normalize(aVertexPositionHigh + aVertexPositionLow);

    vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
    vec3 lowDiff = aVertexPositionLow - eyePositionLow + nh;

    gl_Position = m * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);
}