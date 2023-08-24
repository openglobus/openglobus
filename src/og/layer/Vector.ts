import * as math from "../math";
import * as mercator from "../mercator";
import * as quadTree from "../quadTree/quadTree.js";
import {Entity, IEntityParams} from "../entity/Entity";
import {EntityCollection} from "../entity/EntityCollection";
import {
    EntityCollectionNode,
    EntityCollectionNodeWGS84
} from "../quadTree/EntityCollectionNode.js";
import {EventsHandler} from "../Events";
import {Extent} from "../Extent";
import {GeometryHandler} from "../entity/GeometryHandler";
import {ILayerParams, Layer, LayerEventsList} from "./Layer";
import {NumberArray3, Vec3} from "../math/Vec3";
import {Planet} from "../scene/Planet";
import {QueueArray} from "../QueueArray";
import {Material} from "./Material";
import {NumberArray4} from "../math/Vec4";

interface IVectorParams extends ILayerParams {
    entities?: Entity[] | IEntityParams[];
    polygonOffsetUnits?: number;
    nodeCapacity?: number;
    relativeToGround?: boolean;
    clampToGround?: boolean;
    async?: boolean;
    pickingScale?: number;
    scaleByDistance?: NumberArray3;
}

type VectorEventsList = [
    "entitymove",
    "draw",
    "entityadd",
    "entityremove"
]

type VectorEventsType = EventsHandler<VectorEventsList> & EventsHandler<LayerEventsList>;

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
 * @param {number} [options.nodeCapacity=30] - Maximum entities quantity in the tree node. Rendering optimization parameter. 30 is default.
 * @param {boolean} [options.async=true] - Asynchronous vector data handling before rendering. True for optimization huge data.
 * @param {boolean} [options.clampToGround = false] - Clamp vector data to the ground.
 * @param {boolean} [options.relativeToGround = false] - Place vector data relative to the ground relief.
 * @param {Number} [options.polygonOffsetUnits=0.0] - The multiplier by which an implementation-specific value is multiplied with to create a constant depth offset.
 *
 * @fires EventsHandler<VectorEventsList>#entitymove
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

    public pickingScale: number;

    /**
     * Asynchronous data handling before rendering.
     * @public
     * @type {boolean}
     */
    public async: boolean;

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

    /**
     * Maximum entities quantity in the tree node.
     * @protected
     */
    protected _nodeCapacity: number;
    protected _stripEntityCollection: EntityCollection;
    protected _polylineEntityCollection: EntityCollection;
    protected _geoObjectEntityCollection: EntityCollection;
    public _geometryHandler: GeometryHandler;

    protected _entityCollectionsTree: EntityCollectionNode | null;
    protected _entityCollectionsTreeNorth: EntityCollectionNodeWGS84 | null;
    protected _entityCollectionsTreeSouth: EntityCollectionNodeWGS84 | null;

    protected _renderingNodes: Record<number, any>;
    protected _renderingNodesNorth: Record<number, any>;
    protected _renderingNodesSouth: Record<number, any>;

    protected _counter: number;
    protected _deferredEntitiesPendingQueue: QueueArray<EntityCollectionNode>;

    protected _pendingsQueue: Entity[];

    /**
     * Specifies the scale Units for gl.polygonOffset function to calculate depth values, 0.0 is default.
     * @public
     * @type {Number}
     */
    public polygonOffsetUnits: number;

    protected _secondPASS: EntityCollectionNode[];

    constructor(name: string | null, options: IVectorParams = {}) {
        super(name, options);

        this.events.registerNames(VECTOR_EVENTS);
        //this.events = (super.events as VectorEventsType).registerNames(VECTOR_EVENTS);

        this.isVector = true;

        this._hasImageryTiles = false;

        this.scaleByDistance = options.scaleByDistance || [math.MAX32, math.MAX32, math.MAX32];

        this.pickingScale = options.pickingScale || 1;

        this.async = options.async !== undefined ? options.async : true;

        this.clampToGround = options.clampToGround || false;

        this.relativeToGround = options.relativeToGround || false;

        this._nodeCapacity = options.nodeCapacity || 30;

        this._entities = _entitiesConstructor(options.entities || []);

        this._stripEntityCollection = new EntityCollection({
            pickingEnabled: this.pickingEnabled
        });
        this._bindEventsDefault(this._stripEntityCollection);

        this._polylineEntityCollection = new EntityCollection({
            pickingEnabled: this.pickingEnabled
        });
        this._bindEventsDefault(this._polylineEntityCollection);

        this._geoObjectEntityCollection = new EntityCollection({
            pickingEnabled: this.pickingEnabled
        });
        this._bindEventsDefault(this._geoObjectEntityCollection);

        this._geometryHandler = new GeometryHandler(this);

        this._entityCollectionsTree = null;
        this._entityCollectionsTreeNorth = null;
        this._entityCollectionsTreeSouth = null;

        this._renderingNodes = {};
        this._renderingNodesNorth = {};
        this._renderingNodesSouth = {};

        this._counter = 0;
        this._deferredEntitiesPendingQueue = new QueueArray<EntityCollectionNode>();

        this._pendingsQueue = [];

        this.setEntities(this._entities);

        this.polygonOffsetUnits = options.polygonOffsetUnits != undefined ? options.polygonOffsetUnits : 0.0;

        this.pickingEnabled = this._pickingEnabled;

        this._secondPASS = [];
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

    //_fitExtent(entity) {
    //    var ee = entity.getExtent(),
    //        e = this._extent,
    //        maxLon = -180, maxLat = -90,
    //        minLon = 180, minLat = 90;

    //    if (this._entities.length !== 0) {
    //        maxLon = e.southWest.lon;
    //        minLon = e.northEast.lon;
    //        maxLat = e.northEast.lat;
    //        minLat = e.southWest.lat;
    //    }

    //    if (ee.southWest.lon < minLon) {
    //        e.southWest.lon = ee.southWest.lon;
    //    }
    //    if (ee.southWest.lat < minLat) {
    //        e.southWest.lat = ee.southWest.lat;
    //    }
    //    if (ee.northEast.lon > maxLon) {
    //        e.northEast.lon = ee.northEast.lon;
    //    }
    //    if (ee.northEast.lat > maxLat) {
    //        e.northEast.lat = ee.northEast.lat;
    //    }
    //    this.setExtent(this._extent);
    //}

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

        if (entity.strip) {
            this._stripEntityCollection.add(entity);
        }

        if (entity.polyline || entity.ray) {
            this._polylineEntityCollection.add(entity);
        }

        if (entity.geoObject) {
            this._geoObjectEntityCollection.add(entity);
        }

        if (entity.geometry) {
            this._hasImageryTiles = true;
            if (this._planet) {
                this._planet.renderer!.assignPickingColor(entity);
                this._geometryHandler.add(entity.geometry);
            }
        }

        if (entity.billboard || entity.label || entity.geoObject) {
            if (this._planet) {
                if (entity._cartesian.isZero() && !entity._lonLat.isZero()) {
                    entity._setCartesian3vSilent(
                        this._planet.ellipsoid.lonLatToCartesian(entity._lonLat)
                    );
                } else {
                    entity._lonLat = this._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
                }

                // north tree
                if (entity._lonLat.lat > mercator.MAX_LAT) {
                    this._entityCollectionsTreeNorth!.__setLonLat__(entity);
                    this._entityCollectionsTreeNorth!.insertEntity(entity, rightNow);
                } else if (entity._lonLat.lat < mercator.MIN_LAT) {
                    this._entityCollectionsTreeSouth!.__setLonLat__(entity);
                    this._entityCollectionsTreeSouth!.insertEntity(entity, rightNow);
                } else {
                    this._entityCollectionsTree!.__setLonLat__(entity);
                    this._entityCollectionsTree!.insertEntity(entity, rightNow);
                }
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
                    node = node.parentNode;
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
                            node = node.parentNode;
                        }
                        break;
                    }
                }
            }

            if (entity.geometry) {
                if (this._planet) {
                    this._geometryHandler.remove(entity.geometry);
                    this._planet.renderer!.clearPickingColor(entity);
                }
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

        this._entityCollectionsTree && this._entityCollectionsTree.traverseTree((node: EntityCollectionNode) => {
            node.entityCollection.setPickingEnabled(picking);
        });

        this._entityCollectionsTreeNorth && this._entityCollectionsTreeNorth.traverseTree((node: EntityCollectionNodeWGS84) => {
            node.entityCollection.setPickingEnabled(picking);
        });

        this._entityCollectionsTreeSouth && this._entityCollectionsTreeSouth.traverseTree((node: EntityCollectionNodeWGS84) => {
            node.entityCollection.setPickingEnabled(picking);
        });
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

    // public setScaleByDistance(near, far, farInvisible) {
    //     this.scaleByDistance[0] = near;
    //     this.scaleByDistance[1] = far;
    //     this.scaleByDistance[2] = farInvisible || math.MAX32;
    // }

    /**
     * TODO: Clear the layer.
     * @public
     */
    public override clear() {
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

        this._entityCollectionsTree = null;
        this._entityCollectionsTreeNorth = null;
        this._entityCollectionsTreeSouth = null;
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

            if (ei.strip) {
                this._stripEntityCollection.add(ei);
            } else if (ei.polyline || ei.ray) {
                this._polylineEntityCollection.add(ei);
            } else if (ei.geoObject) {
                this._geoObjectEntityCollection.add(ei);
            } else if (ei.billboard || ei.label) {
                entitiesForTree.push(ei);
            }

            if (ei.geometry) {
                this._hasImageryTiles = true;
                if (this._planet) {
                    this._planet.renderer!.assignPickingColor(ei);
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

            this._entityCollectionsTree = new EntityCollectionNode(
                this,
                quadTree.NW,
                null,
                0,
                Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34]),
                this._planet,
                0
            );

            this._entityCollectionsTreeNorth = new EntityCollectionNodeWGS84(
                this,
                quadTree.NW,
                null,
                0,
                Extent.createFromArray([-180, mercator.MAX_LAT, 180, 90]),
                this._planet,
                0
            );

            this._entityCollectionsTreeSouth = new EntityCollectionNodeWGS84(
                this,
                quadTree.NW,
                null,
                0,
                Extent.createFromArray([-180, -90, 180, mercator.MIN_LAT]),
                this._planet,
                0
            );

            for (let i = 0, len = entitiesForTree.length; i < len; i++) {
                let entity = entitiesForTree[i];
                // north tree
                if (entity._lonLat.lat > mercator.MAX_LAT) {
                    this._entityCollectionsTreeNorth.__setLonLat__(entity);
                } else if (entity._lonLat.lat < mercator.MIN_LAT) {
                    // south tree
                    this._entityCollectionsTreeSouth.__setLonLat__(entity);
                } else {
                    this._entityCollectionsTree.__setLonLat__(entity);
                }
            }

            this._entityCollectionsTree.buildTree(entitiesForTree);
            this._entityCollectionsTreeNorth.buildTree(entitiesForTree);
            this._entityCollectionsTreeSouth.buildTree(entitiesForTree);
        }
    }

    protected _bindEventsDefault(entityCollection: EntityCollection) {

        let ve = this.events;

        //
        // @todo: replace with arrow functions and '...e'
        //
        entityCollection.events.on("entitymove", function (e: any) {
            ve.dispatch(ve.entitymove, e);
        });
        entityCollection.events.on("mousemove", function (e: any) {
            ve.dispatch(ve.mousemove, e);
        });
        entityCollection.events.on("mouseenter", function (e: any) {
            ve.dispatch(ve.mouseenter, e);
        });
        entityCollection.events.on("mouseleave", function (e: any) {
            ve.dispatch(ve.mouseleave, e);
        });
        entityCollection.events.on("lclick", function (e: any) {
            ve.dispatch(ve.lclick, e);
        });
        entityCollection.events.on("rclick", function (e: any) {
            ve.dispatch(ve.rclick, e);
        });
        entityCollection.events.on("mclick", function (e: any) {
            ve.dispatch(ve.mclick, e);
        });
        entityCollection.events.on("ldblclick", function (e: any) {
            ve.dispatch(ve.ldblclick, e);
        });
        entityCollection.events.on("rdblclick", function (e: any) {
            ve.dispatch(ve.rdblclick, e);
        });
        entityCollection.events.on("mdblclick", function (e: any) {
            ve.dispatch(ve.mdblclick, e);
        });
        entityCollection.events.on("lup", function (e: any) {
            ve.dispatch(ve.lup, e);
        });
        entityCollection.events.on("rup", function (e: any) {
            ve.dispatch(ve.rup, e);
        });
        entityCollection.events.on("mup", function (e: any) {
            ve.dispatch(ve.mup, e);
        });
        entityCollection.events.on("ldown", function (e: any) {
            ve.dispatch(ve.ldown, e);
        });
        entityCollection.events.on("rdown", function (e: any) {
            ve.dispatch(ve.rdown, e);
        });
        entityCollection.events.on("mdown", function (e: any) {
            ve.dispatch(ve.mdown, e);
        });
        entityCollection.events.on("lhold", function (e: any) {
            ve.dispatch(ve.lhold, e);
        });
        entityCollection.events.on("rhold", function (e: any) {
            ve.dispatch(ve.rhold, e);
        });
        entityCollection.events.on("mhold", function (e: any) {
            ve.dispatch(ve.mhold, e);
        });
        entityCollection.events.on("mousewheel", function (e: any) {
            ve.dispatch(ve.mousewheel, e);
        });
        entityCollection.events.on("touchmove", function (e: any) {
            ve.dispatch(ve.touchmove, e);
        });
        entityCollection.events.on("touchstart", function (e: any) {
            ve.dispatch(ve.touchstart, e);
        });
        entityCollection.events.on("touchend", function (e: any) {
            ve.dispatch(ve.touchend, e);
        });
        entityCollection.events.on("doubletouch", function (e: any) {
            ve.dispatch(ve.doubletouch, e);
        });
        entityCollection.events.on("touchleave", function (e: any) {
            ve.dispatch(ve.touchleave, e);
        });
        entityCollection.events.on("touchenter", function (e: any) {
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
            this._renderingNodes = {};
            this._renderingNodesNorth = {};
            this._renderingNodesSouth = {};

            // Common collections first
            this._collectStripCollectionPASS(outArr);
            this._collectPolylineCollectionPASS(outArr);
            this._collectGeoObjectCollectionPASS(outArr);

            // Merc nodes
            this._secondPASS = [];
            this._entityCollectionsTree && this._entityCollectionsTree.collectRenderCollectionsPASS1(p._visibleNodes, outArr);
            let i = this._secondPASS.length;
            while (i--) {
                this._secondPASS[i].collectRenderCollectionsPASS2(p._visibleNodes, outArr, this._secondPASS[i].nodeId);
            }

            // North nodes
            this._secondPASS = [];
            this._entityCollectionsTreeNorth && this._entityCollectionsTreeNorth.collectRenderCollectionsPASS1(p._visibleNodesNorth, outArr);
            i = this._secondPASS.length;
            while (i--) {
                this._secondPASS[i].collectRenderCollectionsPASS2(p._visibleNodesNorth, outArr, this._secondPASS[i].nodeId);
            }

            // South nodes
            this._secondPASS = [];
            this._entityCollectionsTreeSouth && this._entityCollectionsTreeSouth.collectRenderCollectionsPASS1(p._visibleNodesSouth, outArr);
            i = this._secondPASS.length;
            while (i--) {
                this._secondPASS[i].collectRenderCollectionsPASS2(p._visibleNodesSouth, outArr, this._secondPASS[i].nodeId);
            }
        }
    }

    protected _queueDeferredNode(node: EntityCollectionNode) {
        if (this._visibility) {
            node._inTheQueue = true;
            if (this._counter >= 1) {
                this._deferredEntitiesPendingQueue.push(node);
            } else {
                this._execDeferredNode(node);
            }
        }
    }

    protected _execDeferredNode(node: EntityCollectionNode) {
        this._counter++;
        setTimeout(() => {
            node.applyCollection();
            this._counter--;
            if (this._deferredEntitiesPendingQueue.length && this._counter < 1) {
                while (this._deferredEntitiesPendingQueue.length) {
                    let n = this._deferredEntitiesPendingQueue.pop()!;
                    n._inTheQueue = false;
                    if (n.isVisible()) {
                        this._execDeferredNode(n);
                        return;
                    }
                }
            }
        }, 0);
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
    /**
     * Triggered when entity has moved.
     * @event EventsHandler<VectorEventsList>#draw
     */
    "entitymove",

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
