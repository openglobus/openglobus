import { EntityCollection } from "../EntityCollection";
import { Renderer } from "../../renderer/Renderer";
import { RenderNode } from "../../scene/RenderNode";
import { Strip } from "./Strip";
import { stripForward, stripTransparent } from "../../shaders/strip/strip";

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

    protected _opaqueCount: number;

    protected _isOpaque(strip: Strip): boolean {
        return strip.color[3] >= 0.999999;
    }

    constructor(entityCollection: EntityCollection) {
        this.__id = StripHandler.__counter__++;

        this.pickingEnabled = true;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._strips = [];
        this._opaqueCount = 0;
    }

    protected _initProgram() {
        if (this._renderer && this._renderer.handler) {
            !this._renderer.handler.programs.stripTransparent && this._renderer.handler.addProgram(stripTransparent());
            !this._renderer.handler.programs.stripForward && this._renderer.handler.addProgram(stripForward());
        }
    }

    public setRenderNode(renderNode: RenderNode) {
        this._renderer = renderNode.renderer;
        this._initProgram();
        for (let i = 0; i < this._strips.length; i++) {
            this._strips[i].setRenderNode(renderNode);
        }
    }

    protected _swap(i: number, j: number) {
        if (i === j) return;
        const a = this._strips;
        const ti = a[i];
        const tj = a[j];
        a[i] = tj;
        a[j] = ti;
        tj._handlerIndex = i;
        ti._handlerIndex = j;
    }

    public add(strip: Strip) {
        if (strip._handlerIndex === -1) {
            strip._handler = this;
            const index = this._strips.length;
            strip._handlerIndex = index;
            this._strips.push(strip);

            // keep opaque first, transparent last
            if (this._isOpaque(strip)) {
                this._swap(index, this._opaqueCount);
                this._opaqueCount++;
            }
            this._entityCollection &&
                this._entityCollection.renderNode &&
                strip.setRenderNode(this._entityCollection.renderNode);
        }
    }

    public remove(strip: Strip) {
        const index = strip._handlerIndex;
        if (index === -1) return;

        strip._deleteBuffers();

        const a = this._strips;
        const lastIndex = a.length - 1;
        if (index < 0 || index > lastIndex) {
            strip._handlerIndex = -1;
            strip._handler = null;
            return;
        }

        if (index < this._opaqueCount) {
            const lastOpaqueIndex = this._opaqueCount - 1;
            this._swap(index, lastOpaqueIndex);
            this._opaqueCount--;
            this._swap(lastOpaqueIndex, lastIndex);
        } else {
            this._swap(index, lastIndex);
        }

        a.pop();

        strip._handlerIndex = -1;
        strip._handler = null;
    }

    public drawForward() {
        this.drawOpaque();
    }

    public drawOpaque(): void {
        for (let i = 0; i < this._opaqueCount; i++) {
            this._strips[i].drawOpaque();
        }
    }

    public drawTransparent(): void {
        for (let i = this._opaqueCount; i < this._strips.length; i++) {
            this._strips[i].drawTransparent();
        }
    }

    public drawTransparentForward(): void {
        for (let i = this._opaqueCount; i < this._strips.length; i++) {
            this._strips[i].drawOpaque();
        }
    }

    public updateStripOpacity(strip: Strip) {
        const index = strip._handlerIndex;
        if (index === -1) return;

        const toOpaque = this._isOpaque(strip);
        const isOpaque = index < this._opaqueCount;
        if (toOpaque === isOpaque) return;

        if (toOpaque) {
            this._swap(index, this._opaqueCount);
            this._opaqueCount++;
        } else {
            const lastOpaqueIndex = this._opaqueCount - 1;
            this._swap(index, lastOpaqueIndex);
            this._opaqueCount--;
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
        this._opaqueCount = 0;
    }
}

export { StripHandler };
