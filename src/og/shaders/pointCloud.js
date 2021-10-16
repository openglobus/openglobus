/**
 * @module og/shaders/pointCloud
 */

'use strict';

import { Program } from '../webgl/Program.js';
import { types } from '../webgl/types.js';

//Picking is the same
export function pointCloud() {
    return new Program("pointCloud", {
        uniforms: {
            projectionViewMatrix: { type: types.MAT4 },
            opacity: { type: types.FLOAT },
            pointSize: { type: types.FLOAT }
        },
        attributes: {
            coordinates: { type: types.VEC3, enableArray: true },
            colors: { type: types.VEC3, enableArray: true }
        },
        vertexShader:
            `attribute vec3 coordinates;
            attribute vec4 colors;
            uniform mat4 projectionViewMatrix;
            uniform float opacity;
            uniform float pointSize;
            varying vec4 color;
            void main() {
                color = colors;
                color.a *= opacity;
                gl_Position = projectionViewMatrix * vec4(coordinates, 1.0);
                gl_PointSize = pointSize;
            }`,
        fragmentShader:
            `precision highp float;
            varying vec4 color;
            void main(void) {
                gl_FragColor = color;
            }`
    });
}