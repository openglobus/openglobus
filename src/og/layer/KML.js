/**
 * @module og/layer/KML
 */

"use strict";
import { Billboard } from "../entity/Billboard.js";
import { Entity } from "../entity/Entity.js";
import { Extent } from "../Extent.js";
import { LonLat } from "../LonLat.js";
import { Vector } from "./Vector.js";

/**
 * Layer to render KMLs files
 * @class
 * @extends {Vector}
 */
export class KML extends Vector {
    /**
     *
     * @param {string} name
     * @param {*} [options]
     */
    constructor(name, options = {}) {
        super(name, options);
        this._extent = null;
        this._billboard = options.billboard || {
            src: "https://openglobus.org/examples/billboards/carrot.png"
        };
        /**
         * @type {string}
         */
        this._color = options.color || "#6689db";
    }

    get instanceName() {
        return "KML";
    }

    /**
     * @public
     */
    _extractCoordonatesFromKml(xmlDoc) {
        const placemarks = Array.from(xmlDoc.getElementsByTagName("Placemark"));
        const clean = str => str?.trim().replace(/\n/g, " ").replace(/\t/g, " ").replace(/ +/g, " ")
        return placemarks.map(placemark => {
            const coordinatesRaw = Array.from(placemark.getElementsByTagName("coordinates")).at(0);
            const coordinates = clean(coordinatesRaw.textContent).split(" ").map((co) => co.split(",").map(parseFloat))
            const style = Array.from(placemark.getElementsByTagName("Style")).at(0);
            if (style) {
                const color = Array.from(style.getElementsByTagName("color"))?.at(0)?.textContent?.trim();
                const width = Array.from(style.getElementsByTagName("width")).at(0)?.textContent?.trim();
                return { coordinates, color, width }
            } else {
                return { coordinates }
            }
        })
    }

    /**
     * Creates billboards or polylines from array of lonlat.
     * @public
     * @param {Array} coordonates: { coordinates: []; color: string; width: string;}[][]
     * @param {string} color
     * @returns {Array<Entity>}
     */
    _convertCoordonatesIntoEntities(coordinates, color, billboard) {
        const extent = new Extent(new LonLat(180.0, 90.0), new LonLat(-180.0, -90.0));
        const addToExtent = (c) => {
            const lon = c[0],
                lat = c[1];
            if (lon < extent.southWest.lon) extent.southWest.lon = lon;
            if (lat < extent.southWest.lat) extent.southWest.lat = lat;
            if (lon > extent.northEast.lon) extent.northEast.lon = lon;
            if (lat > extent.northEast.lat) extent.northEast.lat = lat;
        };
        const _pathes = [];
        coordinates.forEach((kmlFile) => kmlFile.forEach((p) => _pathes.push(p)));
        const entities = _pathes.map((placemark) => {
            if (placemark.coordinates.length === 1) {
                const lonlat = placemark.coordinates[0];
                const _entity = new Entity({ lonlat, billboard });
                addToExtent(lonlat);
                return _entity;
            } else if (placemark.coordinates.length > 1) {
                color = placemark.color || color;
                const thickness = placemark.width || 3;
                const pathLonLat = placemark.coordinates.map((item) => {
                    addToExtent(item);
                    return new LonLat(item[0], item[1], item[2]);
                });
                const _entity = new Entity({
                    polyline: { pathLonLat: [pathLonLat], thickness, color, isClosed: false }
                });
                return _entity;
            }
        });
        return { entities, extent };
    }

    /**
     * @public
     * @returns {Document}
     */
    _getXmlContent(file) {
        return new Promise((resolve) => {
            const fileReader = new FileReader();
            fileReader.onload = async (i) =>
                resolve(new DOMParser().parseFromString(i.target.result, "text/xml"));
            fileReader.readAsText(file);
        });
    }

    /**
     * @public
     */
    _expandExtents(extent1, extent2) {
        if (!extent1) return extent2;
        if (extent2.southWest.lon < extent1.southWest.lon)
            extent1.southWest.lon = extent2.southWest.lon;
        if (extent2.southWest.lat < extent1.southWest.lat)
            extent1.southWest.lat = extent2.southWest.lat;
        if (extent2.northEast.lon > extent1.northEast.lon)
            extent1.northEast.lon = extent2.northEast.lon;
        if (extent2.northEast.lat > extent1.northEast.lat)
            extent1.northEast.lat = extent2.northEast.lat;
        return extent1;
    }

    /**
     * @public
     * @param {File[]} kmls
     * @param {string} [color]
     * @param {Billboard} [billboard]
     * @returns {Promise<{entities: Entity[], extent: Extent}>}
     */
    async addKmlFromFiles(kmls, color = null, billboard = null) {
        const kmlObjs = await Promise.all(kmls.map(this._getXmlContent));
        const coordonates = kmlObjs.map(this._extractCoordonatesFromKml);
        const { entities, extent } = this._convertCoordonatesIntoEntities(
            coordonates,
            color || this._color,
            billboard || this._billboard
        );
        this._extent = this._expandExtents(this._extent, extent);
        entities.forEach(this.add.bind(this));
        return { entities, extent };
    }

    /**
     * @param {string} color
     * @public
     */
    setColor(color) {
        this._color = color;
        this._billboard.color = color;
    }

    /**
     * @public
     */
    _getKmlFromUrl(url) {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.responseType = "document";
            request.overrideMimeType("text/xml");
            request.onload = () => {
                if (request.readyState === request.DONE && request.status === 200) {
                    resolve(request.responseXML);
                } else {
                    reject(new Error("no valid kml file"));
                }
            };
            request.send();
        });
    }

    /**
     * @public
     * @param {string} url - Url of the KML to display. './myFile.kml' or 'http://mySite/myFile.kml' for example.
     * @param {string} [color]
     * @param {Billboard} [billboard]
     * @returns {Promise<{entities: Entity[], extent: Extent}>}
     */
    async addKmlFromUrl(url, color = null, billboard = null) {
        const kml = await this._getKmlFromUrl(url);
        const coordonates = this._extractCoordonatesFromKml(kml);
        const { entities, extent } = this._convertCoordonatesIntoEntities(
            [coordonates],
            color || this._color,
            billboard || this._billboard
        );
        this._extent = this._expandExtents(this._extent, extent);
        entities.forEach(this.add.bind(this));
        return { entities, extent };
    }
}
