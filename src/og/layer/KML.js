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
     * @private
     */
    _extractCoordonatesFromKml(xmlDoc) {
        const raw = Array.from(xmlDoc.getElementsByTagName("coordinates"));
        const rawText = raw.map(item => item.textContent.trim());
        const coordinates = rawText.map(item =>
            item
             .replace(/\n/g, " ")
             .replace(/\t/g, " ")
             .replace(/ +/g," ")
             .split(" ")
             .map((co) => co.split(",").map(parseFloat))
        );
        return coordinates;
    }

    /**
     * @private
     */
    _xml2json(xml) {
      // https://davidwalsh.name/convert-xml-json

      // Create the return object
      var obj = {};

      if (xml.nodeType == 1) { // element
          // do attributes
          if (xml.attributes.length > 0) {
          obj["@attributes"] = {};
              for (var j = 0; j < xml.attributes.length; j++) {
                  var attribute = xml.attributes.item(j);
                  obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
              }
          }
      } else if (xml.nodeType == 3) { // text
          obj = xml.nodeValue;
      }

      // do children
      if (xml.hasChildNodes()) {
          for(var i = 0; i < xml.childNodes.length; i++) {
              var item = xml.childNodes.item(i);
              var nodeName = item.nodeName;
              if (typeof(obj[nodeName]) == "undefined") {
                  obj[nodeName] = this._xml2json(item);
              } else {
                  if (typeof(obj[nodeName].push) == "undefined") {
                      var old = obj[nodeName];
                      obj[nodeName] = [];
                      obj[nodeName].push(old);
                  }
                  obj[nodeName].push(this._xml2json(item));
              }
          }
      }
      return obj;
      }

    /**
     * @private
     */
    _AGBRtoRGBA(agbr) {
      if (agbr === undefined)
        return(undefined);
      if (agbr.length != 8)
        return(undefined);

      var a;
      var r;
      var g;
      var b;

      a = parseInt(agbr.slice(0, 2), 16) / 255;
      b = parseInt(agbr.slice(2, 4), 16);
      g = parseInt(agbr.slice(4, 6), 16);
      r = parseInt(agbr.slice(6, 8), 16);

      return("rgba(" + r + "," + g + "," + b + "," + a + ")");
      }

    /**
     * @private
     */
    _parseKMLcoordinates(jobj) {
      // returns longitude, latitude, altitude
      let coordinates = jobj["#text"].trim()
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/ +/g, ' ')
        .split(" ")
        .map((co) => co.split(",").map(parseFloat))

      return(coordinates);
      }

    /**
     * @private
     */
    _parseKMLstyle(jobj) {
      }

    /**
     * @private
     */
    _kmlPlacemarkToEntity(jobj, extent) {
      if (jobj === undefined)
        return(undefined);

      let name = jobj["name"];
      if (name !== undefined)
        name = name["#text"];

      let point = jobj["Point"];
      let linestring = jobj["LineString"];

      if (point === undefined && linestring === undefined)
        return(undefined);

      var coordinates;

      if (point !== undefined)
        coordinates = point["coordinates"];
      else if (linestring !== undefined)
        coordinates = linestring["coordinates"];
      else
        return(undefined);

      var iconURL;
      var iconColor;
      var lineColor;
      var lineWidth;

      let style = jobj["Style"];
      if (style !== undefined) {
        let iconstyle = style["IconStyle"];
        if (iconstyle !== undefined) {
          let color = iconstyle["color"];
          if (color !== undefined)
            iconColor = this._AGBRtoRGBA(color["#text"])
          let icon = iconstyle["Icon"];
          if (icon !== undefined) {
            let href = icon["href"];
            if (href !== undefined) {
              iconURL = href["#text"];
              };
            };
          };

        let linestyle = style["LineStyle"];
        if (linestyle !== undefined) {
          let color = linestyle["color"];
          if (color !== undefined)
            lineColor = this._AGBRtoRGBA(color["#text"])
          let width = linestyle["width"];
          if (width !== undefined)
            lineWidth = parseInt(width["#text"]);
          };
        };

      if (iconColor === undefined) {
        iconColor = "#FFFFFF";
        };
      if (iconURL === undefined) {
        iconURL = "https://openglobus.org/examples/billboards/carrot.png";
        };

      if (lineColor === undefined)
        lineColor = "#FFFFFF";
      if (lineWidth === undefined)
        lineWidth = 1;

      let lonlatalts = this._parseKMLcoordinates(coordinates);
      if (lonlatalts === undefined)
        lonlatalts = [ 0, 0, 0 ];

      var LonLats=[];
      for (var index=0; index < lonlatalts.length; ++index)
        {
        var lon = lonlatalts[index][0];
        var lat = lonlatalts[index][1];
        var alt = lonlatalts[index][2];
        LonLats.push(new LonLat(lon, lat, alt));
        if (lon < extent.southWest.lon) extent.southWest.lon = lon;
        if (lat < extent.southWest.lat) extent.southWest.lat = lat;
        if (lon > extent.northEast.lon) extent.northEast.lon = lon;
        if (lat > extent.northEast.lat) extent.northEast.lat = lat;
        };

      //console.log(name, iconURL, lonlatalts[0], lonlatalts[1], lonlatalts[2]);

      var entity;

      if (LonLats.length === 1)
        {
        entity = new Entity({
          'name': name,
          'lonlat': LonLats[0],
          'billboard': {
            'src': iconURL,
            'size': [24, 24],
            'color': iconColor,
            'rotation': 0
            },
          'properties': {
            'bearing': 0,
            'color': iconColor
            }
          });
        }
      else
        {
        entity = new Entity({
          'polyline': {
            'pathLonLat': [LonLats],
            'thickness': lineWidth,
            'color': lineColor,
            'isClosed': false
          }
        });
        };

      return(entity);
      }

    /**
     * @private
     */
    _parseJSONKML(jobj, extent, entities=undefined) {
      if (entities === undefined)
        entities = [];

      for (var key in jobj) {
        if (key == "Placemark") {
          for (var index in jobj[key]) {
            let entity = this._kmlPlacemarkToEntity(jobj[key][index], extent);
            if (entity !== undefined) {
              entities.push(entity);
              };
            };
          };
        if (jobj[key] !== null && typeof(jobj[key]) == "object") {
          this._parseJSONKML(jobj[key], extent, entities);
          };
        };

      return(entities);
      }

    /**
     * @private
     */
    _convertKMLintoEntities(xml) {
      const extent = new Extent(new LonLat(180.0, 90.0), new LonLat(-180.0, -90.0));
      let jobj = this._xml2json(xml);

      let entities = this._parseJSONKML(jobj, extent);

      return({entities, extent});
      }

    /**
     * Creates billboards or polylines from array of lonlat.
     * @private
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
     * @private
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
     * @private
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
        const {entities, extent} = this._convertKMLintoEntities(kml);

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
        const {entities, extent} = this._convertKMLintoEntities(kml);

        this._extent = this._expandExtents(this._extent, extent);
        entities.forEach(this.add.bind(this));
        return { entities, extent };
    }
}
