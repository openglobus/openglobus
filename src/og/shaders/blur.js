'use strict';

import { Program } from '../webgl/Program.js';

export function buildKernel(sigma) {

    function gauss(x, sigma) {
        return Math.exp(-(x * x) / (2.0 * sigma * sigma));
    }

    var i, values, sum, halfWidth, kMaxKernelSize = 25, kernelSize = 2 * Math.ceil(sigma * 3.0) + 1;

    if (kernelSize > kMaxKernelSize) kernelSize = kMaxKernelSize;
    halfWidth = (kernelSize - 1) * 0.5;

    values = new Array(kernelSize);
    sum = 0.0;
    for (i = 0; i < kernelSize; ++i) {
        values[i] = gauss(i - halfWidth, sigma);
        sum += values[i];
    }

    // normalize the kernel
    for (i = 0; i < kernelSize; ++i) values[i] /= sum;

    return values;
};

export function blur() {

    return new Program("blur", {
        uniforms: {
            uImageIncrement: "vec2",
            tDiffuse: "sampler2d",
            cKernel: "floatxx"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader:
            `
            #define KERNEL_SIZE_FLOAT 25.0

            attribute vec2 corners;
            uniform vec2 uImageIncrement;

            varying vec2 vUv;

            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                vec2 uv = corners * 0.5 + 0.5;
                vUv = uv - ( ( KERNEL_SIZE_FLOAT - 1.0 ) / 2.0 ) * uImageIncrement;
            }`,
        fragmentShader:
            `precision highp float;

            #define KERNEL_SIZE_INT 25
    
            uniform float cKernel[ KERNEL_SIZE_INT ];

            uniform sampler2D tDiffuse;
            
            uniform vec2 uImageIncrement;

            varying vec2 vUv;

            void main() {
                vec2 imageCoord = vUv;
                vec4 sum = vec4( 0.0, 0.0, 0.0, 0.0 );

                for( int i = 0; i < KERNEL_SIZE_INT; i ++ ) {
                    sum += texture2D( tDiffuse, imageCoord ) * cKernel[ i ];
                    imageCoord += uImageIncrement;
                }

                gl_FragColor = sum;
            }`
    });
};