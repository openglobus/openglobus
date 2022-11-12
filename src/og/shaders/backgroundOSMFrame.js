'use strict';

import { Program } from '../webgl/Program.js';

export function backgroundOSMFrame() {
    return new Program("backgroundOSMFrame", {
        uniforms: {},
        attributes: {
            corners: "vec3"
        },
        vertexShader:
            `attribute vec2 corners;
            
            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
            }`,
        fragmentShader:
            `precision highp float;   
            
            void main(void) {
                gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
            }`
    });
}