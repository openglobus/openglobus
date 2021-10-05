/**
 * @module og/layer/KML
 */

'use strict';
import { Entity } from '../entity/Entity.js';
import { Extent } from '../Extent.js';
import { LonLat } from '../LonLat.js';
import { Vector } from './Vector.js';

/**
 * Layer to render KMLs files
 * @class
 * @extends {og.Vector}
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
        this._billboard = options.billboard || { src: 'https://openglobus.org/examples/billboards/carrot.png' };
        this._color = options.color || '#6689db';
    }

    get instanceName() {
        return 'KML';
    }

    /**
     * @private
     */
    _extractCoordonatesFromKml(xmlDoc) {
        const raw = Array.from(xmlDoc.getElementsByTagName('coordinates'));
        const coordinates = raw.map(item => item.textContent.trim().replace(/\n/g, ' ').split(' ').map(co => co.split(',').map(parseFloat)));
        return coordinates;
    }

    /**
     * Creates billboards or polylines from array of lonlat.
     * @private
     * @param {Array} coordonates
     * @param {string} color 
     * @returns {Array<og.Entity>}
     */
    _convertCoordonatesIntoEntities(coordinates, color, billboard) {
        const extent = new Extent(new LonLat(180.0, 90.0), new LonLat(-180.0, -90.0));
        const addToExtent = (c) => {
            const lon = c[0], lat = c[1];
            if (lon < extent.southWest.lon) extent.southWest.lon = lon;
            if (lat < extent.southWest.lat) extent.southWest.lat = lat;
            if (lon > extent.northEast.lon) extent.northEast.lon = lon;
            if (lat > extent.northEast.lat) extent.northEast.lat = lat;
        };
        const _pathes = [];
        coordinates.forEach(kmlFile => kmlFile.forEach(p => _pathes.push(p)));
        const entities = _pathes.map(path => {
            if (path.length === 1) {
                const lonlat = path[0];
                const _entity = new Entity({ lonlat, billboard });
                addToExtent(lonlat);
                return _entity;
            } else if (path.length > 1) {
                const pathLonLat = path.map(item => {
                    addToExtent(item);
                    return new LonLat(item[0], item[1], item[2]);
                });
                const _entity = new Entity({ polyline: { pathLonLat: [pathLonLat], thickness: 3, color, isClosed: false } });
                return _entity;
            }
        });
        return { entities, extent };
    }

    /**
     * @private
     */
    _getXmlContent(file) {
        return new Promise(resolve => {
            const fileReader = new FileReader();
            fileReader.onload = async i => resolve((new DOMParser()).parseFromString(i.target.result, 'text/xml'));
            fileReader.readAsText(file);
        });
    };

    /**
     * @private
     */
    _expandExtents(extent1, extent2) {
        if (!extent1) return extent2;
        if (extent2.southWest.lon < extent1.southWest.lon) extent1.southWest.lon = extent2.southWest.lon;
        if (extent2.southWest.lat < extent1.southWest.lat) extent1.southWest.lat = extent2.southWest.lat;
        if (extent2.northEast.lon > extent1.northEast.lon) extent1.northEast.lon = extent2.northEast.lon;
        if (extent2.northEast.lat > extent1.northEast.lat) extent1.northEast.lat = extent2.northEast.lat;
        return extent1;
    }

    /**
     * @public
     * @param {File[]} kmls
     * @returns {Promise}
     */
    async addKmlFromFiles(kmls) {
        const kmlObjs = await Promise.all(kmls.map(this._getXmlContent));
        const coordonates = kmlObjs.map(this._extractCoordonatesFromKml);
        const { entities, extent } = this._convertCoordonatesIntoEntities(coordonates, this._color, this._billboard);
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
     * @private
     */
    _getKmlFromUrl(url) {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'document';
            request.overrideMimeType('text/xml');
            request.onload = () => {
                if (request.readyState === request.DONE && request.status === 200) {
                    resolve(request.responseXML);
                } else {
                    reject(new Error('no valid kml file'));
                }
            };
            request.send();
        });
    };

    /**
     * @public
     * @param {string} url - Url of the KML to display. './myFile.kml' or 'http://mySite/myFile.kml' for example.
     * @returns {Promise}
     */
    async addKmlFromUrl(url) {
        const kml = await this._getKmlFromUrl(url);
        const coordonates = this._extractCoordonatesFromKml(kml);
        const { entities, extent } = this._convertCoordonatesIntoEntities([coordonates], this._color, this._billboard);
        this._extent = this._expandExtents(this._extent, extent);
        entities.forEach(this.add.bind(this));
        return { entities, extent };
    }

};
