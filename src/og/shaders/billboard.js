/**
 * @module og/shaders/billboard
 */

'use strict';

import { Program } from '../webgl/Program.js';

const PROJECT = `vec2 project(vec4 p) {
                    return (0.5 * p.xyz / p.w + 0.5).xy * viewport;
                }`;

const ROTATE2D =
    `mat2 rotate2d(float angle) {
        return mat2(cos(angle), -sin(angle),
           sin(angle), cos(angle));
     }`;

export function billboardPicking() {
    return new Program("billboardPicking", {
        uniforms: {
            viewport: "vec2",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            planetRadius: "float",
            uScaleByDistance: "vec3",
            opacity: "float",
            depthOffset: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_positionsHigh: "vec3",
            a_positionsLow: "vec3",
            a_offset: "vec3",
            a_size: "vec2",
            a_rotation: "float",
            a_rgba: "vec4"
        },
        vertexShader:
            `precision highp float;
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

            ${PROJECT}

            ${ROTATE2D}

            void main() {

                vec3 a_positions = a_positionsHigh + a_positionsLow;
                vec3 cameraPos = eyePositionHigh + eyePositionLow;

                vec3 look = a_positions - cameraPos;
                float lookDist = length(look);
                v_rgb = a_rgba.rgb;

                if(opacity * step(lookDist, sqrt(dot(cameraPos,cameraPos) - planetRadius) + sqrt(dot(a_positions,a_positions) - planetRadius)) == 0.0){
                    return;
                }

                vec3 up = vec3( viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1] );
                vec3 right = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );

                float scd = (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookDist)) * (1.0 - step(uScaleByDistance[2], lookDist));

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vec3 highDiff = a_positionsHigh - eyePositionHigh;
                vec3 lowDiff = a_positionsLow - eyePositionLow;
                vec4 posRTE = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
                vec4 projPos = projectionMatrix * posRTE;
                                
                projPos.z += depthOffset + a_offset.z;
                                
                vec2 screenPos = project(projPos);

                vec2 v =  screenPos + rotate2d(a_rotation) * (a_vertices * a_size * scd + a_offset.xy);

                gl_Position = vec4((2.0 * v / viewport - 1.0) * projPos.w, projPos.z, projPos.w);
            }`,
        fragmentShader:
            `precision highp float;
            varying vec3 v_rgb;
            void main () {
                gl_FragColor = vec4(v_rgb, 1.0);
            }`
    });
}

export function billboard_screen() {
    return new Program("billboard", {
        uniforms: {
            viewport: "vec2",
            u_texture: "sampler2d",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            planetRadius: "float",
            uScaleByDistance: "vec3",
            opacity: "float",
            depthOffset: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_texCoord: "vec2",
            a_positionsHigh: "vec3",
            a_positionsLow: "vec3",
            a_offset: "vec3",
            a_size: "vec2",
            a_rotation: "float",
            a_rgba: "vec4",
        },
        vertexShader:
            `precision highp float;
            attribute vec2 a_vertices;
            attribute vec2 a_texCoord;
            attribute vec3 a_positionsHigh;
            attribute vec3 a_positionsLow;
            attribute vec3 a_offset;
            attribute vec2 a_size;
            attribute float a_rotation;
            attribute vec4 a_rgba;

            varying vec2 v_texCoords;
            varying vec4 v_rgba;

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

            ${PROJECT}

            ${ROTATE2D}

            void main() {
                
                vec3 a_positions = a_positionsHigh + a_positionsLow;
                vec3 cameraPos = eyePositionHigh + eyePositionLow;

                v_texCoords = a_texCoord;
                vec3 look = a_positions - cameraPos;
                float lookDist = length(look);
                v_rgba = a_rgba;

                if(opacity * step(lookDist, sqrt(dot(cameraPos,cameraPos) - planetRadius) + sqrt(dot(a_positions,a_positions) - planetRadius)) == 0.0){
                    return;
                }

                vec3 up = vec3( viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1] );
                vec3 right = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );

                float scd = (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookDist)) * (1.0 - step(uScaleByDistance[2], lookDist));

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vec3 highDiff = a_positionsHigh - eyePositionHigh;
                vec3 lowDiff = a_positionsLow - eyePositionLow;
                vec4 posRTE = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
                vec4 projPos = projectionMatrix * posRTE;
                                                
                float camSlope = dot(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]), normalize(cameraPos));                
                if(camSlope > 0.5) {
                    float dist = dot(look, normalize(cameraPos));
                    projPos.z += dist * 0.02;
                }else{
                    projPos.z += -(abs(projPos.z)) * 0.002;                 
                }
                
                projPos.z += depthOffset + a_offset.z;
                
                vec2 screenPos = project(projPos);

                vec2 v = screenPos + rotate2d(a_rotation) * (a_vertices * a_size * scd + a_offset.xy);

                gl_Position = vec4((2.0 * v / viewport - 1.0) * projPos.w, projPos.z, projPos.w);
            }`,
        fragmentShader:
            `precision highp float;
            uniform sampler2D u_texture;
            varying vec2 v_texCoords;
            varying vec4 v_rgba;
            void main () {
                vec4 color = texture2D(u_texture, v_texCoords);
                if(color.a < 0.1)
                    discard;
                gl_FragColor = color * v_rgba;
            }`
    });
}