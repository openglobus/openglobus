import * as utils from "../utils/shared";
import {Entity} from "./Entity";
import {Extent} from "../Extent";
import {GeometryHandler} from "./GeometryHandler";
import {LonLat} from "../LonLat";
import {NumberArray4, Vec4} from "../math/Vec4";
import {NumberArray2} from "../math/Vec2";
import {NumberArray3} from "../math/Vec3";

const GeometryType: Record<string, number> = {
    POINT: 1,
    LINESTRING: 2,
    POLYGON: 3,
    MULTIPOLYGON: 4,
    MULTILINESTRING: 5
};

export type CoordinatesType = NumberArray2 | NumberArray3;
// {
//     "type": "Point",
//     "coordinates": [100.0, 0.0]
// }
export type IPointCoordinates = CoordinatesType;

 // {
 //     "type": "LineString",
 //     "coordinates": [
 //         [100.0, 0.0],
 //         [101.0, 1.0]
 //     ]
 // }
export type ILineStringCoordinates = CoordinatesType[];

// No holes
// {
//     "type": "Polygon",
//     "coordinates": [
//         [
//             [100.0, 0.0],
//             [101.0, 0.0],
//             [101.0, 1.0],
//             [100.0, 1.0],
//             [100.0, 0.0]
//         ]
//     ]
// }
//
// With holes:
// {
//     "type": "Polygon",
//     "coordinates": [
//         [
//             [100.0, 0.0],
//             [101.0, 0.0],
//             [101.0, 1.0],
//             [100.0, 1.0],
//             [100.0, 0.0]
//         ],
//         [
//             [100.8, 0.8],
//             [100.8, 0.2],
//             [100.2, 0.2],
//             [100.2, 0.8],
//             [100.8, 0.8]
//         ]
//     ]
// }
export type IPolygonCoordinates = CoordinatesType[][];

// {
//     "type": "MultiLineString",
//     "coordinates": [
//         [
//             [100.0, 0.0],
//             [101.0, 1.0]
//         ],
//         [
//             [102.0, 2.0],
//             [103.0, 3.0]
//         ]
//     ]
// }
export type IMultiLineStringCoordinates = ILineStringCoordinates[];

// {
//     "type": "MultiPolygon",
//     "coordinates": [
//         [
//             [
//                 [102.0, 2.0],
//                 [103.0, 2.0],
//                 [103.0, 3.0],
//                 [102.0, 3.0],
//                 [102.0, 2.0]
//             ]
//         ],
//         [
//             [
//                 [100.0, 0.0],
//                 [101.0, 0.0],
//                 [101.0, 1.0],
//                 [100.0, 1.0],
//                 [100.0, 0.0]
//             ],
//             [
//                 [100.2, 0.2],
//                 [100.2, 0.8],
//                 [100.8, 0.8],
//                 [100.8, 0.2],
//                 [100.2, 0.2]
//             ]
//         ]
//     ]
// }
export type IMultiPolygonCoordinates = IPolygonCoordinates[];

export type IGeometryCoordinates =
    IPointCoordinates |
    IPolygonCoordinates |
    IMultiPolygonCoordinates |
    ILineStringCoordinates |
    IMultiLineStringCoordinates;

interface IGeometry {
    type: string;
    coordinates: IGeometryCoordinates;
}

interface IGeometryStyle {
    fillColor?: string | NumberArray4 | Vec4;
    lineColor?: string | NumberArray4 | Vec4;
    strokeColor?: string | NumberArray4 | Vec4;
    lineWidth?: number;
    strokeWidth?: number;
}

interface IGeometryStyleInternal {
    fillColor: Vec4;
    lineColor: Vec4;
    strokeColor: Vec4;
    lineWidth: number;
    strokeWidth: number;
}

export interface IGeometryParams {
    type?: string;
    coordinates?: IGeometryCoordinates;
    style?: IGeometryStyle;
    visibility?: boolean;
}

class Geometry {
    static __counter__: number = 0;

    protected __id: number;

    /**
     * Entity instance that holds this geometry.
     * @protected
     * @type {Entity}
     */
    protected _entity: Entity | null;

    protected _handler: GeometryHandler | null;
    protected _handlerIndex: number;

    // Polygon
    protected _polyVerticesHighMerc: number[];
    protected _polyVerticesLowMerc: number[];
    protected _polyVerticesLength: number;
    protected _polyIndexesLength: number;
    protected _polyVerticesHandlerIndex: number;
    protected _polyIndexesHandlerIndex: number;

    // Line(Linestring and polygon's stroke(s)
    protected _lineVerticesHighMerc: number[];
    protected _lineVerticesLowMerc: number[];
    protected _lineVerticesLength: number;
    protected _lineOrdersLength: number;
    protected _lineIndexesLength: number;
    protected _lineColorsLength: number;
    protected _lineThicknessLength: number;
    protected _lineVerticesHandlerIndex: number;
    protected _lineOrdersHandlerIndex: number;
    protected _lineIndexesHandlerIndex: number;
    protected _lineThicknessHandlerIndex: number;
    protected _lineColorsHandlerIndex: number;
    protected _type: number;
    protected _coordinates: IGeometryCoordinates;
    protected _extent: Extent;
    protected _style: IGeometryStyleInternal;
    protected _visibility: boolean;
    public _pickingReady: boolean;

    constructor(options: IGeometryParams = {}) {

        this.__id = Geometry.__counter__++;

        this._entity = null;

        this._handler = null;
        this._handlerIndex = -1;

        this._polyVerticesHighMerc = [];
        this._polyVerticesLowMerc = [];
        this._polyVerticesLength = -1;
        this._polyIndexesLength = -1;
        this._polyVerticesHandlerIndex = -1;
        this._polyIndexesHandlerIndex = -1;

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
        this._extent = Geometry.getExtent({
                type: options.type || "Point",
                coordinates: options.coordinates || []
            },
            this._coordinates
        );

        options.style = options.style || {};

        this._style = {
            fillColor: utils.createColorRGBA(options.style.fillColor, new Vec4(0.19, 0.62, 0.85, 0.4)),
            lineColor: utils.createColorRGBA(options.style.lineColor, new Vec4(0.19, 0.62, 0.85, 1)),
            strokeColor: utils.createColorRGBA(options.style.strokeColor, new Vec4(1, 1, 1, 0.95)),
            lineWidth: options.style.lineWidth || 3,
            strokeWidth: options.style.strokeWidth || 0
        };

        this._visibility = options.visibility || true;

        // optimization flag for picking mask rendering pass
        this._pickingReady = false;
    }

    public get id(): number {
        return this.__id;
    }

    public get type(): number {
        return this._type;
    }

    static getType(typeStr: string): number {
        return GeometryType[typeStr.toUpperCase()];
    }

    /**
     * Returns geometry extent.
     @static
     @param {IGeometry} geometryObj - GeoJSON style geometry feature.
     @param {IGeometryCoordinates} outCoordinates - Geometry feature coordinates clone.
     @returns {Extent} -
     */
    static getExtent(geometryObj: IGeometry, outCoordinates: IGeometryCoordinates): Extent {
        let res = new Extent(new LonLat(180.0, 90.0), new LonLat(-180.0, -90.0));
        let t = Geometry.getType(geometryObj.type);

        if (t === GeometryType.POINT) {
            let lon: number = geometryObj.coordinates[0] as number,
                lat: number = geometryObj.coordinates[1] as number;
            res.southWest.lon = lon;
            res.southWest.lat = lat;
            res.northEast.lon = lon;
            res.northEast.lat = lat;
            outCoordinates && (outCoordinates[0] = lon) && (outCoordinates[1] = lat);
        } else if (t === GeometryType.LINESTRING) {
            let c: ILineStringCoordinates = geometryObj.coordinates as ILineStringCoordinates;
            for (let i = 0; i < c.length; i++) {
                let lon = c[i][0],
                    lat = c[i][1];
                if (lon < res.southWest.lon) res.southWest.lon = lon;
                if (lat < res.southWest.lat) res.southWest.lat = lat;
                if (lon > res.northEast.lon) res.northEast.lon = lon;
                if (lat > res.northEast.lat) res.northEast.lat = lat;
                outCoordinates && ((outCoordinates as ILineStringCoordinates)[i] = [lon, lat]);
            }
        } else if (t === GeometryType.POLYGON) {
            let c: IPolygonCoordinates = geometryObj.coordinates as IPolygonCoordinates;
            for (let i = 0; i < c.length; i++) {
                let ci: CoordinatesType[] = c[i];
                outCoordinates && (outCoordinates[i] = []);
                for (let j = 0; j < ci.length; j++) {
                    let cij = ci[j];
                    let lon = cij[0],
                        lat = cij[1];
                    if (lon < res.southWest.lon) res.southWest.lon = lon;
                    if (lat < res.southWest.lat) res.southWest.lat = lat;
                    if (lon > res.northEast.lon) res.northEast.lon = lon;
                    if (lat > res.northEast.lat) res.northEast.lat = lat;
                    outCoordinates && ((outCoordinates as IPolygonCoordinates)[i][j] = [lon, lat]);
                }
            }
        } else if (t === GeometryType.MULTIPOLYGON) {
            let p = geometryObj.coordinates;
            for (let i = 0; i < p.length; i++) {
                let pi: IPolygonCoordinates = p[i] as IPolygonCoordinates;
                outCoordinates && (outCoordinates[i] = []);
                for (let j = 0; j < pi.length; j++) {
                    let pij: CoordinatesType[] = pi[j];
                    outCoordinates && ((outCoordinates as IMultiPolygonCoordinates)[i][j] = []);
                    for (let k = 0; k < pij.length; k++) {
                        let pijk = pij[k];
                        let lon = pijk[0],
                            lat = pijk[1];
                        if (lon < res.southWest.lon) res.southWest.lon = lon;
                        if (lat < res.southWest.lat) res.southWest.lat = lat;
                        if (lon > res.northEast.lon) res.northEast.lon = lon;
                        if (lat > res.northEast.lat) res.northEast.lat = lat;
                        outCoordinates && ((outCoordinates as IMultiPolygonCoordinates)[i][j][k] = [lon, lat]);
                    }
                }
            }
        } else if (t === GeometryType.MULTILINESTRING) {
            let c = geometryObj.coordinates;
            for (let i = 0; i < c.length; i++) {
                let ci: ILineStringCoordinates = c[i] as ILineStringCoordinates;
                outCoordinates && (outCoordinates[i] = []);
                for (let j = 0; j < ci.length; j++) {
                    let cij = ci[j];
                    let lon = cij[0],
                        lat = cij[1];
                    if (lon < res.southWest.lon) res.southWest.lon = lon;
                    if (lat < res.southWest.lat) res.southWest.lat = lat;
                    if (lon > res.northEast.lon) res.northEast.lon = lon;
                    if (lat > res.northEast.lat) res.northEast.lat = lat;
                    outCoordinates && ((outCoordinates as IMultiLineStringCoordinates)[i][j] = [lon, lat]);
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
    public setGeometry(geoJson: IGeometry): Geometry {
        let h = this._handler;
        if (h) {
            this.remove();
            this._type = Geometry.getType(geoJson.type || "Point");
            this._extent = Geometry.getExtent(geoJson, this._coordinates);
            h.add(this);
        }
        return this;
    }

    public setFillColor(r: number, g: number, b: number, a: number = 1.0): Geometry {
        let c = this._style.fillColor;
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

    public setFillColor4v(rgba: Vec4): Geometry {
        return this.setFillColor(rgba.x, rgba.y, rgba.z, rgba.w);
    }

    public setStrokeColor(r: number, g: number, b: number, a: number = 1.0): Geometry {
        let c = this._style.strokeColor;
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

    public setLineColor(r: number, g: number, b: number, a: number = 1.0): Geometry {
        let c = this._style.lineColor;
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

    public setStrokeColor4v(rgba: Vec4): Geometry {
        return this.setStrokeColor(rgba.x, rgba.y, rgba.z, rgba.w);
    }

    public setLineColor4v(rgba: Vec4): Geometry {
        return this.setLineColor(rgba.x, rgba.y, rgba.z, rgba.w);
    }

    public setStrokeOpacity(opacity: number): Geometry {
        let c = this._style.strokeColor;
        c.w = opacity;
        return this.setStrokeColor(c.x, c.y, c.z, opacity);
    }

    public setLineOpacity(opacity: number): Geometry {
        let c = this._style.lineColor;
        c.w = opacity;
        return this.setLineColor(c.x, c.y, c.z, opacity);
    }

    public setStrokeWidth(width: number): Geometry {
        this._style.strokeWidth = width;
        this._pickingReady = false;
        this._handler && this._handler.setLineStrokeArr(this, width);
        return this;
    }

    public bringToFront(): Geometry {
        this._handler && this._handler.bringToFront(this);
        return this;
    }

    public setLineWidth(width: number): Geometry {
        this._style.lineWidth = width;
        this._pickingReady = false;
        this._handler && this._handler.setLineThicknessArr(this, width);
        return this;
    }

    public setFillOpacity(opacity: number): Geometry {
        let c = this._style.fillColor;
        if ((c.w === 0.0 && opacity !== 0.0) || (c.w !== 0.0 && opacity === 0.0)) {
            this._pickingReady = false;
        }
        c.w = opacity;
        this._handler && this._handler.setPolyColorArr(this, c);
        return this;
    }

    public setVisibility(visibility: boolean): Geometry {
        this._visibility = visibility;
        this._handler && this._handler.setGeometryVisibility(this);
        return this;
    }

    public getVisibility(): boolean {
        return this._visibility;
    }

    public remove() {
        this._handler && this._handler.remove(this);
    }

    public getExtent(): Extent {
        return this._extent.clone();
    }

    public getType(): number {
        return this._type;
    }
}

export {Geometry, GeometryType};
