#version 300 es

precision highp float;

in vec3 aVertexPositionHigh;
in vec3 aVertexPositionLow;
in vec2 aTextureCoord;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec4 uGlobalTextureCoord;
uniform vec3 uNormalMapBias;
uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;
uniform float height;

uniform vec3 rtcEyePositionHigh;
uniform vec3 rtcEyePositionLow;

out vec4 vTextureCoord;
out vec3 v_vertex;
out vec3 v_worldVertex;
out vec3 v_viewPosition;
out vec3 cameraPosition;
out vec2 vGlobalTextureCoord;
out float v_height;

void main(void) {

    vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow;
    vTextureCoord.xy = aTextureCoord;
    vGlobalTextureCoord = uGlobalTextureCoord.xy + (uGlobalTextureCoord.zw - uGlobalTextureCoord.xy) * aTextureCoord;
    vTextureCoord.zw = uNormalMapBias.z * (aTextureCoord + uNormalMapBias.xy);

    cameraPosition = eyePositionHigh + eyePositionLow;

    vec3 highDiff = aVertexPositionHigh - rtcEyePositionHigh;
    vec3 lowDiff = aVertexPositionLow - rtcEyePositionLow;
    vec3 worldPosition = highDiff + lowDiff + cameraPosition;
    vec3 nh = height * normalize(worldPosition);
    lowDiff += nh;

    highDiff = highDiff * step(1.0, length(highDiff));
    vec3 rtcWorldOffset = highDiff + lowDiff;

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    v_height = height;
    v_vertex = aVertexPosition + nh;
    v_worldVertex = rtcWorldOffset + cameraPosition;

    vec4 viewPos = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
    v_viewPosition = viewPos.xyz;
    gl_Position = projectionMatrix * viewPos;
}
