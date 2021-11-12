/**
 * @module og/shaders/skybox
 */

'use strict';

import { Program } from '../webgl/Program.js';
import { types } from '../webgl/types.js';

export function skybox() {
    return new Program("skybox", {
        uniforms: {
            projectionViewMatrix: { type: types.MAT4 },
            uSampler: { type: types.SAMPLERCUBE },
            pos: { type: types.VEC3 }
        },
        attributes: {
            aVertexPosition: { type: types.VEC3, enableArray: true }
        },
        vertexShader:
            `attribute vec3 aVertexPosition;
            uniform mat4 projectionViewMatrix;
            uniform vec3 pos;
            varying vec3 vTextureCoord;
            void main(void) {
                vTextureCoord = aVertexPosition;
                gl_Position = projectionViewMatrix * vec4(aVertexPosition + pos, 1.0);
            }`,
        fragmentShader:
            `precision lowp float;
            varying vec3 vTextureCoord;
            uniform samplerCube uSampler;
            void main(void) {
                gl_FragColor = textureCube(uSampler, vTextureCoord);
            }`
    });
}