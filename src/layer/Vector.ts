import * as math from "../math";
import {Entity, IEntityParams} from "../entity/Entity";
import {EntityCollection} from "../entity/EntityCollection";
import {EntityCollectionsTreeStrategy} from "../quadTree/EntityCollectionsTreeStrategy";
import {EventsHandler} from "../Events";
import {GeometryHandler} from "../entity/GeometryHandler";
import {IMouseState, ITouchState} from "../renderer/RendererEvents";
import {ILayerParams, Layer, LayerEventsList} from "./Layer";
import {NumberArray3, Vec3} from "../math/Vec3";
import {Planet} from "../scene/Planet";
import {Material} from "./Material";
import {NumberArray4} from "../math/Vec4";

export interface IVectorParams extends ILayerParams {
    entities?: Entity[] | IEntityParams[];
    polygonOffsetUnits?: number;
    nodeCapacity?: number;
    relativeToGround?: boolean;
    clampToGround?: boolean;
    async?: boolean;
    pickingScale?: number | NumberArray3;
    scaleByDistance?: NumberArray3;
    labelMaxLetters?: number;
    useLighting?: boolean;
}

type VectorEventsList = [
    //"entitymove",
    "draw",
    "entityadd",
    "entityremove"
]

export type VectorEventsType = EventsHandler<VectorEventsList> & EventsHandler<LayerEventsList>;

/**
 * Creates entity instance array.
 * @param {Entity[] | IEntityParams[]} entities - Entity array.
 * @returns {Entity[]} - Entity array.
 */
function _entitiesConstructor(entities: Entity[] | IEntityParams[]): Entity[] {
    let res: Entity[] = [];
    for (let i = 0; i < entities.length; i++) {
        let ei = entities[i];
        if ((ei as Entity).instanceName === "Entity") {
            res.push(ei as Entity);
        } else {
            res.push(new Entity(ei as IEntityParams));
        }
    }
    return res;
}

/**
 * Vector layer represents alternative entities store. Used for geospatial data rendering like
 * points, lines, polygons, geometry objects etc.
 * @class
 * @extends {Layer}
 * @param {string} [name="noname"] - Layer name.
 * @param {IVectorParams} [options] - Layer options:
 * @param {number} [options.minZoom=0] - Minimal visible zoom. 0 is default
 * @param {number} [options.maxZoom=50] - Maximal visible zoom. 50 is default.
 * @param {string} [options.attribution] - Layer attribution.
 * @param {string} [options.zIndex=0] - Layer Z-order index. 0 is default.
 * @param {boolean} [options.visibility=true] - Layer visibility. True is default.
 * @param {boolean} [options.isBaseLayer=false] - Layer base layer. False is default.
 * @param {Array.<Entity>} [options.entities] - Entities array.
 * @param {Array.<number>} [options.scaleByDistance] - Scale by distance parameters. (exactly 3 entries)
 *      First index - near distance to the entity, after entity becomes full scale.
 *      Second index - far distance to the entity, when entity becomes zero scale.
 *      Third index - far distance to the entity, when entity becomes invisible.
 *      Use [1.0, 1.0, 1.0] for real sized objects
 * @param {number} [options.nodeCapacity=30] - Maximum entities quantity in the tree node. Rendering optimization parameter. 30 is default.
 * @param {boolean} [options.async=true] - Asynchronous vector data handling before rendering. True for optimization huge data.
 * @param {boolean} [options.clampToGround = false] - Clamp vector data to the ground.
 * @param {boolean} [options.relativeToGround = false] - Place vector data relative to the ground relief.
 * @param {Number} [options.polygonOffsetUnits=0.0] - The multiplier by which an implementation-specific value is multiplied with to create a constant depth offset.
 *
 * //@fires EventsHandler<VectorEventsList>#entitymove
 * @fires EventsHandler<VectorEventsList>#draw
 * @fires EventsHandler<VectorEventsList>#add
 * @fires EventsHandler<VectorEventsList>#remove
 * @fires EventsHandler<VectorEventsList>#entityadd
 * @fires EventsHandler<VectorEventsList>#entityremove
 * @fires EventsHandler<VectorEventsList>#visibilitychange
 */
class Vector extends Layer {

    public override events: VectorEventsType;

    /**
     * Entities collection.
     * @protected
     */
    protected _entities: Entity[];

    /**
     * First index - near distance to the entity, after that entity becomes full scale.
     * Second index - far distance to the entity, when entity becomes zero scale.
     * Third index - far distance to the entity, when entity becomes invisible.
     * @public
     * @type {NumberArray3} - (exactly 3 entries)
     */
    public scaleByDistance: NumberArray3;

    public pickingScale: Float32Array;

    /**
     * Asynchronous data handling before rendering.
     * @public
     * @type {boolean}
     */
    public async: boolean;

    /**
     * Maximum entities quantity in the tree node.
     * @public
     */
    public _nodeCapacity: number;

    /**
     * Clamp vector data to the ground.
     * @public
     * @type {boolean}
     */
    public clampToGround: boolean;

    /**
     * Sets vector data relative to the ground relief.
     * @public
     * @type {boolean}
     */
    public relativeToGround: boolean;

    /** todo: combine into one */
    protected _stripEntityCollection: EntityCollection;
    protected _polylineEntityCollection: EntityCollection;
    protected _geoObjectEntityCollection: EntityCollection;

    public _geometryHandler: GeometryHandler;

    protected _entityCollectionsTreeStrategy: EntityCollectionsTreeStrategy | null;

    //protected _pendingsQueue: Entity[];

    /**
     * Specifies the scale Units for gl.polygonOffset function to calculate depth values, 0.0 is default.
     * @public
     * @type {Number}
     */
    public polygonOffsetUnits: number;

    protected _labelMaxLetters: number;

    protected _useLighting: boolean;

    constructor(name?: string | null, options: IVectorParams = {}) {
        super(name, options);

        // @ts-ignore
        this.events = this.events.registerNames(VECTOR_EVENTS);

        this.isVector = true;

        this._hasImageryTiles = false;

        this.scaleByDistance = options.scaleByDistance || [math.MAX32, math.MAX32, math.MAX32];

        this._useLighting = options.useLighting !== undefined ? options.useLighting : true;


        let pickingScale: Float32Array = new Float32Array([1.0, 1.0, 1.0]);
        if (options.pickingScale !== undefined) {
            if (options.pickingScale instanceof Array) {
                pickingScale[0] = options.pickingScale[0] || pickingScale[0];
                pickingScale[1] = options.pickingScale[1] || pickingScale[1];
                pickingScale[2] = options.pickingScale[2] || pickingScale[2];
            } else if (typeof options.pickingScale === 'number') {
                pickingScale[0] = options.pickingScale;
                pickingScale[1] = options.pickingScale;
                pickingScale[2] = options.pickingScale;
            }
        }

        this.pickingScale = pickingScale;

        this.async = options.async !== undefined ? options.async : true;

        this.clampToGround = options.clampToGround || false;

        this.relativeToGround = options.relativeToGround || false;

        this._entities = _entitiesConstructor(options.entities || []);

        this._labelMaxLetters = options.labelMaxLetters || 24;

        this._stripEntityCollection = new EntityCollection({
            pickingEnabled: this.pickingEnabled
        });
        this._bindEventsDefault(this._stripEntityCollection);

        this._polylineEntityCollection = new EntityCollection({
            pickingEnabled: this.pickingEnabled
        });
        this._bindEventsDefault(this._polylineEntityCollection);

        this._geoObjectEntityCollection = new EntityCollection({
            pickingEnabled: this.pickingEnabled,
            useLighting: this._useLighting
        });
        this._bindEventsDefault(this._geoObjectEntityCollection);

        this._geometryHandler = new GeometryHandler(this);

        this._nodeCapacity = options.nodeCapacity || 60;

        this._entityCollectionsTreeStrategy = null;

        this.setEntities(this._entities);

        this.polygonOffsetUnits = options.polygonOffsetUnits != undefined ? options.polygonOffsetUnits : 0.0;

        this.pickingEnabled = this._pickingEnabled;
    }

    public get useLighting(): boolean {
        return this._useLighting;
    }

    public set useLighting(f: boolean) {
        if (f !== this._useLighting) {
            this._geoObjectEntityCollection.useLighting = f;
            this._useLighting = f;
        }
    }

    public get labelMaxLetters(): number {
        return this._labelMaxLetters;
    }

    public override get instanceName() {
        return "Vector";
    }

    protected override _bindPicking() {
        this._pickingColor.clear();
    }

    /**
     * Adds layer to the planet.
     * @public
     * @param {Planet} planet - Planet scene object.
     * @returns {Vector} -
     */
    public override addTo(planet: Planet) {
        if (!this._planet) {
            this._assignPlanet(planet);
            this._geometryHandler.assignHandler(planet.renderer!.handler);
            this._polylineEntityCollection.addTo(planet, true);
            this._stripEntityCollection.addTo(planet, true);
            this._geoObjectEntityCollection.addTo(planet, true);
            this.setEntities(this._entities);
        }
    }

    public override remove(): this {
        super.remove();
        this._polylineEntityCollection.remove();
        this._stripEntityCollection.remove();
        this._geoObjectEntityCollection.remove();
        return this;
    }

    /**
     * Returns stored entities.
     * @public
     * @returns {Array.<Entity>} -
     */
    public getEntities(): Entity[] {
        return ([] as Entity[]).concat(this._entities);
    }

    /**
     * Adds entity to the layer.
     * @public
     * @param {Entity} entity - Entity.
     * @param {boolean} [rightNow=false] - Entity insertion option. False is default.
     * @returns {Vector} - Returns this layer.
     */
    public add(entity: Entity, rightNow: boolean = false): this {
        if (!(entity._layer || entity._entityCollection)) {
            entity._layer = this;
            entity._layerIndex = this._entities.length;
            //this._fitExtent(entity);
            this._entities.push(entity);
            this._proceedEntity(entity, rightNow);
        }
        return this;
    }

    /**
     * Adds entity to the layer in the index position.
     * @public
     * @param {Entity} entity - Entity.
     * @param {Number} index - Index position.
     * @param {boolean} [rightNow] - Entity insertion option. False is default.
     * @returns {Vector} - Returns this layer.
     */
    public insert(entity: Entity, index: number, rightNow: boolean = false): this {
        if (!(entity._layer || entity._entityCollection)) {
            entity._layer = this;
            entity._layerIndex = index;
            //this._fitExtent(entity);
            this._entities.splice(index, 0, entity);
            for (let i = index + 1, len = this._entities.length; i < len; i++) {
                this._entities[i]._layerIndex = i;
            }

            this._proceedEntity(entity, rightNow);
        }

        return this;
    }

    protected _proceedEntity(entity: Entity, rightNow: boolean = false) {
        let temp = this._hasImageryTiles;

        let isEmpty = !(entity.strip || entity.polyline || entity.ray || entity.geoObject || entity.geometry);

        if (entity.strip) {
            this._stripEntityCollection.add(entity);
        }

        if (entity.polyline || entity.ray) {
            this._polylineEntityCollection.add(entity);
        }

        if (entity.geoObject || isEmpty) {
            this._geoObjectEntityCollection.add(entity);
        }

        if (entity.geometry) {
            this._hasImageryTiles = true;
            if (this._planet) {
                this._planet.renderer!.assignPickingColor<Entity>(entity);
                this._geometryHandler.add(entity.geometry);
            }
        }

        if (this._planet) {
            if (entity.billboard || entity.label || entity.geoObject || isEmpty) {
                if (entity._cartesian.isZero() && !entity._lonLat.isZero()) {
                    entity._setCartesian3vSilent(
                        this._planet.ellipsoid.lonLatToCartesian(entity._lonLat)
                    );
                } else {
                    entity._lonLat = this._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
                }
            }

            if (entity.billboard || entity.label) {
                this._entityCollectionsTreeStrategy?.insertEntity(entity);
            }
        }

        if (this._planet && this._hasImageryTiles !== temp) {
            this._planet.updateVisibleLayers();
        }

        this.events.dispatch(this.events.entityadd, entity);
    }

    /**
     * Adds entity array to the layer.
     * @public
     * @param {Array.<Entity>} entities - Entities array.
     * @param {boolean} [rightNow=false] - Entity insertion option. False is default.
     * @returns {Vector} - Returns this layer.
     */
    public addEntities(entities: Entity[], rightNow: boolean = false) {
        let i = entities.length;
        while (i--) {
            this.add(entities[i], rightNow);
        }
        return this;
    }

    /**
     * Remove entity from layer.
     * TODO: memory leaks.
     * @public
     * @param {Entity} entity - Entity to remove.
     * @returns {Vector} - Returns this layer.
     */
    public removeEntity(entity: Entity): this {

        if (entity._layer && this.isEqual(entity._layer)) {

            this._entities.splice(entity._layerIndex, 1);

            this._reindexEntitiesArray(entity._layerIndex);

            entity._layer = null;

            entity._layerIndex = -1;

            if (entity._entityCollection) {

                entity._entityCollection._removeEntitySilent(entity);

                let node = entity._nodePtr;

                while (node) {
                    node.count--;
                    node = node.parentNode!;
                }

                if (
                    entity._nodePtr &&
                    entity._nodePtr.count === 0 &&
                    entity._nodePtr.deferredEntities.length === 0
                ) {
                    entity._nodePtr.entityCollection = null;
                    //
                    // ...
                    //
                }
            } else if (entity._nodePtr && entity._nodePtr.deferredEntities.length) {
                let defEntities = entity._nodePtr.deferredEntities;
                let j = defEntities.length;
                while (j--) {
                    if (defEntities[j].id === entity.id) {
                        defEntities.splice(j, 1);
                        let node = entity._nodePtr;
                        while (node) {
                            node.count--;
                            node = node.parentNode!;
                        }
                        break;
                    }
                }
            }

            if (this._planet && entity.geometry) {
                this._geometryHandler.remove(entity.geometry);
                this._planet.renderer!.clearPickingColor(entity);
            }

            entity._nodePtr = undefined;

            this.events.dispatch(this.events.entityremove, entity);
        }

        return this;
    }

    /**
     * Set layer picking events active.
     * @public
     * @param {boolean} picking - Picking enable flag.
     */
    public override set pickingEnabled(picking: boolean) {
        this._pickingEnabled = picking;
        this._stripEntityCollection.setPickingEnabled(picking);
        this._polylineEntityCollection.setPickingEnabled(picking);
        this._geoObjectEntityCollection.setPickingEnabled(picking);
        this._entityCollectionsTreeStrategy?.setPickingEnabled(picking);
    }

    /**
     * Refresh collected entities indexes from startIndex entities collection array position.
     * @protected
     * @param {number} startIndex - Entity array index.
     */
    protected _reindexEntitiesArray(startIndex: number) {
        const e = this._entities;
        for (let i = startIndex; i < e.length; i++) {
            e[i]._layerIndex = i;
        }
    }

    /**
     * Removes entities from layer.
     * @public
     * @param {Array.<Entity>} entities - Entity array.
     * @returns {Vector} - Returns this layer.
     */
    public removeEntities(entities: Entity[]): this {
        let i = entities.length;
        while (i--) {
            this.removeEntity(entities[i]);
        }
        return this;
    }

    /**
     * Clear the layer.
     * @public
     */
    public override clear() {
        super.clear();
        let temp: Entity[] = new Array(this._entities.length);

        for (let i = 0; i < temp.length; i++) {
            temp[i] = this._entities[i];
        }

        let i = this._entities.length;
        while (i--) {
            this._entities[i].remove();
        }

        this._entities.length = 0;
        this._entities = [];
        for (let i = 0; i < temp.length; i++) {
            this._entities[i] = temp[i];
        }

        this._entityCollectionsTreeStrategy?.dispose();
        this._entityCollectionsTreeStrategy = null;
        this._geometryHandler.clear()
    }

    /**
     * Safety entities loop.
     * @public
     * @param {(entity: Entity, index?: number) => void} callback - Entity callback.
     */
    public each(callback: (entity: Entity, index?: number) => void) {
        let e = this._entities;
        let i = e.length;
        while (i--) {
            callback(e[i], i);
        }
    }

    /**
     * Removes current entities from layer and adds new entities.
     * @public
     * @param {Array.<Entity>} entities - New entity array.
     * @returns {Vector} - Returns layer instance.
     */
    public setEntities(entities: Entity[]): this {

        let temp: Entity[] = new Array(entities.length);

        for (let i = 0, len = entities.length; i < len; i++) {
            temp[i] = entities[i];
        }

        this.clear();

        this._entities = new Array(temp.length);

        let entitiesForTree = [];

        for (let i = 0; i < temp.length; i++) {
            let ei = temp[i];

            ei._layer = this;
            ei._layerIndex = i;

            let isEmpty = !(ei.strip || ei.polyline || ei.ray || ei.geoObject || ei.billboard || ei.label);

            if (ei.strip) {
                this._stripEntityCollection.add(ei);
            } else if (ei.polyline || ei.ray) {
                this._polylineEntityCollection.add(ei);
            } else if (ei.geoObject || isEmpty) {
                this._geoObjectEntityCollection.add(ei);
            } else if (ei.billboard || ei.label) {
                entitiesForTree.push(ei);
            }

            if (ei.geometry) {
                this._hasImageryTiles = true;
                if (this._planet) {
                    this._planet.renderer!.assignPickingColor<Entity>(ei);
                    this._geometryHandler.add(ei.geometry);
                }
            }

            this._entities[i] = ei;
        }

        this._createEntityCollectionsTree(entitiesForTree);

        return this;
    }

    protected _createEntityCollectionsTree(entitiesForTree: Entity[]) {
        if (this._planet) {
            this._entityCollectionsTreeStrategy = this._planet.quadTreeStrategy.createEntitiCollectionsTreeStrategy(this, this._nodeCapacity);
            this._entityCollectionsTreeStrategy.insertEntities(entitiesForTree);
        }
    }

    /**
     * @todo (refactoring) could be used in something like bindEntityCollectionQuad(...)
     * @param entityCollection
     */
    public _bindEventsDefault(entityCollection: EntityCollection) {

        let ve = this.events;

        //
        // @todo: replace with arrow functions and '...e'
        //
        // entityCollection.events.on("entitymove", (e: any) => {
        //     ve.dispatch(ve.entitymove, e);
        // });
        entityCollection.events.on("mousemove", (e: IMouseState) => {
            ve.dispatch(ve.mousemove, e);
        });
        entityCollection.events.on("mouseenter", (e: IMouseState) => {
            ve.dispatch(ve.mouseenter, e);
        });
        entityCollection.events.on("mouseleave", (e: IMouseState) => {
            ve.dispatch(ve.mouseleave, e);
        });
        entityCollection.events.on("lclick", (e: IMouseState) => {
            ve.dispatch(ve.lclick, e);
        });
        entityCollection.events.on("rclick", (e: IMouseState) => {
            ve.dispatch(ve.rclick, e);
        });
        entityCollection.events.on("mclick", (e: IMouseState) => {
            ve.dispatch(ve.mclick, e);
        });
        entityCollection.events.on("ldblclick", (e: IMouseState) => {
            ve.dispatch(ve.ldblclick, e);
        });
        entityCollection.events.on("rdblclick", (e: IMouseState) => {
            ve.dispatch(ve.rdblclick, e);
        });
        entityCollection.events.on("mdblclick", (e: IMouseState) => {
            ve.dispatch(ve.mdblclick, e);
        });
        entityCollection.events.on("lup", (e: IMouseState) => {
            ve.dispatch(ve.lup, e);
        });
        entityCollection.events.on("rup", (e: IMouseState) => {
            ve.dispatch(ve.rup, e);
        });
        entityCollection.events.on("mup", (e: IMouseState) => {
            ve.dispatch(ve.mup, e);
        });
        entityCollection.events.on("ldown", (e: IMouseState) => {
            ve.dispatch(ve.ldown, e);
        });
        entityCollection.events.on("rdown", (e: IMouseState) => {
            ve.dispatch(ve.rdown, e);
        });
        entityCollection.events.on("mdown", (e: IMouseState) => {
            ve.dispatch(ve.mdown, e);
        });
        entityCollection.events.on("lhold", (e: IMouseState) => {
            ve.dispatch(ve.lhold, e);
        });
        entityCollection.events.on("rhold", (e: IMouseState) => {
            ve.dispatch(ve.rhold, e);
        });
        entityCollection.events.on("mhold", (e: IMouseState) => {
            ve.dispatch(ve.mhold, e);
        });
        entityCollection.events.on("mousewheel", (e: IMouseState) => {
            ve.dispatch(ve.mousewheel, e);
        });
        entityCollection.events.on("touchmove", (e: ITouchState) => {
            ve.dispatch(ve.touchmove, e);
        });
        entityCollection.events.on("touchstart", (e: ITouchState) => {
            ve.dispatch(ve.touchstart, e);
        });
        entityCollection.events.on("touchend", (e: ITouchState) => {
            ve.dispatch(ve.touchend, e);
        });
        entityCollection.events.on("doubletouch", (e: ITouchState) => {
            ve.dispatch(ve.doubletouch, e);
        });
        entityCollection.events.on("touchleave", (e: ITouchState) => {
            ve.dispatch(ve.touchleave, e);
        });
        entityCollection.events.on("touchenter", (e: ITouchState) => {
            ve.dispatch(ve.touchenter, e);
        });
    }

    protected _collectStripCollectionPASS(outArr: EntityCollection[]) {
        let ec = this._stripEntityCollection;

        ec._fadingOpacity = this._fadingOpacity;
        ec.scaleByDistance = this.scaleByDistance;
        ec.pickingScale = this.pickingScale;
        ec.polygonOffsetUnits = this.polygonOffsetUnits;

        outArr.push(ec);
    }

    protected _collectPolylineCollectionPASS(outArr: EntityCollection[]) {
        let ec = this._polylineEntityCollection;

        ec._fadingOpacity = this._fadingOpacity;
        ec.scaleByDistance = this.scaleByDistance;
        ec.pickingScale = this.pickingScale;
        ec.polygonOffsetUnits = this.polygonOffsetUnits;

        outArr.push(ec);

        if (this.clampToGround || this.relativeToGround) {
            let rtg = Number(this.relativeToGround);

            const nodes = this._planet!._renderedNodes;
            const visibleExtent = this._planet!.getViewExtent();
            let e = ec._entities;
            let e_i = e.length;
            let res = new Vec3();

            while (e_i--) {
                let p = e[e_i].polyline!;
                if (p && visibleExtent.overlaps(p._extent)) {
                    // TODO:this works only for mercator area.
                    // needs to be working on poles.
                    let coords = p._pathLonLatMerc,
                        c_j = coords.length;
                    while (c_j--) {
                        let c_j_h = coords[c_j].length;
                        while (c_j_h--) {
                            let ll = coords[c_j][c_j_h],
                                n_k = nodes.length;
                            while (n_k--) {
                                let seg = nodes[n_k].segment;
                                if (seg._extent.isInside(ll)) {
                                    let cart = p._path3v[c_j][c_j_h] as Vec3;
                                    seg.getTerrainPoint(cart, ll, res);
                                    let alt = (rtg && p.altitude) || 0.0;
                                    if (alt) {
                                        let n = this._planet!.ellipsoid.getSurfaceNormal3v(res);
                                        p.setPoint3v(res.addA(n.scale(alt)), c_j_h, c_j, true);
                                    } else {
                                        p.setPoint3v(res, c_j_h, c_j, true);
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    protected _collectGeoObjectCollectionPASS(outArr: EntityCollection[]) {
        let ec = this._geoObjectEntityCollection;

        ec._fadingOpacity = this._fadingOpacity;
        ec.scaleByDistance = this.scaleByDistance;
        ec.pickingScale = this.pickingScale;
        ec.polygonOffsetUnits = this.polygonOffsetUnits;

        outArr.push(ec);

        // if (this.clampToGround || this.relativeToGround) {
        //     let rtg = Number(this.relativeToGround);
        //
        //     var nodes = this._planet._renderedNodes;
        //     var visibleExtent = this._planet.getViewExtent();
        //     var e = ec._entities;
        //     var e_i = e.length;
        //     let res = new Vec3();
        //
        //     while (e_i--) {
        //         var p = e[e_i].polyline;
        //         if (visibleExtent.overlaps(p._extent)) {
        //             // TODO:this works only for mercator area.
        //             // needs to be working on poles.
        //             let coords = p._pathLonLatMerc,
        //                 c_j = coords.length;
        //             while (c_j--) {
        //                 var c_j_h = coords[c_j].length;
        //                 while (c_j_h--) {
        //                     let ll = coords[c_j][c_j_h],
        //                         n_k = nodes.length;
        //                     while (n_k--) {
        //                         var seg = nodes[n_k].segment;
        //                         if (seg._extent.isInside(ll)) {
        //                             let cart = p._path3v[c_j][c_j_h];
        //                             seg.getTerrainPoint(cart, ll, res);
        //                             p.setPoint3v(
        //                                 res.addA(res.normal().scale((rtg && p.altitude) || 0.0)),
        //                                 c_j_h,
        //                                 c_j,
        //                                 true
        //                             );
        //                             break;
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     }
        // }
    }

    public collectVisibleCollections(outArr: EntityCollection[]) {
        let p = this._planet!;

        if (
            (this._fading && this._fadingOpacity > 0.0) ||
            (this.minZoom <= p.maxCurrZoom && this.maxZoom >= p.maxCurrZoom)
        ) {
            // Common collections first
            this._collectStripCollectionPASS(outArr);
            this._collectPolylineCollectionPASS(outArr);
            this._collectGeoObjectCollectionPASS(outArr);

            this._entityCollectionsTreeStrategy!.collectVisibleEntityCollections(outArr);
        }
    }

    /**
     * Start to load tile material.
     * @public
     * @virtual
     * @param {Material} material - Current material.
     */
    public override loadMaterial(material: Material) {
        const seg = material.segment;

        if (this._isBaseLayer) {
            material.texture = seg._isNorth ? seg.planet.solidTextureOne : seg.planet.solidTextureTwo;
        } else {
            material.texture = seg.planet.transparentTexture;
        }

        if (this._planet!.layerLock.isFree()) {
            material.isReady = false;
            material.isLoading = true;
            this._planet!._vectorTileCreator.add(material);
        }
    }

    /**
     * Abort exact material loading.
     * @public
     * @override
     * @param {Material} material - Segment material.
     */
    public override abortMaterialLoading(material: Material) {
        material.isLoading = false;
        material.isReady = false;
    }

    public override applyMaterial(material: Material, isForced: boolean = false): NumberArray4 {
        if (material.isReady) {
            return [0, 0, 1, 1];
        } else {
            !material.isLoading && this.loadMaterial(material);

            const segment = material.segment;
            let pn = segment.node,
                notEmpty = false;

            let mId = this.__id;
            let psegm = material;

            while (pn.parentNode) {
                if (psegm && psegm.isReady) {
                    notEmpty = true;
                    break;
                }
                pn = pn.parentNode;
                psegm = pn.segment.materials[mId];
            }

            if (notEmpty) {
                material.appliedNodeId = pn.nodeId;
                material.texture = psegm.texture;
                material.pickingMask = psegm.pickingMask;
                const dZ2 = 1.0 / (2 << (segment.tileZoom - pn.segment.tileZoom - 1));
                return [
                    segment.tileX * dZ2 - pn.segment.tileX,
                    segment.tileY * dZ2 - pn.segment.tileY,
                    dZ2,
                    dZ2
                ];
            } else {
                if (material.textureExists && material._updateTexture) {
                    material.texture = material._updateTexture;
                    material.pickingMask = material._updatePickingMask;
                } else {
                    material.texture = segment.planet.transparentTexture;
                    material.pickingMask = segment.planet.transparentTexture;
                }
                material.pickingReady = true;
                return [0, 0, 1, 1];
            }
        }
    }

    public override clearMaterial(material: Material) {
        if (material.isReady) {
            const gl = material.segment.handler.gl!;

            material.isReady = false;
            material.pickingReady = false;

            let t = material.texture;
            material.texture = null;
            t && !t.default && gl.deleteTexture(t);

            t = material.pickingMask;
            material.pickingMask = null;
            t && !t.default && gl.deleteTexture(t);

            t = material._updateTexture;
            material._updateTexture = null;
            t && !t.default && gl.deleteTexture(t);

            t = material._updatePickingMask;
            material._updatePickingMask = null;
            t && !t.default && gl.deleteTexture(t);
        }

        this.abortMaterialLoading(material);

        material.isLoading = false;
        material.textureExists = false;
    }

    public update() {
        this._geometryHandler.update();
        this.events.dispatch(this.events.draw, this);
    }
}

const VECTOR_EVENTS: VectorEventsList = [
    // /**
    //  * Triggered when entity has moved.
    //  * @event EventsHandler<VectorEventsList>#draw
    //  */
    // "entitymove",

    /**
     * Triggered when layer begin draw.
     * @event EventsHandler<VectorEventsList>#draw
     */
    "draw",

    /**
     * Triggered when new entity added to the layer.
     * @event EventsHandler<VectorEventsList>#entityadd
     */
    "entityadd",

    /**
     * Triggered when entity removes from the collection.
     * @event EventsHandler<VectorEventsList>#entityremove
     */
    "entityremove"
];

export {Vector};
