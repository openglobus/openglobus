precision highp float;

attribute vec4 a_rgba;
attribute vec3 a_startPosHigh;
attribute vec3 a_startPosLow;
attribute vec3 a_endPosHigh;
attribute vec3 a_endPosLow;
attribute vec2 a_vertices;
attribute float a_thickness;
attribute vec4 a_texCoord;
attribute float a_texOffset;
attribute float a_strokeSize;

varying vec4 v_rgba;
varying vec4 v_texCoord;
varying float v_texOffset;
varying float repeat;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 eyePositionHigh;
uniform vec3 eyePositionLow;
uniform float resolution;
uniform float uOpacity;
uniform vec2 viewport;

vec2 project(vec4 p) {
    return (0.5 * p.xyz / p.w + 0.5).xy * viewport;
}

void main() {

    v_texOffset = a_texOffset;
    v_rgba = vec4(a_rgba.rgb, a_rgba.a * uOpacity);
    v_texCoord = a_texCoord;

    vec3 v = (a_endPosHigh - a_startPosHigh) + (a_endPosLow - a_startPosLow);

    vec3 look = (a_startPosHigh - eyePositionHigh) + (a_startPosLow - eyePositionLow) + v * a_vertices.y;
    vec3 up = normalize(normalize(v));
    vec3 right = normalize(cross(look,up));

    float dist = dot(look, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
    float focalSize = 2.0 * dist * resolution;
    vec3 vert = right * a_thickness * focalSize * a_vertices.x;

    vec3 highDiff;
    if(a_vertices.y == 0.0){
        highDiff = a_startPosHigh - eyePositionHigh;
        vert += a_startPosLow - eyePositionLow;
    }else{
        highDiff = a_endPosHigh - eyePositionHigh;
        vert += a_endPosLow - eyePositionLow;
    }

    mat4 viewMatrixRTE = viewMatrix;
    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

    highDiff = a_startPosHigh - eyePositionHigh;
    highDiff = highDiff * step(1.0, length(highDiff));
    vec3 lowDiff = a_startPosLow - eyePositionLow;
    vec4 vStart = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
    vec2 nStart = project(projectionMatrix * vStart);

    highDiff = a_endPosHigh - eyePositionHigh;
    highDiff = highDiff * step(1.0, length(highDiff));
    lowDiff = a_endPosLow - eyePositionLow;
    vec4 vEnd = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
    vec2 nEnd = project(projectionMatrix * vEnd);

    repeat = distance(nStart, nEnd) / a_strokeSize;

    // Could be optimization some times
    //repeat = (1.0 / a_strokeSize) * length(v) / focalSize;

    gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff * step(1.0, length(highDiff)) + vert, 1.0);
}