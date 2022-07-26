'use strict';

import * as math from '../../math.js';
import { RenderNode } from '../../scene/RenderNode.js';
import { Events } from '../../Events.js';
import { LonLat } from '../../LonLat.js';
import { Vec3 } from '../../math/Vec3.js';
import { Vec2 } from '../../math/Vec2.js';
import { Vector } from '../../layer/Vector.js';
import { Entity } from '../../entity/Entity.js';
import { Ellipsoid } from '../../ellipsoid/Ellipsoid.js';

const OUTLINE_COUNT = 100;

class RullerScene extends RenderNode {
    constructor(options = {}) {
        super(options.name);

        this.events = new Events(EVENT_NAMES);

        this._planet = options.planet || null;

        this._startPos = null;
        this._startLonLat = null;
        this._preventClick = false;
        this._stopDrawing = false;

        this._propsLabel = new Entity({
            'name': 'propsLabel',
            'label': {
                text: "123 m, 320 deg",
                size: 12,
                color: "rgba(355,355,355,1.0)",
                outlineColor: "rgba(0,0,0,1.0)",
                outline: 0.0,
                align: "center",
                offset: [0, -15]
            }
        });

        this._propsLabel.label.setVisibility(false);

        this._trackEntity = new Entity({
            polyline: {
                path3v: [],
                thickness: 3.8,
                color: "yellow",
                isClosed: false
            }
        });

        this._trackEntity.polyline.altitude = 2;

        this._trackLayer = new Vector("photo-outline", {
            entities: [this._trackEntity, this._propsLabel],
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
        this._activate();
    }

    onremove() {
        this._deactivate();
    }

    _activate() {
        this._propsLabel.label.setVisibility(false);
        this._onLclick_ = this._onLclick.bind(this);
        this.renderer.events.on("lclick", this._onLclick_, this);
        this._onMouseMove_ = this._onMouseMove.bind(this);
        this.renderer.events.on("mousemove", this._onMouseMove_, this);
        this._onLdblclick_ = this._onLdblclick.bind(this);
        this.renderer.events.on("ldblclick", this._onLdblclick_, this);

        this._planet.addLayer(this._trackLayer);
    }

    _deactivate() {
        this._startPos = null;
        this._startLonLat = null;
        this._preventClick = false;
        this._stopDrawing = false;
        this._trackLayer.remove();
        this.renderer.events.off("lclick", this._onLclick_);
        this.renderer.events.off("mousemove", this._onMouseMove_);
        this.clear();
        this._onLclick_ = null;
        this._onMouseMove_ = null;
    }

    _onLdblclick() {
        this._preventClick = true;
    }

    _onLclick(e) {
        let startLonLat = this._planet.getLonLatFromPixelTerrain(e);
        this._timeout = setTimeout(() => {
            if (!this._preventClick) {
                if (!this._startPos) {
                    this._stopDrawing = false;
                    this._propsLabel.label.setVisibility(false);
                    this._trackEntity.polyline.setPath3v([]);

                    this._startLonLat = startLonLat;
                    this._startPos = this._planet.ellipsoid.lonLatToCartesian(this._startLonLat);
                } else {
                    this._startPos = null;
                    this._startLonLat = null;
                }
            }
            this._preventClick = false;
            this._stopDrawing = false;
            clearTimeout(this._timeout);
        }, 200);

        if (this._startPos) {
            this._stopDrawing = true;
        }
    }

    _onMouseMove(e) {
        if (this._startPos && !this._stopDrawing) {
            this._propsLabel.label.setVisibility(true);
            let endLonLat = this._planet.getLonLatFromPixelTerrain(e);
            if (!endLonLat) return;

            let endPos = this._planet.ellipsoid.lonLatToCartesian(endLonLat);

            //
            // Rhumb path
            //
            // let path = [];
            // let length = this._planet.ellipsoid.rhumbDistanceTo(this._startLonLat, endLonLat);
            let length = this._planet.ellipsoid.getGreatCircleDistance(this._startLonLat, endLonLat);
            let heading = Ellipsoid.getRhumbBearing(this._startLonLat, endLonLat);
            //
            // let prevLonLat = this._startLonLat;
            // for (let i = 0; i < OUTLINE_COUNT; i++) {
            //     prevLonLat = this._planet.ellipsoid.getBearingDestination(prevLonLat, heading, length / OUTLINE_COUNT);
            //     let f = this._planet.ellipsoid.lonLatToCartesian(prevLonLat);
            //     path.push(f);
            // }
            // path.push(endPos);

            //
            // Great circle path
            //
            let path2 = [];
            let dir = endPos.sub(this._startPos);
            let dist2 = dir.length();
            dir.normalize();

            for (let i = 0; i < OUTLINE_COUNT; i++) {
                let f = dir.scaleTo(i * dist2 / OUTLINE_COUNT).addA(this._startPos);
                path2.push(f);
            }
            path2.push(endPos);

            this._trackEntity.polyline.setPath3v([path2]);

            this._propsLabel.setCartesian3v(path2[Math.floor(path2.length / 2)]);
            this._propsLabel.label.setText(`${Math.round(length)} m, ${Math.round(heading)} deg`);
        }
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