/**
 * @module og/quadTree/EntityCollectionNode
 */

'use strict';

import { Sphere } from '../bv/Sphere.js';
import { EntityCollection } from '../entity/EntityCollection.js';
import { Extent } from '../Extent.js';
import { LonLat } from '../LonLat.js';
import { Vec3 } from '../math/Vec3.js';
import * as mercator from '../mercator.js';
import * as quadTree from './quadTree.js';

class EntityCollectionNode {

    constructor(layer, partId, parent, id, extent, planet, zoom) {
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
    }

    insertEntity(entity, rightNow) {
        this.buildTree([entity], rightNow);
    }

    _addEntitiesToCollection(entities, rightNow) {
        if (entities.length) {
            var l = this.layer,
                p = l._planet;

            var ec = this.entityCollection;

            if (!ec) {
                ec = new EntityCollection({
                    pickingEnabled: l._pickingEnabled,
                    labelMaxLetters: l._labelMaxLetters
                });
                ec._layer = this.layer;
                ec.addTo(p, true);
                ec._quadNode = this;
                l._bindEventsDefault(ec);
                this.entityCollection = ec;
            }

            if (rightNow || !l.async) {
                this.entityCollection.addEntities(entities);
            } else {
                this.deferredEntities.push.apply(this.deferredEntities, entities);
            }
        }
    }

    _setExtentBounds() {
        if (!this.nodeId) {
            this.bsphere.radius = this.layer._planet.ellipsoid._a;
            this.bsphere.center = new Vec3();
        } else {
            this.bsphere.setFromExtent(this.layer._planet.ellipsoid, this.extent.inverseMercator());
        }
    }

    __setLonLat__(entity) {

        if (entity._lonlat.isZero() && !entity._cartesian.isZero()) {
            entity._lonlat = this.layer._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
        }

        if (Math.abs(entity._lonlat.lat) < mercator.MAX_LAT) {
            entity._lonlatMerc = entity._lonlat.forwardMercator();
        } else {
            entity._lonlatMerc = null;
        }
        return entity._lonlatMerc;
    }

    buildTree(entities, rightNow) {

        this.count += entities.length;

        if (entities.length > this.layer._nodeCapacity) {
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
                if (cn[quadTree.NW].isInside(ei)) {
                    ei._nodePtr = cn[quadTree.NW];
                    en_nw.push(ei);
                } else if (cn[quadTree.NE].isInside(ei)) {
                    ei._nodePtr = cn[quadTree.NE];
                    en_ne.push(ei);
                } else if (cn[quadTree.SW].isInside(ei)) {
                    ei._nodePtr = cn[quadTree.SW];
                    en_sw.push(ei);
                } else if (cn[quadTree.SE].isInside(ei)) {
                    ei._nodePtr = cn[quadTree.SE];
                    en_se.push(ei);
                }
            }

            en_nw.length && cn[quadTree.NW].buildTree(en_nw, rightNow);
            en_ne.length && cn[quadTree.NE].buildTree(en_ne, rightNow);
            en_sw.length && cn[quadTree.SW].buildTree(en_sw, rightNow);
            en_se.length && cn[quadTree.SE].buildTree(en_se, rightNow);

        } else {
            this._addEntitiesToCollection(entities, rightNow);
        }
    }

    isInside(entity) {
        if (entity._lonlatMerc) {
            return this.extent.isInside(entity._lonlatMerc);
        } else {
            return false;
        }
    }

    createChildrenNodes() {
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
            new Extent(new LonLat(sw.lon + size_x, sw.lat), new LonLat(ne.lon, sw.lat + size_y)), p, z);
    }

    collectRenderCollectionsPASS1(visibleNodes, outArr) {
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
    }

    collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId) {
        var p = this.layer._planet;
        var cam = p.renderer.activeCamera;

        var altVis = (cam.eye.distance(this.bsphere.center) - this.bsphere.radius <
            quadTree.VISIBLE_DISTANCE * Math.sqrt(cam._lonLat.height)) || cam._lonLat.height > 10000;

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
    }

    applyCollection() {
        this.entityCollection.addEntities(this.deferredEntities);
        this.deferredEntities.length = 0;
        this.deferredEntities = [];
        this._inTheQueue = false;
    }

    traverseTree(callback) {

        var cn = this.childrenNodes;

        if (this.entityCollection) {
            callback(this);
        } else if (cn.length) {
            cn[quadTree.NW].traverseTree(callback);
            cn[quadTree.NE].traverseTree(callback);
            cn[quadTree.SW].traverseTree(callback);
            cn[quadTree.SE].traverseTree(callback);
        }
    }

    renderCollection(outArr, visibleNodes, renderingNodeId) {

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

        ec._fadingOpacity = l._fadingOpacity;
        ec.scaleByDistance = l.scaleByDistance;
        ec.pickingScale = l.pickingScale;

        ec.polygonOffsetFactor = l.polygonOffsetFactor;
        ec.polygonOffsetUnits = l.polygonOffsetUnits;

        outArr.push(ec);

        if (l.clampToGround || l.relativeToGround) {
            var e = ec._entities;
            var i = e.length;

            if (visibleNodes[this.nodeId] && visibleNodes[this.nodeId].state === quadTree.RENDERING) {
                while (i--) {
                    let ei = e[i];
                    this.alignEntityToTheGround(ei, visibleNodes[this.nodeId].segment);
                }
            } else if (renderingNodeId) {
                while (i--) {
                    let ei = e[i];
                    this.alignEntityToTheGround(ei, visibleNodes[renderingNodeId].segment);
                }
            } else {
                var n = l._planet._renderedNodes;
                while (i--) {
                    let ei = e[i];
                    let j = n.length;
                    while (j--) {
                        if (n[j].segment.isEntityInside(ei)) {
                            this.alignEntityToTheGround(ei, n[j].segment);
                            break;
                        }
                    }
                }
            }
        }
    }

    alignEntityToTheGround(entity, segment) {
        var res = new Vec3();
        segment.getEntityTerrainPoint(entity, res);
        entity._setCartesian3vSilent(res.addA(res.normal().scale((Number(this.layer.relativeToGround) && entity._altitude) || 0.0)));
    }

    isVisible() {
        if (this.layer._renderingNodes[this.nodeId]) {
            return true;
        }
        return false;
    }

}

class EntityCollectionNodeWGS84 extends EntityCollectionNode {

    constructor(layer, partId, parent, id, extent, planet, zoom) {
        super(layer, partId, parent, id, extent, planet, zoom);
        this.isNorth = false;
    }

    createChildrenNodes() {
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

        nd[quadTree.NW] = new EntityCollectionNodeWGS84(l, quadTree.NW, this, id,
            new Extent(new LonLat(sw.lon, sw.lat + size_y), new LonLat(sw.lon + size_x, ne.lat)), p, z);

        nd[quadTree.NE] = new EntityCollectionNodeWGS84(l, quadTree.NE, this, id,
            new Extent(c, new LonLat(ne.lon, ne.lat)), p, z);

        nd[quadTree.SW] = new EntityCollectionNodeWGS84(l, quadTree.SW, this, id,
            new Extent(new LonLat(sw.lon, sw.lat), c), p, z);

        nd[quadTree.SE] = new EntityCollectionNodeWGS84(l, quadTree.SE, this, id,
            new Extent(new LonLat(sw.lon + size_x, sw.lat), new LonLat(ne.lon, sw.lat + size_y)), p, z);
    }

    _setExtentBounds() {
        if (this.extent.northEast.lat > 0) {
            this.isNorth = true;
        }
        this.bsphere.setFromExtent(this.layer._planet.ellipsoid, this.extent);
    }

    __setLonLat__(entity) {
        if (entity._lonlat.isZero()) {
            entity._lonlat = this.layer._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
        }
        return entity._lonlat;
    }

    isVisible() {
        if (this.isNorth && this.layer._renderingNodesNorth[this.nodeId]) {
            return true;
        } else if (this.layer._renderingNodesSouth[this.nodeId]) {
            return true;
        }
        return false;
    }

    isInside(entity) {
        return this.extent.isInside(entity._lonlat);
    }

    /**
     *
     * @param {*} outArr
     * @param {*} visibleNodes
     * @param {*} renderingNode
     */
    renderCollection(outArr, visibleNodes, renderingNode) {

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

        this.entityCollection._fadingOpacity = this.layer._fadingOpacity;
        this.entityCollection.scaleByDistance = this.layer.scaleByDistance;
        this.entityCollection.pickingScale = this.layer.pickingScale;

        outArr.push(this.entityCollection);
    }
}

export { EntityCollectionNode, EntityCollectionNodeWGS84 };
