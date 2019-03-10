'use sctrict';

import { Program } from '../webgl/Program.js';

export function toneMapping() {
    return new Program("toneMapping", {
        uniforms: {
            hdrBuffer: "sampler2d",
            exposure: "float",
            gamma: "float"
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

            #ifndef saturate
	            #define saturate(a) clamp( a, 0.0, 1.0 )
            #endif

            precision highp float;

            uniform sampler2D hdrBuffer;

            uniform float exposure;
            uniform float gamma;

            in vec2 tc;

            layout(location = 0) out vec4 fragColor;
            
            void main(void) {
                vec3 hdrColor = texture(hdrBuffer, tc).rgb;
                
                vec3 mapped = vec3(1.0) - exp(-hdrColor * exposure);
                mapped = pow(mapped, vec3(1.0 / gamma));

                fragColor = vec4(mapped, 1.0);
            }`
    });
};