/**
 * @module og/shaders/label
 */

'use sctrict';

import { ShaderProgram } from '../webgl/ShaderProgram.js';
import { types } from '../webgl/types.js';

export function label(isSingleBuffer) {

    var strFragment;

    if (isSingleBuffer) {
        strFragment = `#extension GL_OES_standard_derivatives : enable
            precision highp float;
            const int MAX_SIZE = 12;
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
                } else if (fi == 3) {
                    color = texture2D(u_fontTextureArr[3], v_texCoords);
                } else if (fi == 4) {
                    color = texture2D(u_fontTextureArr[4], v_texCoords);
                } else if (fi == 5) {
                    color = texture2D(u_fontTextureArr[5], v_texCoords);
                } else if (fi == 6) {
                    color = texture2D(u_fontTextureArr[6], v_texCoords);
                } else if (fi == 7) {
                    color = texture2D(u_fontTextureArr[7], v_texCoords);
                } else if (fi == 8) {
                    color = texture2D(u_fontTextureArr[8], v_texCoords);
                } else if (fi == 9) {
                    color = texture2D(u_fontTextureArr[9], v_texCoords);
                }else{
                    color = texture2D(u_fontTextureArr[10], v_texCoords);
                }
                float afwidth = step(0.5, v_bufferAA.x) * (1.0 - v_bufferAA.y) * v_bufferAA.x * fwidth( color.r );
                float alpha = smoothstep ( v_bufferAA.x - afwidth - v_bufferAA.z, v_bufferAA.x + afwidth + v_bufferAA.z, color.r );
                if( alpha < 0.2 )
                    discard;
                gl_FragColor = vec4(v_rgba.rgb, alpha * v_rgba.a);
            }`;
    } else {
        strFragment = `#extension GL_OES_standard_derivatives : enable
            #extension GL_EXT_draw_buffers : require
            precision highp float;
            const int MAX_SIZE = 12;
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
                } else if (fi == 3) {
                    color = texture2D(u_fontTextureArr[3], v_texCoords);
                } else if (fi == 4) {
                    color = texture2D(u_fontTextureArr[4], v_texCoords);
                } else if (fi == 5) {
                    color = texture2D(u_fontTextureArr[5], v_texCoords);
                } else if (fi == 6) {
                    color = texture2D(u_fontTextureArr[6], v_texCoords);
                } else if (fi == 7) {
                    color = texture2D(u_fontTextureArr[7], v_texCoords);
                } else if (fi == 8) {
                    color = texture2D(u_fontTextureArr[8], v_texCoords);
                } else if (fi == 9) {
                    color = texture2D(u_fontTextureArr[9], v_texCoords);
                }else{
                    color = texture2D(u_fontTextureArr[10], v_texCoords);
                }
                float afwidth = step(0.5, v_bufferAA.x) * (1.0 - v_bufferAA.y) * v_bufferAA.x * fwidth( color.r );
                float alpha = smoothstep ( v_bufferAA.x - afwidth - v_bufferAA.z, v_bufferAA.x + afwidth + v_bufferAA.z, color.r );
                if( alpha < 0.2 )
                    discard;
                gl_FragData[0] = vec4(v_rgba.rgb, alpha * v_rgba.a);
                gl_FragData[1] = vec4(0.0);
            }`;
    }

    return new ShaderProgram("label", {
        uniforms: {
            u_fontTextureArr: { type: types.SAMPLER2DXX },
            projectionMatrix: { type: types.MAT4 },
            viewMatrix: { type: types.MAT4 },
            uCamPos: { type: types.VEC3 },
            uFloatParams: { type: types.VEC2 },
            uZ: { type: types.FLOAT },
            uScaleByDistance: { type: types.VEC3 },
            uOpacity: { type: types.FLOAT }
        },
        attributes: {
            a_vertices: { type: types.VEC2, enableArray: true },
            a_texCoord: { type: types.VEC4, enableArray: true },
            a_positions: { type: types.VEC4, enableArray: true },
            a_size: { type: types.FLOAT, enableArray: true },
            a_offset: { type: types.VEC3, enableArray: true },
            a_rgba: { type: types.VEC4, enableArray: true },
            a_rotation: { type: types.FLOAT, enableArray: true },
            a_alignedAxis: { type: types.VEC3, enableArray: true },
            a_fontIndex: { type: types.FLOAT, enableArray: true },
            a_bufferAA: { type: types.VEC2, enableArray: true }
        },
        vertexShader:
            `attribute vec2 a_vertices;
            attribute vec4 a_texCoord;
            attribute vec4 a_positions;
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
            uniform vec3 uCamPos;
            /*0 - planetRadius^2, 1 - tan(fov), 2 - screen ratio*/
            uniform vec2 uFloatParams;
            uniform float uZ;
            uniform vec3 uScaleByDistance;
            uniform float uOpacity;
            const vec3 ZERO3 = vec3(0.0);
            const float C = 0.1;
            const float far = 149.6e+9;
            float logc = 2.0 / log( C * far + 1.0 );
            void main() {
                if(a_texCoord.z == -1.0 || a_bufferAA.x == 1.0){
                    gl_Position = vec4(0.0);
                    return;
                }
                v_fontIndex = a_fontIndex;
                v_texCoords = vec2(a_texCoord.xy);
                vec3 look = a_positions.xyz - uCamPos;
                float lookDist = length(look);                
                v_rgba = a_rgba;
                /*v_rgba.a *= uOpacity * step(lookDist, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions.xyz,a_positions.xyz) - uFloatParams[0]));*/
                if(uOpacity * step(lookDist, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions.xyz,a_positions.xyz) - uFloatParams[0]))==0.0){
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
                float dist = dot(uCamPos - a_positions.xyz, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
                float focalSize = 2.0 * dist * uFloatParams[1];
                vec2 offset = a_offset.xy * focalSize;
                float scd = a_positions.w * (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookDist)) * (1.0 - step(uScaleByDistance[2], lookDist));
                float scale = a_size * focalSize * scd;
                float cosRot = cos(a_rotation);
                float sinRot = sin(a_rotation);
                vec3 rr = (right * cosRot - up * sinRot) * (scale * (a_vertices.x + a_texCoord.z + a_texCoord.w) + scd * offset.x) + (right * sinRot + up * cosRot) * (scale * a_vertices.y + scd * offset.y) + a_positions.xyz;
                gl_Position = projectionMatrix * viewMatrix * vec4(rr, 1);
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;
                gl_Position.z += a_offset.z + uZ;
            }`,
        fragmentShader:
            strFragment
    });
};

export function labelPicking() {
    return new ShaderProgram("labelPicking", {
        uniforms: {
            projectionMatrix: { type: types.MAT4 },
            viewMatrix: { type: types.MAT4 },
            uCamPos: { type: types.VEC3 },
            uFloatParams: { type: types.VEC2 },
            uScaleByDistance: { type: types.VEC3 },
            uOpacity: { type: types.FLOAT }
        },
        attributes: {
            a_vertices: { type: types.VEC2, enableArray: true },
            a_texCoord: { type: types.VEC4, enableArray: true },
            a_positions: { type: types.VEC4, enableArray: true },
            a_size: { type: types.FLOAT, enableArray: true },
            a_offset: { type: types.VEC3, enableArray: true },
            a_pickingColor: { type: types.VEC3, enableArray: true },
            a_rotation: { type: types.FLOAT, enableArray: true },
            a_alignedAxis: { type: types.VEC3, enableArray: true }
        },
        vertexShader:
            `precision highp float;
            attribute vec2 a_vertices;
            attribute vec4 a_texCoord;
            attribute vec4 a_positions;
            attribute vec3 a_offset;
            attribute float a_size;
            attribute float a_rotation;
            attribute vec3 a_pickingColor;
            attribute vec3 a_alignedAxis;
            varying vec4 v_color;
            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            uniform vec3 uCamPos;
            /*0 - planetRadius^2, 1 - tan(fov), 2 - screen ratio*/
            uniform vec2 uFloatParams;
            uniform vec3 uScaleByDistance;
            uniform float uOpacity;
            const vec3 ZERO3 = vec3(0.0);
            const float C = 0.1;
            const float far = 149.6e+9;
            float logc = 2.0 / log( C * far + 1.0 );
            void main() {
                if( uOpacity == 0.0 ){
                    gl_Position = vec4(0.0);
                    return;
                }
                if(a_texCoord.z == -1.0){
                    gl_Position = vec4(0.0);
                    return;
                }
                vec3 look = a_positions.xyz - uCamPos;
                float lookLength = length(look);
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
                float scale = a_size * focalSize * scd;
                float cosRot = cos(a_rotation);
                float sinRot = sin(a_rotation);
                vec3 rr = (right * cosRot - up * sinRot) * (scale * (a_vertices.x + a_texCoord.z + a_texCoord.w) + scd * offset.x) + (right * sinRot + up * cosRot) * (scale * a_vertices.y + scd * offset.y) + a_positions.xyz;
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
};