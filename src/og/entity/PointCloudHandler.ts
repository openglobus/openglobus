import * as shaders from "../shaders/pointCloud";
import {EntityCollection} from "./EntityCollection";
import {PointCloud} from "./PointCloud";
import {Renderer} from "../renderer/Renderer";
import {RenderNode} from "../scene/RenderNode";

class PointCloudHandler {
    static __counter__: number = 0;
    protected __id: number;

    /**
     * Picking rendering option.
     * @public
     * @type {boolean}
     */
    public pickingEnabled = true;

    /**
     * Parent collection
     * @protected
     * @type {EntityCollection}
     */
    protected _entityCollection: EntityCollection;

    /**
     * Renderer
     * @protected
     * @type {Renderer|null}
     */
    protected _renderer: Renderer | null;

    /**
     * Point cloud array
     * @protected
     * @type {Array.<PointCloud>}
     */
    protected _pointClouds: PointCloud[];

    constructor(entityCollection: EntityCollection) {

        this.__id = PointCloudHandler.__counter__++;

        this.pickingEnabled = true;
        this._entityCollection = entityCollection;
        this._renderer = null;
        this._pointClouds = [];
    }

    protected _initProgram() {
        if (this._renderer && this._renderer.handler) {
            if (!this._renderer.handler.programs.pointCloud) {
                this._renderer.handler.addProgram(shaders.pointCloud());
            }
        }
    }

    public setRenderNode(renderNode: RenderNode) {
        this._renderer = renderNode.renderer;
        this._initProgram();
        for (let i = 0; i < this._pointClouds.length; i++) {
            this._pointClouds[i].setRenderNode(renderNode);
        }
    }

    public add(pointCloud: PointCloud) {
        // @ts-ignore
        if (pointCloud._handlerIndex === -1) {
            // @ts-ignore
            pointCloud._handler = this;
            // @ts-ignore
            pointCloud._handlerIndex = this._pointClouds.length;
            this._pointClouds.push(pointCloud);
            this._entityCollection &&
            this._entityCollection.renderNode &&
            pointCloud.setRenderNode(this._entityCollection.renderNode);
        }
    }

    public remove(pointCloud: PointCloud) {
        // @ts-ignore
        let index = pointCloud._handlerIndex;
        if (index !== -1) {
            // @ts-ignore
            pointCloud._deleteBuffers();
            // @ts-ignore
            pointCloud._handlerIndex = -1;
            // @ts-ignore
            pointCloud._handler = null;
            this._pointClouds.splice(index, 1);
            this._reindexPointCloudArray(index);
        }
    }

    protected _reindexPointCloudArray(startIndex: number) {
        let pc = this._pointClouds;
        for (let i = startIndex; i < pc.length; i++) {
            // @ts-ignore
            pc[i]._handlerIndex = i;
        }
    }

    public draw() {
        let i = this._pointClouds.length;
        while (i--) {
            this._pointClouds[i].draw();
        }
    }

    public drawPicking() {
        if (this.pickingEnabled) {
            let i = this._pointClouds.length;
            while (i--) {
                this._pointClouds[i].drawPicking();
            }
        }
    }

    public clear() {
        let i = this._pointClouds.length;
        while (i--) {
            // @ts-ignore
            this._pointClouds[i]._deleteBuffers();
            // @ts-ignore
            this._pointClouds[i]._handler = null;
            // @ts-ignore
            this._pointClouds[i]._handlerIndex = -1;
        }
        this._pointClouds.length = 0;
        this._pointClouds = [];
    }
}

export {PointCloudHandler};
