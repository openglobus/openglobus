#version 300 es

#include "../billboard/common.glsl"
#include "../common/getDepthOffsetScale.glsl"

in float a_outline;
in vec4 a_gliphParam;
in vec2 a_vertices;
in vec4 a_texCoord;
in vec3 a_positionsHigh;
in vec3 a_positionsLow;
in vec2 a_offset;
in float a_size;
in float a_rotation;
in vec4 a_rgba;
in float a_fontIndex;

out vec2 v_uv;
out vec4 v_rgba;
flat out int v_fontIndex;
out vec4 v_outlineColor;
flat out float v_outline;

uniform vec2 viewport;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;
uniform float planetRadius;
uniform vec3 scaleByDistance;
uniform float opacity;
uniform float depthOffset;
uniform float depthOffsetNear;

const vec3 ZERO3 = vec3(0.0);


void main() {

    if (a_texCoord.w == EMPTY) {
        gl_Position = vec4(0.0);
        v_fontIndex = -1;
        return;
    }

    vec3 a_positions = a_positionsHigh + a_positionsLow;
    vec3 cameraPos = eyePositionHigh + eyePositionLow;

    v_outline = a_outline;

    v_fontIndex = int(a_fontIndex);
    v_uv = a_texCoord.xy;
    vec3 look = a_positions - cameraPos;
    float lookDist = length(look);
    v_rgba = a_rgba;
    float horizonDist = sqrt(dot(cameraPos, cameraPos) - planetRadius) + sqrt(dot(a_positions, a_positions) - planetRadius);
    float visibilityMask = step(1e-6, opacity) * step(lookDist, horizonDist);

    float scd = (1.0 - smoothstep(scaleByDistance[0], scaleByDistance[1], lookDist)) * (1.0 - step(scaleByDistance[2], lookDist));

    v_rgba.a *= opacity;

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    vec3 highDiff = a_positionsHigh - eyePositionHigh;
    vec3 lowDiff = a_positionsLow - eyePositionLow;
    vec4 posRTE = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);

    if (depthOffset != 0.0) {
        float depthOffsetScale = getDepthOffsetScale(depthOffset, posRTE.xyz, depthOffsetNear);
        posRTE.xyz += posRTE.xyz * depthOffsetScale;
    }

    vec4 projPos = projectionMatrix * posRTE;

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

    vec2 v = screenPos + rotate2d(a_rotation) * ((vert * gp.xy + gp.zw) * a_size * scd + a_offset);

    vec4 clipPos = vec4((2.0 * v / viewport - 1.0) * projPos.w, projPos.z, projPos.w);
    gl_Position = mix(vec4(2.0, 2.0, 2.0, 1.0), clipPos, visibilityMask);
}
