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

const OUTLINE_ALT = 2.0;

let obj3d = Object3d.createCylinder(1, 1, 2.7, 20, 1, true, false, 0, 0, 0)

const LABEL_OPTIONS = {
    text: "",
    size: 11,
    color: "rgba(455,455,455,1.0)",
    outlineColor: "rgba(0,0,0,0.34)",
    outline: 0.23,
    align: "center",
    offset: [0, 20]
};

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

        this.scaleByDistance = new Float32Array([math.MAX32, math.MAX32, math.MAX32]);

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
            relativeToGround: true
        });

        this._centerLayer = new Vector("centers", {
            entities: [],
            pickingEnabled: true,
            polygonOffsetUnits: 0,
            relativeToGround: true
        });

        this._trackEntity = new Entity({
            polyline: {
                path3v: [],
                thickness: 4.2,
                color: "white",
                isClosed: false
            }
        });

        this._trackEntity.polyline.altitude = 2;

        this._trackLayer = new Vector("cam-coords", {
            entities: [this._trackEntity],
            pickingEnabled: false,
            polygonOffsetUnits: 0,
            relativeToGround: true
        });

        //
        // Ghost cursor pointer
        //
        this._ghostCorner = new Entity({
            geoObject: CORNER_OPTIONS,
        });

        this._ghostOutlineLayer = new Vector("ghost-outline", {
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
            opacity: 0.25
        });

        this._ghostOutlineLayer.getEntities()[0].polyline.altitude =
            this._ghostOutlineLayer.getEntities()[1].polyline.altitude = OUTLINE_ALT;

        this._showGhostPointer = false;

        this._isStartPoint = false;

        this._isReadOnly = false;

        this._insertCornerIndex = -1;
    }

    init() {

        this.events.on("mouseenter", (e) => {
            e.renderer.handler.canvas.style.cursor = "pointer";
        });

        this.events.on("mouseleave", (e) => {
            e.renderer.handler.canvas.style.cursor = "default";
        });

        this._onLdown_ = this._onLdown.bind(this);
        this.events.on("ldown", this._onLdown_, this);

        this._onLup_ = this._onLup.bind(this);
        this.renderer.events.on("lup", this._onLup_, this);

        this._onMouseMove_ = this._onMouseMove.bind(this);
        this.renderer.events.on("mousemove", this._onMouseMove_, this);

        this._cornerLayer.events.on("mouseenter", this._onCornerMouseEnter_, this);
        this._cornerLayer.events.on("mouseleave", this._onCornerMouseLeave_, this);
        this._centerLayer.events.on("mouseenter", this._onCenterMouseEnter_, this);
        this._centerLayer.events.on("mouseleave", this._onCenterMouseLeave_, this);

        // if (this._initArea) {
        //     this.setArea(this._initArea);
        // }

        this._planet.addLayer(this._outlineLayer);

        this._planet.addLayer(this._trackLayer);
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
        this._isCorner = true;
    }

    _onCornerMouseLeave(e) {
        this._isCorner = false;
    }

    _onCenterMouseEnter(e) {
        this._isCenter = true;
    }

    _onCenterMouseLeave(e) {
        this._isCenter = false;
    }

    _onLdown(e) {
        e.renderer.controls.mouseNavigation.deactivate();
        this._startClick.set(e.x, e.y);
        let coords = e.pickingObject.getCartesian();
        this._startPos = this._planet.getPixelFromCartesian(coords);

        if (this._isCenter) {
            this._pickedCenter = e.pickingObject;
        } else if (this._isCorner) {
            this._pickedCorner = e.pickingObject;
        }
    }

    _onLup(e) {
        e.renderer.controls.mouseNavigation.activate();
        if (this._pickedCorner || this._pickedCenter) {
            this.events.dispatch(this.events.change, this);
            this._pickedCorner = null;
            this._pickedCenter = null;
        }
    }

    _onMouseMove(e) {
        if (this._pickedCenter) {

            let area = this.getCoordinatesArray(),
                index = this._pickedCenter._sceneIndex + 1,
                ll = this._pickedCenter.getLonLat();
            let newCorner = [ll.lon, ll.lat, ll.height];

            area.splice(index, 0, newCorner);

            this.clear();
            this.setArea(area);

            this._pickedCenter = null;

            this._pickedCorner = this._cornersArr[index];

        } else if (this._pickedCorner) {

            let d = new Vec2(e.x, e.y).sub(this._startClick),
                p = this._startPos.add(d);

            let groundCoords = this._planet.getCartesianFromPixelTerrain(p);

            if (groundCoords) {

                this._pickedCorner.setCartesian(groundCoords);

                if (this._cornersArr.length) {
                    let ind = this._pickedCorner.index;
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

                    prevCenter.setCartesian(prevCenterCart);
                    this._checkTerrainCollision(prevCenter);

                    nextCenter.setCartesian(nextCenterCart);
                    this._checkTerrainCollision(nextCenter);
                }
            }
        }
    }

    _appendCart(cart) {
        let segNum = this._cornersArr.length - 1;
        let prevCorn = this._cornersArr[segNum];


        let corner = new Entity({
            geoObject: CORNER_OPTIONS,
        });

        corner.setCartesian(cart);
        this._cornersArr.push(corner);
        corner.addTo(this._cornersLayer);
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
            center.setCartesian(prevCenterCart);
            center.addTo(this._centerLayer);
            this._checkTerrainCollision(center);

            firstCenter.moveToEnd();
            firstCenter.setCartesian(firstCenterCart);

        } else {
            let center = new Entity({
                geoObject: CENTER_OPTIONS,
            });
            center.addTo(this._centerLayer);
        }
    }

    _onMouseDblClick(e) {

        if (this._isReadOnly || !this._showGhostPointer) return;

        let cart = this._planet.getCartesianFromMouseTerrain();
        if (cart) {
            if (this._insertCornerIndex === -1 || this._cornersArr.length < 2) {
                this._appendCart(cart);
            } else {
                let area = this.getCoordinatesArray(),
                    index = this._insertCornerIndex;
                let ll = this._planet.ellipsoid.cartesianToLonLat(cart);
                let newCorner = [ll.lon, ll.lat, ll.height];
                area.splice(index, 0, newCorner);
                this.clear();
                this.setArea(area);
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
        this.events.off("ldown", this._onLdown_);
        this.renderer.events.off("mousemove", this._onMouseMove_);
        this.renderer.events.off("lup", this._onLup_);
        this.clear();
    }

    clear() {

        this._initArea = this.getCoordinatesArray();

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

        this._trackEntity.polyline.clear();
    }

    setArea(coords) {
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

    setActive(active) {
        if (this._isActive != active) {
            super.setActive(active);
            if (this._isActive) {
                this.startNewPoint();
            } else if (!this._isActive) {
                this.stopNewPoint();
            }
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
        this._planet.addLayer(this._ghostOutlineLayer);
        this._showGhostPointer = true;
        this._insertCornerIndex = this._cornersArr.length;
    }

    hideGhostPointer() {
        this._ghostOutlineLayer.remove();
        this._showGhostPointer = false;
        this._insertCornerIndex = -1;
    }

    setGhostPointerPosition(groundPos) {
        if (!this._isReadOnly) {
            this._ghostCorner.setCartesian(groundPos);
            this._updateGhostOutlinePointer(groundPos);
        }
    }

    _checkTerrainCollision(entity) {
        let _tempTerrPoint = new Vec3();
        let nodes = this._scene._planet._renderedNodes;
        for (let j = 0; j < nodes.length; j++) {
            let seg = nodes[j].segment;
            if (seg && seg._extentLonLat.isInside(entity.getLonLat())) {
                seg.getTerrainPoint(entity._cartesian, this._lonLatMerc, _tempTerrPoint);
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
