#version 300 es
precision highp float;

#include "../common/qrot.glsl"

in vec3 aVertexPosition;
in vec3 aVertexNormal;

in vec3 aRTCPositionHigh;
in vec3 aRTCPositionLow;

in vec4 aColor;
in vec3 aScale;
in vec3 aTranslate;
in float aDispose;
in float aUseTexture;
in vec2 aTexCoord;
in vec4 qRot;
in vec3 aLocalPosition;

uniform vec4 uScaleByDistance;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;

uniform vec3 rtcEyePositionHigh;
uniform vec3 rtcEyePositionLow;

out vec3 cameraPosition;
out vec3 v_vertex;
out vec3 v_viewPosition;
out vec4 vColor;
out vec3 vNormal;
out vec2 vTexCoords;

void main(void) {

    if (aDispose == 0.0) {
        return;
    }

    vColor = aColor;
    vTexCoords = aTexCoord;

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    vec3 highDiff = aRTCPositionHigh - rtcEyePositionHigh;
    vec3 lowDiff = aRTCPositionLow - rtcEyePositionLow;

    cameraPosition = eyePositionHigh + eyePositionLow;
    vec3 rtcWorldOffset = highDiff + lowDiff;

    highDiff = highDiff * step(1.0, length(highDiff));

    vec4 positionInViewSpace = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);

    float lookLength = length(positionInViewSpace.xyz);

    vNormal = normalize(qRotate(qRot, aVertexNormal));

    float distMetric = uScaleByDistance[3] > 0.0 ? uScaleByDistance[3] : lookLength;
    float scd = uScaleByDistance[2] * clamp(distMetric, uScaleByDistance[0], uScaleByDistance[1]) / uScaleByDistance[0];
    vec3 vert = qRotate(qRot, scd * (aVertexPosition * aScale + aTranslate)) + scd * aLocalPosition;

    vec4 viewPos = viewMatrixRTE * vec4(highDiff + lowDiff + vert, 1.0);
    v_viewPosition = viewPos.xyz;
    gl_Position = projectionMatrix * viewPos;

    v_vertex = rtcWorldOffset + cameraPosition + vert;
}
