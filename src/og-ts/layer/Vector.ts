/**
 * @module og/layer/Vector
 */

"use strict";

import * as math from "../math.js";
import * as mercator from "../mercator.js";
import * as quadTree from "../quadTree/quadTree.js";
import { Entity } from "../entity/Entity.js";
import { EntityCollection } from "../entity/EntityCollection.js";
import { Extent } from "../Extent.js";
import {
    EntityCollectionNode,
    EntityCollectionNodeWGS84
} from "../quadTree/EntityCollectionNode.js";
import { GeometryHandler } from "../entity/GeometryHandler.js";
import { Layer } from "./Layer.js";
import { QueueArray } from "../QueueArray.js";
import { Vec3 } from "../math/Vec3.js";

/**
 * Creates entity instance array.
 * @param {Entity[]} entities - Entity array.
 * @returns {Entity[]} - Entity array.
 */
function _entitiesConstructor(entities) {
    var res = [];
    for (var i = 0; i < entities.length; i++) {
        var ei = entities[i];
        if (ei.instanceName === "Entity") {
            res.push(ei);
        } else {
            res.push(new Entity(ei));
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
 * @param {Object} [options] - Layer options:
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
 * @param {Number} [options.polygonOffsetFactor=0.0] - The scale factor for the variable depth offset. The default value is 0.
 * @param {Number} [options.polygonOffsetUnits=-637000.0] - The multiplier by which an implementation-specific value is multiplied with to create a constant depth offset.
 *
 * @fires og.layer.Vector#entitymove
 * @fires og.layer.Vector#draw
 * @fires og.layer.Vector#add
 * @fires og.layer.Vector#remove
 * @fires og.layer.Vector#entityadd
 * @fires og.layer.Vector#entityremove
 * @fires og.layer.Vector#visibilitychange
 */
class Vector extends Layer {
    /**
     * @param {string} name
     * @param {*} [options]
     */
    constructor(name, options = {}) {
        super(name, options);

        this.events.registerNames(EVENT_NAMES);

        this.isVector = true;

        this._hasImageryTiles = false;

        /**
         * First index - near distance to the entity, after that entity becomes full scale.
         * Second index - far distance to the entity, when entity becomes zero scale.
         * Third index - far distance to the entity, when entity becomes invisible.
         * @public
         * @type {Array.<number>} - (exactly 3 entries)
         */
        this.scaleByDistance = options.scaleByDistance || [math.MAX32, math.MAX32, math.MAX32];

        this.pickingScale = options.pickingScale || 1;

        /**
         * Asynchronous data handling before rendering.
         * @public
         * @type {boolean}
         */
        this.async = options.async !== undefined ? options.async : true;

        /**
         * Vector data clamp to ground flag.
         * @public
         * @type {boolean}
         */
        this.clampToGround = options.clampToGround || false;

        /**
         * Sets vector data relative to the ground relief.
         * @public
         * @type {boolean}
         */
        this.relativeToGround = options.relativeToGround || false;

        /**
         * Maximum entities quantity in the tree node.
         * @private
         */
        this._nodeCapacity = options.nodeCapacity || 30;

        /**
         * Stored entities.
         * @private
         */
        this._entities = _entitiesConstructor(options.entities || []);

        this._stripEntityCollection = new EntityCollection({
            pickingEnabled: this.pickingEnabled
        });
        this._bindEventsDefault(this._stripEntityCollection);

        this._polylineEntityCollection = new EntityCollection({
            pickingEnabled: this.pickingEnabled
        });
        this._bindEventsDefault(this._polylineEntityCollection);

        this._geometryHandler = new GeometryHandler(this);

        this._entityCollectionsTree = null;
        this._entityCollectionsTreeNorth = null;
        this._entityCollectionsTreeSouth = null;

        this._renderingNodes = {};
        this._renderingNodesNorth = {};
        this._renderingNodesSouth = {};

        this._counter = 0;
        this._deferredEntitiesPendingQueue = new QueueArray();

        this._pendingsQueue = [];

        // Creates collections tree
        this.setEntities(this._entities);

        /**
         * Specifies the scale factor for gl.polygonOffset function to calculate depth values, 0.0 is default.
         * @public
         * @type {Number}
         */
        this.polygonOffsetFactor =
            options.polygonOffsetFactor != undefined ? options.polygonOffsetFactor : 0.0;

        /**
         * Specifies the scale Units for gl.polygonOffset function to calculate depth values, 0.0 is default.
         * @public
         * @type {Number}
         */
        this.polygonOffsetUnits =
            options.polygonOffsetUnits != undefined ? options.polygonOffsetUnits : -637000.0;

        this.pickingEnabled = this._pickingEnabled;
    }

    get instanceName() {
        return "Vector";
    }

    _bindPicking() {
        this._pickingColor.clear();
    }

    /**
     * Adds layer to the planet.
     * @public
     * @param {Planet} planet - Planet scene object.
     * @returns {layer.Vector} -
     */
    addTo(planet) {
        if (!this._planet) {
            this._assignPlanet(planet);
            this._geometryHandler.assignHandler(planet.renderer.handler);
            this._polylineEntityCollection.addTo(planet, true);
            this._stripEntityCollection.addTo(planet, true);
            this.setEntities(this._entities);
        }
        return this;
    }

    /**
     * Returns stored entities.
     * @public
     * @returns {Array.<Entity>} -
     */
    getEntities() {
        return [].concat(this._entities);
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
     * @param {boolean} [rightNow] - Entity insertion option. False is deafult.
     * @returns {layer.Vector} - Returns this layer.
     */
    add(entity, rightNow) {
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
     * @param {boolean} [rightNow] - Entity insertion option. False is deafult.
     * @returns {layer.Vector} - Returns this layer.
     */
    insert(entity, index, rightNow) {
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

    _proceedEntity(entity, rightNow) {
        let temp = this._hasImageryTiles;

        //
        // ...pointCloud, shape, model etc.
        //

        if (entity.strip) {
            this._stripEntityCollection.add(entity);
        }

        if (entity.polyline || entity.ray) {
            this._polylineEntityCollection.add(entity);
        }

        if (entity.geometry) {
            this._hasImageryTiles = true;
            if (this._planet) {
                this._planet.renderer.assignPickingColor(entity);
                this._geometryHandler.add(entity.geometry);
            }
        }

        if (entity.billboard || entity.label) {
            if (this._planet) {
                if (entity._cartesian.isZero() && !entity._lonlat.isZero()) {
                    entity._setCartesian3vSilent(
                        this._planet.ellipsoid.lonLatToCartesian(entity._lonlat)
                    );
                } else {
                    entity._lonlat = this._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
                }

                // north tree
                if (entity._lonlat.lat > mercator.MAX_LAT) {
                    this._entityCollectionsTreeNorth.__setLonLat__(entity);
                    this._entityCollectionsTreeNorth.insertEntity(entity, rightNow);
                } else if (entity._lonlat.lat < mercator.MIN_LAT) {
                    // south tree
                    this._entityCollectionsTreeSouth.__setLonLat__(entity);
                    this._entityCollectionsTreeSouth.insertEntity(entity, rightNow);
                } else {
                    this._entityCollectionsTree.__setLonLat__(entity);
                    this._entityCollectionsTree.insertEntity(entity, rightNow);
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
     * @param {boolean} [rightNow] - Entity insertion option. False is deafult.
     * @returns {layer.Vector} - Returns this layer.
     */
    addEntities(entities, rightNow) {
        var i = entities.length;
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
     * @returns {layer.Vector} - Returns this layer.
     */
    removeEntity(entity) {
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
                var defEntities = entity._nodePtr.deferredEntities;
                var j = defEntities.length;
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
                    this._planet.renderer.clearPickingColor(entity);
                }
            }

            entity._nodePtr && (entity._nodePtr = null);
            this.events.dispatch(this.events.entityremove, entity);
        }
        return this;
    }

    /**
     * Set layer picking events active.
     * @public
     * @param {boolean} picking - Picking enable flag.
     */
    set pickingEnabled(picking) {
        this._pickingEnabled = picking;

        this._stripEntityCollection.setPickingEnabled(picking);

        this._polylineEntityCollection.setPickingEnabled(picking);

        this._entityCollectionsTree &&
            this._entityCollectionsTree.traverseTree(function (node) {
                node.entityCollection.setPickingEnabled(picking);
            });

        this._entityCollectionsTreeNorth &&
            this._entityCollectionsTreeNorth.traverseTree(function (node) {
                node.entityCollection.setPickingEnabled(picking);
            });

        this._entityCollectionsTreeSouth &&
            this._entityCollectionsTreeSouth.traverseTree(function (node) {
                node.entityCollection.setPickingEnabled(picking);
            });
    }

    /**
     * Refresh collected entities indexes from startIndex entitytes collection array position.
     * @public
     * @param {number} startIndex - Entity array index.
     */
    _reindexEntitiesArray(startIndex) {
        var e = this._entities;
        for (var i = startIndex; i < e.length; i++) {
            e[i]._layerIndex = i;
        }
    }

    /**
     * Removes entities from layer.
     * @public
     * @param {Array.<Entity>} entities - Entity array.
     * @returns {layer.Vector} - Returns this layer.
     */
    removeEntities(entities) {
        var i = entities.length;
        while (i--) {
            this.removeEntity(entities[i]);
        }
        return this;
    }

    /**
     * Sets scale by distance parameters.
     * @public
     * @param {number} near - Full scale entity distance.
     * @param {number} far - Zerol scale entity distance.
     * @param {number} [farInvisible] - Entity visibility distance.
     * @returns {layer.Vector} -
     */
    setScaleByDistance(near, far, farInvisible) {
        this.scaleByDistance[0] = near;
        this.scaleByDistance[1] = far;
        this.scaleByDistance[2] = farInvisible || math.MAX32;
        return this;
    }

    /**
     * TODO: Clear the layer.
     * @public
     */
    clear() {
        let temp = new Array(this._entities.length);

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
     * @param {callback} callback - Entity callback.
     */
    each(callback) {
        var e = this._entities;
        var i = e.length;
        while (i--) {
            callback(e[i], i);
        }
    }

    /**
     * Removes current entities from layer and adds new entities.
     * @public
     * @param {Array.<Entity>} entities - New entity array.
     * @returns {layer.Vector} - Returns layer instance.
     */
    setEntities(entities) {
        let temp = new Array(entities.length);
        for (let i = 0, len = entities.length; i < len; i++) {
            temp[i] = entities[i];
        }

        this.clear();

        //var e = this._extent;

        this._entities = new Array(temp.length);

        var entitiesForTree = [];

        for (var i = 0; i < temp.length; i++) {
            var ei = temp[i];

            ei._layer = this;
            ei._layerIndex = i;

            if (ei.strip) {
                this._stripEntityCollection.add(ei);
            } else if (ei.polyline || ei.ray) {
                this._polylineEntityCollection.add(ei);
            } else if (ei.billboard || ei.label || ei.shape) {
                entitiesForTree.push(ei);
            }

            if (ei.geometry) {
                this._hasImageryTiles = true;
                if (this._planet) {
                    this._planet.renderer.assignPickingColor(ei);
                    this._geometryHandler.add(ei.geometry);
                }
            }

            this._entities[i] = ei;

            //var ext = ei.getExtent();
            //if (ext.northEast.lon > e.northEast.lon) e.northEast.lon = ext.northEast.lon;
            //if (ext.northEast.lat > e.northEast.lat) e.northEast.lat = ext.northEast.lat;
            //if (ext.southWest.lon < e.southWest.lon) e.southWest.lon = ext.southWest.lon;
            //if (ext.southWest.lat < e.southWest.lat) e.southWest.lat = ext.southWest.lat;
        }

        this._createEntityCollectionsTree(entitiesForTree);

        return this;
    }

    _createEntityCollectionsTree(entitiesForTree) {
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
                if (entity._lonlat.lat > mercator.MAX_LAT) {
                    this._entityCollectionsTreeNorth.__setLonLat__(entity);
                } else if (entity._lonlat.lat < mercator.MIN_LAT) {
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

    _bindEventsDefault(entityCollection) {
        var ve = this.events;
        entityCollection.events.on("entitymove", function (e) {
            ve.dispatch(ve.entitymove, e);
        });
        entityCollection.events.on("mousemove", function (e) {
            ve.dispatch(ve.mousemove, e);
        });
        entityCollection.events.on("mouseenter", function (e) {
            ve.dispatch(ve.mouseenter, e);
        });
        entityCollection.events.on("mouseleave", function (e) {
            ve.dispatch(ve.mouseleave, e);
        });
        entityCollection.events.on("lclick", function (e) {
            ve.dispatch(ve.lclick, e);
        });
        entityCollection.events.on("rclick", function (e) {
            ve.dispatch(ve.rclick, e);
        });
        entityCollection.events.on("mclick", function (e) {
            ve.dispatch(ve.mclick, e);
        });
        entityCollection.events.on("ldblclick", function (e) {
            ve.dispatch(ve.ldblclick, e);
        });
        entityCollection.events.on("rdblclick", function (e) {
            ve.dispatch(ve.rdblclick, e);
        });
        entityCollection.events.on("mdblclick", function (e) {
            ve.dispatch(ve.mdblclick, e);
        });
        entityCollection.events.on("lup", function (e) {
            ve.dispatch(ve.lup, e);
        });
        entityCollection.events.on("rup", function (e) {
            ve.dispatch(ve.rup, e);
        });
        entityCollection.events.on("mup", function (e) {
            ve.dispatch(ve.mup, e);
        });
        entityCollection.events.on("ldown", function (e) {
            ve.dispatch(ve.ldown, e);
        });
        entityCollection.events.on("rdown", function (e) {
            ve.dispatch(ve.rdown, e);
        });
        entityCollection.events.on("mdown", function (e) {
            ve.dispatch(ve.mdown, e);
        });
        entityCollection.events.on("lhold", function (e) {
            ve.dispatch(ve.lhold, e);
        });
        entityCollection.events.on("rhold", function (e) {
            ve.dispatch(ve.rhold, e);
        });
        entityCollection.events.on("mhold", function (e) {
            ve.dispatch(ve.mhold, e);
        });
        entityCollection.events.on("mousewheel", function (e) {
            ve.dispatch(ve.mousewheel, e);
        });
        entityCollection.events.on("touchmove", function (e) {
            ve.dispatch(ve.touchmove, e);
        });
        entityCollection.events.on("touchstart", function (e) {
            ve.dispatch(ve.touchstart, e);
        });
        entityCollection.events.on("touchend", function (e) {
            ve.dispatch(ve.touchend, e);
        });
        entityCollection.events.on("doubletouch", function (e) {
            ve.dispatch(ve.doubletouch, e);
        });
        entityCollection.events.on("touchleave", function (e) {
            ve.dispatch(ve.touchleave, e);
        });
        entityCollection.events.on("touchenter", function (e) {
            ve.dispatch(ve.touchenter, e);
        });
    }

    _collectStripCollectionPASS(outArr) {
        var ec = this._stripEntityCollection;

        ec._fadingOpacity = this._fadingOpacity;
        ec.scaleByDistance = this.scaleByDistance;
        ec.pickingScale = this.pickingScale;

        ec.polygonOffsetFactor = this.polygonOffsetFactor;
        ec.polygonOffsetUnits = this.polygonOffsetUnits;

        outArr.push(ec);
        //
        // ...TODO: extent
        //
    }

    _collectPolylineCollectionPASS(outArr) {
        var ec = this._polylineEntityCollection;

        ec._fadingOpacity = this._fadingOpacity;
        ec.scaleByDistance = this.scaleByDistance;
        ec.pickingScale = this.pickingScale;

        ec.polygonOffsetFactor = this.polygonOffsetFactor;
        ec.polygonOffsetUnits = this.polygonOffsetUnits;

        outArr.push(ec);

        if (this.clampToGround || this.relativeToGround) {
            let rtg = Number(this.relativeToGround);

            var nodes = this._planet._renderedNodes;
            var visibleExtent = this._planet.getViewExtent();
            var e = ec._entities;
            var e_i = e.length;
            let res = new Vec3();

            while (e_i--) {
                var p = e[e_i].polyline;
                if (visibleExtent.overlaps(p._extent)) {
                    // TODO:this works only for mercator area.
                    // needs to be working on poles.
                    let coords = p._pathLonLatMerc,
                        c_j = coords.length;
                    while (c_j--) {
                        var c_j_h = coords[c_j].length;
                        while (c_j_h--) {
                            let ll = coords[c_j][c_j_h],
                                n_k = nodes.length;
                            while (n_k--) {
                                var seg = nodes[n_k].segment;
                                if (seg._extent.isInside(ll)) {
                                    let cart = p._path3v[c_j][c_j_h];
                                    seg.getTerrainPoint(cart, ll, res);
                                    p.setPoint3v(
                                        res.addA(res.normal().scale((rtg && p.altitude) || 0.0)),
                                        c_j_h,
                                        c_j,
                                        true
                                    );
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    collectVisibleCollections(outArr) {
        var p = this._planet;

        if (
            (this._fading && this._fadingOpacity > 0.0) ||
            (this.minZoom <= this._planet.maxCurrZoom && this.maxZoom >= p.maxCurrZoom)
        ) {
            this._renderingNodes = {};
            this._renderingNodesNorth = {};
            this._renderingNodesSouth = {};

            // Common collections first
            this._collectStripCollectionPASS(outArr);

            this._collectPolylineCollectionPASS(outArr);

            // Merc nodes
            this._secondPASS = [];
            this._entityCollectionsTree.collectRenderCollectionsPASS1(p._visibleNodes, outArr);
            var i = this._secondPASS.length;
            while (i--) {
                this._secondPASS[i].collectRenderCollectionsPASS2(
                    p._visibleNodes,
                    outArr,
                    this._secondPASS[i].nodeId
                );
            }

            // North nodes
            this._secondPASS = [];
            this._entityCollectionsTreeNorth.collectRenderCollectionsPASS1(
                p._visibleNodesNorth,
                outArr
            );
            i = this._secondPASS.length;
            while (i--) {
                this._secondPASS[i].collectRenderCollectionsPASS2(
                    p._visibleNodesNorth,
                    outArr,
                    this._secondPASS[i].nodeId
                );
            }

            // South nodes
            this._secondPASS = [];
            this._entityCollectionsTreeSouth.collectRenderCollectionsPASS1(
                p._visibleNodesSouth,
                outArr
            );
            i = this._secondPASS.length;
            while (i--) {
                this._secondPASS[i].collectRenderCollectionsPASS2(
                    p._visibleNodesSouth,
                    outArr,
                    this._secondPASS[i].nodeId
                );
            }
        }
    }

    _queueDeferredNode(node) {
        if (this._visibility) {
            node._inTheQueue = true;
            if (this._counter >= 1) {
                this._deferredEntitiesPendingQueue.push(node);
            } else {
                this._execDeferredNode(node);
            }
        }
    }

    _execDeferredNode(node) {
        this._counter++;
        var that = this;
        setTimeout(function () {
            node.applyCollection();
            that._counter--;
            if (that._deferredEntitiesPendingQueue.length && that._counter < 1) {
                while (that._deferredEntitiesPendingQueue.length) {
                    var n = that._deferredEntitiesPendingQueue.pop();
                    n._inTheQueue = false;
                    if (n.isVisible()) {
                        that._execDeferredNode(n);
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
     * @param {Segment.Material} material - Current material.
     */
    loadMaterial(material) {
        var seg = material.segment;

        if (this._isBaseLayer) {
            material.texture = seg._isNorth
                ? seg.planet.solidTextureOne
                : seg.planet.solidTextureTwo;
        } else {
            material.texture = seg.planet.transparentTexture;
        }

        if (this._planet.layerLock.isFree()) {
            material.isReady = false;
            material.isLoading = true;
            this._planet._vectorTileCreator.add(material);
        }
    }

    /**
     * Abort exact material loading.
     * @public
     * @param {Material} material - Segment material.
     */
    abortMaterialLoading(material) {
        material.isLoading = false;
        material.isReady = false;
    }

    applyMaterial(material) {
        if (material.isReady) {
            return [0, 0, 1, 1];
        } else {
            !material.isLoading && this.loadMaterial(material);

            var segment = material.segment;
            var pn = segment.node,
                notEmpty = false;

            var mId = this._id;
            var psegm = material;

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
                var dZ2 = 1.0 / (2 << (segment.tileZoom - pn.segment.tileZoom - 1));
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
                return [0, 0, 1, 1];
            }
        }
    }

    clearMaterial(material) {
        if (material.isReady) {
            var gl = material.segment.handler.gl;

            material.isReady = false;
            material.pickingReady = false;

            var t = material.texture;
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

    update() {
        this._geometryHandler.update();
        this.events.dispatch(this.events.draw, this);
    }
}

const EVENT_NAMES = [
    /**
     * Triggered when entity has moved.
     * @event og.layer.Vector#draw
     */
    "entitymove",

    /**
     * Triggered when layer begin draw.
     * @event og.layer.Vector#draw
     */
    "draw",

    /**
     * Triggered when new entity added to the layer.
     * @event og.layer.Vector#entityadd
     */
    "entityadd",

    /**
     * Triggered when entity removes from the collection.
     * @event og.layer.Vector#entityremove
     */
    "entityremove"
];

export { Vector };
