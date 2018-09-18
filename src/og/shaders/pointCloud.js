/**
 * @module og/shaders/pointCloud
 */

'use sctrict';

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
        'attribute vec3 coordinates;\
            attribute vec4 colors;\
            uniform mat4 projectionViewMatrix;\
            uniform float opacity;\
            uniform float pointSize;\
            varying vec4 color;\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main() {\
                color = colors;\
                color.a *= opacity;\
                gl_Position = projectionViewMatrix * vec4(coordinates, 1.0);\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                gl_PointSize = pointSize;\
            }',
        fragmentShader:
        'precision highp float;\n\
            varying vec4 color;\
            void main(void) {\
                gl_FragColor = color;\
            }'
    });
};