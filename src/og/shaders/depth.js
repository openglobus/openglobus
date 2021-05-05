'use strict';

import { Program } from '../webgl/Program.js';

export function depth() {
    return new Program("depth", {
        uniforms: {
            depthBuffer: "sampler2d",
            near: "float",
            far: "float"
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
            uniform float near;
            uniform float far;

            in vec2 tc;

            layout(location = 0) out vec4 fragColor;

            float LinearizeDepth(in vec2 uv)
            {
                float zNear = near;
                float zFar  = far;
                float depth = texture(depthBuffer, tc).x;
                return (2.0 * zNear) / (zFar + zNear - depth * (zFar - zNear));
            }

            float LinearizeDepth2(in vec2 uv) 
            {
                float depth = texture(depthBuffer, tc).x;
                float z = depth * 2.0 - 1.0; // back to NDC 
                return (2.0 * near * far) / (far + near - z * (far - near));	
            }
            
            void main(void) {
                float c = LinearizeDepth(tc);
                fragColor = vec4(c, c, c, 1.0);
            }`
    });
};