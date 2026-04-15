import {Program} from '../webgl/Program';

export function depth() {
    return new Program("depth", {
        uniforms: {
            depthTexture: "sampler2D"
        },
        attributes: {
            corners: "vec2"
        },
        vertexShader:
            `#version 300 es

            in vec2 corners;

            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
            }`,
        fragmentShader:
            `#version 300 es

            precision highp float;

            uniform sampler2D depthTexture;

            layout(location = 0) out vec4 fragColor;

            void main(void) {
                ivec2 fragCoord = ivec2(gl_FragCoord.xy);
                float c = texelFetch(depthTexture, fragCoord, 0).r;
                fragColor = vec4(c, c, c, 1.0);
            }`
    });
}
