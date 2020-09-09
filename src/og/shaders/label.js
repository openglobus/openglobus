/**
 * @module og/shaders/label
 */

'use sctrict';

import { Program } from '../webgl/Program.js';

export function label_webgl2() {

    return new Program("label", {
        uniforms: {
            u_fontTextureArr: "sampler2dxx",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            uFloatParams: "vec2",
            uZ: "float",
            uScaleByDistance: "vec3",
            uOpacity: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_texCoord: "vec4",
            a_positionsHigh: "vec3",
            a_positionsLow: "vec3",
            a_size: "float",
            a_offset: "vec3",
            a_rgba: "vec4",
            a_rotation: "float",
            a_alignedAxis: "vec3",
            a_fontIndex: "float",
            a_bufferAA: "vec2"
        },
        vertexShader:
            `#version 300 es

            in vec2 a_vertices;
            in vec4 a_texCoord;
            in vec3 a_positionsHigh;
            in vec3 a_positionsLow;
            in vec3 a_offset;
            in float a_size;
            in float a_rotation;
            in vec4 a_rgba;
            in vec3 a_alignedAxis;
            in float a_fontIndex;
            in vec2 a_bufferAA;

            out vec2 v_texCoords;
            out vec4 v_rgba;
            flat out int v_fontIndex;
            out vec3 v_bufferAA;

            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            /*0 - planetRadius^2, 1 - tan(fov), 2 - screen ratio*/
            uniform vec2 uFloatParams;
            uniform float uZ;
            uniform vec3 uScaleByDistance;
            uniform float uOpacity;

            const vec3 ZERO3 = vec3(0.0);

            void main() {
                vec3 a_positions = a_positionsHigh + a_positionsLow;
                vec3 uCamPos = eyePositionHigh + eyePositionLow;

                if(a_texCoord.z == -1.0 || a_bufferAA.x == 1.0){
                    gl_Position = vec4(0.0);
                    return;
                }

                v_fontIndex = int(a_fontIndex);
                v_texCoords = vec2(a_texCoord.xy);
                vec3 look = a_positions - uCamPos;
                float lookDist = length(look);
                v_rgba = a_rgba;
                /*v_rgba.a *= uOpacity * step(lookDist, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions,a_positions) - uFloatParams[0]));*/
                if(uOpacity * step(lookDist, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions,a_positions) - uFloatParams[0]))==0.0){
                    return;
                }

                v_rgba.a *= uOpacity;

                vec3 right, up;

                if(a_alignedAxis == ZERO3){
                    up = vec3( viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1] );
                    right = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );
                }else{
                    up = normalize(a_alignedAxis);
                    right = normalize(cross(look,up));
                    look = cross(up,right);
                }

                v_bufferAA = vec3(a_bufferAA, 8.0 * a_bufferAA.y / a_size);
                float dist = dot(uCamPos - a_positions, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
                float focalSize = 2.0 * dist * uFloatParams[1];
                vec2 offset = a_offset.xy * focalSize;

                float scd = (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookDist)) * (1.0 - step(uScaleByDistance[2], lookDist));
                float scale = a_size * focalSize * scd;
                float cosRot = cos(a_rotation);
                float sinRot = sin(a_rotation);
                vec3 rr = (right * cosRot - up * sinRot) * (scale * (a_vertices.x + a_texCoord.z + a_texCoord.w) + scd * offset.x) + (right * sinRot + up * cosRot) * (scale * a_vertices.y + scd * offset.y);

                vec3 highDiff = a_positionsHigh - eyePositionHigh;
                vec3 lowDiff = a_positionsLow + rr - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
                gl_Position.z += a_offset.z + uZ;
            }`,
        fragmentShader:
            `#version 300 es

            precision highp float;

            const int MAX_SIZE = 3;

            uniform sampler2D u_fontTextureArr[MAX_SIZE];

            flat in int v_fontIndex;
            in vec2 v_texCoords;
            in vec4 v_rgba;
            in vec3 v_bufferAA;
            in vec3 v_pickingColor;

            layout(location = 0) out vec4 outScreen;

            void main () {
                int fi = v_fontIndex;
                vec4 color;
                if (fi == 0) {
                    color = texture(u_fontTextureArr[0], v_texCoords);
                } else if (fi == 1) {
                    color = texture(u_fontTextureArr[1], v_texCoords);
                } else if (fi == 2) {
                    color = texture(u_fontTextureArr[2], v_texCoords);
                }

                float afwidth = step(0.5, v_bufferAA.x) * (1.0 - v_bufferAA.y) * v_bufferAA.x * fwidth( color.r );
                float alpha = smoothstep ( v_bufferAA.x - afwidth - v_bufferAA.z, v_bufferAA.x + afwidth + v_bufferAA.z, color.r );
                if( alpha < 0.2 )
                    discard;
                outScreen = vec4(v_rgba.rgb, alpha * v_rgba.a);
            }`
    });
}

export function labelPicking() {
    return new Program("labelPicking", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            //uCamPos: "vec3",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            uFloatParams: "vec2",
            uScaleByDistance: "vec3",
            uOpacity: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_texCoord: "vec4",
            a_positionsHigh: "vec3",
            a_positionsLow: "vec3",
            a_size: "float",
            a_offset: "vec3",
            a_pickingColor: "vec3",
            a_rotation: "float",
            a_alignedAxis: "vec3"
        },
        vertexShader:
            `precision highp float;
            attribute vec2 a_vertices;
            attribute vec4 a_texCoord;
            attribute vec3 a_positionsHigh;
            attribute vec3 a_positionsLow;
            attribute vec3 a_offset;
            attribute float a_size;
            attribute float a_rotation;
            attribute vec3 a_pickingColor;
            attribute vec3 a_alignedAxis;
            varying vec4 v_color;
            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            //uniform vec3 uCamPos;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            /*0 - planetRadius^2, 1 - tan(fov), 2 - screen ratio*/
            uniform vec2 uFloatParams;
            uniform vec3 uScaleByDistance;
            uniform float uOpacity;
            const vec3 ZERO3 = vec3(0.0);

            void main() {
                vec3 a_positions = a_positionsHigh + a_positionsLow;
                vec3 uCamPos = eyePositionHigh + eyePositionLow;

                if( uOpacity == 0.0 ){
                    gl_Position = vec4(0.0);
                    return;
                }
                if(a_texCoord.z == -1.0){
                    gl_Position = vec4(0.0);
                    return;
                }
                vec3 look = a_positions - uCamPos;
                float lookLength = length(look);
                v_color = vec4(a_pickingColor.rgb, 1.0) * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions, a_positions) - uFloatParams[0]));
                vec3 right, up;
                if(a_alignedAxis == ZERO3){
                    up = vec3( viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1] );
                    right = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );
                }else{
                    up = normalize(a_alignedAxis);
                    right = normalize(cross(look,up));
                    look = cross(up,right);
                }
                float dist = dot(uCamPos - a_positions, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
                float focalSize = 2.0 * dist * uFloatParams[1];
                vec2 offset = a_offset.xy * focalSize;
                float scd = (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookLength)) *(1.0 - step(uScaleByDistance[2], lookLength));
                float scale = a_size * focalSize * scd;
                float cosRot = cos(a_rotation);
                float sinRot = sin(a_rotation);
                vec3 rr = (right * cosRot - up * sinRot) * (scale * (a_vertices.x + a_texCoord.z + a_texCoord.w) + scd * offset.x) + (right * sinRot + up * cosRot) * (scale * a_vertices.y + scd * offset.y) + a_positions;
                gl_Position = projectionMatrix * viewMatrix * vec4(rr, 1);
                gl_Position.z += a_offset.z;
            }`,
        fragmentShader:
            `precision highp float;
            varying vec4 v_color;
            void main () {
                gl_FragColor = v_color;
            }`
    });
}

export function label_screen() {
    return new Program("label", {
        uniforms: {
            u_fontTextureArr: "sampler2dxx",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            uFloatParams: "vec2",
            uZ: "float",
            uScaleByDistance: "vec3",
            uOpacity: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_texCoord: "vec4",
            a_positionsHigh: "vec3",
            a_positionsLow: "vec3",
            a_size: "float",
            a_offset: "vec3",
            a_rgba: "vec4",
            a_rotation: "float",
            a_alignedAxis: "vec3",
            a_fontIndex: "float",
            a_bufferAA: "vec2"
        },

        vertexShader:
            `attribute vec2 a_vertices;
            attribute vec4 a_texCoord;
            attribute vec3 a_positionsHigh;
            attribute vec3 a_positionsLow;
            attribute vec3 a_offset;
            attribute float a_size;
            attribute float a_rotation;
            attribute vec4 a_rgba;
            attribute vec3 a_alignedAxis;
            attribute float a_fontIndex;
            attribute vec2 a_bufferAA;
            varying vec2 v_texCoords;
            varying vec4 v_rgba;
            varying float v_fontIndex;
            varying vec3 v_bufferAA;
            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            /*0 - planetRadius^2, 1 - tan(fov), 2 - screen ratio*/
            uniform vec2 uFloatParams;
            uniform float uZ;
            uniform vec3 uScaleByDistance;
            uniform float uOpacity;
            const vec3 ZERO3 = vec3(0.0);

            void main() {

                vec3 a_positions = a_positionsHigh + a_positionsLow;
                vec3 uCamPos = eyePositionHigh + eyePositionLow;

                if(a_texCoord.z == -1.0 || a_bufferAA.x == 1.0){
                    gl_Position = vec4(0.0);
                    return;
                }
                v_fontIndex = a_fontIndex;
                v_texCoords = vec2(a_texCoord.xy);
                vec3 look = a_positions - uCamPos;
                float lookDist = length(look);                
                v_rgba = a_rgba;
                /*v_rgba.a *= uOpacity * step(lookDist, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions,a_positions) - uFloatParams[0]));*/
                if(uOpacity * step(lookDist, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions,a_positions) - uFloatParams[0]))==0.0){
                    return;
                }
                v_rgba.a *= uOpacity;
                vec3 right, up;
                if(a_alignedAxis == ZERO3){
                    up = vec3( viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1] );
                    right = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );
                }else{
                    up = normalize(a_alignedAxis);
                    right = normalize(cross(look,up));
                    look = cross(up,right);
                }
                v_bufferAA = vec3(a_bufferAA, 8.0 * a_bufferAA.y / a_size);
                float dist = dot(uCamPos - a_positions, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
                float focalSize = 2.0 * dist * uFloatParams[1];
                vec2 offset = a_offset.xy * focalSize;
                float scd = (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookDist)) * (1.0 - step(uScaleByDistance[2], lookDist));
                float scale = a_size * focalSize * scd;
                float cosRot = cos(a_rotation);
                float sinRot = sin(a_rotation);
                vec3 rr = (right * cosRot - up * sinRot) * (scale * (a_vertices.x + a_texCoord.z + a_texCoord.w) + scd * offset.x) + (right * sinRot + up * cosRot) * (scale * a_vertices.y + scd * offset.y);

                vec3 highDiff = a_positionsHigh - eyePositionHigh;
                vec3 lowDiff = a_positionsLow + rr - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
                gl_Position.z += a_offset.z + uZ;
            }`,
            
        fragmentShader:
            `#extension GL_OES_standard_derivatives : enable
        precision highp float;
        const int MAX_SIZE = 3;
        uniform sampler2D u_fontTextureArr[MAX_SIZE];
        varying float v_fontIndex;
        varying vec2 v_texCoords;
        varying vec4 v_rgba;
        varying vec3 v_bufferAA;
        varying vec3 v_pickingColor;
        void main () {
            int fi = int(v_fontIndex);
            vec4 color;
            if (fi == 0) {
                color = texture2D(u_fontTextureArr[0], v_texCoords);
            } else if (fi == 1) {
                color = texture2D(u_fontTextureArr[1], v_texCoords);
            } else if (fi == 2) {
                color = texture2D(u_fontTextureArr[2], v_texCoords);
            }

            float afwidth = step(0.5, v_bufferAA.x) * (1.0 - v_bufferAA.y) * v_bufferAA.x * fwidth( color.r );
            float alpha = smoothstep ( v_bufferAA.x - afwidth - v_bufferAA.z, v_bufferAA.x + afwidth + v_bufferAA.z, color.r );
            if( alpha < 0.2 )
                discard;
            gl_FragColor = vec4(v_rgba.rgb, alpha * v_rgba.a);
        }`
    });
}