"use strict";

import { Extent } from "../Extent.js";
import { LonLat } from "../LonLat.js";
import { Vec4 } from "../math/Vec4.js";
import * as utils from "../utils/shared.js";

const GeometryType = {
    POINT: 1,
    LINESTRING: 2,
    POLYGON: 3,
    MULTIPOLYGON: 4,
    MULTILINESTRING: 5
};

class Geometry {
    constructor(options) {
        this._id = Geometry._staticCounter++;

        options = options || {};
        options.style = options.style || {};

        /**
         * Entity instance that holds this geometry.
         * @protected
         * @type {Entity}
         */
        this._entity = null;

        this._handler = null;
        this._handlerIndex = -1;

        // Polygon
        this._polyVerticesHighMerc = [];
        this._polyVerticesLowMerc = [];
        this._polyVerticesLength = -1;
        this._polyIndexesLength = -1;
        this._polyVerticesHandlerIndex = -1;
        this._polyIndexesHandlerIndex = -1;

        // Line(Linestring and polygon's stroke(s)
        this._lineVerticesHighMerc = [];
        this._lineVerticesLowMerc = [];
        this._lineVerticesLength = -1;
        this._lineOrdersLength = -1;
        this._lineIndexesLength = -1;
        this._lineColorsLength = -1;
        this._lineThicknessLength = -1;
        this._lineVerticesHandlerIndex = -1;
        this._lineOrdersHandlerIndex = -1;
        this._lineIndexesHandlerIndex = -1;
        this._lineThicknessHandlerIndex = -1;
        this._lineColorsHandlerIndex = -1;

        this._type = (options.type && Geometry.getType(options.type)) || GeometryType.POINT;
        this._coordinates = [];
        this._extent = Geometry.getExtent(
            {
                type: options.type || "Point",
                coordinates: options.coordinates || []
            },
            this._coordinates
        );

        this._style = options.style || {};
        this._style.fillColor = utils.createColorRGBA(
            options.style.fillColor,
            new Vec4(0.19, 0.62, 0.85, 0.4)
        );
        this._style.lineColor = utils.createColorRGBA(
            options.style.lineColor,
            new Vec4(0.19, 0.62, 0.85, 1)
        );
        this._style.strokeColor = utils.createColorRGBA(
            options.style.strokeColor,
            new Vec4(1, 1, 1, 0.95)
        );
        this._style.lineWidth = options.style.lineWidth || 3;
        this._style.strokeWidth = options.style.strokeWidth || 0;

        this._visibility = options.visibility || true;

        // optimization flag for picking mask rendering pass
        this._pickingReady = false;
    }

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    static getType(typeStr) {
        return GeometryType[typeStr.toUpperCase()];
    }

    /**
     * Returns geometry feature extent.
     @static
     @param {Object} geometryObj - GeoJSON style geometry feature.
     @param {LonLat[]} outCoordinates - Geometry feature coordinates clone.
     @returns {Extent} -
     */
    static getExtent(geometryObj, outCoordinates) {
        var res = new Extent(new LonLat(180.0, 90.0), new LonLat(-180.0, -90.0));
        var t = Geometry.getType(geometryObj.type);

        if (t === GeometryType.POINT) {
            let lon = geometryObj.coordinates[0],
                lat = geometryObj.coordinates[1];
            res.southWest.lon = lon;
            res.southWest.lat = lat;
            res.northEast.lon = lon;
            res.northEast.lat = lat;
            outCoordinates && (outCoordinates[0] = lon) && (outCoordinates[1] = lat);
        } else if (t === GeometryType.LINESTRING) {
            let c = geometryObj.coordinates;
            for (let i = 0; i < c.length; i++) {
                let lon = c[i][0],
                    lat = c[i][1];
                if (lon < res.southWest.lon) res.southWest.lon = lon;
                if (lat < res.southWest.lat) res.southWest.lat = lat;
                if (lon > res.northEast.lon) res.northEast.lon = lon;
                if (lat > res.northEast.lat) res.northEast.lat = lat;
                outCoordinates && (outCoordinates[i] = [lon, lat]);
            }
        } else if (t === GeometryType.POLYGON) {
            let c = geometryObj.coordinates;
            for (let i = 0; i < c.length; i++) {
                let ci = c[i];
                outCoordinates && (outCoordinates[i] = []);
                for (let j = 0; j < ci.length; j++) {
                    let cij = ci[j];
                    let lon = cij[0],
                        lat = cij[1];
                    if (lon < res.southWest.lon) res.southWest.lon = lon;
                    if (lat < res.southWest.lat) res.southWest.lat = lat;
                    if (lon > res.northEast.lon) res.northEast.lon = lon;
                    if (lat > res.northEast.lat) res.northEast.lat = lat;
                    outCoordinates && (outCoordinates[i][j] = [lon, lat]);
                }
            }
        } else if (t === GeometryType.MULTIPOLYGON) {
            let p = geometryObj.coordinates;
            for (let i = 0; i < p.length; i++) {
                let pi = p[i];
                outCoordinates && (outCoordinates[i] = []);
                for (let j = 0; j < pi.length; j++) {
                    let pij = pi[j];
                    outCoordinates && (outCoordinates[i][j] = []);
                    for (let k = 0; k < pij.length; k++) {
                        let pijk = pij[k];
                        let lon = pijk[0],
                            lat = pijk[1];
                        if (lon < res.southWest.lon) res.southWest.lon = lon;
                        if (lat < res.southWest.lat) res.southWest.lat = lat;
                        if (lon > res.northEast.lon) res.northEast.lon = lon;
                        if (lat > res.northEast.lat) res.northEast.lat = lat;
                        outCoordinates && (outCoordinates[i][j][k] = [lon, lat]);
                    }
                }
            }
        } else if (t === GeometryType.MULTILINESTRING) {
            let c = geometryObj.coordinates;
            for (let i = 0; i < c.length; i++) {
                let ci = c[i];
                outCoordinates && (outCoordinates[i] = []);
                for (let j = 0; j < ci.length; j++) {
                    let cij = ci[j];
                    let lon = cij[0],
                        lat = cij[1];
                    if (lon < res.southWest.lon) res.southWest.lon = lon;
                    if (lat < res.southWest.lat) res.southWest.lat = lat;
                    if (lon > res.northEast.lon) res.northEast.lon = lon;
                    if (lat > res.northEast.lat) res.northEast.lat = lat;
                    outCoordinates && (outCoordinates[i][j] = [lon, lat]);
                }
            }
        } else {
            res.southWest.lon = res.southWest.lat = res.northEast.lon = res.northEast.lat = 0.0;
            outCoordinates && (outCoordinates[0] = 0) && (outCoordinates[1] = 0);
        }
        return res;
    }

    /**
     * @todo ASAP need test for this method
     * @param geoJson
     * @returns {Geometry}
     */
    setGeometry(geoJson) {
        var h = this._handler;
        this.remove();
        this._type = Geometry.getType(geoJson.type || "Point");
        this._extent = Geometry.getExtent(geoJson, this._coordinates);
        h.add(this);
        return this;
    }

    setFillColor(r, g, b, a) {
        var c = this._style.fillColor;
        if ((c.w === 0.0 && a !== 0.0) || (c.w !== 0.0 && a === 0.0)) {
            this._pickingReady = false;
        }
        c.x = r;
        c.y = g;
        c.z = b;
        c.w = a;
        this._handler && this._handler.setPolyColorArr(this, c);
        return this;
    }

    setFillColor4v(rgba) {
        return this.setFillColor(rgba.x, rgba.y, rgba.z, rgba.w);
    }

    setStrokeColor(r, g, b, a) {
        var c = this._style.strokeColor;
        if ((c.w === 0.0 && a !== 0.0) || (c.w !== 0.0 && a === 0.0)) {
            this._pickingReady = false;
        }
        c.x = r;
        c.y = g;
        c.z = b;
        c.w = a;
        this._handler && this._handler.setLineStrokeColorArr(this, c);
        return this;
    }

    setLineColor(r, g, b, a) {
        var c = this._style.lineColor;
        if ((c.w === 0.0 && a !== 0.0) || (c.w !== 0.0 && a === 0.0)) {
            this._pickingReady = false;
        }
        c.x = r;
        c.y = g;
        c.z = b;
        c.w = a;
        this._handler && this._handler.setLineColorArr(this, c);
        return this;
    }

    setStrokeColor4v(rgba) {
        return this.setStrokeColor(rgba.x, rgba.y, rgba.z, rgba.w);
    }

    setLineColor4v(rgba) {
        return this.setLineColor(rgba.x, rgba.y, rgba.z, rgba.w);
    }

    setStrokeOpacity(opacity) {
        var c = this._style.strokeColor;
        c.w = opacity;
        return this.setStrokeColor(c.x, c.y, c.z, opacity);
    }

    setLineOpacity(opacity) {
        var c = this._style.lineColor;
        c.w = opacity;
        return this.setLineColor(c.x, c.y, c.z, opacity);
    }

    setStrokeWidth(width) {
        this._style.strokeWidth = width;
        this._pickingReady = false;
        this._handler && this._handler.setLineStrokeArr(this, width);
        return this;
    }

    bringToFront() {
        this._handler && this._handler.bringToFront(this);
        return this;
    }

    setLineWidth(width) {
        this._style.lineWidth = width;
        this._pickingReady = false;
        this._handler && this._handler.setLineThicknessArr(this, width);
        return this;
    }

    setFillOpacity(opacity) {
        var c = this._style.fillColor;
        if ((c.w === 0.0 && opacity !== 0.0) || (c.w !== 0.0 && opacity === 0.0)) {
            this._pickingReady = false;
        }
        c.w = opacity;
        this._handler && this._handler.setPolyColorArr(this, c);
        return this;
    }

    setVisibility(visibility) {
        this._visibility = visibility;
        this._handler && this._handler.setGeometryVisibility(this);
        return this;
    }

    getVisibility() {
        return this._visibility;
    }

    remove() {
        this._handler && this._handler.remove(this);
    }

    getExtent() {
        return this._extent.clone();
    }

    getType() {
        return this._type;
    }
}

export { Geometry, GeometryType };
