#include "../billboard/common.glsl"

attribute vec4 a_gliphParam;
attribute vec2 a_vertices;
attribute vec4 a_texCoord;
attribute vec3 a_positionsHigh;
attribute vec3 a_positionsLow;
attribute vec3 a_offset;
attribute float a_size;
attribute float a_rotation;
attribute vec4 a_rgba;

varying vec4 v_rgba;

uniform vec2 viewport;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;
uniform float planetRadius;
uniform vec3 scaleByDistance;
uniform float opacity;
uniform float depthOffset;

const vec3 ZERO3 = vec3(0.0);

void main() {
    vec3 a_positions = a_positionsHigh + a_positionsLow;
    vec3 cameraPos = eyePositionHigh + eyePositionLow;
    v_rgba = a_rgba;

    if (a_texCoord.w == EMPTY) {
        v_rgba.a = 0.0;
        gl_Position = vec4(0.0);
        return;
    }

    vec3 look = a_positions - cameraPos;
    float lookDist = length(look);
    if (opacity * step(lookDist, sqrt(dot(cameraPos, cameraPos) - planetRadius) + sqrt(dot(a_positions, a_positions) - planetRadius)) == 0.0) {
        return;
    }

    float scd = (1.0 - smoothstep(scaleByDistance[0], scaleByDistance[1], lookDist)) * (1.0 - step(scaleByDistance[2], lookDist));

    v_rgba.a *= opacity;

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

    vec2 vert = a_vertices;
    vec4 gp = a_gliphParam;
    if (a_texCoord.w == RTL) {
        vert.x = step(vert.x * 0.5 + 1.0, 1.0);
        gp.x = -a_gliphParam.x;
        gp.z = -(a_gliphParam.z + a_texCoord.z);
    } else {
        gp.z = a_gliphParam.z + a_texCoord.z;
    }

    vec2 v = screenPos + rotate2d(a_rotation) * ((vert * gp.xy + gp.zw) * a_size * scd + a_offset.xy);

    gl_Position = vec4((2.0 * v / viewport - 1.0) * projPos.w, projPos.z, projPos.w);
}