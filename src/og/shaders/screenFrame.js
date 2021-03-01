'use strict';

import { Program } from '../webgl/Program.js';

export function screenFrame() {
    return new Program("screenFrame", {
        uniforms: {
            texture: "sampler2d"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader:
            `attribute vec2 corners;
            
            varying vec2 tc;
            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                tc = corners * 0.5 + 0.5;
            }`,
        fragmentShader:
            `precision highp float;
            uniform sampler2D texture;
            
            varying vec2 tc;
            
            void main(void) {
                gl_FragColor = texture2D( texture, tc );
            }`
    });
};