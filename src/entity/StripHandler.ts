import {EntityCollection} from "./EntityCollection";
import {Renderer} from "../renderer/Renderer";
import {RenderNode} from "../scene/RenderNode";
import {Strip} from "./Strip";
import {stripScreen} from "../shaders/strip/strip";

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
            this._renderer.handler.addProgram(stripScreen());
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
