import {Program} from "../webgl/Program";

export function forwardDepthToMultisample() {
    return new Program("forwardDepthToMultisample", {
        uniforms: {
            depthTexture: "sampler2D"
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
            
            uniform sampler2D depthTexture;
            in vec2 vUv;
            
            layout(location = 0) out vec4 fragColor;
            
            void main() {
                float d = texture(depthTexture, vUv).r;
            
                // if (d >= 1.0) discard;
            
                gl_FragDepth = d;
                fragColor = vec4(0.0);
            }`
    });
}