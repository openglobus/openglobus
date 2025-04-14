precision highp float;

#include "../common/qrot.glsl"

attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;

attribute vec3 aRTCPositionHigh;
attribute vec3 aRTCPositionLow;

attribute vec4 aColor;
attribute vec3 aScale;
attribute vec3 aTranslate;
attribute float aDispose;
attribute float aUseTexture;
attribute vec2 aTexCoord;
attribute vec4 qRot;
attribute vec3 aLocalPosition;

uniform vec3 uScaleByDistance;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;

uniform vec3 rtcEyePositionHigh;
uniform vec3 rtcEyePositionLow;

varying vec3 cameraPosition;
varying vec3 vNormal;
varying vec3 v_vertex;
varying vec4 vColor;
varying float vDispose;
varying vec2 vTexCoords;

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

    highDiff = highDiff * step(1.0, length(highDiff));

    vec4 positionInViewSpace = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);

    float lookLength = length(positionInViewSpace.xyz);

    vNormal = normalize(qRotate(qRot, aVertexNormal));

    float scd = uScaleByDistance[2] * clamp(lookLength, uScaleByDistance[0], uScaleByDistance[1]) / uScaleByDistance[0];
    vec3 vert = qRotate(qRot, scd * (aVertexPosition * aScale + aTranslate)) + scd * aLocalPosition;

    gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff + vert, 1.0);

    v_vertex = positionInViewSpace.xyz + vert;
}