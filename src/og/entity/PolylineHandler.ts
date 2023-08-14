'use strict';

import * as shaders from '../shaders/polyline';
import {EntityCollection} from "./EntityCollection";
import {Polyline} from "./Polyline";
import {Renderer} from "../renderer/Renderer";
import {RenderNode} from "../scene/RenderNode";

class PolylineHandler {

    static __counter__: number;
    protected __id: number;

    protected _entityCollection: EntityCollection;

    protected _renderer: Renderer | null;

    protected _polylines: Polyline[];

    public pickingEnabled: boolean;

    constructor(entityCollection: EntityCollection) {

        this.__id = PolylineHandler.__counter__++;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._polylines = [];

        this.pickingEnabled = true;
    }

    protected _initProgram() {
        if (this._renderer && this._renderer.handler) {
            if (!this._renderer.handler.programs.polyline_screen) {
                this._renderer.handler.addProgram(shaders.polyline_screen());
            }
            if (!this._renderer.handler.programs.polyline_picking) {
                this._renderer.handler.addProgram(shaders.polyline_picking());
            }
        }
    }

    public setRenderNode(renderNode: RenderNode) {
        this._renderer = renderNode.renderer;
        this._initProgram();
        for (let i = 0; i < this._polylines.length; i++) {
            this._polylines[i].setRenderNode(renderNode);
        }
    }

    public add(polyline: Polyline) {
        //@ts-ignore
        if (polyline._handlerIndex === -1) {
            //@ts-ignore
            polyline._handler = this;
            //@ts-ignore
            polyline._handlerIndex = this._polylines.length;
            this._polylines.push(polyline);
            this._entityCollection && this._entityCollection.renderNode &&
            polyline.setRenderNode(this._entityCollection.renderNode);
        }
    }

    public remove(polyline: Polyline) {
        //@ts-ignore
        let index = polyline._handlerIndex;
        if (index !== -1) {
            polyline._deleteBuffers();
            //@ts-ignore
            polyline._handlerIndex = -1;
            //@ts-ignore
            polyline._handler = null;
            this._polylines.splice(index, 1);
            this.reindexPolylineArray(index);
        }
    }

    public reindexPolylineArray(startIndex: number) {
        let ls = this._polylines;
        for (let i = startIndex; i < ls.length; i++) {
            //@ts-ignore
            ls[i]._handlerIndex = i;
        }
    }

    public draw() {
        let i = this._polylines.length;
        while (i--) {
            this._polylines[i].draw();
        }
    }

    public drawPicking() {
        if (this.pickingEnabled) {
            let i = this._polylines.length;
            while (i--) {
                this._polylines[i].drawPicking();
            }
        }
    }

    public clear() {
        let i = this._polylines.length;
        while (i--) {
            this._polylines[i]._deleteBuffers();
            //@ts-ignore
            this._polylines[i]._handler = null;
            //@ts-ignore
            this._polylines[i]._handlerIndex = -1;
        }
        this._polylines.length = 0;
        this._polylines = [];
    }
}

export {PolylineHandler};