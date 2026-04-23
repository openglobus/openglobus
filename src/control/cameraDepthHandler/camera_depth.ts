import { ShaderProgram } from "../../webgl";

export function camera_depth() {
    return new ShaderProgram("camera_depth", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            height: "float",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3"
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3"
        },

        vertexShader: `#version 300 es
            
            precision highp float;

            in vec3 aVertexPositionHigh;
            in vec3 aVertexPositionLow;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform vec3 rtcEyePositionHigh;
            uniform vec3 rtcEyePositionLow;
            uniform float height;

            void main(void) {

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                mat4 m = projectionMatrix * viewMatrixRTE;

                vec3 nh = height * normalize(aVertexPositionHigh + aVertexPositionLow);

                vec3 highDiff = aVertexPositionHigh - rtcEyePositionHigh;
                vec3 lowDiff = aVertexPositionLow - rtcEyePositionLow + nh;
                 
                gl_Position =  m * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);    
            }`,

        fragmentShader: `#version 300 es
            
            precision highp float;        

            layout(location = 0) out vec4 depthColor;

            void main(void) {
                depthColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
            }`
    });
}
