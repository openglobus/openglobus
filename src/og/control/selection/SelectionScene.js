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

const OUTLINE_COUNT = 120;

const MAX_SCALE = 0.005;
const MIN_SCALE = 0.001;
const MAX_SCALE_HEIGHT = 3000.0;
const MIN_SCALE_HEIGHT = 19000000.0;

function distanceFormat(v) {
    if (v > 1000) {
        return `${(v / 1000).toFixed(1)} km`;
    } else if (v > 9) {
        return `${Math.round(v)} m`;
    } else {
        return `${v.toFixed(1)} m`;
    }
}

class SelectionScene extends RenderNode {
    constructor(options = {}) {
        super(options.name);

        this.events = new Events(EVENT_NAMES);

        this._ignoreTerrain = options.ignoreTerrain != undefined ? options.ignoreTerrain : true;

        this._onSelect = options.onSelect || null;

        this._autoSelectionHide = options.autoSelectionHide || false;

        this._planet = options.planet || null;

        this._startLonLat = null;

        this._heading = 0;

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

        this._trackEntity.polyline.altitude = 0.01;

        let obj3d = Object3d.createCylinder(1.1, 0, 2.7, 20, 1, true, false, 0, 0, 0)

        this._cornerEntity = [
            new Entity({
                geoObject: {
                    scale: 1,
                    instanced: true,
                    tag: "selection",
                    color: "rgb(0,305,0)",
                    object3d: obj3d
                },
                properties: {
                    name: "start"
                }
            }),
            new Entity({
                geoObject: {
                    scale: 1,
                    instanced: true,
                    tag: "selection",
                    color: "rgb(455,0,0)",
                    object3d: obj3d
                },
                properties: {
                    name: "end"
                }
            })
        ];

        this._trackLayer = new Vector("track", {
            entities: [this._trackEntity, this._propsLabel],
            pickingEnabled: false,
            polygonOffsetUnits: -1.0,
            relativeToGround: true,
            displayInLayerSwitcher: false
        });

        this._cornersLayer = new Vector("corners", {
            entities: [this._cornerEntity[0], this._cornerEntity[1]],
            pickingEnabled: true,
            displayInLayerSwitcher: false,
            scaleByDistance: [1.0, 4000000, 0.01],
            pickingScale: 2
        });
    }

    set ignoreTerrain(v) {
        this._ignoreTerrain = v;
        if (v) {
            //...redraw line
        }
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

        this._onMouseMove_ = this._onMouseMove.bind(this);
        this.renderer.events.on("mousemove", this._onMouseMove_, this);

        this._onMouseLdown_ = this._onMouseLdown.bind(this);
        this.renderer.events.on("ldown", this._onMouseLdown_, this);

        this._onMouseLup_ = this._onMouseLup.bind(this);
        this.renderer.events.on("lup", this._onMouseLup_, this);

        this._planet.addLayer(this._trackLayer);

        this._planet.addLayer(this._cornersLayer);

    }

    _deactivate() {
        this._startLonLat = null;
        this._trackLayer.remove();
        this._cornersLayer.remove();
        this.renderer.events.off("mousemove", this._onMouseMove_);
        this.renderer.events.off("ldown", this._onMouseLdown_);
        this.renderer.events.off("lup", this._onMouseLup_);

        this.clear();

        this._onMouseMove_ = null;
        this._onMouseLdown_ = null;
        this._onMouseLup_ = null;
    }

    _onMouseLdown(e) {

        //workaround to show pointer, because ogGrabbingPoiner keep !importanti which override pointer style
        e.renderer.handler.canvas.classList.remove('ogGrabbingPoiner');

        e.renderer.handler.canvas.style.cursor = 'pointer';

        if (!this._startLonLat) {


            this._propsLabel.label.setVisibility(false);

            this._trackEntity.polyline.setPath3v([]);


            this._cornerEntity[0].geoObject.setVisibility(true);
            this._cornerEntity[1].geoObject.setVisibility(true);

            this.renderer.controls.mouseNavigation.deactivate();
            this._startLonLat = this._planet.getLonLatFromPixelTerrain(e);

            let startPos = this._planet.ellipsoid.lonLatToCartesian(this._startLonLat);
            this._cornerEntity[0].setCartesian3v(startPos);
            this._cornerEntity[1].setCartesian3v(startPos);
        }
    }

    _onMouseLup(e) {
        if (this._startLonLat) {

            this._pickedCorner = null;
            this._anchorLonLat = null;

            this._propsLabel.label.setVisibility(true);

            if (this._onSelect && typeof this._onSelect === 'function') {
                let startLonLat = this._cornerEntity[0].getLonLat();
                let endLonLat = this._cornerEntity[1].getLonLat();

                let extent = [
                    Math.min(startLonLat.lon, endLonLat.lon),
                    Math.min(startLonLat.lat, endLonLat.lat),
                    Math.max(startLonLat.lon, endLonLat.lon),
                    Math.max(startLonLat.lat, endLonLat.lat)
                ];
                this._onSelect(extent);
            }

            if (this._autoSelectionHide) {
                this.clear();
            }

            this._startLonLat = null;
        }
        e.renderer.handler.canvas.style.cursor = 'default';
        this.renderer.controls.mouseNavigation.activate();
    }

    _drawLine(startLonLat, endLonLat, startPos) {

        if (!startPos) {
            startPos = this._planet.ellipsoid.lonLatToCartesian(startLonLat);
        }

        let endPos = this._planet.ellipsoid.lonLatToCartesian(endLonLat);

        let length = this._planet.ellipsoid.getGreatCircleDistance(startLonLat, endLonLat);

        this._heading = Ellipsoid.getRhumbBearing(startLonLat, endLonLat);

        let path = [];


        this._cornerEntity[0].setCartesian3v(startPos);
        this._cornerEntity[1].setCartesian3v(endPos);


        let corners = [
            startPos,
            this._planet.ellipsoid.lonLatToCartesian(new LonLat(endLonLat.lon, startLonLat.lat, startLonLat.height)),
            endPos,
            this._planet.ellipsoid.lonLatToCartesian(new LonLat(startLonLat.lon, endLonLat.lat, startLonLat.height)),
            startPos
        ];


        path.push(startPos);

        let createPath = (sideA, sideB) => {
            let dir = sideB.sub(sideA);
            let dist = dir.length();
            dir.normalize();

            for (let i = 0; i < OUTLINE_COUNT; i++) {
                let f = dir.scaleTo(i * dist / OUTLINE_COUNT).addA(sideA);
                path.push(f);
            }
        };

        for (let i = 0; i < corners.length - 1; i++) {
            createPath(corners[i], corners[i + 1]);
        }

        this._trackEntity.polyline.setPath3v([path]);

        if (this._ignoreTerrain) {
            // this._propsLabel.setCartesian3v(path[Math.floor(path.length / 2)]);
            // this._propsLabel.label.setText(`${distanceFormat(length)}, ${Math.round(this._heading)} deg`);
        }
    }

    _onMouseMove(e) {
        if (this._startLonLat) {
            this._propsLabel.label.setVisibility(true);
            let endLonLat = this._planet.getLonLatFromPixelTerrain(e);
            if (!endLonLat)
                return;
            this._drawLine(this._startLonLat, endLonLat);
        }
    }

    clear() {
        this._trackEntity.polyline.clear();
        this._cornerEntity[0].geoObject.setVisibility(false);
        this._cornerEntity[1].geoObject.setVisibility(false);
    }

    frame() {
        let t = this._trackEntity.polyline.getPath3v()[0];
        if (t) {
            if (!this._ignoreTerrain) {
                let res = 0;
                for (let i = 0, len = t.length - 1; i < len; i++) {
                    res += t[i + 1].distance(t[i]);
                }

                this._propsLabel.setCartesian3v(t[Math.floor(t.length / 2)]);
                this._propsLabel.label.setText(`${distanceFormat(res)}, ${Math.round(this._heading)} deg`);
            }
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

export { SelectionScene };