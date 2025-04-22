import {Dialog, IDialogParams} from "../ui/Dialog";
import {Framebuffer} from "../webgl/Framebuffer";
import {Control, IControlParams} from "./Control";
import {Program} from "../webgl/Program";

function creteCanvas(width: number, height: number) {
    let canvas = new HTMLCanvasElement();
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = "absolute";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    return canvas;
}

export interface IFramebufferDialogParams extends IControlParams {
}

export class FramebufferDialog extends Control {

    protected _dialog: Dialog<Framebuffer | null>;
    public $canvas: HTMLCanvasElement;

    constructor(params: IFramebufferDialogParams) {
        super({
            autoActivate: true,
            ...params
        });
        this._dialog = new Dialog<Framebuffer | null>();
        this.$canvas = creteCanvas(this._dialog.width, this._dialog.height);
    }

    public override oninit() {
        super.oninit();
    }

    public override activate() {
        super.activate();
        this._dialog.appendTo(document.body);
        this._dialog.container?.appendChild(this.$canvas);
    }

    public override deactivate() {
        super.deactivate();
        this._dialog.remove();
    }
}

function framebuffer_dialog_screen() {
    return new Program("framebuffer_dialog_screen", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            height: "float",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3"
        },

        vertexShader:
            `#version 300 es
            
            precision highp float;

            in vec3 aVertexPositionHigh;
            in vec3 aVertexPositionLow;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            uniform float height;

            void main(void) {

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                mat4 m = projectionMatrix * viewMatrixRTE;

                vec3 nh = height * normalize(aVertexPositionHigh + aVertexPositionLow);

                vec3 eyePosition = eyePositionHigh + eyePositionLow;
                vec3 vertexPosition = aVertexPositionHigh + aVertexPositionLow;

                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow - eyePositionLow + nh;
                
                gl_Position =  m * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);    
            }`,

        fragmentShader:
            `#version 300 es
            
            precision highp float;
            

            layout(location = 0) out vec4 depthColor;

            void main(void) {
                depthColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
            }`
    });
}