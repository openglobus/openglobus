import {Program} from "../webgl/Program";

export function weightedOITResolve() {
    return new Program("weightedOITResolve", {
        uniforms: {
            uAccumulate: "sampler2D",
            uAccumulateAlpha: "sampler2D"
        },
        attributes: {
            corners: "vec2"
        },
        vertexShader: `#version 300 es
            in vec2 corners;
            out vec2 vUv;

            void main() {
                gl_Position = vec4(corners, 0.0, 1.0);
                vUv = corners * 0.5 + 0.5;
            }`,
        fragmentShader: `#version 300 es
            precision highp float;

            uniform sampler2D uAccumulate;
            uniform sampler2D uAccumulateAlpha;

            out vec4 fragColor;

            void main() {
                ivec2 fragCoord = ivec2(gl_FragCoord.xy);
                vec4 accum = texelFetch(uAccumulate, fragCoord, 0);
                float a = 1.0 - accum.a;
                accum.a = texelFetch(uAccumulateAlpha, fragCoord, 0).r;
                fragColor = vec4(a * accum.rgb / clamp(accum.a, 0.001, 50000.0), a);
            }`
    });
}
