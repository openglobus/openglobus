import { ShaderProgram } from "../webgl/ShaderProgram";
import { types } from "../webgl/types";

export function skybox(): ShaderProgram {
    return new ShaderProgram("skybox", {
        uniforms: {
            projectionViewMatrix: { type: types.MAT4 },
            uSampler: "samplercube"
        },
        attributes: {
            aVertexPosition: "vec3"
        },
        vertexShader: `attribute vec3 aVertexPosition;
            uniform mat4 projectionViewMatrix;
            varying vec3 vTextureCoord;
            void main(void) {
                vTextureCoord = normalize(aVertexPosition);
                vec4 clipPos = projectionViewMatrix * vec4(aVertexPosition, 1.0);
                gl_Position = clipPos.xyww;
            }`,
        fragmentShader: `precision highp float;
            varying vec3 vTextureCoord;
            uniform samplerCube uSampler;
            void main(void) {
                gl_FragColor = textureCube(uSampler, vTextureCoord);
            }`
    });
}
