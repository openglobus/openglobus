/**
 * @module og/quadTree/EntityCollectionNode
 */

'use strict';

import * as inheritance from '../inheritance.js';
import * as mercator from '../mercator.js';
import * as quadTree from './quadTree.js';
import { Extent } from '../Extent.js';
import { LonLat } from '../LonLat.js';
import { Vec3 } from '../math/Vec3.js';
import { EntityCollection } from '../entity/EntityCollection.js';
import { Box } from '../bv/Box.js';
import { Sphere } from '../bv/Sphere.js';

const EntityCollectionNode = function (layer, partId, parent, id, extent, planet, zoom) {
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

    this.bsphere = new Sphere();

    planet && this._setExtentBounds();
};

EntityCollectionNode.prototype.insertEntity = function (entity, isInside, rightNow) {

    var p = this._setLonLat(entity);

    if (isInside || p && this.extent.isInside(p)) {

        this.count++;

        if (this.count > this.layer._nodeCapacity) {
            var cn = this.childrenNodes;
            if (cn.length) {
                if (cn[quadTree.NW].extent.isInside(p)) {
                    cn[quadTree.NW].insertEntity(entity, true, rightNow);
                } else if (cn[quadTree.NE].extent.isInside(p)) {
                    cn[quadTree.NE].insertEntity(entity, true, rightNow);
                } else if (cn[quadTree.SW].extent.isInside(p)) {
                    cn[quadTree.SW].insertEntity(entity, true, rightNow);
                } else if (cn[quadTree.SE].extent.isInside(p)) {
                    cn[quadTree.SE].insertEntity(entity, true, rightNow);
                }
            } else {
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

EntityCollectionNode.prototype._addEntitiesToCollection = function (entities, rightNow) {
    if (entities.length) {
        var l = this.layer,
            p = l._planet,
            ell = p.ellipsoid,
            ext = this.extent;

        var ec = this.entityCollection;

        if (!ec) {
            ec = new EntityCollection({
                'pickingEnabled': l._pickingEnabled
            });
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

EntityCollectionNode.prototype._setExtentBounds = function () {
    if (!this.nodeId) {
        this.bsphere.radius = this.layer._planet.ellipsoid._a;
        this.bsphere.center = new Vec3();
    } else {
        this.bsphere.setFromExtent(this.layer._planet.ellipsoid, this.extent.inverseMercator());
    }
};

EntityCollectionNode.prototype._setLonLat = function (entity) {
    if (!entity._lonlat) {
        entity._lonlat = this.layer._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
    }
    this.layer._fitExtent(entity);
    if (Math.abs(entity._lonlat.lat) < mercator.MAX_LAT) {
        entity._lonlatMerc = entity._lonlat.forwardMercator();
    } else {
        entity._lonlatMerc = null;
    }
    return entity._lonlatMerc;
};

EntityCollectionNode.prototype.buildTree = function (entities, rightNow) {

    this.count = entities.length;

    if (entities.length > this.layer._nodeCapacity ||
        this.zoom < this.layer.minZoom || this.zoom < this.layer._minDepth) {
        var cn = this.childrenNodes;
        if (!cn.length) {
            this.createChildrenNodes();
        }

        var en_nw = [],
            en_ne = [],
            en_sw = [],
            en_se = [];

        var i = entities.length;
        while (i--) {
            var ei = entities[i];
            var p = this._setLonLat(ei);
            if (p) {
                if (cn[quadTree.NW].extent.isInside(p)) {
                    ei._nodePtr = cn[quadTree.NW];
                    en_nw.push(ei);
                } else if (cn[quadTree.NE].extent.isInside(p)) {
                    ei._nodePtr = cn[quadTree.NE];
                    en_ne.push(ei);
                } else if (cn[quadTree.SW].extent.isInside(p)) {
                    ei._nodePtr = cn[quadTree.SW];
                    en_sw.push(ei);
                } else if (cn[quadTree.SE].extent.isInside(p)) {
                    ei._nodePtr = cn[quadTree.SE];
                    en_se.push(ei);
                }
            }
        }

        en_nw.length && cn[quadTree.NW].buildTree(en_nw, rightNow);
        en_ne.length && cn[quadTree.NE].buildTree(en_ne, rightNow);
        en_sw.length && cn[quadTree.SW].buildTree(en_sw, rightNow);
        en_se.length && cn[quadTree.SE].buildTree(en_se, rightNow);

    } else {
        this._addEntitiesToCollection(entities, rightNow);
    }
};


EntityCollectionNode.prototype.createChildrenNodes = function () {
    var l = this.layer;
    var ext = this.extent;
    var size_x = ext.getWidth() * 0.5;
    var size_y = ext.getHeight() * 0.5;
    var ne = ext.northEast,
        sw = ext.southWest;
    var id = this.nodeId * 4 + 1;
    var c = new LonLat(sw.lon + size_x, sw.lat + size_y);
    var nd = this.childrenNodes;
    var p = this.layer._planet;
    var z = this.zoom + 1;

    nd[quadTree.NW] = new EntityCollectionNode(l, quadTree.NW, this, id,
        new Extent(new LonLat(sw.lon, sw.lat + size_y), new LonLat(sw.lon + size_x, ne.lat)), p, z);

    nd[quadTree.NE] = new EntityCollectionNode(l, quadTree.NE, this, id,
        new Extent(c, new LonLat(ne.lon, ne.lat)), p, z);

    nd[quadTree.SW] = new EntityCollectionNode(l, quadTree.SW, this, id,
        new Extent(new LonLat(sw.lon, sw.lat), c), p, z);

    nd[quadTree.SE] = new EntityCollectionNode(l, quadTree.SE, this, id,
        new oExtent(new LonLat(sw.lon + size_x, sw.lat), new LonLat(ne.lon, sw.lat + size_y)), p, z);
};

EntityCollectionNode.prototype.collectRenderCollectionsPASS1 = function (visibleNodes, outArr) {
    var p = this.layer._planet;
    var cam = p.renderer.activeCamera;
    var n = visibleNodes[this.nodeId];

    if (n) {
        var cn = this.childrenNodes;
        if (this.entityCollection) {
            this.renderCollection(outArr, visibleNodes);
        } else if (cn.length) {
            if (n.state === quadTree.RENDERING) {
                this.layer._secondPASS.push(this);
            } else {
                cn[quadTree.NW].collectRenderCollectionsPASS1(visibleNodes, outArr);
                cn[quadTree.NE].collectRenderCollectionsPASS1(visibleNodes, outArr);
                cn[quadTree.SW].collectRenderCollectionsPASS1(visibleNodes, outArr);
                cn[quadTree.SE].collectRenderCollectionsPASS1(visibleNodes, outArr);
            }
        }
    }
};

EntityCollectionNode.prototype.collectRenderCollectionsPASS2 = function (visibleNodes, outArr, renderingNodeId) {
    var p = this.layer._planet;
    var cam = p.renderer.activeCamera;

    var altVis = (cam.eye.distance(this.bsphere.center) - this.bsphere.radius <
        quadTree.Node.VISIBLE_DISTANCE * Math.sqrt(cam._lonLat.height)) || cam._lonLat.height > 10000;

    if (this.count > 0 && altVis &&
        p.renderer.activeCamera.frustum.containsSphere(this.bsphere) > 0) {

        var cn = this.childrenNodes;

        if (this.entityCollection) {
            this.renderCollection(outArr, visibleNodes, renderingNodeId);
        } else if (cn.length) {
            cn[quadTree.NW].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
            cn[quadTree.NE].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
            cn[quadTree.SW].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
            cn[quadTree.SE].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
        }

    }
};

EntityCollectionNode.prototype.applyCollection = function () {
    this.entityCollection.addEntities(this.deferredEntities);
    this.deferredEntities.length = 0;
    this.deferredEntities = [];
    this._inTheQueue = false;
};

EntityCollectionNode.prototype.traverseTree = function (callback) {

    var cn = this.childrenNodes;

    if (this.entityCollection) {
        callback(this);
    } else if (cn.length) {
        cn[quadTree.NW].traverseTree(callback);
        cn[quadTree.NE].traverseTree(callback);
        cn[quadTree.SW].traverseTree(callback);
        cn[quadTree.SE].traverseTree(callback);
    }
};

EntityCollectionNode.prototype.renderCollection = function (outArr, visibleNodes, renderingNodeId) {

    var l = this.layer;

    l._renderingNodes[this.nodeId] = true;

    if (this.deferredEntities.length && !this._inTheQueue) {
        if (l.async) {
            l._queueDeferredNode(this);
        } else {
            this.applyCollection();
        }
    }

    var ec = this.entityCollection;
    ec._animatedOpacity = l.opacity;
    ec.scaleByDistance = l.scaleByDistance;
    outArr.push(this.entityCollection);

    if (l.clampToGround || l.relativeToGround) {
        var e = ec._entities;
        var i = e.length;

        if (visibleNodes[this.nodeId] && visibleNodes[this.nodeId].state === quadTree.RENDERING) {
            while (i--) {
                var ei = e[i];
                this.alignEntityToTheGround(ei, visibleNodes[this.nodeId].planetSegment);
            }
        } else if (renderingNodeId) {
            while (i--) {
                var ei = e[i];
                this.alignEntityToTheGround(ei, visibleNodes[renderingNodeId].planetSegment);
            }
        } else {
            var n = l._planet._renderedNodes;
            while (i--) {
                var ei = e[i];
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
};

EntityCollectionNode.prototype.alignEntityToTheGround = function (entity, planetSegment) {
    planetSegment.getEntityTerrainPoint(entity, entity._cartesian);
    entity._setCartesian3vSilent(entity._cartesian.addA(entity._cartesian.normal().scale(this.layer.relativeToGround && entity._altitude || 0.1)));
};

EntityCollectionNode.prototype.isVisible = function () {
    if (this.layer._renderingNodes[this.nodeId]) {
        return true;
    }
    return false;
};

const EntityCollectionNodeWGS84 = function (layer, partId, parent, id, extent, planet, zoom) {
    inheritance.base(this, layer, partId, parent, id, extent, planet, zoom);
    this.isNorth = false;
};

inheritance.extend(EntityCollectionNodeWGS84, EntityCollectionQuadNode);

EntityCollectionNodeWGS84.prototype._setExtentBounds = function () {
    if (this.extent.northEast.lat > 0) {
        this.isNorth = true;
    }
    this.bsphere.setFromExtent(this.layer._planet.ellipsoid, this.extent);
};

EntityCollectionNodeWGS84.prototype._setLonLat = function (entity) {
    if (!entity._lonlat) {
        entity._lonlat = this.layer._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
    }
    return entity._lonlat;
};

EntityCollectionNodeWGS84.prototype.isVisible = function () {
    if (this.isNorth && this.layer._renderingNodesNorth[this.nodeId]) {
        return true;
    } else if (this.layer._renderingNodesSouth[this.nodeId]) {
        return true;
    }
    return false;
};

EntityCollectionNodeWGS84.prototype.renderCollection = function (outArr, visibleNodes, renderingNode) {

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

export { EntityCollectionNode, EntityCollectionNodeWGS84 };