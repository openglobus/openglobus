import * as mercator from '../mercator';
import {NW, NE, SW, SE, RENDERING, VISIBLE_DISTANCE} from './quadTree';
import {EntityCollection} from '../entity/EntityCollection';
import {Extent} from '../Extent';
import {LonLat} from '../LonLat';
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {Sphere} from '../bv/Sphere';
import {Segment} from "../segment/Segment";
import {Vec3} from '../math/Vec3';
import {Vector} from "../layer/Vector";
import {Entity} from "../entity/Entity";
import {EarthEntityCollectionsTreeStrategy, EntityCollectionsTreeStrategy} from "./EntityCollectionsTreeStrategy";

type NodesDict = Record<number, Node>;

/**
 * @todo: remove planet parameter. It's already available in the layer.
 */
class EntityCollectionNode {

    public layer: Vector;
    public strategy: EntityCollectionsTreeStrategy
    public parentNode: EntityCollectionNode | null;
    public childrenNodes: EntityCollectionNode[];
    public partId: number;
    public nodeId: number;
    public state: number | null;
    public extent: Extent;
    public count: number;
    public deferredEntities: Entity[];
    public entityCollection: EntityCollection | null;
    public zoom: number;
    public bsphere: Sphere;

    public _inTheQueue: boolean;

    constructor(strategy: EntityCollectionsTreeStrategy, partId: number, parent: EntityCollectionNode | null, extent: Extent, planet: Planet, zoom: number) {
        this.strategy = strategy;
        this.layer = strategy._layer;
        this.parentNode = parent;
        this.childrenNodes = [];
        this.partId = partId;
        //this.nodeId = partId + id;
        this.nodeId = partId + (parent ? parent.nodeId * 4 + 1 : 0);
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

    public insertEntity(entity: Entity, rightNow: boolean = false) {
        this.buildTree([entity], rightNow);
    }

    protected _addEntitiesToCollection(entities: Entity[], rightNow: boolean = false) {
        if (entities.length) {
            const l = this.layer;
            const p = l._planet!;

            let ec = this.entityCollection;

            if (!ec) {
                ec = new EntityCollection({
                    pickingEnabled: l._pickingEnabled,
                    labelMaxLetters: l.labelMaxLetters
                });
                ec._layer = this.layer;
                ec.addTo(p, true);
                ec._quadNode = this;
                l._bindEventsDefault(ec);
                this.entityCollection = ec;
            }

            if (rightNow || !l.async) {
                this.entityCollection!.addEntities(entities);
            } else {
                this.deferredEntities.push.apply(this.deferredEntities, entities);
            }
        }
    }

    protected _setExtentBounds() {
        if (!this.nodeId) {
            this.bsphere.radius = this.layer._planet!.ellipsoid.equatorialSize;
            this.bsphere.center = new Vec3();
        } else {
            this.bsphere.setFromExtent(this.layer._planet!.ellipsoid, this.extent.inverseMercator());
        }
    }

    public __setLonLat__(entity: Entity): LonLat {

        if (entity._lonLat.isZero() && !entity._cartesian.isZero()) {
            entity._lonLat = this.layer._planet!.ellipsoid.cartesianToLonLat(entity._cartesian);
        }

        if (Math.abs(entity._lonLat.lat) < mercator.MAX_LAT) {
            entity._lonLatMerc = entity._lonLat.forwardMercator();
        } else {
            entity._lonLatMerc = new LonLat();
        }
        return entity._lonLatMerc;
    }

    public buildTree(entities: Entity[], rightNow: boolean = false) {

        this.count += entities.length;

        if (entities.length > this.layer._nodeCapacity) {
            const cn = this.childrenNodes;
            if (!cn.length) {
                this.createChildrenNodes();
            }

            let en_nw = [],
                en_ne = [],
                en_sw = [],
                en_se = [];

            let i = entities.length;
            while (i--) {
                const ei = entities[i];
                if (cn[NW].isInside(ei)) {
                    ei._nodePtr = cn[NW];
                    en_nw.push(ei);
                } else if (cn[NE].isInside(ei)) {
                    ei._nodePtr = cn[NE];
                    en_ne.push(ei);
                } else if (cn[SW].isInside(ei)) {
                    ei._nodePtr = cn[SW];
                    en_sw.push(ei);
                } else if (cn[SE].isInside(ei)) {
                    ei._nodePtr = cn[SE];
                    en_se.push(ei);
                }
            }

            en_nw.length && cn[NW].buildTree(en_nw, rightNow);
            en_ne.length && cn[NE].buildTree(en_ne, rightNow);
            en_sw.length && cn[SW].buildTree(en_sw, rightNow);
            en_se.length && cn[SE].buildTree(en_se, rightNow);

        } else {
            this._addEntitiesToCollection(entities, rightNow);
        }
    }

    public isInside(entity: Entity): boolean {
        if (entity._lonLatMerc) {
            return this.extent.isInside(entity._lonLatMerc);
        } else {
            return false;
        }
    }

    public createChildrenNodes() {
        const s = this.strategy;
        const ext = this.extent;
        const size_x = ext.getWidth() * 0.5;
        const size_y = ext.getHeight() * 0.5;
        const ne = ext.northEast;
        const sw = ext.southWest;
        const c = new LonLat(sw.lon + size_x, sw.lat + size_y);
        const nd = this.childrenNodes;
        const p = this.layer._planet!;
        const z = this.zoom + 1;

        nd[NW] = new EntityCollectionNode(s, NW, this, new Extent(new LonLat(sw.lon, sw.lat + size_y), new LonLat(sw.lon + size_x, ne.lat)), p, z);
        nd[NE] = new EntityCollectionNode(s, NE, this, new Extent(c, new LonLat(ne.lon, ne.lat)), p, z);
        nd[SW] = new EntityCollectionNode(s, SW, this, new Extent(new LonLat(sw.lon, sw.lat), c), p, z);
        nd[SE] = new EntityCollectionNode(s, SE, this, new Extent(new LonLat(sw.lon + size_x, sw.lat), new LonLat(ne.lon, sw.lat + size_y)), p, z);
    }

    public collectRenderCollectionsPASS1(visibleNodes: NodesDict, outArr: EntityCollection[]) {
        const n = visibleNodes[this.nodeId];
        if (n) {
            const cn = this.childrenNodes;
            if (this.entityCollection) {
                this.renderCollection(outArr, visibleNodes);
            } else if (cn.length) {
                if (n.state === RENDERING) {
                    this.strategy._secondPASS.push(this);
                } else {
                    cn[NW].collectRenderCollectionsPASS1(visibleNodes, outArr);
                    cn[NE].collectRenderCollectionsPASS1(visibleNodes, outArr);
                    cn[SW].collectRenderCollectionsPASS1(visibleNodes, outArr);
                    cn[SE].collectRenderCollectionsPASS1(visibleNodes, outArr);
                }
            }
        }
    }

    public collectRenderCollectionsPASS2(visibleNodes: NodesDict, outArr: EntityCollection[], renderingNodeId: number) {
        const p = this.layer._planet!;
        const cam = p.camera;

        const altVis = (cam.eye.distance(this.bsphere.center) - this.bsphere.radius <
            VISIBLE_DISTANCE * Math.sqrt(cam._lonLat.height)) || cam._lonLat.height > 10000;

        if (this.count > 0 && altVis && cam.frustum.containsSphere(this.bsphere)) {

            const cn = this.childrenNodes;

            if (this.entityCollection) {
                this.renderCollection(outArr, visibleNodes, renderingNodeId);
            } else if (cn.length) {
                cn[NW].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
                cn[NE].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
                cn[SW].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
                cn[SE].collectRenderCollectionsPASS2(visibleNodes, outArr, renderingNodeId);
            }
        }
    }

    public applyCollection() {
        this.entityCollection!.addEntities(this.deferredEntities);
        this.deferredEntities.length = 0;
        this.deferredEntities = [];
        this._inTheQueue = false;
    }

    public traverseTree(callback: Function) {

        const cn = this.childrenNodes;

        if (this.entityCollection) {
            callback(this);
        } else if (cn.length) {
            cn[NW].traverseTree(callback);
            cn[NE].traverseTree(callback);
            cn[SW].traverseTree(callback);
            cn[SE].traverseTree(callback);
        }
    }

    public renderCollection(outArr: EntityCollection[], visibleNodes: NodesDict, renderingNodeId?: number) {

        const s = this.strategy;

        s._renderingNodes[this.nodeId] = true;

        if (this.deferredEntities.length && !this._inTheQueue) {
            if (this.layer.async) {
                s._queueDeferredNode(this);
            } else {
                this.applyCollection();
            }
        }

        let ec = this.entityCollection!;
        let l = this.layer;

        ec._fadingOpacity = l._fadingOpacity;
        ec.scaleByDistance = l.scaleByDistance;
        ec.pickingScale = l.pickingScale;
        ec.polygonOffsetUnits = l.polygonOffsetUnits;

        outArr.push(ec);

        if (l.clampToGround || l.relativeToGround) {
            const e = ec._entities;
            let i = e.length;

            if (visibleNodes[this.nodeId] && visibleNodes[this.nodeId].state === RENDERING) {
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
                const n = l._planet!._renderedNodes;
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

    public alignEntityToTheGround(entity: Entity, segment: Segment) {
        let res = new Vec3();
        segment.getEntityTerrainPoint(entity, res);
        let alt = (Number(this.layer.relativeToGround) && entity._altitude) || 0.0;
        if (alt) {
            let n = this.layer._planet!.ellipsoid.getSurfaceNormal3v(res);
            entity._setCartesian3vSilent(res.addA(n.scale(alt)));
        } else {
            entity._setCartesian3vSilent(res);
        }
    }

    public isVisible(): boolean {
        if (this.strategy._renderingNodes[this.nodeId]) {
            return true;
        }
        return false;
    }
}

class EntityCollectionNodeLonLat extends EntityCollectionNode {

    public isNorth: boolean;

    public override strategy: EarthEntityCollectionsTreeStrategy;

    constructor(strategy: EarthEntityCollectionsTreeStrategy, partId: number, parent: EntityCollectionNodeLonLat | null, extent: Extent, planet: Planet, zoom: number) {
        super(strategy, partId, parent, extent, planet, zoom);
        this.strategy = strategy;
        this.isNorth = false;
    }

    public override createChildrenNodes() {
        const s = this.strategy;
        const ext = this.extent;
        const size_x = ext.getWidth() * 0.5;
        const size_y = ext.getHeight() * 0.5;
        const ne = ext.northEast;
        const sw = ext.southWest;
        const c = new LonLat(sw.lon + size_x, sw.lat + size_y);
        const nd = this.childrenNodes;
        const p = this.layer._planet!;
        const z = this.zoom + 1;

        nd[NW] = new EntityCollectionNodeLonLat(s, NW, this, new Extent(new LonLat(sw.lon, sw.lat + size_y), new LonLat(sw.lon + size_x, ne.lat)), p, z);
        nd[NE] = new EntityCollectionNodeLonLat(s, NE, this, new Extent(c, new LonLat(ne.lon, ne.lat)), p, z);
        nd[SW] = new EntityCollectionNodeLonLat(s, SW, this, new Extent(new LonLat(sw.lon, sw.lat), c), p, z);
        nd[SE] = new EntityCollectionNodeLonLat(s, SE, this, new Extent(new LonLat(sw.lon + size_x, sw.lat), new LonLat(ne.lon, sw.lat + size_y)), p, z);
    }

    protected override _setExtentBounds() {
        if (this.extent.northEast.lat > 0) {
            this.isNorth = true;
        }
        this.bsphere.setFromExtent(this.layer._planet!.ellipsoid, this.extent);
    }

    public override __setLonLat__(entity: Entity): LonLat {
        if (entity._lonLat.isZero()) {
            entity._lonLat = this.layer._planet!.ellipsoid.cartesianToLonLat(entity._cartesian);
        }
        return entity._lonLat;
    }

    public override isVisible(): boolean {
        if (this.isNorth && this.strategy._renderingNodesNorth[this.nodeId]) {
            return true;
        } else if (this.strategy._renderingNodesSouth[this.nodeId]) {
            return true;
        }
        return false;
    }

    public override isInside(entity: Entity): boolean {
        return this.extent.isInside(entity._lonLat);
    }

    public override renderCollection(outArr: EntityCollection[], visibleNodes: NodesDict, renderingNode: number) {

        if (this.isNorth) {
            this.strategy._renderingNodesNorth[this.nodeId] = true;
        } else {
            this.strategy._renderingNodesSouth[this.nodeId] = true;
        }

        if (this.deferredEntities.length && !this._inTheQueue) {
            if (this.layer.async) {
                this.strategy._queueDeferredNode(this);
            } else {
                this.applyCollection();
            }
        }

        const ec = this.entityCollection!;

        ec._fadingOpacity = this.layer._fadingOpacity;
        ec.scaleByDistance = this.layer.scaleByDistance;
        ec.pickingScale = this.layer.pickingScale;

        outArr.push(ec);
    }
}

export {EntityCollectionNode, EntityCollectionNodeLonLat};
