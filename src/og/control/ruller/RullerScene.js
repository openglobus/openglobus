'use strict';

import * as math from '../../math.js';
import { RenderNode } from '../../scene/RenderNode.js';
import { Events } from '../../Events.js';
import { LonLat } from '../../LonLat.js';
import { Vec3 } from '../../math/Vec3.js';
import { Vec2 } from '../../math/Vec2.js';
import { Vector } from '../../layer/Vector.js';
import { Entity } from '../../entity/Entity.js';

const OUTLINE_COUNT = 100;

class RullerScene extends RenderNode {
    constructor(options = {}) {
        super(options.name);

        this.events = new Events(EVENT_NAMES);

        this._planet = options.planet || null;

        this._startPos = null;
        this._startClick = new Vec2();

        this._trackEntity = new Entity({
            polyline: {
                path3v: [],
                thickness: 3,
                color: "yellow",
                isClosed: false
            }
        });

        this._trackEntity.polyline.altitude = 2;

        this._trackLayer = new Vector("photo-outline", {
            entities: [this._trackEntity],
            pickingEnabled: false,
            polygonOffsetUnits: 0,
            relativeToGround: true
        });

        this._length = 0;
    }

    get length() {
        return this._length;
    }

    bindPlanet(planet) {
        this._planet = planet;
    }

    init() {

        this._onLclick_ = this._onLclick.bind(this);
        this.renderer.events.on("lclick", this._onLclick_, this);

        this._onMouseMove_ = this._onMouseMove.bind(this);
        this.renderer.events.on("mousemove", this._onMouseMove_, this);

        this._planet.addLayer(this._trackLayer);
    }

    _updateGhostOutlinePointer(groundPos) {

        // let size = this._cornersArr.length;
        //
        // if (size > 0) {
        //
        //     let cartNext = this._cornersArr[this._cornersArr.length - 1].getCartesian();
        //     let vecNext = this._ghostCorner.getCartesian().sub(cartNext);
        //     let distNext = vecNext.length();
        //
        //     vecNext.normalize();
        //
        //     let pathNext = [];
        //
        //     for (let i = 0; i <= OUTLINE_COUNT; i++) {
        //         let f = vecNext.scaleTo(i * distNext / OUTLINE_COUNT).addA(cartNext);
        //         pathNext.push(f);
        //     }
        //
        //     this._ghostOutlineLayer.getEntities()[0].polyline.setPath3v([pathNext]);
        // }
    }

    _onLclick(e) {

        console.log("click");

        // e.renderer.controls.mouseNavigation.deactivate();
        // this._startClick.set(e.x, e.y);
        // let coords = e.pickingObject.getCartesian();
        // this._startPos = this._planet.getPixelFromCartesian(coords);
        //
        // if (e.pickingObject instanceof AreaCenter) {
        //     this._pickedCenter = e.pickingObject;
        // } else if (e.pickingObject instanceof AreaCorner) {
        //     this._pickedCorner = e.pickingObject;
        // }
    }

    _onMouseMove(e) {

        // if (this._pickedCorner) {
        //
        //     let d = new Vec2(e.x, e.y).sub(this._startClick),
        //         p = this._startPos.add(d);
        //
        //     let groundCoords = this._planet.getCartesianFromPixelTerrain(p, true);
        //
        //     if (groundCoords) {
        //
        //         this._pickedCorner.setCartesian(groundCoords);
        //
        //         if (this._cornersArr.length) {
        //             let ind = this._pickedCorner.index;
        //             let size = this._cornersArr.length;
        //
        //             let cPrev = this._cornersArr[ind - 1],
        //                 cNext = this._cornersArr[ind + 1];
        //
        //             let entities = this._outlineLayer.getEntities();
        //
        //             if (cPrev) {
        //                 let cartPrev = cPrev.getCartesian();
        //                 let vecPrev = this._pickedCorner.getCartesian().sub(cartPrev);
        //                 let distPrev = vecPrev.length();
        //                 vecPrev.normalize();
        //
        //                 let pathPrev = [];
        //                 for (let i = 0; i <= OUTLINE_COUNT; i++) {
        //                     let p = vecPrev.scaleTo(i * distPrev / OUTLINE_COUNT).addA(cartPrev);
        //                     pathPrev.push(p);
        //                 }
        //
        //                 let prevPolyline = entities[ind].polyline;
        //                 prevPolyline.setPath3v([pathPrev]);
        //
        //                 //
        //                 // Move center points
        //                 let prevCenter = this._centersArr[ind - 1];
        //                 let prevCenterCart = vecPrev.scaleTo(distPrev * 0.5).addA(cartPrev);
        //
        //                 prevCenter.setCartesian(prevCenterCart);
        //                 prevCenter.checkTerrainCollision();
        //             }
        //
        //             if (cNext) {
        //                 let cartNext = cNext.getCartesian();
        //                 let vecNext = this._pickedCorner.getCartesian().sub(cartNext);
        //                 let distNext = vecNext.length();
        //                 vecNext.normalize();
        //
        //                 let pathNext = [];
        //                 for (let i = 0; i <= OUTLINE_COUNT; i++) {
        //                     let f = vecNext.scaleTo(i * distNext / OUTLINE_COUNT).addA(cartNext);
        //                     pathNext.push(f);
        //                 }
        //
        //                 let nextPolyline = entities[(ind + 1) % size].polyline;
        //                 nextPolyline.setPath3v([pathNext]);
        //
        //                 //
        //                 // Move center points
        //                 let nextCenter = this._centersArr[ind];
        //                 let nextCenterCart = vecNext.scaleTo(distNext * 0.5).addA(cartNext);
        //                 nextCenter.setCartesian(nextCenterCart);
        //                 nextCenter.checkTerrainCollision();
        //             }
        //         }
        //     }
        // }
    }

    onremove() {
        this.renderer.events.off("lclick", this._onLclick_);
        this.renderer.events.off("mousemove", this._onMouseMove_);
        this.clear();
    }

    clear() {
        // удаляем трек
        this._trackEntity.polyline.clear();
    }

    frame() {
        //this._drawGhostCorner();
    }

    // setActive(active) {
    //     if (this._isActive != active) {
    //         super.setActive(active);
    //         if (this._isActive && this._pickingCallbackId === -1) {
    //             this._pickingCallbackId = this.renderer.addPickingCallback(this, this._drawPicking);
    //         } else if (!this._isActive && this._pickingCallbackId !== -1) {
    //             this.renderer.removePickingCallback(this._pickingCallbackId);
    //             this._pickingCallbackId = -1;
    //         }
    //     }
    // }

    get ellipsoid() {
        return this._planet ? this._planet.ellipsoid : null;
    }
}

const EVENT_NAMES = [
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

export { RullerScene };