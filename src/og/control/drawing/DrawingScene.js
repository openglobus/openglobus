'use strict';

import * as math from "../../math.js";
import { Ellipsoid } from '../../ellipsoid/Ellipsoid.js';
import { Entity } from '../../entity/Entity.js';
import { Events } from '../../Events.js';
import { Vector } from '../../layer/Vector.js';
import { Vec2 } from '../../math/Vec2.js';
import { Object3d } from '../../Object3d.js';
import { RenderNode } from '../../scene/RenderNode.js';
import { Vec3 } from '../../math/Vec3.js';
import { Line3 } from '../../math/Line3.js';
import { LonLat } from '../../LonLat.js';

const NUM_SEGMENTS = 120;

const OUTLINE_ALT = 1.0;

let obj3d = Object3d.createCylinder(1, 0, 2.0, 20, 1, true, false, 0, 0, 0);

const CORNER_OPTIONS = {
    scale: 1,
    instanced: true,
    tag: "corners",
    color: "rgb(0,305,0)",
    object3d: obj3d
};

const CENTER_OPTIONS = {
    scale: 1,
    instanced: true,
    tag: "centers",
    color: "rgb(305,305,0)",
    object3d: obj3d
};

class DrawingScene extends RenderNode {
    constructor(options = {}) {
        super(options.name);

        this.events = new Events(EVENT_NAMES);

        this._planet = options.planet || null;

        this._cornersArr = [];

        this._centersArr = [];

        this._outlineLayer = new Vector("outline", {
            entities: [new Entity({
                polyline: {
                    path3v: [],
                    thickness: 3,
                    color: "yellow",
                    isClosed: false
                },
                properties: {
                    index: 0
                }
            })],
            pickingEnabled: false,
            polygonOffsetUnits: 0,
            relativeToGround: true
        });

        this._outlineLayer.getEntities()[0].polyline.altitude = OUTLINE_ALT;

        this._pickedCorner = null;

        this._pickedCenter = null;

        this._startPos = null;
        this._startClick = new Vec2();

        this._cornerLayer = new Vector("corners", {
            entities: [],
            pickingEnabled: true,
            polygonOffsetUnits: 0,
            relativeToGround: true,
            scaleByDistance: [100, 4000000, 1.0]
        });

        this._centerLayer = new Vector("centers", {
            entities: [],
            pickingEnabled: true,
            polygonOffsetUnits: 0,
            relativeToGround: true,
            scaleByDistance: [100, 4000000, 1.0]
        });

        //
        // Ghost cursor pointer
        //
        this._ghostCorner = new Entity({
            geoObject: CORNER_OPTIONS,
        });

        this._ghostOutlineLayer = new Vector("ghost-pointer", {
            entities: [
                new Entity({
                    polyline: {
                        path3v: [],
                        thickness: 3,
                        color: "yellow",
                        isClosed: false
                    },
                    properties: {
                        index: 0
                    }
                }), new Entity({
                    polyline: {
                        path3v: [],
                        thickness: 3,
                        color: "yellow",
                        isClosed: false
                    },
                    properties: {
                        index: 0
                    }
                }),
                this._ghostCorner
            ],
            pickingEnabled: false,
            polygonOffsetUnits: 0,
            relativeToGround: true,
            scaleByDistance: [100, 4000000, 1.0],
            opacity: 0.25
        });

        this._ghostOutlineLayer.getEntities()[0].polyline.altitude =
            this._ghostOutlineLayer.getEntities()[1].polyline.altitude = OUTLINE_ALT;

        this._showGhostPointer = false;

        this._isStartPoint = false;

        this._isReadOnly = false;

        this._insertCornerIndex = -1;
    }

    getCoordinates() {
        if (this._cornersArr && this._cornersArr.length > 0) {
            return this._cornersArr.map((c) => {
                let ll = c.getLonLat();
                return [ll.lon, ll.lat, ll.height];
            });
        } else {
            return this._initArea;
        }
    }

    bindPlanet(planet) {
        this._planet = planet;
    }

    init() {

        this._onCornerLdown_ = this._onCornerLdown.bind(this);
        this._cornerLayer.events.on("ldown", this._onCornerLdown_, this);

        this._onCenterLdown_ = this._onCenterLdown.bind(this);
        this._centerLayer.events.on("ldown", this._onCenterLdown_, this);

        this._onLup_ = this._onLup.bind(this);
        this.renderer.events.on("lup", this._onLup_, this);

        this._onMouseMove_ = this._onMouseMove.bind(this);
        this.renderer.events.on("mousemove", this._onMouseMove_, this);

        this._onCornerMouseEnter_ = this._onCornerMouseEnter.bind(this);
        this._cornerLayer.events.on("mouseenter", this._onCornerMouseEnter_, this);

        this._onCornerMouseLeave_ = this._onCornerMouseLeave.bind(this);
        this._cornerLayer.events.on("mouseleave", this._onCornerMouseLeave_, this);

        this._onCenterMouseEnter_ = this._onCenterMouseEnter.bind(this);
        this._centerLayer.events.on("mouseenter", this._onCenterMouseEnter_, this);

        this._onCenterMouseLeave_ = this._onCenterMouseLeave.bind(this);
        this._centerLayer.events.on("mouseleave", this._onCenterMouseLeave_, this);

        // if (this._initArea) {
        //     this.setCoordinates(this._initArea);
        // }

        this._planet.addLayer(this._outlineLayer);
        this._planet.addLayer(this._cornerLayer);
        this._planet.addLayer(this._centerLayer);

        this.showGhostPointer();
        this.startNewPoint();

        this._planet.renderer.controls.mouseNavigation.deactivateDoubleClickZoom();
    }

    _updateGhostOutlinePointer(groundPos) {

        let size = this._cornersArr.length;

        if (size > 0) {

            let ind = 0;

            let minDist = math.MAX;

            for (let i = 0; i < size; i++) {
                let ci = this._cornersArr[i];
                let dist = ci.getCartesian().distance(groundPos);
                if (dist < minDist) {
                    minDist = dist;
                    ind = i;
                }
            }

            let cCurr = this._cornersArr[ind].getCartesian(),
                cNext = this._cornersArr[(ind + 1) % size].getCartesian(),
                cPrev = this._cornersArr[ind === 0 ? (size - 1) : (ind - 1)].getCartesian();

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
                let side = new Line3(this._cornersArr[i].getCartesian(), this._cornersArr[(i + 1) % size].getCartesian());
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

            let cartPrev = this._cornersArr[ind % size].getCartesian(),
                cartNext = this._cornersArr[(ind + 1) % size].getCartesian();

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

            prevPolyline.setPath3v([pathPrev]);
            nextPolyline.setPath3v([pathNext]);
        }
    }

    _onCornerMouseEnter(e) {
        e.renderer.handler.canvas.style.cursor = "pointer";
        this.hideGhostPointer();
    }

    _onCornerMouseLeave(e) {
        e.renderer.handler.canvas.style.cursor = "default";
        this.showGhostPointer();
    }

    _onCenterMouseEnter(e) {
        e.renderer.handler.canvas.style.cursor = "pointer";
        this.hideGhostPointer();
    }

    _onCenterMouseLeave(e) {
        e.renderer.handler.canvas.style.cursor = "default";
        if (!(this._pickedCenter || this._pickedCorner)) {
            this.showGhostPointer();
        }
    }

    _getLdown(e) {
        e.renderer.controls.mouseNavigation.deactivate();
        this._startClick.set(e.x, e.y);
        let coords = e.pickingObject.getCartesian();
        this._startPos = this._planet.getPixelFromCartesian(coords);
        return e.pickingObject;
    }

    _onCornerLdown(e) {
        this._pickedCorner = this._getLdown(e);
    }

    _onCenterLdown(e) {
        this._pickedCenter = this._getLdown(e);
    }

    _onLup(e) {
        e.renderer.controls.mouseNavigation.activate();
        if (this._pickedCorner || this._pickedCenter) {
            this.events.dispatch(this.events.change, this);
            this.showGhostPointer();
            this._pickedCorner = null;
            this._pickedCenter = null;
        }
    }

    _onMouseMove(e) {
        if (this._pickedCenter) {

            let area = this.getCoordinates(),
                index = this._pickedCenter.layerIndex + 1,
                ll = this._pickedCenter.getLonLat();
            let newCorner = [ll.lon, ll.lat, ll.height];

            area.splice(index, 0, newCorner);

            this.clear();
            this.setCoordinates(area);

            this._pickedCenter = null;

            this._pickedCorner = this._cornersArr[index];

        } else if (this._pickedCorner) {

            let d = new Vec2(e.x, e.y).sub(this._startClick),
                p = this._startPos.add(d);

            let groundCoords = this._planet.getCartesianFromPixelTerrain(p);

            if (groundCoords) {

                this._pickedCorner.setCartesian3v(groundCoords);

                if (this._cornersArr.length) {
                    let ind = this._pickedCorner.layerIndex;
                    let size = this._cornersArr.length;

                    let cartPrev = this._cornersArr[ind == 0 ? (size - 1) : (ind - 1)].getCartesian(),
                        cartNext = this._cornersArr[(ind + 1) % size].getCartesian();

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

                    prevPolyline.setPath3v([pathPrev]);
                    nextPolyline.setPath3v([pathNext]);

                    //
                    // Move center points
                    let prevCenter = this._centersArr[ind === 0 ? (size - 1) : (ind - 1)],
                        nextCenter = this._centersArr[ind];

                    let prevCenterCart = vecPrev.scaleTo(distPrev * 0.5).addA(cartPrev),
                        nextCenterCart = vecNext.scaleTo(distNext * 0.5).addA(cartNext);

                    prevCenter.setCartesian3v(prevCenterCart);
                    this._checkTerrainCollision(prevCenter);

                    nextCenter.setCartesian3v(nextCenterCart);
                    this._checkTerrainCollision(nextCenter);
                }
            }
        } else {
            this.setGhostPointerPosition(this._planet.getCartesianFromPixelTerrain(e));
        }
    }

    _appendCart(cart) {
        let segNum = this._cornersArr.length - 1;
        let prevCorn = this._cornersArr[segNum];

        let corner = new Entity({
            geoObject: CORNER_OPTIONS,
        });

        corner.setCartesian3v(cart);
        this._cornersArr.push(corner);
        corner.addTo(this._cornerLayer);
        this._checkTerrainCollision(corner);

        if (prevCorn) {

            let firstCart = this._cornersArr[0].getCartesian(),
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

            this._outlineLayer.getEntities()[0].polyline.setPath3v([firstPath]);

            let entity = new Entity({
                polyline: {
                    path3v: [prevPath],
                    thickness: 3,
                    color: "yellow",
                    isClosed: false,
                    properties: {
                        index: segNum + 1
                    }
                }
            });
            entity.polyline.altitude = OUTLINE_ALT;
            this._outlineLayer.add(entity);

            let firstCenter = this._centersArr[this._centersArr.length - 1];

            let prevCenterCart = vecPrev.scaleTo(distPrev * 0.5).addA(prevCart),
                firstCenterCart = vecFirst.scaleTo(distFirst * 0.5).addA(firstCart);

            let center = new Entity({
                geoObject: CENTER_OPTIONS,
            });
            center.setCartesian3v(prevCenterCart);
            center.addTo(this._centerLayer);
            this._centersArr.push(center);
            this._checkTerrainCollision(center);

            //moveToEnd
            firstCenter.remove();
            firstCenter.addTo(this._centerLayer);

            firstCenter.setCartesian3v(firstCenterCart);

        } else {
            let center = new Entity({
                geoObject: CENTER_OPTIONS,
            });
            center.addTo(this._centerLayer);
            this._centersArr.push(center);
        }
    }

    _onMouseDblClick(e) {

        if (this._isReadOnly || !this._showGhostPointer) return;

        let cart = this._planet.getCartesianFromMouseTerrain();
        if (cart) {
            if (this._insertCornerIndex === -1 || this._cornersArr.length < 2) {
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
            if (!this._isStartPoint && this._cornersArr.length > 2) {
                this._isStartPoint = true;
                this.events.dispatch(this.events.startpoint, this);
            }
            this.events.dispatch(this.events.change, this);
        }
    }

    onremove() {
        this.stopNewPoint();
        this._clearEvents();
        this.clear();
    }

    _clearEvents() {
        this.events.off("ldown", this._onLdown_);
        this._onLdown_ = null;

        this.renderer.events.off("mousemove", this._onMouseMove_);
        this._onMouseMove_ = null;

        this.renderer.events.off("lup", this._onLup_);
        this._onLup_ = null;

        this._cornerLayer.events.off("mouseenter", this._onCornerMouseEnter_);
        this._onCornerMouseEnter_ = null;

        this._cornerLayer.events.off("mouseleave", this._onCornerMouseLeave_);
        this._onCornerMouseLeave_ = null;

        this._centerLayer.events.off("mouseenter", this._onCenterMouseEnter_);
        this._onCenterMouseEnter_ = null;

        this._centerLayer.events.off("mouseleave", this._onCenterMouseLeave_);
        this._onCenterMouseLeave_ = null;
    }

    clear() {

        this._initArea = this.getCoordinates();

        let i = this._cornersArr.length;
        while (i--) {
            this._cornersArr[i].remove();
        }
        this._cornersArr = [];

        i = this._centersArr.length;
        while (i--) {
            this._centersArr[i].remove();
        }
        this._centersArr = [];

        let entities = this._outlineLayer.getEntities();
        i = entities.length;
        while (i--) {
            entities[i].polyline.clear();
            if (i > 0) {
                entities[i].remove();
            }
        }

        //this._trackEntity.polyline.clear();
    }

    setCoordinates(coords) {
        for (let i = 0; i < coords.length; i++) {
            let ci = coords[i];
            let cart = this._planet.ellipsoid.lonLatToCartesian(new LonLat(ci[0], ci[1], ci[2]));
            this._appendCart(cart);
        }
    }

    _drawCorners() {
        let len = this._cornersArr.length;
        for (let i = 0; i < len; i++) {
            let ai = this._cornersArr[i];
            this._checkTerrainCollision(ai);
        }
    }

    _drawCenters() {
        let len = this._centersArr.length;
        for (let i = 0; i < len; i++) {
            let ai = this._centersArr[i];
            this._checkTerrainCollision(ai);
        }
    }

    _drawGhostCorner() {
        if (this._showGhostPointer) {
            this._checkTerrainCollision(this._ghostCorner);
        }
    }

    frame() {
        if (!this._isReadOnly) {
            this._drawCorners();
            this._drawCenters();
            this._drawGhostCorner();
        }
    }

    stopNewPoint() {
        if (this.renderer) {
            this.renderer.events.off("ldblclick", this._onMouseDblClick_);
            this._onMouseDblClick_ = null;
        }
    }

    startNewPoint() {
        this._onMouseDblClick_ = this._onMouseDblClick.bind(this);
        this.renderer.events.on("ldblclick", this._onMouseDblClick_, this);
    }

    showGhostPointer() {
        this._showGhostPointer = true;
        this._planet.addLayer(this._ghostOutlineLayer);
        this._insertCornerIndex = this._cornersArr.length;
    }

    hideGhostPointer() {
        this._showGhostPointer = false;
        this._ghostOutlineLayer.remove();
        this._insertCornerIndex = -1;
    }

    setGhostPointerPosition(groundPos) {
        if (!this._isReadOnly && groundPos) {
            this._ghostCorner.setCartesian3v(groundPos);
            this._updateGhostOutlinePointer(groundPos);
        }
    }

    _checkTerrainCollision(entity) {
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


export { DrawingScene };
