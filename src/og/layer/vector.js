goog.provide('og.layer.Vector')

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.LonLat');
goog.require('og.quadTree');
goog.require('og.quadTree.EntityCollectionQuadNode');
goog.require('og.math');
goog.require('og.inheritance');
goog.require('og.QueueArray');
goog.require('og.GeometryHandler');

/**
 * Vector layer represents alternative entities store. Used for geospatial data rendering like
 * points, lines, polygons, geometry objects etc.
 * @class
 * @extends {og.layer.Layer}
 * @param {string} [name="noname"] - Layer name.
 * @param {Object} [options] - Layer options:
 * @param {number} [options.minZoom=0] - Minimal visible zoom. 0 is default
 * @param {number} [options.maxZoom=50] - Maximal visible zoom. 50 is default.
 * @param {string} [options.attribution] - Layer attribution.
 * @param {string} [options.zIndex=0] - Layer Z-order index. 0 is default.
 * @param {boolean} [options.visibility=true] - Layer visibility. True is default.
 * @param {boolean} [options.isBaseLayer=false] - Layer base layer. False is default.
 * @param {Array.<og.Entity>} [options.entities] - Entities array.
 * @param {Array.<number,number,number>} [options.scaleByDistance] - Scale by distance parameters.
 *      First index - near distance to the entity, after entity becomes full scale.
 *      Second index - far distance to the entity, when entity becomes zero scale.
 *      Third index - far distance to the entity, when entity becomes invisible.
 * @param {number} [options.nodeCapacity=30] - Maximum entities quantity in the tree node. Rendering optimization parameter. 30 is default.
 * @param {boolean} [options.async=true] - Asynchronous vector data handling before rendering. True for optimization huge data.
 * @param {boolean} [options.clampToGround = false] - Clamp vector data to the ground.
 * @param {boolean} [options.relativeToGround = false] - Place vector data relative to the ground relief.
 *
 * @fires og.layer.Vector#entitymove
 * @fires og.layer.Vector#draw
 * @fires og.layer.Vector#add
 * @fires og.layer.Vector#remove
 * @fires og.layer.Vector#entityadd
 * @fires og.layer.Vector#entityremove
 * @fires og.layer.Vector#visibilitychange
 */
og.layer.Vector = function (name, options) {
    options = options || {};

    og.inheritance.base(this, name, options);

    this.events.registerNames(og.layer.Vector.EVENT_NAMES);

    this.isVector = true;

    /**
     * First index - near distance to the entity, after that entity becomes full scale.
     * Second index - far distance to the entity, when entity becomes zero scale.
     * Third index - far distance to the entity, when entity becomes invisible.
     * @public
     * @type {Array.<number,number,number>}
     */
    this.scaleByDistance = options.scaleByDistance || [og.math.MAX32, og.math.MAX32, og.math.MAX32];

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

    this._pickingEnabled = options.pickingEnabled !== undefined ? options.pickingEnabled : true;

    /**
     * Manimal tree node depth index.
     * @private
     */
    this._minDepth = options.minDepth || 1;

    /**
     * Stored entities.
     * @private
     */
    this._entities = og.layer.Vector._entitiesConstructor(options.entities || []);

    this._polylineEntityCollection = new og.EntityCollection({
        'pickingEnabled': this._pickingEnabled
    });
    this._bindEventsDefault(this._polylineEntityCollection);

    this._geometryHandler = new og.GeometryHandler(this);

    this._entityCollectionsTree = null;
    this._entityCollectionsTreeNorth = null;
    this._entityCollectionsTreeSouth = null;

    this._renderingNodes = {};
    this._renderingNodesNorth = {};
    this._renderingNodesSouth = {};

    this._counter = 0;
    this._deferredEntitiesPendingQueue = new og.QueueArray();

    this._pendingsQueue = [];

    /** Creates collections tree*/
    this.setEntities(this._entities);
};

og.inheritance.extend(og.layer.Vector, og.layer.Layer);

og.layer.Vector.EVENT_NAMES = [
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

/**
 * Vector layer {@link og.layer.Vector} object factory.
 * @static
 * @returns {og.layer.Vector} Returns vector layer.
 */
og.layer.vector = function (name, options) {
    return new og.layer.Vector(name, options);
};

/**
 * Creates entity instance array.
 * @static
 * @param {og.Entities[] || Object[]} entities - Entity array.
 * @returns {og.Entity[]} - Entity object array.
 */
og.layer.Vector._entitiesConstructor = function (entities) {
    var res = [];
    for (var i = 0; i < entities.length; i++) {
        var ei = entities[i];
        if (ei instanceof og.Entity) {
            res.push(ei);
        } else {
            res.push(new og.Entity(ei));
        }
    }
    return res;
};

og.layer.Vector.prototype._bindPicking = function () {
    this._pickingColor.clear();
};

/**
 * Adds layer to the planet.
 * @public
 */
og.layer.Vector.prototype.addTo = function (planet) {
    this._assignPlanet(planet);
    this._geometryHandler.assignHandler(planet.renderer.handler);
    this._polylineEntityCollection.addTo(planet, true);
    this.setEntities(this._entities);
    return this;
};

/**
 * Returns true if a layer has rasterized vector data like polygons.
 * @public
 * @virtual
 * @returns {boolean}
 */
og.layer.Vector.prototype.hasImageryTiles = function () {
    return true;
};

/**
 * Returns stored entities.
 * @public
 * @returns {Array.<og.Entity>}
 */
og.layer.Vector.prototype.getEntities = function () {
    return [].concat(this._entities);
};

/**
 * @private
 */
og.layer.Vector.prototype._fitExtent = function (entity) {
    var ee = entity.getExtent(),
        e = this._extent;
    if (ee.southWest.lon < e.southWest.lon) {
        e.southWest.lon = ee.southWest.lon;
    }
    if (ee.southWest.lat < e.southWest.lat) {
        e.southWest.lat = ee.southWest.lat;
    }
    if (ee.northEast.lon > e.northEast.lon) {
        e.northEast.lon = ee.northEast.lon;
    }
    if (ee.northEast.lat > e.northEast.lat) {
        e.northEast.lat = ee.northEast.lat;
    }
    this.setExtent(this._extent);
};

/**
 * Adds entity to the layer.
 * @public
 * @param {og.Entity} entity - Entity.
 * @param {boolean} [rightNow] - Entity insertion option. False is deafult.
 * @returns {og.layer.Vector} - Returns this layer.
 */
og.layer.Vector.prototype.add = function (entity, rightNow) {
    if (!(entity._layer || entity._entityCollection)) {
        entity._layer = this;
        entity._layerIndex = this._entities.length;
        this._entities.push(entity);


        this._fitExtent(entity);

        //
        //...pointCloud, shape, model etc.
        //

        if (entity.polyline) {
            this._polylineEntityCollection.add(entity);
        }

        if (entity.geometry) {
            if (this._planet) {
                this._planet.renderer.assignPickingColor(entity);
                this._geometryHandler.add(entity.geometry);
            }
        }

        if (entity.billboard || entity.label) {
            if (this._planet) {
                if (!entity._lonlat) {
                    entity._lonlat = this.layer._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
                }

                //poles trees
                if (entity._lonlat.lat > og.mercator.MAX_LAT) {
                    this._entityCollectionsTreeNorth.insertEntity(entity, rightNow);
                } else if (entity._lonlat.lat < og.mercator.MIN_LAT) {
                    this._entityCollectionsTreeSouth.insertEntity(entity, rightNow);
                } else {
                    this._entityCollectionsTree.insertEntity(entity, rightNow);
                }
            }
        }

        this.events.dispatch(this.events.entityadd, entity);
    }
    return this;
};

/**
 * Adds entity array to the layer.
 * @public
 * @param {Array.<og.Entity>} entities - Entities array.
 * @param {boolean} [rightNow] - Entity insertion option. False is deafult.
 * @returns {og.layer.Vector} - Returns this layer.
 */
og.layer.Vector.prototype.addEntities = function (entities, rightNow) {
    var i = entities.length;
    while (i--) {
        this.add(entities[i], rightNow);
    }
    return this;
};

/**
 * Remove entity from layer.
 * TODO: memory leaks.
 * @public
 * @param {og.Entity} entity - Entity to remove.
 * @returns {og.layer.Vector} - Returns this layer.
 */
og.layer.Vector.prototype.removeEntity = function (entity) {
    if (entity._layer && this.isEqual(entity._layer)) {
        this._entities.splice(entity._layerIndex, 1);
        this._reindexEntitiesArray(entity._layerIndex);
        entity._layer = null;
        entity._layerIndex = -1;

        if (entity._entityCollection) {
            entity._entityCollection._removeEntitySilent(entity);
            var node = entity._nodePtr;
            while (node) {
                node.count--;
                node = node.parentNode;
            }
            if (entity._nodePtr && entity._nodePtr.count === 0 &&
                entity._nodePtr.deferredEntities.length === 0) {
                entity._nodePtr.entityCollection = null;
                //
                //...
                //
            }
        } else if (entity._nodePtr &&
            entity._nodePtr.deferredEntities.length) {
            var defEntities = entity._nodePtr.deferredEntities;
            var j = defEntities.length;
            while (j--) {
                if (defEntities[j].id === entity.id) {
                    defEntities.splice(j, 1);
                    var node = entity._nodePtr;
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
};

/**
 * Set layer picking events active.
 * @public
 * @param {number} enable
 */
og.layer.Vector.prototype.setPickingEnabled = function (enable) {
    this._pickingEnabled = enable;

    this._polylineEntityCollection.setPickingEnabled(enable);

    this._entityCollectionsTree.traverseTree(function (ec) {
        ec.setPickingEnabled(enable);
    });
    this._entityCollectionsTreeNorth.traverseTree(function (ec) {
        ec.setPickingEnabled(enable);
    });
    this._entityCollectionsTreeSouth.traverseTree(function (ec) {
        ec.setPickingEnabled(enable);
    });
};

/**
 * Refresh collected entities indexes from startIndex entitytes collection array position.
 * @public
 * @param {number} startIndex - Entity array index.
 */
og.layer.Vector.prototype._reindexEntitiesArray = function (startIndex) {
    var e = this._entities;
    for (var i = startIndex; i < e.length; i++) {
        e[i]._layerIndex = i;
    }
};

/**
 * Removes entities from layer.
 * @public
 * @param {Array.<og.Entity>} entities - Entity array.
 * @returns {og.layer.Vector} - Returns this layer.
 */
og.layer.Vector.prototype.removeEntities = function (entities) {
    var i = entities.length;
    while (i--) {
        this.removeEntity(entities[i]);
    }
    return this;
};

/**
 * Sets scale by distance parameters.
 * @public
 * @param {number} near - Full scale entity distance.
 * @param {number} far - Zerol scale entity distance.
 * @param {number} [farInvisible] - Entity visibility distance.
 */
og.layer.Vector.prototype.setScaleByDistance = function (near, far, farInisible) {
    this.scaleByDistance[0] = near;
    this.scaleByDistance[1] = far;
    this.scaleByDistance[2] = farInisible || og.math.MAX32;
    return this;
};

/**
 * TODO: Clear the layer.
 * @public
 */
og.layer.Vector.prototype.clear = function () {
    //TODO
};

/**
 * Safety entities loop.
 * @public
 * @param {callback} callback - Entity callback.
 */
og.layer.Vector.prototype.each = function (callback) {
    var e = this._entities;
    var i = e.length;
    while (i--) {
        callback(e[i]);
    }
};

/**
 * Removes current entities from layer and adds new entities.
 * @public
 * @param {Array.<og.Entity>} entities - New entity array.
 */
og.layer.Vector.prototype.setEntities = function (entities) {

    this.clear();

    var e = this._extent = new og.Extent(new og.LonLat(180, 90), new og.LonLat(-180, -90));

    this._entities = new Array(entities.length);

    var entitiesForTree = [];

    for (var i = 0; i < entities.length; i++) {
        var ei = entities[i];

        ei._layer = this;
        ei._layerIndex = i;

        if (ei.polyline) {
            this._polylineEntityCollection.add(ei);
        } else if (ei.billboard || ei.label || ei.shape) {
            entitiesForTree.push(ei);
        }

        if (ei.geometry) {
            if (this._planet) {
                this._planet.renderer.assignPickingColor(ei);
                this._geometryHandler.add(ei.geometry);
            }
        }

        this._entities[i] = ei;

        var ext = ei.getExtent();
        if (ext.northEast.lon > e.northEast.lon) e.northEast.lon = ext.northEast.lon;
        if (ext.northEast.lat > e.northEast.lat) e.northEast.lat = ext.northEast.lat;
        if (ext.southWest.lon < e.southWest.lon) e.southWest.lon = ext.southWest.lon;
        if (ext.southWest.lat < e.southWest.lat) e.southWest.lat = ext.southWest.lat;
    }

    this._createEntityCollectionsTree(entitiesForTree);

    return this;
};

og.layer.Vector.prototype._createEntityCollectionsTree = function (entitiesForTree) {
    if (this._planet) {
        this._entityCollectionsTree = new og.quadTree.EntityCollectionQuadNode(this, og.quadTree.NW, null, 0,
            og.Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34]), this._planet, 0);
        this._entityCollectionsTreeNorth = new og.quadTree.EntityCollectionQuadNodeWGS84(this, og.quadTree.NW, null, 0,
            og.Extent.createFromArray([-180, og.mercator.MAX_LAT, 180, 90]), this._planet, 0);
        this._entityCollectionsTreeSouth = new og.quadTree.EntityCollectionQuadNodeWGS84(this, og.quadTree.NW, null, 0,
            og.Extent.createFromArray([-180, -90, 180, og.mercator.MIN_LAT]), this._planet, 0);

        this._entityCollectionsTree.buildTree(entitiesForTree);
        this._entityCollectionsTreeNorth.buildTree(entitiesForTree);
        this._entityCollectionsTreeSouth.buildTree(entitiesForTree);
    }
};

og.layer.Vector.prototype._bindEventsDefault = function (entityCollection) {
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
};

og.layer.Vector.prototype._collectPolylineCollectionPASS = function (outArr) {
    outArr.push(this._polylineEntityCollection);
    if (this.clampToGround || this.relativeToGround) {
        var rtg = this.relativeToGround;

        var nodes = this._planet._renderedNodes;
        var visibleExtent = this._planet.getViewExtent();
        var e = this._polylineEntityCollection._entities;
        var e_i = e.length;

        while (e_i--) {
            var p = e[e_i].polyline;
            if (visibleExtent.overlaps(p._extent)) {
                var coords = p._pathLonLatMerc;
                var c_j = coords.length;
                while (c_j--) {
                    var c_j_h = coords[c_j].length;
                    while (c_j_h--) {
                        var ll = coords[c_j][c_j_h];
                        var n_k = nodes.length;
                        while (n_k--) {
                            var seg = nodes[n_k].planetSegment;
                            if (seg._extent.isInside(ll)) {
                                var cart = p._path3v[c_j][c_j_h];
                                var res = new og.math.Vector3();
                                seg.getTerrainPoint(res, cart, ll);
                                p.setPoint3v(res.addA(res.normal().scale(rtg && p.altitude + 1.0)), c_j_h, c_j, true);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
};

og.layer.Vector.prototype.collectVisibleCollections = function (outArr) {
    var p = this._planet;

    if (this.minZoom <= this._planet.maxCurrZoom && this.maxZoom >= p.maxCurrZoom) {

        this._renderingNodes = {};
        this._renderingNodesNorth = {};
        this._renderingNodesSouth = {};

        //Common collection first
        this._collectPolylineCollectionPASS(outArr);

        //Merc nodes
        this._secondPASS = [];
        this._entityCollectionsTree.collectRenderCollectionsPASS1(p._visibleNodes, outArr);
        var i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(p._visibleNodes, outArr, this._secondPASS[i].nodeId);
        }

        //North nodes
        this._secondPASS = [];
        this._entityCollectionsTreeNorth.collectRenderCollectionsPASS1(p._visibleNodesNorth, outArr);
        i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(p._visibleNodesNorth, outArr, this._secondPASS[i].nodeId);
        }

        //South nodes
        this._secondPASS = [];
        this._entityCollectionsTreeSouth.collectRenderCollectionsPASS1(p._visibleNodesSouth, outArr);
        i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(p._visibleNodesSouth, outArr, this._secondPASS[i].nodeId);
        }
    }
};

og.layer.Vector.prototype._queueDeferredNode = function (node) {
    if (this._visibility) {
        node._inTheQueue = true;
        if (this._counter >= 1) {
            this._deferredEntitiesPendingQueue.push(node);
        } else {
            this._execDeferredNode(node);
        }
    }
};

og.layer.Vector.prototype._execDeferredNode = function (node) {
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
                    that._execDeferredNode(node);
                    return;
                }
            }
        }
    }, 0);
};

/**
 * Start to load tile material.
 * @public
 * @virtual
 * @param {og.planetSegment.Material} material - Current material.
 */
og.layer.Vector.prototype.loadMaterial = function (material) {

    var seg = material.segment;

    if (this._isBaseLayer) {
        material.texture = seg._isNorth ? seg.planet.solidTextureOne : seg.planet.solidTextureTwo;
    } else {
        material.texture = seg.planet.transparentTexture;
    }

    if (this._planet.layerLock.isFree()) {
        material.isReady = false;
        material.isLoading = true;
        this._planet._vectorTileCreator.add(material);
    }
};

/**
 * Abort exact material loading.
 * @public
 * @param {og.planetSegment.Material} material - Segment material.
 */
og.layer.Vector.prototype.abortMaterialLoading = function (material) {
    material.isLoading = false;
    material.isReady = false;
};

og.layer.Vector.prototype.applyMaterial = function (material) {
    if (material.isReady) {
        return [0, 0, 1, 1];
    } else {

        !material.isLoading && this.loadMaterial(material);

        var segment = material.segment;
        var pn = segment.node,
            notEmpty = false;

        var mId = this._id;
        var psegm = material;
        var i = 0;
        while (pn.parentNode && i < 2) {
            if (psegm && psegm.isReady) {
                notEmpty = true;
                break;
            }
            pn = pn.parentNode;
            psegm = pn.planetSegment.materials[mId];
        }

        if (notEmpty) {
            material.appliedNodeId = pn.nodeId;
            material.texture = psegm.texture;
            material.pickingMask = psegm.pickingMask;
            var dZ2 = 1.0 / (2 << (segment.tileZoom - pn.planetSegment.tileZoom - 1));
            return [
                segment.tileX * dZ2 - pn.planetSegment.tileX,
                segment.tileY * dZ2 - pn.planetSegment.tileY,
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
};

og.layer.Vector.prototype.clearMaterial = function (material) {
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
};


og.layer.Vector.prototype.update = function () {
    this._geometryHandler.update();
    this.collectVisibleCollections(this._planet._frustumEntityCollections);
    this.events.dispatch(this.events.draw, this);
};