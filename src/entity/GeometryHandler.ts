import * as mercator from "../mercator";
import * as quadTree from "../quadTree/quadTree.js";
import {Extent} from "../Extent";
import {Handler} from "../webgl/Handler";
import {doubleToTwoFloatsV2} from "../math/coder";
import {Vector} from "../layer/Vector";
import {NumberArray2, Vec2} from "../math/Vec2";
import {Node} from "../quadTree/Node";
import {Vec3} from "../math/Vec3";
import {Vec4} from "../math/Vec4";
import {
    CoordinatesType,
    GeometryType,
    Geometry,
    IMultiLineStringCoordinates,
    ILineStringCoordinates,
    IMultiPolygonCoordinates,
    IPolygonCoordinates
} from "./Geometry";

import {earcut, flatten} from "../utils/earcut.js";
import {WebGLBufferExt} from "../webgl/Handler";

const POLYVERTICES_BUFFER = 0;
const POLYINDEXES_BUFFER = 1;
const POLYCOLORS_BUFFER = 2;
const LINEVERTICES_BUFFER = 3;
const LINEINDEXES_BUFFER = 4;
const LINEORDERS_BUFFER = 5;
const LINECOLORS_BUFFER = 6;
const LINETHICKNESS_BUFFER = 7;
const LINESTROKES_BUFFER = 8;
const LINESTROKECOLORS_BUFFER = 9;
const POLYPICKINGCOLORS_BUFFER = 10;
const LINEPICKINGCOLORS_BUFFER = 11;

function doubleToTwoFloats(v: NumberArray2, high: Vec2, low: Vec2) {
    let x = v[0],
        y = v[1];

    if (x >= 0.0) {
        let doubleHigh = Math.floor(x / 65536.0) * 65536.0;
        high.x = Math.fround(doubleHigh);
        low.x = Math.fround(x - doubleHigh);
    } else {
        let doubleHigh = Math.floor(-x / 65536.0) * 65536.0;
        high.x = Math.fround(-doubleHigh);
        low.x = Math.fround(x + doubleHigh);
    }

    if (y >= 0.0) {
        let doubleHigh = Math.floor(y / 65536.0) * 65536.0;
        high.y = Math.fround(doubleHigh);
        low.y = Math.fround(y - doubleHigh);
    } else {
        let doubleHigh = Math.floor(-y / 65536.0) * 65536.0;
        high.y = Math.fround(-doubleHigh);
        low.y = Math.fround(y + doubleHigh);
    }
}

let tempHigh = new Vec2(),
    tempLow = new Vec2(),
    tempHighLow = new Vec2();

class GeometryHandler {

    static __counter__: number = 0;

    protected __id: number;

    protected _layer: Vector;

    protected _handler: Handler | null;

    protected _geometries: Geometry[];

    protected _updatedGeometryArr: Geometry[];
    protected _updatedGeometry: Record<number, boolean>;

    protected _removeGeometryExtentArr: Extent[];
    protected _removeGeometryExtents: Record<number, boolean>;

    // Polygon arrays
    protected _polyVerticesHighMerc: number[];
    protected _polyVerticesLowMerc: number[];
    protected _polyColors: number[];
    protected _polyPickingColors: number[];
    protected _polyIndexes: number[];

    // Line arrays
    protected _lineVerticesHighMerc: number[];
    protected _lineVerticesLowMerc: number[];
    protected _lineOrders: number[];
    protected _lineIndexes: number[];
    protected _lineColors: number[];
    protected _linePickingColors: number[];
    protected _lineThickness: number[];
    protected _lineStrokes: number[];
    protected _lineStrokeColors: number[];

    // Buffers
    public _polyVerticesHighBufferMerc: WebGLBufferExt | null;
    public _polyVerticesLowBufferMerc: WebGLBufferExt | null;
    public _polyColorsBuffer: WebGLBufferExt | null;
    public _polyPickingColorsBuffer: WebGLBufferExt | null;
    public _polyIndexesBuffer: WebGLBufferExt | null;

    public _lineVerticesHighBufferMerc: WebGLBufferExt | null;
    public _lineVerticesLowBufferMerc: WebGLBufferExt | null;
    public _lineColorsBuffer: WebGLBufferExt | null;
    public _linePickingColorsBuffer: WebGLBufferExt | null;
    public _lineThicknessBuffer: WebGLBufferExt | null;
    public _lineStrokesBuffer: WebGLBufferExt | null;
    public _lineStrokeColorsBuffer: WebGLBufferExt | null;
    public _lineOrdersBuffer: WebGLBufferExt | null;
    public _lineIndexesBuffer: WebGLBufferExt | null;

    protected _buffersUpdateCallbacks: Function[];

    protected _changedBuffers: boolean[];

    constructor(layer: Vector) {
        this.__id = GeometryHandler.__counter__++;

        this._layer = layer;

        this._handler = null;

        this._geometries = [];

        this._updatedGeometryArr = [];
        this._updatedGeometry = {};

        this._removeGeometryExtentArr = [];
        this._removeGeometryExtents = {};

        // Polygon arrays
        this._polyVerticesHighMerc = [];
        this._polyVerticesLowMerc = [];
        this._polyColors = [];
        this._polyPickingColors = [];
        this._polyIndexes = [];

        // Line arrays
        this._lineVerticesHighMerc = [];
        this._lineVerticesLowMerc = [];
        this._lineOrders = [];
        this._lineIndexes = [];
        this._lineColors = [];
        this._linePickingColors = [];
        this._lineThickness = [];
        this._lineStrokes = [];
        this._lineStrokeColors = [];

        // Buffers
        this._polyVerticesHighBufferMerc = null;
        this._polyVerticesLowBufferMerc = null;
        this._polyColorsBuffer = null;
        this._polyPickingColorsBuffer = null;
        this._polyIndexesBuffer = null;

        this._lineVerticesHighBufferMerc = null;
        this._lineVerticesLowBufferMerc = null;
        this._lineColorsBuffer = null;
        this._linePickingColorsBuffer = null;
        this._lineThicknessBuffer = null;
        this._lineStrokesBuffer = null;
        this._lineStrokeColorsBuffer = null;
        this._lineOrdersBuffer = null;
        this._lineIndexesBuffer = null;

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[POLYVERTICES_BUFFER] = this.createPolyVerticesBuffer;
        this._buffersUpdateCallbacks[POLYINDEXES_BUFFER] = this.createPolyIndexesBuffer;
        this._buffersUpdateCallbacks[POLYCOLORS_BUFFER] = this.createPolyColorsBuffer;
        this._buffersUpdateCallbacks[LINEVERTICES_BUFFER] = this.createLineVerticesBuffer;
        this._buffersUpdateCallbacks[LINEINDEXES_BUFFER] = this.createLineIndexesBuffer;
        this._buffersUpdateCallbacks[LINEORDERS_BUFFER] = this.createLineOrdersBuffer;
        this._buffersUpdateCallbacks[LINECOLORS_BUFFER] = this.createLineColorsBuffer;
        this._buffersUpdateCallbacks[LINETHICKNESS_BUFFER] = this.createLineThicknessBuffer;
        this._buffersUpdateCallbacks[LINESTROKES_BUFFER] = this.createLineStrokesBuffer;
        this._buffersUpdateCallbacks[LINESTROKECOLORS_BUFFER] = this.createLineStrokeColorsBuffer;
        this._buffersUpdateCallbacks[POLYPICKINGCOLORS_BUFFER] = this.createPolyPickingColorsBuffer;
        this._buffersUpdateCallbacks[LINEPICKINGCOLORS_BUFFER] = this.createLinePickingColorsBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
    }

    static appendLineData(
        pathArr: CoordinatesType[][],
        isClosed: boolean,
        color: Vec4,
        pickingColor: Vec3,
        thickness: number,
        strokeColor: Vec4,
        strokeSize: number,
        outVerticesHigh: number[],
        outVerticesLow: number[],
        outOrders: number[],
        outIndexes: number[],
        outColors: number[],
        outPickingColors: number[],
        outThickness: number[],
        outStrokeColors: number[],
        outStrokes: number[],
        outVerticesHigh2: number[],
        outVerticesLow2: number[]
    ) {
        var index = 0;

        if (outIndexes.length > 0) {
            index = outIndexes[outIndexes.length - 5] + 9;
            outIndexes.push(index, index);
        } else {
            outIndexes.push(0, 0);
        }

        var t = thickness,
            c = [color.x, color.y, color.z, color.w],
            s = strokeSize,
            sc = [strokeColor.x, strokeColor.y, strokeColor.z, strokeColor.w],
            p = [pickingColor.x, pickingColor.y, pickingColor.z, 1.0];

        for (let j = 0; j < pathArr.length; j++) {
            var path = pathArr[j];

            if (path.length === 0) {
                continue;
            }

            let startIndex = index;
            let last: CoordinatesType;
            if (isClosed) {
                last = path[path.length - 1];
            } else {
                let p0 = path[0],
                    p1 = path[1];

                if (!p1) {
                    p1 = p0;
                }

                last = [p0[0] + p0[0] - p1[0], p0[1] + p0[1] - p1[1]];
            }

            doubleToTwoFloats(last as NumberArray2, tempHigh, tempLow);

            outVerticesHigh.push(
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y
            );
            outVerticesLow.push(
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y
            );

            outVerticesHigh2.push(
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y
            );
            outVerticesLow2.push(
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y
            );

            outOrders.push(1, -1, 2, -2);

            outThickness.push(t, t, t, t);
            outStrokes.push(s, s, s, s);
            outColors.push(
                c[0], c[1], c[2], c[3],
                c[0], c[1], c[2], c[3],
                c[0], c[1], c[2], c[3],
                c[0], c[1], c[2], c[3]
            );
            outStrokeColors.push(
                sc[0], sc[1], sc[2], sc[3],
                sc[0], sc[1], sc[2], sc[3],
                sc[0], sc[1], sc[2], sc[3],
                sc[0], sc[1], sc[2], sc[3]
            );
            outPickingColors.push(
                p[0], p[1], p[2], p[3],
                p[0], p[1], p[2], p[3],
                p[0], p[1], p[2], p[3],
                p[0], p[1], p[2], p[3]
            );

            for (let i = 0; i < path.length; i++) {
                let cur = path[i];

                doubleToTwoFloats(cur as NumberArray2, tempHigh, tempLow);

                outVerticesHigh.push(
                    tempHigh.x, tempHigh.y,
                    tempHigh.x, tempHigh.y,
                    tempHigh.x, tempHigh.y,
                    tempHigh.x, tempHigh.y
                );
                outVerticesLow.push(
                    tempLow.x, tempLow.y,
                    tempLow.x, tempLow.y,
                    tempLow.x, tempLow.y,
                    tempLow.x, tempLow.y
                );

                outVerticesHigh2.push(
                    tempHigh.x, tempHigh.y,
                    tempHigh.x, tempHigh.y,
                    tempHigh.x, tempHigh.y,
                    tempHigh.x, tempHigh.y
                );
                outVerticesLow2.push(
                    tempLow.x, tempLow.y,
                    tempLow.x, tempLow.y,
                    tempLow.x, tempLow.y,
                    tempLow.x, tempLow.y
                );

                outOrders.push(1, -1, 2, -2);
                outThickness.push(t, t, t, t);
                outStrokes.push(s, s, s, s);
                outColors.push(
                    c[0], c[1], c[2], c[3],
                    c[0], c[1], c[2], c[3],
                    c[0], c[1], c[2], c[3],
                    c[0], c[1], c[2], c[3]
                );
                outStrokeColors.push(
                    sc[0], sc[1], sc[2], sc[3],
                    sc[0], sc[1], sc[2], sc[3],
                    sc[0], sc[1], sc[2], sc[3],
                    sc[0], sc[1], sc[2], sc[3]
                );
                outPickingColors.push(
                    p[0], p[1], p[2], p[3],
                    p[0], p[1], p[2], p[3],
                    p[0], p[1], p[2], p[3],
                    p[0], p[1], p[2], p[3]
                );
                outIndexes.push(index++, index++, index++, index++);
            }

            let first: CoordinatesType;
            if (isClosed) {
                first = path[0];
                outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
            } else {
                let p0 = path[path.length - 1],
                    p1 = path[path.length - 2];

                if (!p1) {
                    p1 = p0;
                }

                first = [p0[0] + p0[0] - p1[0], p0[1] + p0[1] - p1[1]];
                outIndexes.push(index - 1, index - 1, index - 1, index - 1);
            }

            doubleToTwoFloats(first as NumberArray2, tempHigh, tempLow);

            outVerticesHigh.push(
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y
            );
            outVerticesLow.push(
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y
            );

            outVerticesHigh2.push(
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y,
                tempHigh.x, tempHigh.y
            );
            outVerticesLow2.push(
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y,
                tempLow.x, tempLow.y
            );

            outOrders.push(1, -1, 2, -2);
            outThickness.push(t, t, t, t);
            outStrokes.push(s, s, s, s);
            outColors.push(
                c[0], c[1], c[2], c[3],
                c[0], c[1], c[2], c[3],
                c[0], c[1], c[2], c[3],
                c[0], c[1], c[2], c[3]
            );
            outStrokeColors.push(
                sc[0], sc[1], sc[2], sc[3],
                sc[0], sc[1], sc[2], sc[3],
                sc[0], sc[1], sc[2], sc[3],
                sc[0], sc[1], sc[2], sc[3]
            );
            outPickingColors.push(
                p[0], p[1], p[2], p[3],
                p[0], p[1], p[2], p[3],
                p[0], p[1], p[2], p[3],
                p[0], p[1], p[2], p[3]
            );

            if (j < pathArr.length - 1) {
                index += 8;
                outIndexes.push(index, index);
            }
        }
    }

    public assignHandler(handler: Handler) {
        this._handler = handler;
        this.refresh();
        if (handler.isInitialized()) {
            this.update();
        }
    }

    /**
     * @public
     * @param {Geometry} geometry - Geometry object.
     */
    public add(geometry: Geometry) {
        //
        // Triangulates polygon and sets geometry data.
        if (geometry._handlerIndex === -1) {
            geometry._handler = this;
            geometry._handlerIndex = this._geometries.length;

            this._geometries.push(geometry);

            let pickingColor = geometry._entity!._pickingColor.scaleTo(1 / 255);

            geometry._polyVerticesHighMerc = [];
            geometry._polyVerticesLowMerc = [];
            geometry._lineVerticesHighMerc = [];
            geometry._lineVerticesLowMerc = [];

            if ((geometry._coordinates as IPolygonCoordinates)[0].length) {
                if (geometry.type === GeometryType.POLYGON) {
                    let coordinates = geometry._coordinates as IPolygonCoordinates;
                    let ci: IPolygonCoordinates = [];
                    for (let j = 0; j < coordinates.length; j++) {
                        ci[j] = [];
                        for (let k = 0; k < coordinates[j].length; k++) {
                            ci[j][k] = [mercator.forward_lon(coordinates[j][k][0]), mercator.forward_lat(coordinates[j][k][1])];
                        }
                    }

                    let data = flatten(ci);
                    let indexes: number[] = earcut(data.vertices, data.holes, 2);

                    geometry._polyVerticesHandlerIndex = this._polyVerticesHighMerc.length;
                    geometry._polyIndexesHandlerIndex = this._polyIndexes.length;

                    for (let i = 0; i < indexes.length; i++) {
                        this._polyIndexes.push(indexes[i] + geometry._polyVerticesHandlerIndex * 0.5);
                    }

                    let color = geometry._style.fillColor;

                    let verticesHigh = [],
                        verticesLow = [];

                    for (let i = 0; i < data.vertices.length * 0.5; i++) {
                        this._polyColors.push(color.x, color.y, color.z, color.w);
                        this._polyPickingColors.push(pickingColor.x, pickingColor.y, pickingColor.z, 1.0);
                    }

                    for (let i = 0; i < data.vertices.length; i++) {
                        doubleToTwoFloatsV2(data.vertices[i], tempHighLow);
                        verticesHigh[i] = tempHighLow.x;
                        verticesLow[i] = tempHighLow.y;
                    }

                    geometry._polyVerticesHighMerc = verticesHigh;
                    geometry._polyVerticesLowMerc = verticesLow;

                    this._polyVerticesHighMerc.push.apply(this._polyVerticesHighMerc, verticesHigh);
                    this._polyVerticesLowMerc.push.apply(this._polyVerticesLowMerc, verticesLow);

                    geometry._polyVerticesLength = data.vertices.length;
                    geometry._polyIndexesLength = indexes.length;

                    // Creates polygon stroke data
                    geometry._lineVerticesHandlerIndex = this._lineVerticesHighMerc.length;
                    geometry._lineOrdersHandlerIndex = this._lineOrders.length;
                    geometry._lineIndexesHandlerIndex = this._lineIndexes.length;
                    geometry._lineColorsHandlerIndex = this._lineColors.length;
                    geometry._lineThicknessHandlerIndex = this._lineThickness.length;

                    GeometryHandler.appendLineData(
                        ci,
                        true,
                        geometry._style.lineColor,
                        pickingColor,
                        geometry._style.lineWidth,
                        geometry._style.strokeColor,
                        geometry._style.strokeWidth,
                        this._lineVerticesHighMerc,
                        this._lineVerticesLowMerc,
                        this._lineOrders,
                        this._lineIndexes,
                        this._lineColors,
                        this._linePickingColors,
                        this._lineThickness,
                        this._lineStrokeColors,
                        this._lineStrokes,
                        geometry._lineVerticesHighMerc,
                        geometry._lineVerticesLowMerc
                    );

                    geometry._lineVerticesLength = this._lineVerticesHighMerc.length - geometry._lineVerticesHandlerIndex;
                    geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex;
                    geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex;
                    geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex;
                    geometry._lineThicknessLength = this._lineThickness.length - geometry._lineThicknessHandlerIndex;

                } else if (geometry.type === GeometryType.MULTIPOLYGON) {

                    let coordinates = geometry._coordinates as IMultiPolygonCoordinates;
                    let vertices: number[] = [],
                        indexes: number[] = [];

                    // Creates polygon stroke data
                    geometry._lineVerticesHandlerIndex = this._lineVerticesHighMerc.length;
                    geometry._lineOrdersHandlerIndex = this._lineOrders.length;
                    geometry._lineIndexesHandlerIndex = this._lineIndexes.length;
                    geometry._lineColorsHandlerIndex = this._lineColors.length;
                    geometry._lineThicknessHandlerIndex = this._lineThickness.length;

                    for (let i = 0; i < coordinates.length; i++) {
                        let cci: CoordinatesType[][] = coordinates[i];
                        let ci: CoordinatesType[][] = [];
                        for (let j = 0; j < cci.length; j++) {
                            ci[j] = [];
                            for (let k = 0; k < coordinates[i][j].length; k++) {
                                ci[j][k] = [mercator.forward_lon(cci[j][k][0]), mercator.forward_lat(cci[j][k][1])];
                            }
                        }
                        let data = flatten(ci);
                        let dataIndexes: number[] = earcut(data.vertices, data.holes, 2);

                        for (let j = 0; j < dataIndexes.length; j++) {
                            indexes.push(dataIndexes[j] + vertices.length * 0.5);
                        }

                        vertices.push.apply(vertices, data.vertices);

                        GeometryHandler.appendLineData(
                            ci,
                            true,
                            geometry._style.lineColor,
                            pickingColor,
                            geometry._style.lineWidth,
                            geometry._style.strokeColor,
                            geometry._style.strokeWidth,
                            this._lineVerticesHighMerc,
                            this._lineVerticesLowMerc,
                            this._lineOrders,
                            this._lineIndexes,
                            this._lineColors,
                            this._linePickingColors,
                            this._lineThickness,
                            this._lineStrokeColors,
                            this._lineStrokes,
                            geometry._lineVerticesHighMerc,
                            geometry._lineVerticesLowMerc
                        );
                    }

                    geometry._polyVerticesHandlerIndex = this._polyVerticesHighMerc.length;
                    geometry._polyIndexesHandlerIndex = this._polyIndexes.length;

                    for (let i = 0; i < indexes.length; i++) {
                        this._polyIndexes.push(indexes[i] + geometry._polyVerticesHandlerIndex * 0.5);
                    }

                    let color = geometry._style.fillColor;

                    let verticesHigh = [],
                        verticesLow = [];

                    for (let i = 0; i < vertices.length * 0.5; i++) {
                        this._polyColors.push(color.x, color.y, color.z, color.w);
                        this._polyPickingColors.push(
                            pickingColor.x,
                            pickingColor.y,
                            pickingColor.z,
                            1.0
                        );
                    }

                    for (let i = 0; i < vertices.length; i++) {
                        doubleToTwoFloatsV2(vertices[i], tempHighLow);
                        verticesHigh[i] = tempHighLow.x;
                        verticesLow[i] = tempHighLow.y;
                    }

                    geometry._polyVerticesHighMerc = verticesHigh;
                    geometry._polyVerticesLowMerc = verticesLow;

                    this._polyVerticesHighMerc.push.apply(this._polyVerticesHighMerc, verticesHigh);
                    this._polyVerticesLowMerc.push.apply(this._polyVerticesLowMerc, verticesLow);

                    geometry._polyVerticesLength = vertices.length;
                    geometry._polyIndexesLength = indexes.length;

                    geometry._lineVerticesLength = this._lineVerticesHighMerc.length - geometry._lineVerticesHandlerIndex;
                    geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex;
                    geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex;
                    geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex;
                    geometry._lineThicknessLength = this._lineThickness.length - geometry._lineThicknessHandlerIndex;

                } else if (geometry.type === GeometryType.LINESTRING) {

                    let coordinates: ILineStringCoordinates = geometry._coordinates as ILineStringCoordinates;
                    let ci = new Array(coordinates.length);
                    for (let j = 0; j < coordinates.length; j++) {
                        ci[j] = [mercator.forward_lon(coordinates[j][0]), mercator.forward_lat(coordinates[j][1])];
                    }

                    // Creates polygon stroke data
                    geometry._lineVerticesHandlerIndex = this._lineVerticesHighMerc.length;
                    geometry._lineOrdersHandlerIndex = this._lineOrders.length;
                    geometry._lineIndexesHandlerIndex = this._lineIndexes.length;
                    geometry._lineColorsHandlerIndex = this._lineColors.length;
                    geometry._lineThicknessHandlerIndex = this._lineThickness.length;

                    GeometryHandler.appendLineData(
                        [ci],
                        false,
                        geometry._style.lineColor,
                        pickingColor,
                        geometry._style.lineWidth,
                        geometry._style.strokeColor,
                        geometry._style.strokeWidth,
                        this._lineVerticesHighMerc,
                        this._lineVerticesLowMerc,
                        this._lineOrders,
                        this._lineIndexes,
                        this._lineColors,
                        this._linePickingColors,
                        this._lineThickness,
                        this._lineStrokeColors,
                        this._lineStrokes,
                        geometry._lineVerticesHighMerc,
                        geometry._lineVerticesLowMerc
                    );

                    geometry._lineVerticesLength = this._lineVerticesHighMerc.length - geometry._lineVerticesHandlerIndex;
                    geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex;
                    geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex;
                    geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex;
                    geometry._lineThicknessLength = this._lineThickness.length - geometry._lineThicknessHandlerIndex;

                } else if (geometry.type === GeometryType.MULTILINESTRING) {

                    let coordinates = geometry._coordinates as IMultiLineStringCoordinates;
                    let ci: IMultiLineStringCoordinates = [];
                    for (let j = 0; j < coordinates.length; j++) {
                        ci[j] = [];
                        for (let k = 0; k < coordinates[j].length; k++) {
                            ci[j][k] = [mercator.forward_lon(coordinates[j][k][0]), mercator.forward_lat(coordinates[j][k][1])];
                        }
                    }

                    // Creates polygon stroke data
                    geometry._lineVerticesHandlerIndex = this._lineVerticesHighMerc.length;
                    geometry._lineOrdersHandlerIndex = this._lineOrders.length;
                    geometry._lineIndexesHandlerIndex = this._lineIndexes.length;
                    geometry._lineColorsHandlerIndex = this._lineColors.length;
                    geometry._lineThicknessHandlerIndex = this._lineThickness.length;

                    GeometryHandler.appendLineData(
                        ci,
                        false,
                        geometry._style.lineColor,
                        pickingColor,
                        geometry._style.lineWidth,
                        geometry._style.strokeColor,
                        geometry._style.strokeWidth,
                        this._lineVerticesHighMerc,
                        this._lineVerticesLowMerc,
                        this._lineOrders,
                        this._lineIndexes,
                        this._lineColors,
                        this._linePickingColors,
                        this._lineThickness,
                        this._lineStrokeColors,
                        this._lineStrokes,
                        geometry._lineVerticesHighMerc,
                        geometry._lineVerticesLowMerc
                    );

                    geometry._lineVerticesLength = this._lineVerticesHighMerc.length - geometry._lineVerticesHandlerIndex;
                    geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex;
                    geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex;
                    geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex;
                    geometry._lineThicknessLength = this._lineThickness.length - geometry._lineThicknessHandlerIndex;
                }
            }

            // Refresh visibility
            this.setGeometryVisibility(geometry);

            !this._updatedGeometry[geometry.__id] && this._updatedGeometryArr.push(geometry);
            this._updatedGeometry[geometry.__id] = true;
            this.refresh();
        }
    }

    public remove(geometry: Geometry) {

        const index = geometry._handlerIndex;
        if (index !== -1) {
            this._geometries.splice(index, 1);

            // polygon
            // this._polyVerticesLonLat.splice(geometry._polyVerticesHandlerIndex, geometry._polyVerticesLength);

            this._polyVerticesHighMerc.splice(geometry._polyVerticesHandlerIndex, geometry._polyVerticesLength);
            this._polyVerticesLowMerc.splice(geometry._polyVerticesHandlerIndex, geometry._polyVerticesLength);

            this._polyColors.splice(geometry._polyVerticesHandlerIndex * 2, geometry._polyVerticesLength * 2);
            this._polyPickingColors.splice(geometry._polyVerticesHandlerIndex * 2, geometry._polyVerticesLength * 2);
            this._polyIndexes.splice(geometry._polyIndexesHandlerIndex, geometry._polyIndexesLength);

            let di = geometry._polyVerticesLength * 0.5;
            for (let i = geometry._polyIndexesHandlerIndex; i < this._polyIndexes.length; i++) {
                this._polyIndexes[i] -= di;
            }

            // line
            // this._lineVerticesLonLat.splice(geometry._lineVerticesHandlerIndex, geometry._lineVerticesLength);

            this._lineVerticesHighMerc.splice(geometry._lineVerticesHandlerIndex, geometry._lineVerticesLength);
            this._lineVerticesLowMerc.splice(geometry._lineVerticesHandlerIndex, geometry._lineVerticesLength);

            this._lineOrders.splice(geometry._lineOrdersHandlerIndex, geometry._lineOrdersLength);
            this._lineColors.splice(geometry._lineColorsHandlerIndex, geometry._lineColorsLength);
            this._linePickingColors.splice(geometry._lineColorsHandlerIndex, geometry._lineColorsLength);
            this._lineStrokeColors.splice(geometry._lineColorsHandlerIndex, geometry._lineColorsLength);
            this._lineThickness.splice(geometry._lineThicknessHandlerIndex, geometry._lineThicknessLength);
            this._lineStrokes.splice(geometry._lineThicknessHandlerIndex, geometry._lineThicknessLength);
            this._lineIndexes.splice(geometry._lineIndexesHandlerIndex, geometry._lineIndexesLength);

            di = geometry._lineVerticesLength * 0.5;
            for (let i = geometry._lineIndexesHandlerIndex; i < this._lineIndexes.length; i++) {
                this._lineIndexes[i] -= di;
            }

            // reindex
            let g = this._geometries;
            for (let i = index; i < g.length; i++) {
                let gi = g[i];

                gi._handlerIndex = i;
                gi._polyVerticesHandlerIndex -= geometry._polyVerticesLength;
                gi._polyIndexesHandlerIndex -= geometry._polyIndexesLength;

                gi._lineVerticesHandlerIndex -= geometry._lineVerticesLength;
                gi._lineOrdersHandlerIndex -= geometry._lineOrdersLength;
                gi._lineColorsHandlerIndex -= geometry._lineColorsLength;
                gi._lineThicknessHandlerIndex -= geometry._lineThicknessLength;
                gi._lineIndexesHandlerIndex -= geometry._lineIndexesLength;
            }


            geometry._pickingReady = false;

            geometry._handler = null;
            geometry._handlerIndex = -1;

            geometry._polyVerticesHighMerc = [];
            geometry._polyVerticesLowMerc = [];
            geometry._polyVerticesLength = -1;
            geometry._polyIndexesLength = -1;
            geometry._polyVerticesHandlerIndex = -1;
            geometry._polyIndexesHandlerIndex = -1;

            geometry._lineVerticesHighMerc = [];
            geometry._lineVerticesLowMerc = [];
            geometry._lineVerticesLength = -1;
            geometry._lineOrdersLength = -1;
            geometry._lineIndexesLength = -1;
            geometry._lineColorsLength = -1;
            geometry._lineThicknessLength = -1;
            geometry._lineVerticesHandlerIndex = -1;
            geometry._lineOrdersHandlerIndex = -1;
            geometry._lineIndexesHandlerIndex = -1;
            geometry._lineThicknessHandlerIndex = -1;
            geometry._lineColorsHandlerIndex = -1;

            !this._removeGeometryExtents[geometry.__id] && this._removeGeometryExtentArr.push(geometry.getExtent());
            this._removeGeometryExtents[geometry.__id] = true;

            this.refresh();
        }
    }

    protected _refreshRecursevely(geometry: Geometry, treeNode: Node) {
        if (treeNode.ready) {
            let lid = this._layer._id;
            for (let i = 0; i < treeNode.nodes.length; i++) {
                let ni = treeNode.nodes[i];
                if (geometry.overlaps(ni.segment.getExtentLonLat())) {
                    this._refreshRecursevely(geometry, ni);
                    let m = ni.segment.materials[lid];
                    if (m && m.isReady) {
                        if (m.segment.node.getState() !== quadTree.RENDERING) {
                            m.layer.clearMaterial(m);
                        } else {
                            m.pickingReady = m.pickingReady && geometry._pickingReady;
                            m.isReady = false;
                            m._updateTexture = m.texture;
                            m._updatePickingMask = m.pickingMask;
                        }

                        geometry._pickingReady = true;
                    }
                }
            }
        }
    }

    protected _refreshRecursevelyExt(extent: Extent, treeNode: Node) {
        if (treeNode.ready) {
            let lid = this._layer.__id;
            for (let i = 0; i < treeNode.nodes.length; i++) {
                let ni = treeNode.nodes[i];
                if (extent.overlaps(ni.segment.getExtentLonLat())) {
                    this._refreshRecursevelyExt(extent, ni);
                    let m = ni.segment.materials[lid];
                    if (m && m.isReady) {
                        m.layer.clearMaterial(m);
                        // m.pickingReady = false;
                        // m.isReady = false;
                        // m._updateTexture = m.texture;
                        // m._updatePickingMask = m.pickingMask;
                    }
                }
            }
        }
    }

    protected _refreshPlanetNode(treeNode: Node) {
        let i;

        let e = this._removeGeometryExtentArr;
        for (i = 0; i < e.length; i++) {
            this._refreshRecursevelyExt(e[i], treeNode);
        }

        let g = this._updatedGeometryArr;
        for (i = 0; i < g.length; i++) {
            this._refreshRecursevely(g[i], treeNode);
        }
    }

    protected _updatePlanet() {
        let p = this._layer._planet;
        if (p) {
            let ql = p.quadTreeStrategy.quadTreeList;
            for (let i = 0; i < ql.length; i++) {
                this._refreshPlanetNode(ql[i]);
            }
            // p.quadTreeStrategy.quadTreeList.forEach((quadTree: Node) => {
            //     this._refreshPlanetNode(quadTree);
            // });
        }
        this._updatedGeometryArr.length = 0;
        this._updatedGeometryArr = [];
        this._updatedGeometry = {};

        this._removeGeometryExtentArr.length = 0;
        this._removeGeometryExtentArr = [];
        this._removeGeometryExtents = {};
    }

    protected refresh() {
        let i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    public update() {
        if (this._handler) {
            let needUpdate = false;
            let i = this._changedBuffers.length;
            while (i--) {
                if (this._changedBuffers[i]) {
                    needUpdate = true;
                    this._buffersUpdateCallbacks[i].call(this);
                    this._changedBuffers[i] = false;
                }
            }
            needUpdate && this._updatePlanet();
        }
    }

    public setGeometryVisibility(geometry: Geometry) {
        let v = geometry.getVisibility() ? 1.0 : 0.0;

        let a = this._polyVerticesHighMerc,
            b = this._polyVerticesLowMerc;

        let l = geometry._polyVerticesLength;
        let ind = geometry._polyVerticesHandlerIndex;
        for (let i = 0; i < l; i++) {
            a[ind + i] = geometry._polyVerticesHighMerc[i] * v;
            b[ind + i] = geometry._polyVerticesLowMerc[i] * v;
        }

        a = this._lineVerticesHighMerc;
        b = this._lineVerticesLowMerc;

        l = geometry._lineVerticesLength;
        ind = geometry._lineVerticesHandlerIndex;
        for (let i = 0; i < l; i++) {
            a[ind + i] = geometry._lineVerticesHighMerc[i] * v;
            b[ind + i] = geometry._lineVerticesLowMerc[i] * v;
        }

        this._changedBuffers[POLYVERTICES_BUFFER] = true;
        this._changedBuffers[LINEVERTICES_BUFFER] = true;

        !this._updatedGeometry[geometry.__id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry.__id] = true;
    }

    public setPolyColorArr(geometry: Geometry, color: Vec4) {
        let index = geometry._polyVerticesHandlerIndex * 2, // ... / 2 * 4
            size = index + geometry._polyVerticesLength * 2; // ... / 2 * 4
        let a = this._polyColors;
        for (let i = index; i < size; i += 4) {
            a[i] = color.x;
            a[i + 1] = color.y;
            a[i + 2] = color.z;
            a[i + 3] = color.w;
        }
        this._changedBuffers[POLYCOLORS_BUFFER] = true;
        !this._updatedGeometry[geometry.__id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry.__id] = true;
    }

    public setLineStrokeColorArr(geometry: Geometry, color: Vec4) {
        let index = geometry._lineColorsHandlerIndex,
            size = index + geometry._lineColorsLength;
        let a = this._lineStrokeColors;
        for (let i = index; i < size; i += 4) {
            a[i] = color.x;
            a[i + 1] = color.y;
            a[i + 2] = color.z;
            a[i + 3] = color.w;
        }
        this._changedBuffers[LINESTROKECOLORS_BUFFER] = true;
        !this._updatedGeometry[geometry.__id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry.__id] = true;
    }

    public setLineColorArr(geometry: Geometry, color: Vec4) {
        let index = geometry._lineColorsHandlerIndex,
            size = index + geometry._lineColorsLength;
        let a = this._lineColors;
        for (let i = index; i < size; i += 4) {
            a[i] = color.x;
            a[i + 1] = color.y;
            a[i + 2] = color.z;
            a[i + 3] = color.w;
        }
        this._changedBuffers[LINECOLORS_BUFFER] = true;
        !this._updatedGeometry[geometry.__id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry.__id] = true;
    }

    public setLineStrokeArr(geometry: Geometry, width: number) {
        // let index = geometry._lineStrokesHandlerIndex,
        //     size = index + geometry._lineStrokesLength;
        // let a = this._lineStrokes;
        // for (let i = index; i < size; i++) {
        //     a[i] = width;
        // }
        // this._changedBuffers[LINESTROKES_BUFFER] = true;
        // !this._updatedGeometry[geometry.__id] && this._updatedGeometryArr.push(geometry);
        // this._updatedGeometry[geometry.__id] = true;
    }

    public setLineThicknessArr(geometry: Geometry, width: number) {
        let index = geometry._lineThicknessHandlerIndex,
            size = index + geometry._lineThicknessLength;
        let a = this._lineThickness;
        for (let i = index; i < size; i++) {
            a[i] = width;
        }
        this._changedBuffers[LINETHICKNESS_BUFFER] = true;
        !this._updatedGeometry[geometry.__id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry.__id] = true;
    }

    public bringToFront(geometry: Geometry) {
        let polyIndexes = this._polyIndexes.splice(geometry._polyIndexesHandlerIndex, geometry._polyIndexesLength);
        let lineIndexes = this._lineIndexes.splice(geometry._lineIndexesHandlerIndex, geometry._lineIndexesLength);

        this._geometries.splice(geometry._handlerIndex, 1);

        let g = this._geometries;
        for (let i = geometry._handlerIndex; i < g.length; i++) {
            let gi = g[i];
            gi._handlerIndex = i;
            gi._polyIndexesHandlerIndex -= geometry._polyIndexesLength;
            gi._lineIndexesHandlerIndex -= geometry._lineIndexesLength;
        }

        geometry._polyIndexesHandlerIndex = this._polyIndexes.length;
        geometry._lineIndexesHandlerIndex = this._lineIndexes.length;

        geometry._handlerIndex = this._geometries.length;
        this._geometries.push(geometry);

        this._polyIndexes.push.apply(this._polyIndexes, polyIndexes);
        this._lineIndexes.push.apply(this._lineIndexes, lineIndexes);

        this._changedBuffers[POLYINDEXES_BUFFER] = true;
        this._changedBuffers[LINEINDEXES_BUFFER] = true;

        !this._updatedGeometry[geometry.__id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry.__id] = true;
    }

    public createPolyVerticesBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._polyVerticesHighBufferMerc!);
        this._polyVerticesHighBufferMerc = h.createArrayBuffer(
            new Float32Array(this._polyVerticesHighMerc),
            2,
            this._polyVerticesHighMerc.length / 2
        );

        h.gl!.deleteBuffer(this._polyVerticesLowBufferMerc!);
        this._polyVerticesLowBufferMerc = h.createArrayBuffer(
            new Float32Array(this._polyVerticesLowMerc),
            2,
            this._polyVerticesLowMerc.length / 2
        );
    }

    public createPolyIndexesBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._polyIndexesBuffer!);
        this._polyIndexesBuffer = h.createElementArrayBuffer(
            new Uint32Array(this._polyIndexes),
            1,
            this._polyIndexes.length
        );
    }

    public createPolyColorsBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._polyColorsBuffer!);
        this._polyColorsBuffer = h.createArrayBuffer(
            new Float32Array(this._polyColors),
            4,
            this._polyColors.length / 4
        );
    }

    public createPolyPickingColorsBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._polyPickingColorsBuffer!);
        this._polyPickingColorsBuffer = h.createArrayBuffer(
            new Float32Array(this._polyPickingColors),
            4,
            this._polyPickingColors.length / 4
        );
    }

    public createLineVerticesBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._lineVerticesHighBufferMerc!);
        this._lineVerticesHighBufferMerc = h.createArrayBuffer(
            new Float32Array(this._lineVerticesHighMerc),
            2,
            this._lineVerticesHighMerc.length / 2
        );

        h.gl!.deleteBuffer(this._lineVerticesLowBufferMerc!);
        this._lineVerticesLowBufferMerc = h.createArrayBuffer(
            new Float32Array(this._lineVerticesLowMerc),
            2,
            this._lineVerticesLowMerc.length / 2
        );
    }

    public createLineIndexesBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._lineIndexesBuffer!);
        this._lineIndexesBuffer = h.createElementArrayBuffer(
            new Uint32Array(this._lineIndexes),
            1,
            this._lineIndexes.length
        );
    }

    public createLineOrdersBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._lineOrdersBuffer!);
        this._lineOrdersBuffer = h.createArrayBuffer(
            new Float32Array(this._lineOrders),
            1,
            this._lineOrders.length / 2
        );
    }

    public createLineColorsBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._lineColorsBuffer!);
        this._lineColorsBuffer = h.createArrayBuffer(
            new Float32Array(this._lineColors),
            4,
            this._lineColors.length / 4
        );
    }

    public createLinePickingColorsBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._linePickingColorsBuffer!);
        this._linePickingColorsBuffer = h.createArrayBuffer(
            new Float32Array(this._linePickingColors),
            4,
            this._linePickingColors.length / 4
        );
    }

    public createLineThicknessBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._lineThicknessBuffer!);
        this._lineThicknessBuffer = h.createArrayBuffer(
            new Float32Array(this._lineThickness),
            1,
            this._lineThickness.length
        );
    }

    public createLineStrokesBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._lineStrokesBuffer!);
        this._lineStrokesBuffer = h.createArrayBuffer(
            new Float32Array(this._lineStrokes),
            1,
            this._lineStrokes.length
        );
    }

    public createLineStrokeColorsBuffer() {
        let h = this._handler!;
        h.gl!.deleteBuffer(this._lineStrokeColorsBuffer!);
        this._lineStrokeColorsBuffer = h.createArrayBuffer(
            new Float32Array(this._lineStrokeColors),
            4,
            this._lineStrokeColors.length / 4
        );
    }
}

export {GeometryHandler};
