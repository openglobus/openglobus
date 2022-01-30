'use strict';

import { Program } from '../webgl/Program.js';

export function bloom() {
    return new Program("bloom", {
        uniforms: {
            uTextureOriginal: "sampler2d",
            uTexture1: "sampler2d",
            uTexture2: "sampler2d"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader:
            `attribute vec2 corners;
            varying vec2 uv;
            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                uv = corners * 0.5 + 0.5;
            }`,
        fragmentShader:
            `precision highp float;
            uniform sampler2D uTextureOriginal;
            uniform sampler2D uTexture1;
            uniform sampler2D uTexture2;

            varying vec2 uv;

            void main() {
              vec4 vOriginal = texture2D(uTextureOriginal, uv);
              vec4 vT1 = texture2D(uTexture1, uv);
              vec4 vT2 = texture2D(uTexture2, uv);
              gl_FragColor = vOriginal + vT1 + vT2;
            }`
    });
}