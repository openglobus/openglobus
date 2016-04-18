goog.provide('og.quadTree.EntityCollectionQuadNode');
goog.provide('EntityCollectionQuadNodeWGS84');

goog.require('og.Extent');
goog.require('og.quadTree');
goog.require('og.LonLat');
goog.require('og.EntityCollection');
goog.require('og.bv.Box');
goog.require('og.bv.Sphere');
goog.require('og.inheritance');

og.quadTree.EntityCollectionQuadNode = function (layer, partId, parent, id, extent, planet, zoom) {
    this.layer = layer;
    this.parentNode = parent;
    this.childrenNodes = [];
    this.partId = partId;
    this.nodeId = partId + id;
    this.state = null;
    this.extent = extent;
    this.count = 0;
    this.deferredEntities = [];
    this.entityCollection = null;
    this.zoom = zoom;
    this._inTheQueue = false;

    this.bsphere = new og.bv.Sphere();

    planet && this._setExtentBounds();
};

og.quadTree.EntityCollectionQuadNode.prototype.insertEntity = function (entity, isInside, rightNow) {

    var p = this._setLonLat(entity);

    if (isInside || p && this.extent.isInside(p)) {

        this.count++;

        if (this.count > this.layer._maxCountPerCollection) {
            var cn = this.childrenNodes;
            if (cn.length) {
                if (cn[og.quadTree.NW].extent.isInside(p)) {
                    cn[og.quadTree.NW].insertEntity(entity, true, rightNow);
                } else if (cn[og.quadTree.NE].extent.isInside(p)) {
                    cn[og.quadTree.NE].insertEntity(entity, true, rightNow);
                } else if (cn[og.quadTree.SW].extent.isInside(p)) {
                    cn[og.quadTree.SW].insertEntity(entity, true, rightNow);
                } else if (cn[og.quadTree.SE].extent.isInside(p)) {
                    cn[og.quadTree.SE].insertEntity(entity, true, rightNow);
                }
            } else {
                /** Saves node's old entities, clears entityCollection
                    and adds new entity to the node */
                var entities = this.entityCollection.getEntities();
                entities.push(entity);
                this.entityCollection.events.clear();
                this.entityCollection.clear();
                this.entityCollection = null;
                //this._freeCollection();

                /** Build sub tree with new inserted entity */
                this.buildTree(entities, rightNow);
            }
        } else {
            this._addEntitiesToCollection([entity], rightNow);
        }
    }
};

og.quadTree.EntityCollectionQuadNode.prototype._addEntitiesToCollection = function (entities, rightNow) {
    if (entities.length) {
        var l = this.layer,
            p = l._planet,
            ell = p.ellipsoid,
            ext = this.extent;

        var ec = this.entityCollection;

        if (!ec) {
            ec = new og.EntityCollection();
            ec._layer = this.layer;
            ec.addTo(p, true);
            ec._quadNode = this;
            l._bindEventsDefault(ec);
            this.entityCollection = ec;
        }

        if (rightNow) {
            this.entityCollection.addEntities(entities);
        } else {
            this.deferredEntities.push.apply(this.deferredEntities, entities);
        }
    }
};

og.quadTree.EntityCollectionQuadNode.prototype._setExtentBounds = function () {
    if (!this.nodeId) {
        this.bsphere.radius = this.layer._planet.ellipsoid._a;
        this.bsphere.center = new og.math.Vector3();
    } else {
        this.bsphere.setFromExtent(this.layer._planet.ellipsoid, this.extent.inverseMercator());
    }
};

og.quadTree.EntityCollectionQuadNode.prototype._setLonLat = function (entity) {
    if (!entity._lonlat) {
        entity._lonlat = this.layer._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
    }
    if (Math.abs(entity._lonlat.lat) < og.mercator.MAX_LAT) {
        entity._lonlatMerc = entity._lonlat.forwardMercator();
    } else {
        entity._lonlatMerc = null;
    }
    return entity._lonlatMerc;
};

og.quadTree.EntityCollectionQuadNode.prototype.buildTree = function (entities, rightNow) {

    this.count = entities.length;

    if (entities.length > this.layer._maxCountPerCollection ||
        this.zoom < this.layer.minZoom || this.zoom < this.layer._minTreeZoom) {
        var cn = this.childrenNodes;
        if (!cn.length) {
            this.createChildrenNodes();
        }

        var en_nw = [], en_ne = [], en_sw = [], en_se = [];

        var i = entities.length;
        while (i--) {
            var ei = entities[i];
            var p = this._setLonLat(ei);
            if (p) {
                if (cn[og.quadTree.NW].extent.isInside(p)) {
                    ei._nodePtr = cn[og.quadTree.NW];
                    en_nw.push(ei);
                } else if (cn[og.quadTree.NE].extent.isInside(p)) {
                    ei._nodePtr = cn[og.quadTree.NE];
                    en_ne.push(ei);
                } else if (cn[og.quadTree.SW].extent.isInside(p)) {
                    ei._nodePtr = cn[og.quadTree.SW];
                    en_sw.push(ei);
                } else if (cn[og.quadTree.SE].extent.isInside(p)) {
                    ei._nodePtr = cn[og.quadTree.SE];
                    en_se.push(ei);
                }
            }
        }

        en_nw.length && cn[og.quadTree.NW].buildTree(en_nw, rightNow);
        en_ne.length && cn[og.quadTree.NE].buildTree(en_ne, rightNow);
        en_sw.length && cn[og.quadTree.SW].buildTree(en_sw, rightNow);
        en_se.length && cn[og.quadTree.SE].buildTree(en_se, rightNow);

    } else {
        this._addEntitiesToCollection(entities, rightNow);
    }
};


og.quadTree.EntityCollectionQuadNode.prototype.createChildrenNodes = function () {
    var l = this.layer;
    var ext = this.extent;
    var size_x = ext.getWidth() * 0.5;
    var size_y = ext.getHeight() * 0.5;
    var ne = ext.northEast,
        sw = ext.southWest;
    var id = this.nodeId * 4 + 1;
    var c = new og.LonLat(sw.lon + size_x, sw.lat + size_y);
    var nd = this.childrenNodes;
    var p = this.layer._planet;
    var z = this.zoom + 1;

    nd[og.quadTree.NW] = new og.quadTree.EntityCollectionQuadNode(l, og.quadTree.NW, this, id,
        new og.Extent(new og.LonLat(sw.lon, sw.lat + size_y), new og.LonLat(sw.lon + size_x, ne.lat)), p, z);

    nd[og.quadTree.NE] = new og.quadTree.EntityCollectionQuadNode(l, og.quadTree.NE, this, id,
        new og.Extent(c, new og.LonLat(ne.lon, ne.lat)), p, z);

    nd[og.quadTree.SW] = new og.quadTree.EntityCollectionQuadNode(l, og.quadTree.SW, this, id,
        new og.Extent(new og.LonLat(sw.lon, sw.lat), c), p, z);

    nd[og.quadTree.SE] = new og.quadTree.EntityCollectionQuadNode(l, og.quadTree.SE, this, id,
        new og.Extent(new og.LonLat(sw.lon + size_x, sw.lat), new og.LonLat(ne.lon, sw.lat + size_y)), p, z);
};

og.quadTree.EntityCollectionQuadNode.prototype.collectRenderCollections = function (visibleNodes, outArr) {
    var p = this.layer._planet;
    var cam = p.renderer.activeCamera;
    var n = visibleNodes[this.nodeId];

    if (n) {
        var cn = this.childrenNodes;
        if (this.entityCollection) {
            this.renderCollection(outArr, visibleNodes);
        } else if (cn.length) {
            if (n.state === og.quadTree.RENDERING) {
                this.layer._secondPASS.push(this);
            } else {
                cn[og.quadTree.NW].collectRenderCollections(visibleNodes, outArr);
                cn[og.quadTree.NE].collectRenderCollections(visibleNodes, outArr);
                cn[og.quadTree.SW].collectRenderCollections(visibleNodes, outArr);
                cn[og.quadTree.SE].collectRenderCollections(visibleNodes, outArr);
            }
        }
    }
};

og.quadTree.EntityCollectionQuadNode.prototype.collectRenderCollectionsPASS2 = function (visibleNodes, outArr, renderingNodeId) {
    var p = this.layer._planet;
    var cam = p.renderer.activeCamera;

    if (this.count > 0 && cam.eye.distance(this.bsphere.center) - this.bsphere.radius <
        og.quadTree.QuadNode.VISIBLE_DISTANCE * Math.sqrt(cam._lonLat.height) &&
        p.renderer.activeCamera.frustum.containsSphere(this.bsphere) > 0) {
        var cn = this.childrenNodes;
        if (this.entityCollection) {
            this.renderCollection(outArr, visibleNodes, renderingNodeId);
        } else if (cn.length) {
            cn[og.quadTree.NW].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
            cn[og.quadTree.NE].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
            cn[og.quadTree.SW].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
            cn[og.quadTree.SE].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
        }
    }
};

og.quadTree.EntityCollectionQuadNode.prototype.applyCollection = function () {
    this.entityCollection.addEntities(this.deferredEntities);
    this.deferredEntities.length = 0;
    this.deferredEntities = [];
    this._inTheQueue = false;
};

og.quadTree.EntityCollectionQuadNode.prototype.renderCollection = function (outArr, visibleNodes, renderingNodeId) {

    this.layer._renderingNodes[this.nodeId] = true;

    if (this.deferredEntities.length && !this._inTheQueue) {
        if (this.layer.async) {
            this.layer._queueDeferredNode(this);
        } else {
            this.applyCollection();
        }
    }

    var ec = this.entityCollection;
    ec._animatedOpacity = this.layer.opacity;
    ec.scaleByDistance = this.layer.scaleByDistance;
    outArr.push(this.entityCollection);

    if (this.layer.groundAlign) {
        var e = ec._entities;
        var i = e.length;

        if (visibleNodes[this.nodeId] && visibleNodes[this.nodeId].state === og.quadTree.RENDERING) {
            while (i--) {
                var ei = e[i];
                if (!ei._lonlat.height) {
                    this.alignEntityToTheGround(ei, visibleNodes[this.nodeId].planetSegment);
                }
            }
        } else if (renderingNodeId) {
            while (i--) {
                var ei = e[i];
                if (!ei._lonlat.height) {
                    this.alignEntityToTheGround(ei, visibleNodes[renderingNodeId].planetSegment);
                }
            }
        } else {
            var n = this.layer._planet._renderedNodes;
            while (i--) {
                var ei = e[i];
                if (!ei._lonlat.height) {
                    var j = n.length;
                    while (j--) {
                        if (n[j].planetSegment.isEntityInside(ei)) {
                            this.alignEntityToTheGround(ei, n[j].planetSegment);
                            break;
                        }
                    }
                }
            }
        }
    }
};

og.quadTree.EntityCollectionQuadNode.prototype.alignEntityToTheGround = function (entity, planetSegment) {
    planetSegment.getEntityTerrainPoint(entity, entity._cartesian);
    entity._setCartesian3vSilent(entity._cartesian.addA(entity._cartesian.normal().scale(entity._altitude || 0.1)));
};

og.quadTree.EntityCollectionQuadNode.prototype.isVisible = function () {
    if (this.layer._renderingNodes[this.nodeId]) {
        return true;
    }
    return false;
};

/**
 * @class
 */
og.quadTree.EntityCollectionQuadNodeWGS84 = function (layer, partId, parent, id, extent, planet, zoom) {
    og.inheritance.base(this, layer, partId, parent, id, extent, planet, zoom);
    this.isNorth = false;
};

og.inheritance.extend(og.quadTree.EntityCollectionQuadNodeWGS84, og.quadTree.EntityCollectionQuadNode);

og.quadTree.EntityCollectionQuadNodeWGS84.prototype._setExtentBounds = function () {
    if (this.extent.northEast.lat > 0) {
        this.isNorth = true;
    }
    this.bsphere.setFromExtent(this.layer._planet.ellipsoid, this.extent);
};

og.quadTree.EntityCollectionQuadNodeWGS84.prototype._setLonLat = function (entity) {
    if (!entity._lonlat) {
        entity._lonlat = this.layer._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
    }
    return entity._lonlat;
};

og.quadTree.EntityCollectionQuadNodeWGS84.prototype.isVisible = function () {
    if (this.isNorth && this.layer._renderingNodesNorth[this.nodeId]) {
        return true;
    } else if (this.layer._renderingNodesSouth[this.nodeId]) {
        return true;
    }
    return false;
};

og.quadTree.EntityCollectionQuadNodeWGS84.prototype.renderCollection = function (outArr, visibleNodes, renderingNode) {

    if (this.isNorth) {
        this.layer._renderingNodesNorth[this.nodeId] = true;
    } else {
        this.layer._renderingNodesSouth[this.nodeId] = true;
    }

    if (this.deferredEntities.length && !this._inTheQueue) {
        if (this.layer.async) {
            this.layer._queueDeferredNode(this);
        } else {
            this.applyCollection();
        }
    }

    this.entityCollection._animatedOpacity = this.layer.opacity;
    this.entityCollection.scaleByDistance = this.layer.scaleByDistance;
    outArr.push(this.entityCollection);
};
