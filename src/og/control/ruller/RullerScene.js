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
import { Object3d } from '../../Object3d.js';
import * as utils from "../../utils/shared.js";

const OUTLINE_COUNT = 120;

class RullerScene extends RenderNode {
    constructor(options = {}) {
        super(options.name);

        this.events = new Events(EVENT_NAMES);

        this._planet = options.planet || null;

        this._startLonLat = null;
        this._preventClick = false;
        this._stopDrawing = false;

        this._pickedCorner = null;
        this._startPos = null;
        this._startClick = new Vec2();

        this._propsLabel = new Entity({
            'name': 'propsLabel',
            'label': {
                text: "",
                size: 11,
                color: "rgba(455,455,455,1.0)",
                outlineColor: "rgba(0,0,0,0.34)",
                outline: 0.23,
                align: "center",
                offset: [0, 18]
            }
        });

        this._propsLabel.label.setVisibility(false);

        this._trackEntity = new Entity({
            polyline: {
                path3v: [],
                thickness: 3.8,
                color: "rgb(455,455,455)",
                isClosed: false
            }
        });

        this._trackEntity.polyline.altitude = 2;

        let obj3d = Object3d.createCylinder(1.5, 0, 5, 20, 1, true, false, 0, -3.5, 0)

        this._cornerEntity = [
            new Entity({
                geoObject: {
                    scale: 1,
                    instanced: true,
                    tag: "ruller",
                    color: "rgb(0,305,0)",
                    vertices: obj3d.vertices,
                    indices: obj3d.indexes,
                    normals: obj3d.normals
                },
                properties: {
                    name: "start"
                }
            }),
            new Entity({
                geoObject: {
                    scale: 1,
                    instanced: true,
                    tag: "ruller",
                    color: "rgb(455,0,0)",
                    vertices: obj3d.vertices,
                    indices: obj3d.indexes,
                    normals: obj3d.normals
                },
                properties: {
                    name: "end"
                }

            })
        ];

        this._trackLayer = new Vector("track", {
            entities: [this._trackEntity, this._propsLabel],
            pickingEnabled: false,
            polygonOffsetUnits: 0,
            relativeToGround: true
        });

        this._cornersLayer = new Vector("corners", {
            entities: [this._cornerEntity[0], this._cornerEntity[1]],
            pickingEnabled: true
        });
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

        this._onCornerEnter_ = this._onCornerEnter.bind(this);
        this._cornersLayer.events.on("mouseenter", this._onCornerEnter_, this);

        this._onCornerLeave_ = this._onCornerLeave.bind(this);
        this._cornersLayer.events.on("mouseleave", this._onCornerLeave_, this);

        this._onCornerLdown_ = this._onCornerLdown.bind(this);
        this._cornersLayer.events.on("ldown", this._onCornerLdown_, this);

        this._onCornerLup_ = this._onCornerLup.bind(this);
        this._cornersLayer.events.on("lup", this._onCornerLup, this);

        this._planet.addLayer(this._trackLayer);
        this._planet.addLayer(this._cornersLayer);
    }

    _deactivate() {
        this._startLonLat = null;
        this._preventClick = false;
        this._stopDrawing = false;
        this._pickedCorner = null;
        this._trackLayer.remove();
        this._cornersLayer.remove();
        this.renderer.events.off("lclick", this._onLclick_);
        this.renderer.events.off("mousemove", this._onMouseMove_);
        this._cornersLayer.events.off("mouseenter", this._onCornerEnter_);
        this._cornersLayer.events.off("mouseleave", this._onCornerLeave_);
        this._cornersLayer.events.off("ldown", this._onCornerLdown_);
        this._cornersLayer.events.off("lup", this._onCornerLup_);

        this.clear();

        this._onLclick_ = null;
        this._onMouseMove_ = null;
        this._onCornerLeave_ = null;
        this._onCornerEnter_ = null;
        this._onCornerLdown_ = null;
        this._onCornerLup_ = null;
    }

    _onCornerLdown(e) {
        if (!this._startLonLat) {
            this.renderer.controls.mouseNavigation.deactivate();
            this._startClick.set(e.x, e.y);
            let coords = e.pickingObject.getCartesian();
            this._startPos = this._planet.getPixelFromCartesian(coords);
            this._pickedCorner = e.pickingObject;
            if (e.pickingObject.properties.name == "start") {
                this._anchorLonLat = this._cornerEntity[1].getLonLat().clone();
            } else {
                this._anchorLonLat = this._cornerEntity[0].getLonLat().clone();
            }
        }
    }

    _onCornerLup(e) {
        if (this._pickedCorner) {
            this.renderer.controls.mouseNavigation.activate();
            this._pickedCorner = null;
            this._anchorLonLat = null;
        }
    }

    _onCornerEnter(e) {
        e.renderer.handler.canvas.style.cursor = "pointer";
    }

    _onCornerLeave(e) {
        e.renderer.handler.canvas.style.cursor = "default";
    }

    _onLdblclick() {
        this._preventClick = true;
    }

    _onLclick(e) {
        let startLonLat = this._planet.getLonLatFromPixelTerrain(e);
        this._timeout = setTimeout(() => {
            if (!this._preventClick) {
                if (!this._startLonLat) {
                    this._stopDrawing = false;
                    this._propsLabel.label.setVisibility(false);
                    this._trackEntity.polyline.setPath3v([]);
                    this._cornerEntity[0].geoObject.setVisibility(true);
                    this._cornerEntity[1].geoObject.setVisibility(true);
                    this._startLonLat = startLonLat;
                } else {
                    this._startLonLat = null;
                }
            }
            this._preventClick = false;
            this._stopDrawing = false;
            clearTimeout(this._timeout);
        }, 200);

        if (this._startLonLat) {
            this._stopDrawing = true;
        }
    }

    _drawLine(startLonLat, endLonLat, startPos) {

        if (!startPos) {
            startPos = this._planet.ellipsoid.lonLatToCartesian(startLonLat);
        }

        let endPos = this._planet.ellipsoid.lonLatToCartesian(endLonLat);

        let length = this._planet.ellipsoid.getGreatCircleDistance(startLonLat, endLonLat);
        let heading = Ellipsoid.getRhumbBearing(startLonLat, endLonLat);

        let path = [];
        let dir = endPos.sub(startPos);
        let dist = dir.length();
        dir.normalize();

        for (let i = 0; i < OUTLINE_COUNT; i++) {
            let f = dir.scaleTo(i * dist / OUTLINE_COUNT).addA(startPos);
            path.push(f);
        }
        path.push(endPos);

        this._trackEntity.polyline.setPath3v([path]);
        this._propsLabel.setCartesian3v(path[Math.floor(path.length / 2)]);
        this._propsLabel.label.setText(`${Math.round(length)} m, ${Math.round(heading)} deg`);
    }

    _onMouseMove(e) {
        if (this._startLonLat && !this._stopDrawing) {
            this._propsLabel.label.setVisibility(true);
            let endLonLat = this._planet.getLonLatFromPixelTerrain(e);
            if (!endLonLat) return;
            this._drawLine(this._startLonLat, endLonLat);
        } else if (this._pickedCorner) {
            let newLonLat = this._planet.getLonLatFromPixelTerrain(e);
            if (newLonLat) {
                if (this._pickedCorner.properties.name === "start") {
                    this._drawLine(newLonLat, this._anchorLonLat);
                } else {
                    this._drawLine(this._anchorLonLat, newLonLat);
                }
            }
        }
    }

    clear() {
        // удаляем трек
        this._trackEntity.polyline.clear();
        this._cornerEntity[0].geoObject.setVisibility(false);
        this._cornerEntity[1].geoObject.setVisibility(false);
    }

    getScale(cart) {
        const MAX_SCALE = 0.005;
        const MIN_SCALE = 0.001;
        const MAX_SCALE_HEIGHT = 3000.0;
        const MIN_SCALE_HEIGHT = 1900000.0;

        let r = this.renderer;
        let t = 1.0 - (r.activeCamera._lonLat.height - MAX_SCALE_HEIGHT) / (MIN_SCALE_HEIGHT - MAX_SCALE_HEIGHT);
        let _distanceToCamera = cart.distance(r.activeCamera.eye);
        return math.lerp(t < 0 ? 0 : t, MAX_SCALE, MIN_SCALE) * _distanceToCamera;
    }

    frame() {
        let t = this._trackEntity.polyline.getPath3v()[0];
        if (t) {
            this._cornerEntity[0].setCartesian3v(t[0].clone());
            this._cornerEntity[1].setCartesian3v(t[t.length - 1].clone());

            this._cornerEntity[0].geoObject.setScale(this.getScale(this._cornerEntity[0].getCartesian()));
            this._cornerEntity[1].geoObject.setScale(this.getScale(this._cornerEntity[1].getCartesian()));
        }
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