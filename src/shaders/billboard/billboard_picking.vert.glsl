precision highp float;

#include "./common.glsl"

attribute vec2 a_vertices;
attribute vec3 a_positionsHigh;
attribute vec3 a_positionsLow;
attribute vec3 a_offset;
attribute vec2 a_size;
attribute float a_rotation;
attribute vec4 a_rgba;

varying vec3 v_rgb;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;
uniform vec3 uScaleByDistance;
uniform float opacity;
uniform float planetRadius;
uniform vec2 viewport;
uniform float depthOffset;

const vec3 ZERO3 = vec3(0.0);


void main() {

    vec3 a_positions = a_positionsHigh + a_positionsLow;
    vec3 cameraPos = eyePositionHigh + eyePositionLow;

    vec3 look = a_positions - cameraPos;
    float lookDist = length(look);
    v_rgb = a_rgba.rgb;

    if (opacity * step(lookDist, sqrt(dot(cameraPos, cameraPos) - planetRadius) + sqrt(dot(a_positions, a_positions) - planetRadius)) == 0.0) {
        return;
    }

    //vec3 up = vec3( viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1] );
    //vec3 right = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );

    float scd = (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookDist)) * (1.0 - step(uScaleByDistance[2], lookDist));

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    vec3 highDiff = a_positionsHigh - eyePositionHigh;
    vec3 lowDiff = a_positionsLow - eyePositionLow;
    vec4 posRTE = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
    vec4 projPos = projectionMatrix * posRTE;

    float camSlope = dot(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]), normalize(cameraPos));
    if (camSlope > 0.5) {
        float dist = dot(look, normalize(cameraPos));
        projPos.z += dist * 0.02;
    } else {
        projPos.z += -(abs(projPos.z)) * 0.002;
    }

    projPos.z += depthOffset + a_offset.z;

    vec2 screenPos = project(projPos, viewport);

    vec2 v = screenPos + rotate2d(a_rotation) * (a_vertices * a_size * scd + a_offset.xy);

    gl_Position = vec4((2.0 * v / viewport - 1.0) * projPos.w, projPos.z, projPos.w);
}