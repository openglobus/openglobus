/**
 * @module og/shaders/pickingMask
 */

'use strict';

import { Program } from '../webgl/Program.js';

export function pickingMask() {
    return new Program("pickingMask", {
        uniforms: {
            offset: "vec2"
        },
        attributes: {
            coordinates: "vec2"
        },
        vertexShader:
            `attribute vec2 coordinates;
            uniform vec2 offset;
            void main() {
            
                gl_Position = vec4(coordinates + offset, 0.0, 1.0);
                gl_PointSize = 5.0;
            }`,
        fragmentShader:
            `precision highp float;
            void main(void) {
                gl_FragColor = vec4(1.0);
            }`
    });
}