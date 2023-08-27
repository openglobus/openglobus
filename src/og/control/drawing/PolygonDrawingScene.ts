

import { Events } from '../../Events';
import { LonLat } from '../../LonLat';
import { Object3d } from '../../Object3d.js';
import { Entity } from '../../entity/Entity.js';
import { Vector } from '../../layer/Vector.js';
import * as math from "../../math";
import { Line3 } from '../../math/Line3.js';
import { Vec2 } from '../../math/Vec2';
import { Vec3 } from '../../math/Vec3';
import { RenderNode } from '../../scene/RenderNode.js';

const POINTER_OBJ3D = Object3d.createCylinder(1, 1, 2.0, 20, 1, true, false, 0, -0.5, 0);

export const NUM_SEGMENTS = 200;
export const OUTLINE_ALT = 0.3;
export const COORDINATES_COLOR = "rgb(350, 350, 0)";
export const CENTER_COLOR = "rgb(0, 350, 50)";
export const OUTLINE_COLOR = "rgb(0, 350, 50)";
export const OUTLINE_THICKNESS = 3.5;

export const CORNER_OPTIONS = {
    scale: 0.5,
    instanced: true,
    tag: "corners",
    color: COORDINATES_COLOR,
    object3d: POINTER_OBJ3D
};

export const CENTER_OPTIONS = {
    scale: 0.4,
    instanced: true,
    tag: "centers",
    color: CENTER_COLOR,
    object3d: POINTER_OBJ3D
};

export const OUTLINE_OPTIONS = {
    thickness: OUTLINE_THICKNESS,
    color: OUTLINE_COLOR
}

class PolygonDrawingScene extends RenderNode {
    events: any; // Events<string[]>;
    _planet: any;
    _initCoordinates: any;
    _pickedCorner: any;
    _pickedCenter: any;
    _startPos: any;
    _startClick: Vec2;
    _geometryLayer: Vector;
    _cornerLayer: Vector;
    _centerLayer: Vector;
    _outlineLayer: Vector;
    _ghostCorner: Entity;
    _ghostOutlineLayer: Vector;
    _showGhostPointer: boolean;
    _isStartPoint: boolean;
    _insertCornerIndex: number;
    _onChange_: any;
    _cornerDblClick = false;
    _onCornerLdblclick_: any;
    _onCornerLdown_: any;
    _onCenterLdown_: any;
    _onLup_: any;
    _onMouseMove_: any;
    _onCornerMouseEnter_: any;
    _onCornerMouseLeave_: any;
    _onCenterMouseEnter_: any;
    _onCenterMouseLeave_: any;
    private _onMouseDblClick_: any;

    constructor(options: { name?: string, coordinates?: any[] } = {}) {
        super(options.name);

        this.events = new Events(EVENT_NAMES);

        this._planet = null;

        this._initCoordinates = options.coordinates || [];

        this._pickedCorner = null;
        this._pickedCenter = null;

        this._startPos = null;
        this._startClick = new Vec2();

        this._geometryLayer = new Vector(null);

        //
        // outline vectors
        //
        this._cornerLayer = new Vector("corners", {
            pickingScale: 3,
            pickingEnabled: true,
            polygonOffsetUnits: -5,
            relativeToGround: true,
            scaleByDistance: [100, 4000000, 1.0]
        });

        this._centerLayer = new Vector("centers", {
            pickingScale: 3,
            pickingEnabled: true,
            polygonOffsetUnits: -5,
            relativeToGround: true,
            scaleByDistance: [100, 4000000, 1.0]
        });

        this._outlineLayer = new Vector("outline", {
            entities: [new Entity({
                polyline: {
                    path3v: [],
                    isClosed: false,
                    ...OUTLINE_OPTIONS
                } as any,
                properties: {
                    index: 0
                }
            })],
            pickingEnabled: false,
            polygonOffsetUnits: -5,
            relativeToGround: true
        });

        (this._outlineLayer as any).getEntities()[0].polyline.altitude = OUTLINE_ALT;

        //
        // Ghost cursor pointer
        //
        this._ghostCorner = new Entity({
            geoObject: CORNER_OPTIONS as any,
        });

        this._ghostOutlineLayer = new Vector("ghost-pointer", {
            pickingEnabled: false,
            polygonOffsetUnits: -5,
            relativeToGround: true,
            scaleByDistance: [100, 4000000, 1.0],
            opacity: 0.5
        });

        this._showGhostPointer = false;

        this._isStartPoint = false;

        this._insertCornerIndex = -1;
    }

    get geometryType() {
        return "Polygon";
    }

    getCoordinates() {
        let corners = this._cornerLayer.getEntities();
        if (corners.length > 0) {
            return corners.map((c) => {
                let ll = c.getLonLat();
                return [ll.lon, ll.lat, ll.height];
            });
        } else {
            return this._initCoordinates;
        }
    }

    bindPlanet(planet: any) {
        this._planet = planet;
    }

    override init() {

        this._initEvents();

        this._initGhostLayerPointer();

        if (this._initCoordinates.length) {
            this.setCoordinates(this._initCoordinates);
        }

        this._planet.addLayer(this._outlineLayer);
        this._planet.addLayer(this._cornerLayer);
        this._planet.addLayer(this._centerLayer);

        this.showGhostPointer();
        this.startNewPoint();

        this._planet.renderer.controls.mouseNavigation.deactivateDoubleClickZoom();

        this._geometryLayer.addTo(this._planet);

        this._onChange_ = this._onChange.bind(this);
        this.events.on("change", this._onChange_, this);
    }

    _onChange(e: any) {
        if (e.geometryType === "Polygon") {
            let coords = this.getCoordinates();
            let entity = new Entity({
                'geometry': {
                    'type': e.geometryType,
                    'coordinates': [coords],
                    'style': {
                        'fillColor': "rgba(0,146,247,0.2)"
                    }
                }
            } as any);
            this._geometryLayer.clear();
            this._geometryLayer.add(entity);
        }
    }

    override onremove() {
        this._clearEvents();
        this.hideGhostPointer();
        this.stopNewPoint();
        this.clear();
        this._geometryLayer.remove();
    }

    clear() {

        this._geometryLayer.clear();

        let corners = this._cornerLayer.getEntities();

        let i = corners.length;
        while (i--) {
            corners[i].remove();
        }

        let centers = this._centerLayer.getEntities();
        i = centers.length;
        while (i--) {
            centers[i].remove();
        }

        let entities = this._outlineLayer.getEntities();
        i = entities.length;
        while (i--) {
            (entities[i] as any).polyline.clear();
            if (i > 0) {
                entities[i].remove();
            }
        }

        this._clearGhostPointer();
    }

    setCoordinates(coords: any[]) {
        this.clear();
        for (let i = 0; i < coords.length; i++) {
            let ci = coords[i];
            let cart = this._planet.ellipsoid.lonLatToCartesian(new LonLat(ci[0], ci[1], ci[2]));
            this._appendCart(cart);
        }
        this.events.dispatch((this.events as any).change, this);
    }

    stopNewPoint() {
        if (this.renderer) {
            this.renderer.events.off("ldblclick", this._onMouseDblClick_);
            this._onMouseDblClick_ = null;
        }
    }

    startNewPoint() {
        this._onMouseDblClick_ = this._onMouseDblClick.bind(this);
        this.renderer?.events.on("ldblclick", this._onMouseDblClick_, this);
    }

    showGhostPointer() {
        this._showGhostPointer = true;
        this._planet.addLayer(this._ghostOutlineLayer);
        this._insertCornerIndex = this._cornerLayer.getEntities().length;
    }

    hideGhostPointer() {
        this._showGhostPointer = false;
        this._ghostOutlineLayer.remove();
        this._insertCornerIndex = -1;
    }

    setGhostPointerPosition(groundPos: Vec3) {
        if (groundPos) {
            this._ghostCorner.setCartesian3v(groundPos);
            this._updateGhostOutlinePointer(groundPos);
        }
    }

    _onCornerMouseEnter(e: any) {
        e.renderer.handler.canvas.style.cursor = "pointer";
        this.hideGhostPointer();
    }

    _onCornerMouseLeave(e: any) {
        e.renderer.handler.canvas.style.cursor = "default";
        this.showGhostPointer();
    }

    _onCenterMouseEnter(e: any) {
        e.renderer.handler.canvas.style.cursor = "pointer";
        this.hideGhostPointer();
    }

    _onCenterMouseLeave(e: any) {
        e.renderer.handler.canvas.style.cursor = "default";
        if (!(this._pickedCenter || this._pickedCorner)) {
            this.showGhostPointer();
        }
    }

    _onLup(e: any) {
        this._planet.renderer.controls.mouseNavigation.activate();
        if (this._pickedCorner || this._pickedCenter) {
            this.events.dispatch((this.events as any).change, this);
            this.setGhostPointerPosition(this._planet.getCartesianFromPixelTerrain(e));
            this.showGhostPointer();
            this._pickedCorner = null;
            this._pickedCenter = null;
        }
    }

    _getLdown(e: any) {
        this._planet.renderer.controls.mouseNavigation.deactivate();
        this._startClick.set(e.x, e.y);
        let coords = e.pickingObject.getCartesian();
        this._startPos = this._planet.getPixelFromCartesian(coords);
        return e.pickingObject;
    }

    _onCornerLdown(e: any) {
        this._pickedCorner = this._getLdown(e);
    }

    _onCenterLdown(e: any) {
        this._pickedCenter = this._getLdown(e);
    }

    _onMouseMove(e: any) {
        if (this._pickedCenter) {
            this._moveCenterPoint();
        } else if (this._pickedCorner) {
            this._moveCornerPoint(e);
        } else {
            this.setGhostPointerPosition(this._planet.getCartesianFromPixelTerrain(e));
        }
    }

    _onCornerLdblclick(e: any) {
        this._cornerDblClick = true;
        let coords = this.getCoordinates();
        coords.splice(e.pickingObject.layerIndex, 1);
        this.setCoordinates(coords);
    }

    _onMouseDblClick(e: any) {

        if (this._cornerDblClick) {
            this._cornerDblClick = false;
            return;
        }

        if (!this._showGhostPointer) {
            return;
        }

        let cart = this._planet.getCartesianFromPixelTerrain(e);
        if (cart) {
            this._addNew(cart);
            if (!this._isStartPoint && this._cornerLayer.getEntities().length > 2) {
                this._isStartPoint = true;
                this.events.dispatch(this.events.startpoint, this);
            }
            this.events.dispatch(this.events.change, this);
        }
    }

    _initEvents() {

        this._onCornerLdblclick_ = this._onCornerLdblclick.bind(this);
        this._cornerLayer.events.on("ldblclick", this._onCornerLdblclick_, this);

        this._onCornerLdown_ = this._onCornerLdown.bind(this);
        this._cornerLayer.events.on("ldown", this._onCornerLdown_, this);

        this._onCenterLdown_ = this._onCenterLdown.bind(this);
        this._centerLayer.events.on("ldown", this._onCenterLdown_, this);

        this._onLup_ = this._onLup.bind(this);
        this.renderer?.events.on("lup", this._onLup_, this);

        this._onMouseMove_ = this._onMouseMove.bind(this);
        this.renderer?.events.on("mousemove", this._onMouseMove_, this);

        this._onCornerMouseEnter_ = this._onCornerMouseEnter.bind(this);
        this._cornerLayer.events.on("mouseenter", this._onCornerMouseEnter_, this);

        this._onCornerMouseLeave_ = this._onCornerMouseLeave.bind(this);
        this._cornerLayer.events.on("mouseleave", this._onCornerMouseLeave_, this);

        this._onCenterMouseEnter_ = this._onCenterMouseEnter.bind(this);
        this._centerLayer.events.on("mouseenter", this._onCenterMouseEnter_, this);

        this._onCenterMouseLeave_ = this._onCenterMouseLeave.bind(this);
        this._centerLayer.events.on("mouseleave", this._onCenterMouseLeave_, this);
    }

    _clearEvents() {
        this._cornerLayer.events.off("ldblclick", this._onCornerLdblclick_);
        this._onCornerLdblclick_ = null;

        this._cornerLayer.events.off("ldown", this._onCornerLdown_);
        this._onCornerLdown_ = null;

        this._centerLayer.events.off("ldown", this._onCenterLdown_);
        this._onCenterLdown_ = null;

        this.renderer?.events.off("lup", this._onLup_);
        this._onLup_ = null;

        this.renderer?.events.off("mousemove", this._onMouseMove_);
        this._onMouseMove_ = null;

        this._cornerLayer.events.off("mouseenter", this._onCornerMouseEnter_);
        this._onCornerMouseEnter_ = null;

        this._cornerLayer.events.off("mouseleave", this._onCornerMouseLeave_);
        this._onCornerMouseLeave_ = null;

        this._centerLayer.events.off("mouseenter", this._onCenterMouseEnter_);
        this._onCenterMouseEnter_ = null;

        this._centerLayer.events.off("mouseleave", this._onCenterMouseLeave_);
        this._onCenterMouseLeave_ = null;
    }

    _drawCorners() {
        let corners = this._cornerLayer.getEntities();
        for (let i = 0; i < corners.length; i++) {
            let ai = corners[i];
            this._checkTerrainCollision(ai);
        }
    }

    _drawCenters() {
        let centers = this._centerLayer.getEntities();
        for (let i = 0; i < centers.length; i++) {
            let ai = centers[i];
            this._checkTerrainCollision(ai);
        }
    }

    _drawGhostCorner() {
        if (this._showGhostPointer) {
            this._checkTerrainCollision(this._ghostCorner);
        }
    }

    override frame() {
        this._drawCorners();
        this._drawCenters();
        this._drawGhostCorner();
    }

    _checkTerrainCollision(entity: any) {
        let _tempTerrPoint = new Vec3();
        let nodes = this._planet._renderedNodes;
        for (let j = 0; j < nodes.length; j++) {
            let seg = nodes[j].segment;
            if (seg && seg._extentLonLat.isInside(entity.getLonLat())) {
                seg.getEntityTerrainPoint(entity, _tempTerrPoint);
                entity.setCartesian3v(_tempTerrPoint);
                break;
            }
        }
    }

    _moveCenterPoint() {
        let coords = this.getCoordinates(),
            index = this._pickedCenter.layerIndex + 1,
            ll = this._pickedCenter.getLonLat();
        let newCorner = [ll.lon, ll.lat, ll.height];

        coords.splice(index, 0, newCorner);

        this.setCoordinates(coords);

        this._pickedCenter = null;

        this._pickedCorner = this._cornerLayer.getEntities()[index];
    }

    //
    // virtual
    //

    _addNew(cart: any) {
        if (this._insertCornerIndex === -1 || this._cornerLayer.getEntities().length < 2) {
            this._appendCart(cart);
        } else {
            let area = this.getCoordinates(),
                index = this._insertCornerIndex;
            let ll = this._planet.ellipsoid.cartesianToLonLat(cart);
            let newCorner = [ll.lon, ll.lat, ll.height];
            area.splice(index, 0, newCorner);
            this.clear();
            this.setCoordinates(area);
        }
    }

    _appendCart(cart: any) {
        let corners = this._cornerLayer.getEntities();

        let segNum = corners.length - 1;
        let prevCorn = corners[segNum];

        let corner = new Entity({
            geoObject: CORNER_OPTIONS,
        } as any);

        corner.setCartesian3v(cart);
        corner.addTo(this._cornerLayer);
        this._checkTerrainCollision(corner);

        if (prevCorn) {

            let firstCart = corners[0].getCartesian(),
                prevCart = prevCorn.getCartesian();

            let vecPrev = corner.getCartesian().sub(prevCart),
                vecFirst = corner.getCartesian().sub(firstCart);

            let distPrev = vecPrev.length(),
                distFirst = vecFirst.length();

            vecPrev.normalize();
            vecFirst.normalize();

            let prevPath = [],
                firstPath = [];

            for (let i = 0; i <= NUM_SEGMENTS; i++) {
                let p = vecPrev.scaleTo(i * distPrev / NUM_SEGMENTS).addA(prevCart);
                prevPath.push(p);

                let f = vecFirst.scaleTo(i * distFirst / NUM_SEGMENTS).addA(firstCart);
                firstPath.push(f);
            }

            (this._outlineLayer as any).getEntities()[0].polyline.setPath3v([firstPath]);

            let entity = new Entity({
                polyline: {
                    path3v: [prevPath],
                    isClosed: false,
                    properties: {
                        index: segNum + 1
                    },
                    ...OUTLINE_OPTIONS
                }
            } as any);
            (entity.polyline as any).altitude = OUTLINE_ALT;
            this._outlineLayer.add(entity);

            let centers = this._centerLayer.getEntities();
            let firstCenter = centers[centers.length - 1];

            let prevCenterCart = vecPrev.scaleTo(distPrev * 0.5).addA(prevCart),
                firstCenterCart = vecFirst.scaleTo(distFirst * 0.5).addA(firstCart);

            let center = new Entity({
                geoObject: CENTER_OPTIONS,
            } as any);
            center.setCartesian3v(prevCenterCart);
            center.addTo(this._centerLayer);
            this._checkTerrainCollision(center);

            //moveToEnd
            firstCenter.remove();
            firstCenter.addTo(this._centerLayer);

            firstCenter.setCartesian3v(firstCenterCart);

        } else {
            let center = new Entity({
                geoObject: CENTER_OPTIONS,
            } as any);
            center.addTo(this._centerLayer);
        }
    }

    _clearGhostPointer() {
        const g = this._ghostOutlineLayer as any;
        g.getEntities()[0].polyline.clear();
        g.getEntities()[1].polyline.clear();
    }

    _moveCornerPoint(e: any) {
        let d = new Vec2(e.x, e.y).sub(this._startClick),
            p = this._startPos.add(d);

        let groundCoords = this._planet.getCartesianFromPixelTerrain(p);

        if (groundCoords) {

            this._pickedCorner.setCartesian3v(groundCoords);

            let corners = this._cornerLayer.getEntities();

            if (corners.length) {
                let ind = this._pickedCorner.layerIndex;
                let size = corners.length;

                let cartPrev = corners[ind === 0 ? (size - 1) : (ind - 1)].getCartesian(),
                    cartNext = corners[(ind + 1) % size].getCartesian();

                let vecPrev = this._pickedCorner.getCartesian().sub(cartPrev),
                    vecNext = this._pickedCorner.getCartesian().sub(cartNext);

                let distPrev = vecPrev.length(),
                    distNext = vecNext.length();

                vecPrev.normalize();
                vecNext.normalize();

                let pathPrev = [],
                    pathNext = [];

                for (let i = 0; i <= NUM_SEGMENTS; i++) {
                    let p = vecPrev.scaleTo(i * distPrev / NUM_SEGMENTS).addA(cartPrev);
                    pathPrev.push(p);

                    let f = vecNext.scaleTo(i * distNext / NUM_SEGMENTS).addA(cartNext);
                    pathNext.push(f);
                }

                let entities = this._outlineLayer.getEntities();

                let prevPolyline = entities[ind].polyline,
                    nextPolyline = entities[(ind + 1) % size].polyline;

                prevPolyline?.setPath3v([pathPrev]);
                nextPolyline?.setPath3v([pathNext]);

                //
                // Move center points
                let centers = this._centerLayer.getEntities();
                let prevCenter = centers[ind === 0 ? (size - 1) : (ind - 1)],
                    nextCenter = centers[ind];

                let prevCenterCart = vecPrev.scaleTo(distPrev * 0.5).addA(cartPrev),
                    nextCenterCart = vecNext.scaleTo(distNext * 0.5).addA(cartNext);

                prevCenter.setCartesian3v(prevCenterCart);
                this._checkTerrainCollision(prevCenter);

                nextCenter.setCartesian3v(nextCenterCart);
                this._checkTerrainCollision(nextCenter);
            }
        }
    }

    _updateGhostOutlinePointer(groundPos: Vec3) {

        let corners = this._cornerLayer.getEntities();
        let size = corners.length;

        if (size > 0) {

            let ind = 0;

            let minDist = math.MAX;

            for (let i = 0; i < size; i++) {
                let ci = corners[i];
                let dist = ci.getCartesian().distance(groundPos);
                if (dist < minDist) {
                    minDist = dist;
                    ind = i;
                }
            }

            let cCurr = corners[ind].getCartesian(),
                cNext = corners[(ind + 1) % size].getCartesian(),
                cPrev = corners[ind === 0 ? (size - 1) : (ind - 1)].getCartesian();

            let nPrev = cPrev.sub(cCurr).normalize(),
                nNext = cNext.sub(cCurr).normalize(),
                nGround = groundPos.sub(cCurr).normalize();

            let midVec = nPrev.add(nNext).normalize();

            let toMid = nGround.cross(midVec),
                up = nPrev.cross(nNext);

            if (toMid.dot(up) > 0) {
                ind--;
                if (ind < 0) {
                    ind = size - 1;
                }
            }

            let temp = new Vec3();

            for (let i = 0; i < size; i++) {
                let side = new Line3(corners[i].getCartesian(), corners[(i + 1) % size].getCartesian());
                let u = side.getNearestDistancePoint(groundPos, temp);
                if (u) {
                    let dist = temp.distance(groundPos);
                    if (dist < minDist) {
                        minDist = dist;
                        ind = i;
                    }
                }
            }

            this._insertCornerIndex = (ind + 1) % size;

            let cartPrev = corners[ind % size].getCartesian(),
                cartNext = corners[(ind + 1) % size].getCartesian();

            let vecPrev = this._ghostCorner.getCartesian().sub(cartPrev),
                vecNext = this._ghostCorner.getCartesian().sub(cartNext);

            let distPrev = vecPrev.length(),
                distNext = vecNext.length();

            vecPrev.normalize();
            vecNext.normalize();

            let pathPrev = [],
                pathNext = [];

            for (let i = 0; i <= NUM_SEGMENTS; i++) {
                let p = vecPrev.scaleTo(i * distPrev / NUM_SEGMENTS).addA(cartPrev);
                pathPrev.push(p);

                let f = vecNext.scaleTo(i * distNext / NUM_SEGMENTS).addA(cartNext);
                pathNext.push(f);
            }

            let entities = this._ghostOutlineLayer.getEntities();

            let prevPolyline = entities[0].polyline,
                nextPolyline = entities[1].polyline;

            prevPolyline?.setPath3v([pathPrev]);
            nextPolyline?.setPath3v([pathNext]);
        }
    }

    _initGhostLayerPointer() {
        this._ghostOutlineLayer.setEntities([
            new Entity({
                polyline: {
                    path3v: [],
                    isClosed: false,
                    ...OUTLINE_OPTIONS
                },
                properties: {
                    index: 0
                }
            } as any), new Entity({
                polyline: {
                    path3v: [],
                    isClosed: false,
                    ...OUTLINE_OPTIONS
                },
                properties: {
                    index: 0
                }
            } as any),
            this._ghostCorner
        ]);

        const g = this._ghostOutlineLayer as any;
        g.getEntities()[0].polyline.altitude = g.getEntities()[1].polyline.altitude = OUTLINE_ALT;
    }
}

const EVENT_NAMES = [
    "startpoint",
    "change",
    "add",
    "remove",
    "mousemove",
    "mouseenter",
    "mouseleave",
    "lclick",
    "rclick",
    "mclick",
    "ldblclick",
    "rdblclick",
    "mdblclick",
    "lup",
    "rup",
    "mup",
    "ldown",
    "rdown",
    "mdown",
    "lhold",
    "rhold",
    "mhold",
    "mousewheel",
    "touchmove",
    "touchstart",
    "touchend",
    "doubletouch",
    "touchleave",
    "touchenter"
];


export { PolygonDrawingScene };
