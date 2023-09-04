import {EntityCollection} from "./EntityCollection";
import {Program} from "../webgl/Program";
import {Renderer} from "../renderer/Renderer";
import {RenderNode} from "../scene/RenderNode";
import {Strip} from "./Strip";

class StripHandler {

    static __counter__: number = 0;
    protected __id: number;

    /**
     * Picking rendering option.
     * @public
     * @type {boolean}
     */
    public pickingEnabled: boolean;

    /**
     * Parent collection
     * @protected
     * @type {EntityCollection}
     */
    protected _entityCollection: EntityCollection;

    /**
     * Renderer
     * @protected
     * @type {Renderer | null}
     */
    protected _renderer: Renderer | null;

    /**
     * Strip objects array
     * @protected
     * @type {Array.<Strip>}
     */
    protected _strips: Strip[];

    constructor(entityCollection: EntityCollection) {

        this.__id = StripHandler.__counter__++;

        this.pickingEnabled = true;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._strips = [];
    }

    protected _initProgram() {
        if (this._renderer && this._renderer.handler) {
            !this._renderer.handler.programs.strip &&
            this._renderer.handler.addProgram(
                new Program("strip", {
                    uniforms: {
                        projectionMatrix: {type: "mat4"},
                        viewMatrix: {type: "mat4"},
                        eyePositionHigh: "vec3",
                        eyePositionLow: "vec3",
                        uColor: {type: "vec4"},
                        uOpacity: {type: "float"}
                    },
                    attributes: {
                        aVertexPositionHigh: {type: "vec3"},
                        aVertexPositionLow: {type: "vec3"}
                    },
                    vertexShader: `attribute vec3 aVertexPositionHigh;
                        attribute vec3 aVertexPositionLow;
                        uniform mat4 projectionMatrix;
                        uniform mat4 viewMatrix;
                        uniform vec3 eyePositionHigh;
                        uniform vec3 eyePositionLow;
                        void main(void) {

                            vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                            vec3 lowDiff = aVertexPositionLow - eyePositionLow;

                            mat4 viewMatrixRTE = viewMatrix;
                            viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                            gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
                        }`,
                    fragmentShader: `precision highp float;
                        uniform vec4 uColor;
                        uniform float uOpacity;
                        void main(void) {
                            gl_FragColor = vec4(uColor.rgb, uColor.a * uOpacity);
                        }`
                })
            );
        }
    }

    public setRenderNode(renderNode: RenderNode) {
        this._renderer = renderNode.renderer;
        this._initProgram();
        for (let i = 0; i < this._strips.length; i++) {
            this._strips[i].setRenderNode(renderNode);
        }
    }

    public add(strip: Strip) {
        if (strip._handlerIndex === -1) {
            strip._handler = this;
            strip._handlerIndex = this._strips.length;
            this._strips.push(strip);
            this._entityCollection &&
            this._entityCollection.renderNode &&
            strip.setRenderNode(this._entityCollection.renderNode);
        }
    }

    public remove(strip: Strip) {
        let index = strip._handlerIndex;
        if (index !== -1) {
            strip._deleteBuffers();
            strip._handlerIndex = -1;
            strip._handler = null;
            this._strips.splice(index, 1);
            this.reindexStripArray(index);
        }
    }

    public reindexStripArray(startIndex: number) {
        let pc = this._strips;
        for (let i = startIndex; i < pc.length; i++) {
            pc[i]._handlerIndex = i;
        }
    }

    public draw() {
        let i = this._strips.length;
        while (i--) {
            this._strips[i].draw();
        }
    }

    public drawPicking() {
        if (this.pickingEnabled) {
            let i = this._strips.length;
            while (i--) {
                this._strips[i].drawPicking();
            }
        }
    }

    public clear() {
        let i = this._strips.length;
        while (i--) {
            this._strips[i]._deleteBuffers();
            this._strips[i]._handler = null;
            this._strips[i]._handlerIndex = -1;
        }
        this._strips.length = 0;
        this._strips = [];
    }
}

export {StripHandler};
