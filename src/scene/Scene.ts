import { Renderer } from "../renderer/Renderer";
import type { EntityCollection } from "../entity/EntityCollection";
import { Quat } from "../math/Quat";
import { Vec3 } from "../math/Vec3";
import type { Planet } from "./Planet";

/**
 * Render node is a logical part of a render mechanism. Represents scene rendering.
 * For example one scene node for rendering the Earth, another one for rendering the Moon, another node for rendering stars etc.
 * Each render node has own model view space defined with matrices(scale, rotation, translation, transformation).
 * There are collections of light sources, entities and so on in the node.
 * Access to the node is renderer.scenes["Earth"]
 * @class
 * @param {string} name - Node name.
 */

class Scene {
    static __counter__: number = 0;

    protected __id: number;

    /**
     * Node name.
     * @protected
     * @type {string}
     */
    protected _name: string;

    /**
     * Top scene tree node pointer.
     * @public
     * @type {Scene}
     */
    public topNode: Scene;

    /**
     * Children nodes.
     * @public
     * @type {Array.<Scene>}
     */
    public childNodes: Scene[];

    /**
     * Parent node pointer.
     * @public
     * @type {Scene}
     */
    public parentNode: Scene | null;

    /**
     * Renderer that calls frame() callback.
     * @public
     * @type {Renderer}
     */
    public renderer: Renderer | null;

    public drawMode: number;

    /** Show rendering.
     * @public
     */
    public show: boolean;

    protected _isActive: boolean;

    /**
     * Entity collection array.
     * @public
     * @type {Array.<EntityCollection>}
     */
    public entityCollections: EntityCollection[];

    protected _entityCollectionsByDepthOrder: EntityCollection[][];

    protected _pickingId: number;

    constructor(name?: string) {
        this.__id = Scene.__counter__++;

        this._name = name || `${this.__id}`;

        this.topNode = this;

        this.childNodes = [];

        this.parentNode = null;

        this.renderer = null;

        this.drawMode = 0;

        this.show = true;

        this._isActive = true;

        this.entityCollections = [];

        this._entityCollectionsByDepthOrder = [];

        this._pickingId = -1;
    }

    public get name(): string {
        return this._name;
    }

    public getFrameRotation(cartesian: Vec3): Quat {
        return Quat.IDENTITY;
    }

    /**
     * Adds node to the current hierarchy.
     * @public
     * @type {Scene}
     */
    public addNode(node: Scene) {
        if (this.parentNode == null) {
            node.topNode = this;
        } else {
            node.topNode = this.topNode;
        }
        node.parentNode = this;
        this.childNodes.push(node);
        this.renderer && node.assign(this.renderer);
    }

    /**
     * Assign render node with renderer.
     * @public
     * @param {Renderer} renderer - Render node's renderer.
     */
    public assign(renderer: Renderer) {
        this.renderer = renderer;
        this._pickingId = renderer.addPickingCallback(this, this._entityCollectionPickingCallback);
        this.initialize();
    }

    public initialize() {
        if (this.renderer && this.renderer.isInitialized()) {
            for (let i = 0; i < this.entityCollections.length; i++) {
                this.entityCollections[i].bindScene(this);
            }
            this.init();
        }
    }

    public init() {
        //virtual
    }

    public onremove() {
        //virtual
    }

    public remove() {
        let r = this.renderer,
            n = this.name;

        if (r) {
            // TODO: replace to renderer
            if (r.scenes[n] && r.scenes[n].isEqual(this)) {
                // @ts-ignore
                r.scenes[n] = null;
                delete r.scenes[n];
            }

            for (let i = 0; i < r._scenesArr.length; i++) {
                if (r._scenesArr[i].isEqual(this)) {
                    r._scenesArr.splice(i, 1);
                    break;
                }
            }
            r.removePickingCallback(this._pickingId);
            this._pickingId = -1;
            this.onremove && this.onremove();
        }
    }

    /**
     * Destroy node.
     * @public
     */
    public destroy() {
        for (let i = 0; i < this.childNodes.length; i++) {
            this.childNodes[i].destroy();
        }
        this._clear();
    }

    /**
     * Clear current node.
     * @protected
     */
    protected _clear() {
        this.parentNode = null;
        this.topNode = this;
        this.childNodes.length = 0;
    }

    /**
     * Adds entity collection.
     * @public
     * @param {EntityCollection} entityCollection - Entity collection.
     * @param {boolean} [isHidden] - If it's true that this collection has specific rendering.
     * @returns {Scene} -
     */
    public addEntityCollection(entityCollection: EntityCollection, isHidden?: boolean): void {
        if (!entityCollection.scene) {
            entityCollection.scene = this;

            if (!isHidden) {
                this.entityCollections.push(entityCollection);
                this.updateEntityCollectionsDepthOrder();
            }

            //@ts-ignore
            (this as Planet).ellipsoid && entityCollection._updateGeodeticCoordinates((this as Planet).ellipsoid);

            entityCollection.bindScene(this);

            entityCollection.events.dispatch(entityCollection.events.add, this);
        }
    }

    /**
     * Removes entity collection.
     * @public
     * @param {EntityCollection} entityCollection - Entity collection for remove.
     */
    public removeEntityCollection(entityCollection: EntityCollection) {
        for (let i = 0; i < this.entityCollections.length; i++) {
            if (this.entityCollections[i].isEqual(entityCollection)) {
                this.entityCollections.splice(i, 1);
                this.updateEntityCollectionsDepthOrder();
                return;
            }
        }
    }

    public updateEntityCollectionsDepthOrder() {
        let grouped: Record<number, EntityCollection[]> = { 0: [] };
        for (const ec of this.entityCollections) {
            if (ec.getVisibility()) {
                if (!grouped[ec.depthOrder]) {
                    grouped[ec.depthOrder] = [];
                }
                grouped[ec.depthOrder].push(ec);
            }
        }

        this._entityCollectionsByDepthOrder.length = 0;
        this._entityCollectionsByDepthOrder = [];
        this._entityCollectionsByDepthOrder = Object.keys(grouped)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => grouped[Number(key)]);
    }

    /**
     * Calls render frame node's callback. Used in renderer.
     * @public
     */
    public preDraw() {
        this._isActive && this._preDraw();
    }

    /**
     * Calls render frame node's callback. Used in renderer.
     * @public
     */
    public draw() {
        this._isActive && this._draw();
    }

    /**
     * Gets render node activity.
     * @public
     * @returns {Boolean} -
     */
    public isActive(): boolean {
        return this._isActive;
    }

    /**
     * Rendering activation.
     * @public
     * @param {boolean} isActive - Activation flag.
     */
    public setActive(isActive: boolean) {
        this._isActive = isActive;

        if (this.renderer) {
            if (this._isActive && this._pickingId === -1) {
                // This picking callback MUST be the first picking callback
                // in the rendering queue in the renderer. It affects on blending.
                this._pickingId = this.renderer.addPickingCallback(this, this._entityCollectionPickingCallback);
            } else if (!this._isActive && this._pickingId !== -1) {
                this.renderer.removePickingCallback(this._pickingId);
                this._pickingId = -1;
            }
        }

        for (let i = 0; i < this.childNodes.length; i++) {
            this.childNodes[i].setActive(isActive);
        }
    }

    /**
     * Sets draw mode
     * @public
     * @param {Number} mode - Draw mode, such as gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.LINES etc.
     */
    public setDrawMode(mode: number) {
        this.drawMode = mode;
        for (let i = 0; i < this.childNodes.length; i++) {
            this.childNodes[i].setDrawMode(mode);
        }
    }

    /*
        @todo: use one atlas for both handlers?
     */
    public updateBillboardsTexCoords() {
        for (let i = 0; i < this.entityCollections.length; i++) {
            this.entityCollections[i].billboardHandler.refreshTexCoordsArr();
        }
    }

    public updateStrokeTexCoords() {
        for (let i = 0; i < this.entityCollections.length; i++) {
            let ei = this.entityCollections[i];
            ei.rayHandler.refreshTexCoordsArr();
            ei.polylineHandler.refreshTexCoordsArr();
            //Strips etc.
            //@todo
        }
    }

    public frame() {
        // virtual
    }

    public preFrame() {
        // virtual
    }

    protected _preDraw() {
        for (let i = 0; i < this.childNodes.length; i++) {
            if (this.childNodes[i]._isActive) {
                this.childNodes[i]._preDraw();
            }
        }

        if (this.show) {
            this.preFrame();
            for (let i = 0; i < this._entityCollectionsByDepthOrder.length; i++) {
                this.drawEntityCollections(this._entityCollectionsByDepthOrder[i], i);
            }
        }
    }

    protected _draw() {
        for (let i = 0; i < this.childNodes.length; i++) {
            if (this.childNodes[i]._isActive) {
                this.childNodes[i]._draw();
            }
        }

        if (this.show) {
            this.frame();
        }
    }

    public drawEntityCollections(ec: EntityCollection[], depthOrder: number = 0) {
        this.renderer!.enqueueEntityCollectionsToDraw(ec, depthOrder);
    }

    /**
     * Draw entity collections picking frame.
     * @public
     * @param {Array<EntityCollection>} ec - Entity collection array.
     */
    public drawPickingEntityCollections(ec: EntityCollection[]) {
        if (ec.length) {
            // billboard pass
            let i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].billboardHandler.drawPicking();
            }

            // geoObject pass
            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].geoObjectHandler.drawPicking();
            }

            // label pass
            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].labelHandler.drawPicking();
            }

            // ray pass
            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].rayHandler.drawPicking();
            }

            // polyline pass
            i = ec.length;
            while (i--) {
                ec[i]._visibility && ec[i].polylineHandler.drawPicking();
            }

            //Strip pass
            i = ec.length;
            while (i--) {
                ec[i]._visibility && ec[i].stripHandler.drawPicking();
            }

            // //pointClouds pass
            // i = ec.length;
            // while (i--) {
            //    ec[i]._visibility && ec[i].pointCloudHandler.drawPicking();
            // }
        }
    }

    protected _entityCollectionPickingCallback() {
        // for (let i = 0; i < this._entityCollectionsByDepthOrder.length; i++) {
        //     this.drawPickingEntityCollections(this._entityCollectionsByDepthOrder[i]);
        // }
    }

    public isEqual(node: Scene): boolean {
        return node.__id === this.__id;
    }
}

export { Scene };
