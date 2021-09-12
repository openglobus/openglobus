/**
 * @module og/layer/KML
 */

'use strict';

/**
 * Layer to render KMLs files
 * @class
 * @extends {og.Vector}
 */
class KML extends Vector {

    #extent;

    constructor(name, options = {}) {
        const xmlDocs = options.kmls;
        const coordonates = xmlDocs.map(f => this._extractCoordonatesFromKml(f));
        const { entities, extent } = this._convertCoordonatesIntoEntities(coordonates, color);
        this.#extent = extent;
        if (!options.entities) options.entities = [];
        options.entities = [...options.entities, ...entities];
        super(name, options);
    }

    get instanceName() {
        return "KML";
    }

    _extractCoordonatesFromKml(xmlDoc) {
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
    _convertCoordonatesIntoEntities(coordinates, color) {
        const extent = new og.Extent(new og.LonLat(180.0, 90.0), new og.LonLat(-180.0, -90.0));
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
                const _entity = new og.Entity({ lonlat, billboard });
                addToExtent(lonlat);
                return _entity;
            } else if (path.length > 1) {
                const pathLonLat = path.map(item => {
                    addToExtent(item);
                    return new og.LonLat(item[0], item[1], item[2]);
                });
                const _entity = new og.Entity({ polyline: { pathLonLat: [pathLonLat], thickness: 3, color, isClosed: false } });
                return _entity;
            }
        });
        return { entities, extent };
    }

    getExtent() {
        return this.#extent;
    }
};

export { KML };
