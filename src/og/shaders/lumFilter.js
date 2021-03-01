'use strict';

import { Program } from '../webgl/Program.js';

export function lumFilter() {
    return new Program("lumFilter", {
        uniforms: {
            texture: "sampler2d",
            threshold: "float"
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

            uniform float threshold;
            
            varying vec2 tc;
            
            const vec3 LUM_VEC = vec3(0.2125, 0.7154, 0.0721);

            void main(void) {
                vec4 c = texture2D( texture, tc );
                float brightness = dot(LUM_VEC, c.rgb);
                if(brightness > threshold)
                    gl_FragColor = vec4(c.rgb, 1.0);
                else
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }`
    });
};