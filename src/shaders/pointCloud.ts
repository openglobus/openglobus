import { Program } from '../webgl/Program';

//Picking is the same
export function pointCloud(): Program {
    return new Program("pointCloud", {
        uniforms: {
            projectionViewMatrix: "mat4",
            opacity: "float",
            pointSize: "float"
        },
        attributes: {
            coordinates: "vec3",
            colors: "vec3"
        },
        vertexShader:
            `attribute vec3 coordinates;
            attribute vec4 colors;
            uniform mat4 projectionViewMatrix;
            uniform float opacity;
            uniform float pointSize;
            varying vec4 color;
            void main() {
                color = colors;
                color.a *= opacity;
                gl_Position = projectionViewMatrix * vec4(coordinates, 1.0);
                gl_PointSize = pointSize;
            }`,
        fragmentShader:
            `precision highp float;
            varying vec4 color;
            void main(void) {
                gl_FragColor = color;
            }`
    });
}