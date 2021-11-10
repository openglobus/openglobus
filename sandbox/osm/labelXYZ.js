// © Microsoft Corporation. All rights reserved.

import { XYZ } from "../../src/og/layer/XYZ.js";
import { Vector } from "../../src/og/layer/Vector.js";
import { Entity } from "../../src/og/entity/Entity.js";

/**
 * Represents an label tiles source provider.
 * @class
 * @extends {og.Layer}
 * @param {string} name - Layer name.
 * @param {Object} options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {Array.<number,number,number>} [options.transparentColor=[-1,-1,-1]] - RGB color that defines transparent color.
 * @param {Array.<string>} [options.subdomains=['a','b','c']] - Subdomains of the tile service.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {number} [options.minNativeZoom=0] - Minimal available zoom level.
 * @param {number} [options.maxNativeZoom=19] - Maximal available zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {string} [options.crossOrigin=true] - If true, all tiles will have their crossOrigin attribute set to ''.
 * @param {string} options.url - Tile url source template(see example below).
 * @param {String} [options.color] - color of labels
 * @param {String} [options.style]
 * @param {number} [options.size=10]
 * @param {number} [options.height=1000000]
 * @param {string} [options.align]
 * @param {String} [options.face]
 * @param {number} [options.countryLayersNumber=2]
 * @param {String} [options.countryLayerData]
 *
 * @param {og.layer.labelXYZ~_urlRewriteCallback} options.urlRewrite - Url rewrite function.
 * @fires og.layer.labelXYZ#load
 * @fires og.layer.labelXYZ#loadend
 */

window.dZ = 4;

export class labelXYZ extends XYZ {
    constructor(name, options) {
        super(name, options);

        this.events.registerNames(EVENT_NAMES);
        // quadkey
        this.Key = "";

        this.labelCache = new Map();
        window.labelCache = this.labelCache;

        this.labelColor = options.color || "white";
        this.labelHeight = options.height || 1000;
        this.labelSize = options.size || 10;
        this.labelAlign = options.align || "center";
        this.labelFace = null;
        this.countryVectorLayer = null;

        this.countryLayers = new Map();
        this.countryLayersNumber = options.countryLayersNumber || 2;
        this.countryLayerData = options.countryLayerData;
        for (let i = 1; i <= this.countryLayersNumber; i++) {
            const url = this.countryLayerData.replace(/{}/, i.toString());
            fetch(url)
                .then((r) => {
                    return r.json();
                })
                .then((data) => {
                    const f = data.slice(0);
                    for (let j = 0; j < f.length; j++) {
                        var fi = f[j];
                        this.countryLayers.set(fi, i);
                    }
                });
        }
    }

    get instanceName() {
        return "labelXYZ";
    }

    /**
     * Start to load tile material.
     * @public
     * @virtual
     * @param {og.planetSegment.Material} material - Loads current material.
     */
    loadMaterial(material, forceLoading) {
        const seg = material.segment;

        if (this._isBaseLayer) {
            material.texture = seg.getDefaultTexture();
        } else {
            material.texture = seg.planet.transparentTexture;
        }

        if (this._planet.layerLock.isFree()) {
            material.isReady = false;
            material.isLoading = true;
            material.loadingAttempts++;

            this._planet._tileLoader.load(
                {
                    src: this._getHTTPRequestString(material.segment),
                    filter: () => (seg.initialized && seg.node.getState() === 1) || forceLoading,
                    options: {}
                },
                async (response) => {
                    if (response.status === "ready") {
                        if (material.isLoading) {
                            // material.isReady = true;
                            const e = this.events.load;
                            if (e.handlers.length) {
                                this.events.dispatch(e, material);
                            }
                            var input = eval("(_ => _)" + (await response.data.text()));

                            var f = input.entities;
                            for (var i = 1; i < f.length; i++) {
                                var fi = f[i];
                                if (fi.tid == 40 && !this.labelCache.has(fi.id)) {
                                    const label = new Entity({
                                        name: fi.dn,
                                        lonlat: [fi.long, fi.lat, this.labelHeight],
                                        visibility: true,
                                        label: {
                                            text: fi.dn.toUpperCase(),
                                            size: this.labelSize,
                                            color: this.labelColor,
                                            face: this.labelFace,
                                            align: this.labelAlign,
                                            opacity: 1,
                                            weight: 500,
                                            outlineColor: "rgba(0,0,0,0.45)",
                                            outline: 0.3
                                        }
                                    });
                                    this.labelCache.set(fi.id, label);
                                    this.countryVectorLayer.add(label);
                                }
                            }
                        }

                        response.data = null;
                    } else if (response.status === "abort") {
                        material.isLoading = false;
                    } else if (response.status === "error") {
                        if (material.isLoading) {
                            material.textureNotExists();
                        }
                    }
                }
            );
        } else {
            material.textureNotExists();
        }
    }

    /**
     * Assign the planet.
     * @protected
     * @virtual
     * @param {og.scene.Planet} planet - Planet render node.
     */
    _assignPlanet(planet) {
        super._assignPlanet(planet);
        this.countryVectorLayer = new Vector("cities", {
            visibility: true,
            isBaseLayer: false,
            nodeCapacity: 100000,
            async: false
        });

        this.countryVectorLayer.addTo(planet);
    }

    /**
     * Creates query url.
     * @protected
     * @virtual
     * @param {og.planetSegment.Segment} segment - Creates specific url for current segment.
     * @returns {String} - Returns url string.
     */
    _createUrl(segment) {
        var params = [
            segment.tileX.toString(),
            segment.tileY.toString(),
            segment.tileZoom.toString()
        ];
        this._tileToQuadkey(params);
        return this._stringTemplate(this.url);
    }

    /**
     * Stringtemplate for json labels query url
     * @param {string} template - String with templates in "{" and "}"
     * @param {Object} params - Template named object with subsrtings.
     * @returns {string} -
     */
    _stringTemplate(template) {
        return template.replace(/{[^{}]+}/g, this.key);
    }

    /**
     * tileX,Y,Z to quadkey
     * @param {Object} params - Template named object with subsrtings.
     * @returns {string} -
     */
    _tileToQuadkey(params) {
        var quadKey = new Array(3);
        var x = params[0];
        var y = params[1];
        var z = params[2];
        for (var i = z; i > 0; i--) {
            var digit = 0;
            var mask = 1 << (i - 1);
            if ((x & mask) != 0) {
                digit++;
            }
            if ((y & mask) != 0) {
                digit++;
                digit++;
            }
            quadKey.push(digit);
        }
        this.key = quadKey.join("");
    }

    /**
     * @param {lonlat} lonlat1
     * @param {lonlat} lonlat2
     * @returns {number} - angle between to points
     */
    _getAngle(lonlat1, lonlat2) {
        var a1 = (lonlat1.lon / 180) * Math.PI;
        var b1 = (lonlat1.lat / 180) * Math.PI;
        var a2 = (lonlat2.lon / 180) * Math.PI;
        var b2 = (lonlat2.lat / 180) * Math.PI;
        return Math.acos(
            Math.cos(b1) * Math.cos(b2) * Math.cos(a1 - a2) + Math.sin(b1) * Math.sin(b2)
        );
    }

    applyMaterial(material) {
        if (material.isReady) {
            return material.texOffset;
        } else {
            const segment = material.segment;
            let pn = segment.node;
            let notEmpty = false;

            const mId = this._id;
            let psegm = material;
            while (pn.parentNode) {
                if (psegm && psegm.textureExists) {
                    notEmpty = true;
                    break;
                }
                pn = pn.parentNode;
                psegm = pn.segment.materials[mId];
            }

            const maxNativeZoom = material.layer.maxNativeZoom;

            if (pn.segment.tileZoom === maxNativeZoom) {
                material.textureNotExists();
            } else if (material.segment.tileZoom <= maxNativeZoom) {
                !material.isLoading && !material.isReady && this.loadMaterial(material);
            } else {
                let pn = segment.node;
                while (pn.segment.tileZoom > material.layer.maxNativeZoom) {
                    pn = pn.parentNode;
                }
                let pnm = pn.segment.materials[material.layer._id];
                if (pnm) {
                    !pnm.isLoading && !pnm.isReady && this.loadMaterial(pnm, true);
                } else {
                    pnm = pn.segment.materials[material.layer._id] = material.layer.createMaterial(
                        pn.segment
                    );
                    this.loadMaterial(pnm, true);
                }
            }
            this._updateOpacity(material.segment);
            if (notEmpty) {
                material.appliedNode = pn;
                material.appliedNodeId = pn.nodeId;
                material.texture = psegm.texture;
                const dZ2 = 1.0 / (2 << (segment.tileZoom - pn.segment.tileZoom - 1));
                material.texOffset[0] = segment.tileX * dZ2 - pn.segment.tileX;
                material.texOffset[1] = segment.tileY * dZ2 - pn.segment.tileY;
                material.texOffset[2] = dZ2;
                material.texOffset[3] = dZ2;
            } else {
                material.texture = segment.planet.transparentTexture;
                material.texOffset[0] = 0.0;
                material.texOffset[1] = 0.0;
                material.texOffset[2] = 1.0;
                material.texOffset[3] = 1.0;
            }
        }

        return material.texOffset;
    }

    /**
     *
     * @param {}
     */
    _updateOpacity(segment) {
        var height = this._planet.camera.getHeight();
        var centerLonlat = this._planet.ellipsoid.cartesianToLonLat(this._planet.camera.eye);
        var z = segment.tileZoom;
        for (const city of this.labelCache.values()) {
            var localLonlat = city._lonlat;
            var angle = this._getAngle(centerLonlat, localLonlat);
            var name = city.properties.name;
            if (!this.countryLayers.get(name)) {
                city.label.setOpacity(0);
            } else if (this.countryLayers.get(name) == 2) {
                if (angle > Math.PI / 6 && z < 4) {
                    city.label.setOpacity(0);
                } else {
                    city.label.setOpacity(
                        Math.min(1 - Math.log(height / 5000000), 1 - (angle ** 2 * 3) / Math.PI)
                    );
                }
            } else {
                city.label.setOpacity(1 - (angle ** 2 * 3) / Math.PI);
            }
        }
    }

    /**
     *  set the font face
     * @param {string} faceName
     * @param {string} srcDir
     * @param {string} fontFile
     */
    setFace(faceName, srcDir, fontFile) {
        this._planet.renderer.fontAtlas.loadFont(faceName, srcDir, fontFile);
        this.labelFace = faceName;
    }
}

const EVENT_NAMES = [
    /**
     * Triggered when current tile image has loaded before rendereing.
     * @event og.layer.XYZ#load
     */
    "load",

    /**
     * Triggered when all tiles have loaded or loading has stopped.
     * @event og.layer.XYZ#loadend
     */
    "loadend"
];
