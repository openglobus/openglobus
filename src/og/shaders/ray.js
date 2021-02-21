/**
 * @module og/shaders/ray
 */

'use strict';

import { Program } from '../webgl/Program.js';

export function rayScreen() {
    return new Program("rayScreen", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            resolution: "float",
            uOpacity: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_startPosHigh: "vec3",
            a_startPosLow: "vec3",
            a_endPosHigh: "vec3",
            a_endPosLow: "vec3",
            a_length: "float",
            a_thickness: "float",
            a_rgba: "vec4"
        },
        vertexShader:
            `precision highp float;
            attribute vec2 a_vertices;
            attribute vec3 a_startPosHigh;
            attribute vec3 a_startPosLow;
            attribute vec3 a_endPosHigh;
            attribute vec3 a_endPosLow;
            attribute float a_thickness;
            attribute float a_length;
            attribute vec4 a_rgba;

            varying vec4 v_rgba;

            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            uniform float resolution;

            void main() {

                v_rgba = a_rgba;

                vec3 camPos = eyePositionHigh + eyePositionLow;

                vec3 startPos = a_startPosHigh + a_startPosLow;
                vec3 direction = normalize((a_endPosHigh + a_endPosLow) - startPos);
                vec3 vertPos = startPos + a_vertices.y * direction * a_length;

                vec3 look = vertPos - camPos;
                vec3 up = normalize(direction);
                vec3 right = normalize(cross(look,up));
 
                float dist = dot(camPos - vertPos, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
                float focalSize = 2.0 * dist * resolution;
                vec3 rr = right * a_thickness * focalSize * a_vertices.x + up * a_length * a_vertices.y;

                vec3 highDiff = a_startPosHigh - eyePositionHigh;
                vec3 lowDiff = a_startPosLow + rr - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vec4 pos = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
                
                gl_Position = projectionMatrix * pos;
            }`,
        fragmentShader:
            `precision highp float;
            uniform float uOpacity;
            varying vec4 v_rgba;
            void main () {
                gl_FragColor = v_rgba * uOpacity;
            }`
    });
}
