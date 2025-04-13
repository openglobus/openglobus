
attribute vec3 aVertexPositionHigh;
attribute vec3 aVertexPositionLow;
attribute vec2 aTextureCoord;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec4 uGlobalTextureCoord;
uniform vec3 uNormalMapBias;
uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;
uniform float height;

varying vec4 vTextureCoord;
varying vec3 v_vertex;
varying vec3 cameraPosition;
varying vec2 vGlobalTextureCoord;
varying float v_height;

void main(void) {

    vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow;
    vec3 nh = height * normalize(aVertexPosition);

    vTextureCoord.xy = aTextureCoord;
    vGlobalTextureCoord = uGlobalTextureCoord.xy + (uGlobalTextureCoord.zw - uGlobalTextureCoord.xy) * aTextureCoord;
    vTextureCoord.zw = uNormalMapBias.z * ( aTextureCoord + uNormalMapBias.xy );

    cameraPosition = eyePositionHigh + eyePositionLow;

    vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
    vec3 lowDiff = aVertexPositionLow - eyePositionLow + nh;

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    v_height = height;
    v_vertex = aVertexPosition + nh;

    gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);
}