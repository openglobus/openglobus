/**
 * @module og/layer/KML
 */

"use strict";
import { Billboard } from "../entity/Billboard.js";
import { Entity } from "../entity/Entity.js";
import { Extent } from "../Extent.js";
import { Label } from "../entity/Label.js";
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
        const raw = Array.from(xmlDoc.getElementsByTagName("coordinates"));
        const rawText = raw.map(item => item.textContent.trim());
        const coordinates = rawText.map(item =>
            item
                .replace(/\n/g, " ")
                .replace(/\t/g, " ")
                .replace(/ +/g, " ")
                .split(" ")
                .map((co) => co.split(",").map(parseFloat))
        );
        return coordinates;
    }

    /**
     * @private
     */
    _AGBRtoRGBA(agbr) {
        if (!agbr || agbr.length != 8) return

        const a = parseInt(agbr.slice(0, 2), 16) / 255;
        const b = parseInt(agbr.slice(2, 4), 16);
        const g = parseInt(agbr.slice(4, 6), 16);
        const r = parseInt(agbr.slice(6, 8), 16);

        return `rgba(${r},${g},${b},${a})`;
    }

    /**
     * @private
     returns array of longitude, latitude, altitude (altitude optional)
     */
    _parseKMLcoordinates(coords) {
        const coordinates = coords.innerHTML.trim()
            .replace(/\n/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/ +/g, ' ')
            .split(" ")
            .map((co) => co.split(",").map(parseFloat))

        return coordinates;
    }

    /**
     * @private
     */
    _parseKMLstyle(jobj) {
    }

    /**
     * @private
     */
    _kmlPlacemarkToEntity(placemark, extent) {
        if (!placemark) return;

        // TODO error check if tags below exist (before trying [0])

        let name = placemark.getElementsByTagName("name")[0].innerHTML.trim();

        let iconColor;
        let iconHeading;
        let iconURL;
        let lineColor;
        let lineWidth;

        let style = placemark.getElementsByTagName("Style")[0];
        if (style) {
            let iconstyle = style.getElementsByTagName("IconStyle")[0];
            if (iconstyle) {
                let color = iconstyle.getElementsByTagName("color")[0];
                if (color)
                    iconColor = this._AGBRtoRGBA(color.innerHTML.trim());

                let heading = iconstyle.getElementsByTagName("heading")[0];
                if (heading) {
                    const hdg = parseFloat(heading.innerHTML.trim());
                    if (hdg >= 0 && hdg <= 360)
                        iconHeading = hdg % 360;
                };

                let icon = iconstyle.getElementsByTagName("Icon")[0];
                if (icon !== undefined) {
                    let href = icon.getElementsByTagName("href")[0];
                    if (href !== undefined) {
                        iconURL = href.innerHTML.trim();
                    };
                };
            };

            let linestyle = style.getElementsByTagName("LineStyle")[0];
            if (linestyle !== undefined) {
                let color = linestyle.getElementsByTagName("color")[0];
                if (color !== undefined)
                    lineColor = this._AGBRtoRGBA(color.innerHTML.trim());
                let width = linestyle.getElementsByTagName("width")[0];
                if (width !== undefined)
                    lineWidth = parseFloat(width.innerHTML.trim());
            };
        };

        if (iconColor === undefined)
            iconColor = "#FFFFFF";
        if (iconHeading === undefined)
            iconHeading = 0;
        if (iconURL === undefined)
            iconURL = "https://openglobus.org/examples/billboards/carrot.png";

        if (lineColor === undefined)
            lineColor = "#FFFFFF";
        if (lineWidth === undefined)
            lineWidth = 1;

        // TODO handle MultiGeometry

        const LonLats = [];
        for (const coord of placemark.getElementsByTagName("coordinates")) {
            let coordinates = this._parseKMLcoordinates(coord);
            if (coordinates === undefined)
                coordinates = [[0, 0, 0]];

            for (const lonlatalt of coordinates) {
                let lon = lonlatalt[0];
                let lat = lonlatalt[1];
                let alt = lonlatalt[2];

                LonLats.push(new LonLat(lon, lat, alt));

                if (lon < extent.southWest.lon) extent.southWest.lon = lon;
                if (lat < extent.southWest.lat) extent.southWest.lat = lat;
                if (lon > extent.northEast.lon) extent.northEast.lon = lon;
                if (lat > extent.northEast.lat) extent.northEast.lat = lat;
            };
        };

        let entity;

        // Point
        if (LonLats.length === 1) {
            const hdgrad = iconHeading * 0.01745329; // radians

            entity = new Entity({
                name,
                lonlat: LonLats[0],
                billboard: {
                    src: iconURL,
                    size: [24, 24],
                    color: iconColor,
                    rotation: hdgrad
                },
                properties: {
                    color: iconColor,
                    heading: iconHeading
                }
            });

            /*
                    TODO Label rendering doesn't appear to work!
                    if (name !== undefined)
                      {
                      var label = new Label({
                                    'text': "PressStart2P-Regular",
                                    'color': "black",
                                    'face': "PressStart2P-Regular",
                                    'outlineColor': "white",
                                    'size': 24
                        });
                      entity.setLabel(label);
                      };
            */

        }
        else // LineString
        {
            entity = new Entity({
                polyline: {
                    pathLonLat: [LonLats],
                    thickness: lineWidth,
                    color: lineColor,
                    isClosed: false
                }
            });
        };

        return entity;
    }

    /**
     * @private
     */
    _parseKML(xml, extent, entities = undefined) {
        if (!entities)
            entities = [];

        if (xml.documentElement.nodeName != "kml")
            return entities;

        for (const placemark of xml.getElementsByTagName("Placemark")) {
            const entity = this._kmlPlacemarkToEntity(placemark, extent);
            if (!entity)
                entities.push(entity);
        };

        return entities;
    }

    /**
     * @private
     */
    _convertKMLintoEntities(xml) {
        const extent = new Extent(new LonLat(180.0, 90.0), new LonLat(-180.0, -90.0));
        const entities = this._parseKML(xml, extent);

        return ({ entities, extent });
    }

    /**
     * Creates billboards or polylines from array of lonlat.
     * @public
     * @param {Array} coordonates
     * @param {string} color
     * @returns {Array<Entity>}
     */
    /*
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
            const entities = _pathes.map((path) => {
                if (path.length === 1) {
                    const lonlat = path[0];
                    const _entity = new Entity({ lonlat, billboard });
                    addToExtent(lonlat);
                    return _entity;
                } else if (path.length > 1) {
                    const pathLonLat = path.map((item) => {
                        addToExtent(item);
                        return new LonLat(item[0], item[1], item[2]);
                    });
                    const _entity = new Entity({
                        polyline: { pathLonLat: [pathLonLat], thickness: 3, color, isClosed: false }
                    });
                    return _entity;
                }
            });
            return { entities, extent };
        }
    */

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
        /*
                const kmlObjs = await Promise.all(kmls.map(this._getXmlContent));
                const coordonates = kmlObjs.map(this._extractCoordonatesFromKml);
                const { entities, extent } = this._convertCoordonatesIntoEntities(
                    coordonates,
                    color || this._color,
                    billboard || this._billboard
                );
        */
        const { entities, extent } = this._convertKMLintoEntities(kml);

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
        /*
                const coordonates = this._extractCoordonatesFromKml(kml);
                const { entities, extent } = this._convertCoordonatesIntoEntities(
                    [coordonates],
                    color || this._color,
                    billboard || this._billboard
                );
        */
        const { entities, extent } = this._convertKMLintoEntities(kml);

        this._extent = this._expandExtents(this._extent, extent);

        entities.forEach(this.add.bind(this));

        return { entities, extent };
    }
}
