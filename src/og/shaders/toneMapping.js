'use strict';

import { Program } from '../webgl/Program.js';

export function toneMapping() {
    return new Program("toneMapping", {
        uniforms: {
            hdrBuffer: "sampler2d",
            exposure: "float",
            gamma: "float",
            whitepoint: "float"
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

            #ifndef saturate
                #define saturate(a) clamp(a, 0.0, 1.0)
            #endif

            uniform sampler2D hdrBuffer;

            uniform float whitepoint;
            uniform float exposure;
            uniform float gamma;

            vec3 LinearToneMapping(vec3 color) {
                return exposure * color;
            }

            vec3 ReinhardToneMapping2(vec3 color) {
                return vec3(1.0) - exp(-color * exposure);
            }

            vec3 ReinhardToneMapping(vec3 color) {
                color *= exposure;
                return saturate(color / (vec3(1.0) + color));
            }

            #define Uncharted2Helper(x) max(((x * (0.15 * x + 0.10 * 0.50) + 0.20 * 0.02) / (x * (0.15 * x + 0.50) + 0.20 * 0.30)) - 0.02 / 0.30, vec3(0.0))

            vec3 Uncharted2ToneMapping(vec3 color) {
                color *= exposure;
                return saturate(Uncharted2Helper(color) / Uncharted2Helper(vec3(whitepoint)));
            }

            vec3 OptimizedCineonToneMapping(vec3 color) {
                color *= exposure;
                color = max(vec3(0.0), color - 0.004);
                return pow((color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06), vec3(2.2));
            }

            vec3 ACESFilmicToneMapping(vec3 color) {
                color *= exposure;
                return saturate((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14));
            }

            in vec2 tc;

            layout(location = 0) out vec4 fragColor;
            
            void main(void) {
                vec4 hdrColor = texture(hdrBuffer, tc).rgba;
                
                float oneByGamma = gamma / gamma;
                float oneByWhitePoint = whitepoint / whitepoint;
                vec3 mapped = ReinhardToneMapping2(hdrColor.rgb) * oneByGamma * oneByWhitePoint;
                //vec3 mapped = ACESFilmicToneMapping(hdrColor.rgb) * oneByGamma * oneByWhitePoint;

                mapped = pow(mapped, vec3(1.0 / gamma));
        
                fragColor = vec4(mapped, hdrColor.a);
            }`
    });
}