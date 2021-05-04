'use strict';

import { Program } from '../webgl/Program.js';

export function depth() {
    return new Program("depth", {
        uniforms: {
            depthBuffer: "sampler2d"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader:
            `#version 300 es
            
            in vec2 corners;
            
            out vec2 tc;

            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                tc = corners * 0.5 + 0.5;
            }`,
        fragmentShader:
            `#version 300 es

            precision highp float;

            uniform sampler2D depthBuffer;

            in vec2 tc;

            layout(location = 0) out vec4 fragColor;
            
            void main(void) {
                vec3 depth = texture(depthBuffer, tc).rgb;
                
                fragColor = vec4(depth, 1.0);
            }`
    });
};