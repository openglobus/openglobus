/**
 * @module og/layer/KML
 */

'use strict';
import { Extent } from '../Extent.js';
import { LonLat } from '../LonLat.js';
import { Vector } from './Vector.js';
import { Entity } from '../entity/Entity.js';

/**
 * Layer to render KMLs files
 * @class
 * @extends {og.Vector}
 */
class KML extends Vector {

    #extent;
    #billboard = { src: 'https://openglobus.org/examples/billboards/carrot.png' };
    #color = '#6689db';

    constructor(name, options = {}) {
        super(name, options);
        this.#billboard = options.billboard || this.#billboard;
        this.#color = options.color || this.#color;
    }

    get instanceName() {
        return 'KML';
    }

    extractCoordonatesFromKml(xmlDoc) {
        const raw = Array.from(xmlDoc.getElementsByTagName('coordinates'));
        const coordinates = raw.map(item => item.textContent.trim().replace(/\n/g, ' ').split(' ').map(co => co.split(',').map(parseFloat)));
        return coordinates;
    }

    /**
     * Creates billboards or polylines from array of lonlat.
     * @param {Array} coordonates
     * @param {string} color 
     * @returns {Array<og.Entity>}
     */
    convertCoordonatesIntoEntities(coordinates, color, billboard) {
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

    getXmlContent(file) {
        return new Promise(resolve => {
            const fileReader = new FileReader();
            fileReader.onload = async i => resolve((new DOMParser()).parseFromString(i.target.result, 'text/xml'));
            fileReader.readAsText(file);
        });
    };

    async addKmlFromFiles(kmls) {
        const kmlObjs = await Promise.all(kmls.map(this.getXmlContent));
        const coordonates = kmlObjs.map(this.extractCoordonatesFromKml);
        const { entities, extent } = this.convertCoordonatesIntoEntities(coordonates, this.#color, this.#billboard);
        this.#extent = extent; // TODO expand the extent here
        entities.forEach(this.add.bind(this));
        return { entities, extent };
    }

    setColor(color) {
        this.#color = color;
        this.#billboard.color = color;
    }

    getKmlFromUrl(url) {
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

    async addKmlFromUrl(url) {
        const kml = await this.getKmlFromUrl(url);
        const coordonates = this.extractCoordonatesFromKml(kml);
        const { entities, extent } = this.convertCoordonatesIntoEntities([coordonates], this.#color, this.#billboard);
        this.#extent = extent;
        entities.forEach(this.add.bind(this));
        return { entities, extent };
    }

    getExtent() {
        return this.#extent;
    }
};

export { KML };
