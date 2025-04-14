#version 300 es
precision highp float;

#include "../common/qrot.glsl"

in vec3 aVertexPosition;
in vec3 aRTCPositionHigh;
in vec3 aRTCPositionLow;
in vec3 aScale;
in vec3 aTranslate;
in float aDispose;
in vec4 qRot;
in vec3 aLocalPosition;

uniform vec3 rtcEyePositionHigh;
uniform vec3 rtcEyePositionLow;
uniform vec3 uScaleByDistance;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

void main(void) {

    if (aDispose == 0.0) {
        return;
    }

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    vec3 highDiff = aRTCPositionHigh - rtcEyePositionHigh;
    vec3 lowDiff = aRTCPositionLow - rtcEyePositionLow;

    highDiff = highDiff * step(1.0, length(highDiff));

    vec4 positionInViewSpace = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);

    float lookLength = length(positionInViewSpace.xyz);

    float scd = uScaleByDistance[2] * clamp(lookLength, uScaleByDistance[0], uScaleByDistance[1]) / uScaleByDistance[0];

    vec3 vert = qRotate(qRot, scd * (aVertexPosition * aScale + aTranslate)) + scd * aLocalPosition;

    gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff + vert, 1.0);
}