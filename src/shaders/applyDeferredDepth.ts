import { Program } from "../webgl/Program";

export function applyDeferredDepth() {
    return new Program("applyDeferredDepth", {
        uniforms: {
            depthTexture: "sampler2D"
        },
        attributes: {
            corners: "vec2"
        },
        vertexShader: `#version 300 es
            in vec2 corners;

            void main() {
                gl_Position = vec4(corners, 0.0, 1.0);
            }`,
        fragmentShader: `#version 300 es
            precision highp float;

            uniform sampler2D depthTexture;

            layout(location = 0) out vec4 fragColor;

            void main() {
                ivec2 fragCoord = ivec2(gl_FragCoord.xy);
                float d = texelFetch(depthTexture, fragCoord, 0).r;

                // if (d >= 1.0) discard;

                gl_FragDepth = d;
                fragColor = vec4(0.0);
            }`
    });
}
