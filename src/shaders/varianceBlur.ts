import { ShaderProgram } from "../webgl/ShaderProgram";

export function varianceBlur(): ShaderProgram {
    return new ShaderProgram("varianceBlur", {
        uniforms: {
            u_textureArray: "sampler2darray",
            u_layer: "int",
            u_direction: "vec2"
        },
        attributes: {
            corners: "vec2"
        },
        vertexShader: `#version 300 es

            in vec2 corners;
            out vec2 v_uv;

            void main(void) {
                v_uv = corners * 0.5 + 0.5;
                gl_Position = vec4(corners, 0.0, 1.0);
            }`,
        fragmentShader: `#version 300 es

            precision highp float;
            precision highp sampler2DArray;

            in vec2 v_uv;
            out vec4 fragColor;

            uniform sampler2DArray u_textureArray;
            uniform int u_layer;
            uniform vec2 u_direction;

            const int VARIANCE_BLUR_RADIUS = 2;

            void main(void) {
                vec2 texelSize = 1.0 / vec2(textureSize(u_textureArray, 0).xy);
                vec4 sum = vec4(0.0);

                for (int i = -VARIANCE_BLUR_RADIUS; i <= VARIANCE_BLUR_RADIUS; i++) {
                    vec2 uv = v_uv + u_direction * texelSize * float(i);
                    sum += texture(u_textureArray, vec3(uv, float(u_layer)));
                }

                fragColor = sum / float(VARIANCE_BLUR_RADIUS * 2 + 1);
            }`
    });
}
