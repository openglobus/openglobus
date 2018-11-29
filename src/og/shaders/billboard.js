/**
 * @module og/shaders/billboard
 */

'use sctrict';

import { Program } from '../webgl/Program.js';
import { types } from '../webgl/types.js';

export function billboard() {

    return new Program("billboard", {
        uniforms: {
            u_texture: "sampler2d",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            uCamPos: "vec3",
            uFloatParams: "vec2",
            uScaleByDistance: "vec3",
            uOpacity: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_texCoord: "vec2",
            a_positions: "vec4",
            a_size: "vec2",
            a_offset: "vec3",
            a_rgba: "vec4",
            a_rotation: "float",
            a_alignedAxis: "vec3"
        },
        vertexShader:
            `#version 300 es

            precision highp float;
            in vec2 a_vertices;
            in vec2 a_texCoord;
            in vec4 a_positions;
            in vec3 a_offset;
            in vec2 a_size;
            in float a_rotation;
            in vec4 a_rgba;
            in vec3 a_alignedAxis;

            out vec2 v_texCoords;
            out vec4 v_rgba;

            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            uniform vec3 uCamPos;
            uniform vec2 uFloatParams;
            uniform vec3 uScaleByDistance;
            uniform float uOpacity;

            const vec3 ZERO3 = vec3(0.0);
            const float C = 0.1;
            const float far = 149.6e+9;
            float logc = 2.0 / log( C * far + 1.0 );

            void main() {
                v_texCoords = a_texCoord;
                vec3 look = a_positions.xyz - uCamPos;
                float lookLength = length(look);
                v_rgba = a_rgba;
                /*v_rgba.a *= uOpacity * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions.xyz,a_positions.xyz) - uFloatParams[0]));*/
                if(uOpacity * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions.xyz,a_positions.xyz) - uFloatParams[0])) == 0.0){
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
                float dist = dot(uCamPos - a_positions.xyz, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
                float focalSize = 2.0 * dist * uFloatParams[1];
                vec2 offset = a_offset.xy * focalSize;
                float scd = a_positions.w * (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookLength)) * (1.0 - step(uScaleByDistance[2], lookLength));
                vec2 scale = a_size * focalSize * scd;
                float cosRot = cos(a_rotation);
                float sinRot = sin(a_rotation);
                vec3 rr = (right * cosRot - up * sinRot) * (scale.x * a_vertices.x + scd * offset.x) + (right * sinRot + up * cosRot) * (scale.y * a_vertices.y + scd * offset.y) + a_positions.xyz;
                gl_Position = projectionMatrix * viewMatrix * vec4(rr, 1);
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;
                gl_Position.z += a_offset.z;
            }`,
        fragmentShader:
            `#version 300 es

            precision highp float;

            uniform sampler2D u_texture;

            in vec2 v_texCoords;
            in vec4 v_rgba;

            layout(location = 0) out vec4 outScreen;
            layout(location = 1) out vec4 outPickingMask;

            void main () {
                vec4 color = texture(u_texture, v_texCoords);
                if(color.a < 0.1)
                    discard;
                outScreen = color * v_rgba;
                outPickingMask = vec4(0.0);
            }`
    });
}

export function billboardPicking() {
    return new Program("billboardPicking", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            uCamPos: "vec3",
            uFloatParams: "vec2",
            uScaleByDistance: "vec3",
            uOpacity: "float",
            pickingScale: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_positions: "vec4",
            a_size: "vec2",
            a_offset: "vec3",
            a_pickingColor: "vec3",
            a_rotation: "float",
            a_alignedAxis: "vec3"
        },
        vertexShader:
            `precision highp float;

            attribute vec2 a_vertices;
            attribute vec4 a_positions;
            attribute vec3 a_offset;
            attribute vec2 a_size;
            attribute float a_rotation;
            attribute vec3 a_pickingColor;
            attribute vec3 a_alignedAxis;

            varying vec4 v_color;

            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            uniform vec3 uCamPos;
            uniform vec2 uFloatParams;
            uniform vec3 uScaleByDistance;
            uniform float uOpacity;
            uniform float pickingScale;

            const vec3 ZERO3 = vec3(0.0);
            const float C = 0.1;
            const float far = 149.6e+9;
            float logc = 2.0 / log( C * far + 1.0 );

            void main() {
                vec3 look = a_positions.xyz - uCamPos;
                float lookLength = length(look);
                if( uOpacity == 0.0 ) {
                    gl_Position = vec4(0.0);
                    return;
                }
                v_color = vec4(a_pickingColor.rgb, 1.0) * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions.xyz, a_positions.xyz) - uFloatParams[0]));
                vec3 right, up;
                if(a_alignedAxis == ZERO3){
                    up = vec3( viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1] );
                    right = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );
                }else{
                    up = normalize(a_alignedAxis);
                    right = normalize(cross(look,up));
                    look = cross(up,right);
                }
                float dist = dot(uCamPos - a_positions.xyz, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
                float focalSize = 2.0 * dist * uFloatParams[1];
                vec2 offset = a_offset.xy * focalSize;
                float scd = a_positions.w * (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookLength)) *(1.0 - step(uScaleByDistance[2], lookLength));
                vec2 scale = a_size * focalSize * scd * pickingScale;
                float cosRot = cos(a_rotation);
                float sinRot = sin(a_rotation);
                vec3 rr = (right * cosRot - up * sinRot) * (scale.x * a_vertices.x + scd * offset.x) + (right * sinRot + up * cosRot) * (scale.y * a_vertices.y + scd * offset.y) + a_positions.xyz;
                gl_Position = projectionMatrix * viewMatrix * vec4(rr, 1);
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;
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

export function billboard_screen() {
    return new ShaderProgram("billboard", {
        uniforms: {
            u_texture: "sampler2d",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            uCamPos: "vec3",
            uFloatParams: "vec2",
            uScaleByDistance: "vec3",
            uOpacity: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_texCoord: "vec2",
            a_positions: "vec4",
            a_size: "vec2",
            a_offset: "vec3",
            a_rgba: "vec4",
            a_rotation: "float",
            a_alignedAxis: "vec3"
        },
        vertexShader:
            `precision highp float;
            attribute vec2 a_vertices;
            attribute vec2 a_texCoord;
            attribute vec4 a_positions;
            attribute vec3 a_offset;
            attribute vec2 a_size;
            attribute float a_rotation;
            attribute vec4 a_rgba;
            attribute vec3 a_alignedAxis;
            varying vec2 v_texCoords;
            varying vec4 v_rgba;
            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            uniform vec3 uCamPos;
            uniform vec2 uFloatParams;
            uniform vec3 uScaleByDistance;
            uniform float uOpacity;
            const vec3 ZERO3 = vec3(0.0);
            const float C = 0.1;
            const float far = 149.6e+9;
            float logc = 2.0 / log( C * far + 1.0 );
            void main() {
                v_texCoords = a_texCoord;
                vec3 look = a_positions.xyz - uCamPos;
                float lookLength = length(look);
                v_rgba = a_rgba;
                /*v_rgba.a *= uOpacity * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions.xyz,a_positions.xyz) - uFloatParams[0]));*/
                if(uOpacity * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions.xyz,a_positions.xyz) - uFloatParams[0])) == 0.0){
                    return;
                }
                vec3 right, up;
                if(a_alignedAxis == ZERO3){
                    up = vec3( viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1] );
                    right = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );
                }else{
                    up = normalize(a_alignedAxis);
                    right = normalize(cross(look,up));
                    look = cross(up,right);
                }
                float dist = dot(uCamPos - a_positions.xyz, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
                float focalSize = 2.0 * dist * uFloatParams[1];
                vec2 offset = a_offset.xy * focalSize;
                float scd = a_positions.w * (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookLength)) * (1.0 - step(uScaleByDistance[2], lookLength));
                vec2 scale = a_size * focalSize * scd;
                float cosRot = cos(a_rotation);
                float sinRot = sin(a_rotation);
                vec3 rr = (right * cosRot - up * sinRot) * (scale.x * a_vertices.x + scd * offset.x) + (right * sinRot + up * cosRot) * (scale.y * a_vertices.y + scd * offset.y) + a_positions.xyz;
                gl_Position = projectionMatrix * viewMatrix * vec4(rr, 1);
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;
                gl_Position.z += a_offset.z;
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