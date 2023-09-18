import {Program} from '../webgl/Program';
import {RenderNode} from './RenderNode';
import {WebGLBufferExt} from "../webgl/Handler";

class Axes extends RenderNode {

    public size: number;
    public axesBuffer: WebGLBufferExt | null;
    public axesColorBuffer: WebGLBufferExt | null;

    constructor(size: number = 100) {
        super("Axes");

        this.size = size;
        this.axesBuffer = null;
        this.axesColorBuffer = null;
    }

    public override init() {
        this.createAxesBuffer(this.size);
        this.drawMode = this.renderer!.handler.gl!.LINES;
        this.renderer!.handler.addProgram(new Program("axesShader", {
            uniforms: {
                projectionViewMatrix: 'mat4'
            },
            attributes: {
                aVertexPosition: 'vec3',
                aVertexColor: 'vec4'
            },
            vertexShader:
                `attribute vec3 aVertexPosition;
            attribute vec4 aVertexColor;
            uniform mat4 projectionViewMatrix;
            varying vec4 vColor;
            void main(void) {
                gl_Position = projectionViewMatrix * vec4(aVertexPosition, 1.0);
                vColor = aVertexColor;
            }`,
            fragmentShader:
                `precision highp float;
            varying vec4 vColor;
            void main(void) {
                gl_FragColor = vColor;
            }`
        }));
    }

    public override frame() {

        this.renderer!.handler.programs.axesShader.activate().set({
            projectionViewMatrix: this.renderer!.activeCamera!.getProjectionViewMatrix(),
            aVertexPosition: this.axesBuffer,
            aVertexColor: this.axesColorBuffer
        });

        this.renderer!.handler.programs.axesShader.drawArrays(this.drawMode, this.axesBuffer!.numItems);
    }

    public createAxesBuffer(gridSize: number) {

        const vertices = [
            0.0, 0.0, 0.0, gridSize - 1, 0.0, 0.0, // x - R
            0.0, 0.0, 0.0, 0.0, gridSize - 1, 0.0, // y - B  
            0.0, 0.0, 0.0, 0.0, 0.0, gridSize - 1  // z - G
        ];

        const colors = [
            1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,   // x - R
            0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,   // y - B
            0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0    // z - G
        ];

        this.axesBuffer = this.renderer!.handler.createArrayBuffer(new Float32Array(vertices), 3, 6);
        this.axesColorBuffer = this.renderer!.handler.createArrayBuffer(new Float32Array(colors), 4, 6);
    }
}

export {Axes};
