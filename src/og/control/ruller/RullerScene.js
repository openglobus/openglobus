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
        this._startLonLat = null;

        this._trackEntity = new Entity({
            polyline: {
                path3v: [],
                thickness: 3.4,
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

    _onLclick(e) {
        if (!this._startPos) {
            this._startLonLat = this._planet.getLonLatFromPixelTerrain(e);
            this._startPos = this._planet.ellipsoid.lonLatToCartesian(this._startLonLat);
        } else {
            this._startPos = null;
            this._startLonLat = null;
        }
    }

    _onMouseMove(e) {
        if(this._startPos) {
            let endLonLat = this._planet.getLonLatFromPixelTerrain(e);
            let endPos = this._planet.ellipsoid.lonLatToCartesian(endLonLat);
            let dir = endPos.sub(this._startPos);
            let dist = dir.length();
            dir.normalize();

            let path = [];

            for (let i = 0; i <= OUTLINE_COUNT; i++) {
                let f = dir.scaleTo(i * dist / OUTLINE_COUNT).addA(this._startPos);
                path.push(f);
            }

            this._trackEntity.polyline.setPath3v([path]);
        }
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