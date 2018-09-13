'use strict';

import { input } from '../../src/og/input/input.js';
import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { Vector } from '../../src/og/layer/Vector.js';
import { Entity } from '../../src/og/entity/Entity.js';
import { Control } from '../../src/og/control/Control.js';
import { Vec2 } from '../../src/og/math/Vec2.js';
import { Vec3 } from '../../src/og/math/Vec3.js';
import { Ray } from '../../src/og/math/Ray.js';
import { Sphere } from '../../src/og/bv/Sphere.js';


//Define custom control class
class PlannerControl extends Control {
    constructor(options) {
        super(options);

        this._pointLayer = null;
        this._spinLayer = null;
        this._pickingObject = null;
        this._startPos = null;
        this._startClick = new Vec2();
        this._grabbedSpheroid = new Sphere();

        this._container = null;

        this._pointCounter = 0;

        this._containerTemplate =
            '<div class="pl-list"></div>';

        this._pointTemplate =
            '<div class="pl-point">\
              <div class="pl-val pl-name">{id}</div>\
              <div class="pl-val pl-lon">{lon}</div>\
              <div class="pl-val pl-lat">{lat}</div>\
              <div class="pl-val pl-alt">{alt}</div>\
            </div>';
    }

    static replaceSubstring(template, params) {
        return template.replace(/{[^{}]+}/g, function (key) {
            return params[key.replace(/[{}]+/g, "")] || "";
        });
    }

    _createContainer() {
        let el = document.createElement('div');
        el.innerHTML = this._containerTemplate;
        this._container = el.childNodes[0];
        el.removeChild(el.childNodes[0]);
    }

    _createPointLayer() {

        this._pointLayer = new Vector("points", {
            'relativeToGround': true,
            'entities': [],
            'async': false
        });

        this._spinLayer = new Vector("spins", {
            'entities': [],
            'pickingEnabled': false
        });

        this._pointLayer.events.on("mouseenter", function (e) {
            e.renderer.handler.canvas.style.cursor = "pointer";
            e.pickingObject.properties.el.classList.add('pl-hover');            
        });

        this._pointLayer.events.on("mouseleave", function (e) {
            e.renderer.handler.canvas.style.cursor = "default";
            e.pickingObject.properties.el.classList.remove('pl-hover');            
        });

        let _this = this;
        this._pointLayer.events.on("ldown", function (e) {
            e.renderer.controls.mouseNavigation.deactivate();
            _this._startClick.set(e.x, e.y);
            _this._pickingObject = e.pickingObject;
            let coords = _this._pickingObject.getCartesian();
            _this._startPos = e.pickingObject.layer.planet.getPixelFromCartesian(coords);
            _this._grabbedSpheroid.radius = coords.length();
        });

        this._pointLayer.events.on("lup", function (e) {
            e.renderer.controls.mouseNavigation.activate();
            _this._pickingObject = null;
        });

        this.planet.addLayers([this._pointLayer, this._spinLayer]);

    }

    addPoint(lonlat) {

        this._pointCounter++;

        let id = this._pointLayer.getEntities().length.toFixed(0);

        let el = document.createElement('div');
        el.innerHTML = PlannerControl.replaceSubstring(this._pointTemplate, {
            'id': id,
            'lon': lonlat.lon.toFixed(5),
            'lat': lonlat.lat.toFixed(5),
            'alt': lonlat.height.toFixed(1)
        });
        let lineEl = el.childNodes[0];
        el.removeChild(lineEl);
        this._container.appendChild(lineEl);

        let spinEntity = new Entity({
            'name': id,
            'lonlat': lonlat,
            'polyline': {
                'pathLonLat': [[lonlat, lonlat]],
                'thickness': 1.5,
                'color': "white",
                'isClosed': false
            }
        });

        this._pointLayer.add(new Entity({
            'name': id,
            'lonlat': lonlat,
            'billboard': {
                'src': 'marker.png',
                'size': [22, 22],
                'offset': [0, 11]
            },
            'label': {
                'text': id,
                'size': 15,
                'outline': 0,
                'face': "Lucida Console",
                'weight': "bold",
                'color': "black",
                'align': "center",
                'offset': [-1, 14]
            },
            'properties': {
                'el': lineEl,
                'spin': spinEntity
            }
        }));

        this._spinLayer.add(spinEntity);
    }

    _createHandlers() {

        let _this = this;

        this.planet.renderer.events.on("mousemove", function (e) {
            if (_this._pickingObject) {

                let cam = this.renderer.activeCamera,
                    grCoords = new Vec3();


                if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
                    let p0 = _this._pickingObject.getCartesian(),
                        p1 = p0.add(p0.normal()),
                        p2 = p0.add(cam.getRight());

                    var px = new Vec3();
                    if (new Ray(cam.eye, e.direction).hitPlane(p0, p1, p2, px) === Ray.INSIDE) {

                        let coords = Vec3.proj_b_to_a(px, p0);

                        _this.planet.getEntityTerrainPoint(_this._pickingObject, grCoords);

                        let alt = coords.length() - grCoords.length();

                        if (alt <= 0.0) {
                            alt = 0.0;
                            _this._pickingObject.properties.spin.polyline.setVisibility(false);
                        } else {
                            _this._pickingObject.properties.spin.polyline.setVisibility(true);
                        }

                        _this._pickingObject.setAltitude(alt);
                        _this._pickingObject.properties.spin.polyline.setPath3v([[grCoords, coords]], true);
                        _this._pickingObject.properties.el.querySelector(".pl-alt").innerHTML = alt.toFixed(1);
                    }

                } else {
                    let alt = _this._pickingObject.getAltitude();
                    let ll = _this._pickingObject._lonlat;
                    if (alt === 0.0) {
                        let d = new Vec2(e.x, e.y).sub(_this._startClick);
                        let endPos = _this._startPos.add(d);
                        let coords = this.getCartesianFromPixelTerrain(endPos);
                        if (coords) {
                            _this._pickingObject.setCartesian3v(coords);
                        }
                    } else {
                        let coords = new Ray(cam.eye, e.direction).hitSphere(_this._grabbedSpheroid);
                        if (coords) {
                            _this._pickingObject.setCartesian3v(coords);
                            _this.planet.getEntityTerrainPoint(_this._pickingObject, grCoords);
                            let alt = coords.length() - grCoords.length();
                            if (alt <= 0.0) {
                                alt = 0.0;
                                _this._pickingObject.properties.spin.polyline.setVisibility(false);
                            } else {
                                _this._pickingObject.properties.spin.polyline.setVisibility(true);
                            }
                            _this._pickingObject.setAltitude(alt);
                            _this._pickingObject.properties.spin.polyline.setPath3v([[grCoords, coords]], true);
                        }
                    }
                    _this._pickingObject.properties.el.querySelector(".pl-lon").innerHTML = ll.lon.toFixed(5);
                    _this._pickingObject.properties.el.querySelector(".pl-lat").innerHTML = ll.lat.toFixed(5);
                    _this._pickingObject.properties.el.querySelector(".pl-alt").innerHTML = alt.toFixed(1);
                }
            }
        }, this.planet);

        this.planet.renderer.events.on("lclick", function (e) {
            var ll = _this.planet.getLonLatFromPixelTerrain(e, true);
            ll.height = 0;
            _this.addPoint(ll);
        });

        this._pointLayer.events.on("rclick", function (e) {
            e.pickingObject.properties.el.parentNode.removeChild(e.pickingObject.properties.el);
            e.pickingObject.remove();
            e.pickingObject.properties.spin.remove();
        });
    }

    onadd() {
        this._createPointLayer();
        this._createHandlers();
        this._createContainer();
        document.body.appendChild(this._container);

        this.planet.fontAtlas.createFont("Lucida Console", "normal", "bold");
    }

    oninit() {

    }
};

let osm = new XYZ("OSM", {
    'specular': [0.0003, 0.00012, 0.00001],
    'shininess': 20,
    'diffuse': [0.89, 0.9, 0.83],
    'isBaseLayer': true,
    'url': "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});


window.globe = new Globe({
    'name': "Earth",
    'target': "earth",
    'terrain': new GlobusTerrain(),
    'layers': [osm]
});

globe.planet.addControl(new PlannerControl());