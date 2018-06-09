/**
 * @module og/entity/GeometryHandler
 */

'use strict';

import * as mercator from '../mercator.js';
import * as quadTree from '../quadTree/quadTree.js';
import { earcut, flatten } from '../utils/earcut.js';
import { GeometryType } from './Geometry.js';

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

class GeometryHandler {
    constructor(layer) {
        this.__staticId = GeometryHandler._staticCounter++;

        this._layer = layer;

        this._handler = null;

        this._geometries = [];

        this._updatedGeometryArr = [];
        this._updatedGeometry = {};

        this._removeGeometryExtentArr = [];
        this._removeGeometryExtents = {};

        //Polygon arrays
        this._polyVerticesMerc = [];
        this._polyColors = [];
        this._polyPickingColors = [];
        this._polyIndexes = [];

        //Line arrays
        this._lineVerticesMerc = [];
        this._lineOrders = [];
        this._lineIndexes = [];
        this._lineColors = [];
        this._linePickingColors = [];
        this._lineThickness = [];
        this._lineStrokes = [];
        this._lineStrokeColors = [];

        //Buffers
        this._polyVerticesBufferMerc = null;
        this._polyColorsBuffer = null;
        this._polyPickingColorsBuffer = null;
        this._polyIndexesBuffer = null;

        this._lineVerticesBufferMerc = null;
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

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    static appendLineData(pathArr, isClosed, color, pickingColor, thickness, strokeColor, strokeSize,
        outVertices, outOrders, outIndexes, outColors, outPickingColors, outThickness, outStrokeColors, outStrokes,
        outVertices2) {
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

        for (var j = 0; j < pathArr.length; j++) {
            var path = pathArr[j];
            var startIndex = index;
            var last;
            if (isClosed) {
                last = path[path.length - 1];
            } else {
                let p0 = path[0],
                    p1 = path[1];
                last = [p0[0] + p0[0] - p1[0], p0[1] + p0[1] - p1[1]];
            }
            outVertices.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
            outVertices2.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
            outOrders.push(1, -1, 2, -2);

            outThickness.push(t, t, t, t);
            outStrokes.push(s, s, s, s);
            outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
            outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
            outPickingColors.push(p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);

            for (var i = 0; i < path.length; i++) {
                var cur = path[i];
                outVertices.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
                outVertices2.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
                outOrders.push(1, -1, 2, -2);
                outThickness.push(t, t, t, t);
                outStrokes.push(s, s, s, s);
                outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
                outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
                outPickingColors.push(p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);
                outIndexes.push(index++, index++, index++, index++);
            }

            var first;
            if (isClosed) {
                first = path[0];
                outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
            } else {
                let p0 = path[path.length - 1],
                    p1 = path[path.length - 2];
                first = [p0[0] + p0[0] - p1[0], p0[1] + p0[1] - p1[1]];
                outIndexes.push(index - 1, index - 1, index - 1, index - 1);
            }
            outVertices.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
            outVertices2.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
            outOrders.push(1, -1, 2, -2);
            outThickness.push(t, t, t, t);
            outStrokes.push(s, s, s, s);
            outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
            outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
            outPickingColors.push(p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);

            if (j < pathArr.length - 1) {
                index += 8;
                outIndexes.push(index, index);
            }
        }
    }

    assignHandler(handler) {
        this._handler = handler;
        this.refresh();
    }

    /**
     * @public
     * @param {og.Geometry} geometry - Geometry object.
     */
    add(geometry) {
        //
        // Triangulates polygon and sets geometry data.
        if (geometry._handlerIndex === -1) {
            geometry._handler = this;
            geometry._handlerIndex = this._geometries.length;
            this._geometries.push(geometry);

            let pickingColor = geometry._entity._pickingColor.scaleTo(1 / 255);

            geometry._polyVerticesMerc = [];
            geometry._lineVerticesMerc = [];

            if (geometry._type === GeometryType.POLYGON) {

                let coordinates = geometry._coordinates;
                let ci = [];
                for (let j = 0; j < coordinates.length; j++) {
                    ci[j] = [];
                    for (var k = 0; k < coordinates[j].length; k++) {
                        ci[j][k] = [mercator.forward_lon(coordinates[j][k][0]), mercator.forward_lat(coordinates[j][k][1])];
                    }
                }

                let data = flatten(ci);
                let indexes = earcut(data.vertices, data.holes, 2);

                geometry._polyVerticesMerc = data.vertices;
                geometry._polyVerticesHandlerIndex = this._polyVerticesMerc.length;
                geometry._polyIndexesHandlerIndex = this._polyIndexes.length;

                this._polyVerticesMerc.push.apply(this._polyVerticesMerc, data.vertices);

                for (let i = 0; i < indexes.length; i++) {
                    this._polyIndexes.push(indexes[i] + geometry._polyVerticesHandlerIndex * 0.5);
                }

                var color = geometry._style.fillColor;
                for (let i = 0; i < data.vertices.length * 0.5; i++) {
                    this._polyColors.push(color.x, color.y, color.z, color.w);
                    this._polyPickingColors.push(pickingColor.x, pickingColor.y, pickingColor.z, 1.0);
                }

                geometry._polyVerticesLength = data.vertices.length;
                geometry._polyIndexesLength = indexes.length;

                //Creates polygon stroke data
                geometry._lineVerticesHandlerIndex = this._lineVerticesMerc.length;
                geometry._lineOrdersHandlerIndex = this._lineOrders.length;
                geometry._lineIndexesHandlerIndex = this._lineIndexes.length;
                geometry._lineColorsHandlerIndex = this._lineColors.length;
                geometry._lineThicknessHandlerIndex = this._lineThickness.length;

                GeometryHandler.appendLineData(ci, true,
                    geometry._style.lineColor, pickingColor, geometry._style.lineWidth,
                    geometry._style.strokeColor, geometry._style.strokeWidth,
                    this._lineVerticesMerc, this._lineOrders, this._lineIndexes, this._lineColors, this._linePickingColors,
                    this._lineThickness, this._lineStrokeColors, this._lineStrokes, geometry._lineVerticesMerc);

                geometry._lineVerticesLength = this._lineVerticesMerc.length - geometry._lineVerticesHandlerIndex;
                geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex;
                geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex;
                geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex;
                geometry._lineThicknessLength = this._lineThickness.length - geometry._lineThicknessHandlerIndex;

            } else if (geometry._type === GeometryType.MULTIPOLYGON) {

                let coordinates = geometry._coordinates;
                let vertices = [],
                    indexes = [],
                    colors = [];

                //Creates polygon stroke data
                geometry._lineVerticesHandlerIndex = this._lineVerticesMerc.length;
                geometry._lineOrdersHandlerIndex = this._lineOrders.length;
                geometry._lineIndexesHandlerIndex = this._lineIndexes.length;
                geometry._lineColorsHandlerIndex = this._lineColors.length;
                geometry._lineThicknessHandlerIndex = this._lineThickness.length;

                for (var i = 0; i < coordinates.length; i++) {
                    let cci = coordinates[i];
                    let ci = [];
                    for (let j = 0; j < cci.length; j++) {
                        ci[j] = [];
                        for (let k = 0; k < coordinates[i][j].length; k++) {
                            ci[j][k] = [mercator.forward_lon(cci[j][k][0]), mercator.forward_lat(cci[j][k][1])];
                        }
                    }
                    let data = flatten(ci);
                    let dataIndexes = earcut(data.vertices, data.holes, 2);

                    for (let j = 0; j < dataIndexes.length; j++) {
                        indexes.push(dataIndexes[j] + vertices.length * 0.5);
                    }

                    vertices.push.apply(vertices, data.vertices);

                    GeometryHandler.appendLineData(ci, true,
                        geometry._style.lineColor, pickingColor, geometry._style.lineWidth,
                        geometry._style.strokeColor, geometry._style.strokeWidth,
                        this._lineVerticesMerc, this._lineOrders, this._lineIndexes, this._lineColors, this._linePickingColors,
                        this._lineThickness, this._lineStrokeColors, this._lineStrokes, geometry._lineVerticesMerc);
                }

                geometry._polyVerticesMerc = vertices;
                geometry._polyVerticesHandlerIndex = this._polyVerticesMerc.length;
                geometry._polyIndexesHandlerIndex = this._polyIndexes.length;

                this._polyVerticesMerc.push.apply(this._polyVerticesMerc, vertices);

                for (let i = 0; i < indexes.length; i++) {
                    this._polyIndexes.push(indexes[i] + geometry._polyVerticesHandlerIndex * 0.5);
                }

                let color = geometry._style.fillColor;
                for (let i = 0; i < vertices.length * 0.5; i++) {
                    this._polyColors.push(color.x, color.y, color.z, color.w);
                    this._polyPickingColors.push(pickingColor.x, pickingColor.y, pickingColor.z, 1.0);
                }

                geometry._polyVerticesLength = vertices.length;
                geometry._polyIndexesLength = indexes.length;

                geometry._lineVerticesLength = this._lineVerticesMerc.length - geometry._lineVerticesHandlerIndex;
                geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex;
                geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex;
                geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex;
                geometry._lineThicknessLength = this._lineThickness.length - geometry._lineThicknessHandlerIndex;

            } else if (geometry._type === GeometryType.LINESTRING) {

                let coordinates = geometry._coordinates;
                let ci = new Array(coordinates.length);
                for (let j = 0; j < coordinates.length; j++) {
                    ci[j] = [mercator.forward_lon(coordinates[j][0]), mercator.forward_lat(coordinates[j][1])];
                }

                //Creates polygon stroke data
                geometry._lineVerticesHandlerIndex = this._lineVerticesMerc.length;
                geometry._lineOrdersHandlerIndex = this._lineOrders.length;
                geometry._lineIndexesHandlerIndex = this._lineIndexes.length;
                geometry._lineColorsHandlerIndex = this._lineColors.length;
                geometry._lineThicknessHandlerIndex = this._lineThickness.length;

                GeometryHandler.appendLineData([ci], false,
                    geometry._style.lineColor, pickingColor, geometry._style.lineWidth,
                    geometry._style.strokeColor, geometry._style.strokeWidth,
                    this._lineVerticesMerc, this._lineOrders, this._lineIndexes, this._lineColors, this._linePickingColors,
                    this._lineThickness, this._lineStrokeColors, this._lineStrokes, geometry._lineVerticesMerc);

                geometry._lineVerticesLength = this._lineVerticesMerc.length - geometry._lineVerticesHandlerIndex;
                geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex;
                geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex;
                geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex;
                geometry._lineThicknessLength = this._lineThickness.length - geometry._lineThicknessHandlerIndex;

            } else if (geometry._type === GeometryType.MULTILINESTRING) {
                let coordinates = geometry._coordinates;
                let ci = [];
                for (let j = 0; j < coordinates.length; j++) {
                    ci[j] = [];
                    for (let k = 0; k < coordinates[j].length; k++) {
                        ci[j][k] = [mercator.forward_lon(coordinates[j][k][0]), mercator.forward_lat(coordinates[j][k][1])];
                    }
                }

                //Creates polygon stroke data
                geometry._lineVerticesHandlerIndex = this._lineVerticesMerc.length;
                geometry._lineOrdersHandlerIndex = this._lineOrders.length;
                geometry._lineIndexesHandlerIndex = this._lineIndexes.length;
                geometry._lineColorsHandlerIndex = this._lineColors.length;
                geometry._lineThicknessHandlerIndex = this._lineThickness.length;

                GeometryHandler.appendLineData(ci, false,
                    geometry._style.lineColor, pickingColor, geometry._style.lineWidth,
                    geometry._style.strokeColor, geometry._style.strokeWidth,
                    this._lineVerticesMerc, this._lineOrders, this._lineIndexes, this._lineColors, this._linePickingColors,
                    this._lineThickness, this._lineStrokeColors, this._lineStrokes, geometry._lineVerticesMerc);

                geometry._lineVerticesLength = this._lineVerticesMerc.length - geometry._lineVerticesHandlerIndex;
                geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex;
                geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex;
                geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex;
                geometry._lineThicknessLength = this._lineThickness.length - geometry._lineThicknessHandlerIndex;
            }

            //Refresh visibility
            this.setGeometryVisibility(geometry);

            !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
            this._updatedGeometry[geometry._id] = true;
            this.refresh();
        }
    }

    remove(geometry) {
        var index = geometry._handlerIndex;
        if (index !== -1) {
            this._geometries.splice(index, 1);

            //polygon
            //this._polyVerticesLonLat.splice(geometry._polyVerticesHandlerIndex, geometry._polyVerticesLength);
            this._polyVerticesMerc.splice(geometry._polyVerticesHandlerIndex, geometry._polyVerticesLength);
            this._polyColors.splice(geometry._polyVerticesHandlerIndex * 2, geometry._polyVerticesLength * 2);
            this._polyPickingColors.splice(geometry._polyVerticesHandlerIndex * 2, geometry._polyVerticesLength * 2);
            this._polyIndexes.splice(geometry._polyIndexesHandlerIndex, geometry._polyIndexesLength);
            var di = geometry._polyVerticesLength * 0.5;
            for (var i = geometry._polyIndexesHandlerIndex; i < this._polyIndexes.length; i++) {
                this._polyIndexes[i] -= di;
            }

            //line
            //this._lineVerticesLonLat.splice(geometry._lineVerticesHandlerIndex, geometry._lineVerticesLength);
            this._lineVerticesMerc.splice(geometry._lineVerticesHandlerIndex, geometry._lineVerticesLength);
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

            //reindex
            var g = this._geometries;
            for (let i = index; i < g.length; i++) {
                var gi = g[i];
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

            geometry._polyVerticesMerc = [];
            geometry._polyVerticesLength = -1;
            geometry._polyIndexesLength = -1;
            geometry._polyVerticesHandlerIndex = -1;
            geometry._polyIndexesHandlerIndex = -1;

            geometry._lineVerticesMerc = [];
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

            !this._removeGeometryExtents[geometry._id] && this._removeGeometryExtentArr.push(geometry.getExtent());
            this._removeGeometryExtents[geometry._id] = true;

            this.refresh();
        }
    }

    _refreshRecursevely(geometry, treeNode) {
        if (treeNode.ready) {
            var lid = this._layer._id;
            for (var i = 0; i < treeNode.nodes.length; i++) {
                var ni = treeNode.nodes[i];
                if (geometry._extent.overlaps(ni.segment.getExtentLonLat())) {
                    this._refreshRecursevely(geometry, ni);
                    var m = ni.segment.materials[lid];
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

    _refreshRecursevelyExt(extent, treeNode) {
        if (treeNode.ready) {
            var lid = this._layer._id;
            for (var i = 0; i < treeNode.nodes.length; i++) {
                var ni = treeNode.nodes[i];
                if (extent.overlaps(ni.segment.getExtentLonLat())) {
                    this._refreshRecursevelyExt(extent, ni);
                    var m = ni.segment.materials[lid];
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

    _refreshPlanetNode(treeNode) {
        var i = 0;

        var e = this._removeGeometryExtentArr;
        for (i = 0; i < e.length; i++) {
            this._refreshRecursevelyExt(e[i], treeNode);
        }

        var g = this._updatedGeometryArr;
        for (i = 0; i < g.length; i++) {
            this._refreshRecursevely(g[i], treeNode);
        }
    }

    _updatePlanet() {
        var p = this._layer._planet;
        if (p) {
            this._refreshPlanetNode(p._quadTree);
            this._refreshPlanetNode(p._quadTreeNorth);
            this._refreshPlanetNode(p._quadTreeSouth);
        }
        this._updatedGeometryArr.length = 0;
        this._updatedGeometryArr = [];
        this._updatedGeometry = {};

        this._removeGeometryExtentArr.length = 0;
        this._removeGeometryExtentArr = [];
        this._removeGeometryExtents = {};
    }

    refresh() {
        var i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    update() {
        if (this._handler) {
            var needUpdate = false;
            var i = this._changedBuffers.length;
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

    setGeometryVisibility(geometry) {
        var v = geometry._visibility ? 1.0 : 0.0;

        var a = this._polyVerticesMerc;
        var l = geometry._polyVerticesLength;
        var ind = geometry._polyVerticesHandlerIndex;
        for (var i = 0; i < l; i++) {
            a[ind + i] = geometry._polyVerticesMerc[i] * v;
        }

        a = this._lineVerticesMerc;
        l = geometry._lineVerticesLength;
        ind = geometry._lineVerticesHandlerIndex;
        for (i = 0; i < l; i++) {
            a[ind + i] = geometry._lineVerticesMerc[i] * v;
        }

        this._changedBuffers[POLYVERTICES_BUFFER] = true;
        this._changedBuffers[LINEVERTICES_BUFFER] = true;

        !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry._id] = true;
    }

    setPolyColorArr(geometry, color) {
        var index = geometry._polyVerticesHandlerIndex * 2, // ... / 2 * 4
            size = index + geometry._polyVerticesLength * 2; // ... / 2 * 4
        var a = this._polyColors;
        for (var i = index; i < size; i += 4) {
            a[i] = color.x;
            a[i + 1] = color.y;
            a[i + 2] = color.z;
            a[i + 3] = color.w;
        }
        this._changedBuffers[POLYCOLORS_BUFFER] = true;
        !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry._id] = true;
    }

    setLineStrokeColorArr(geometry, color) {
        var index = geometry._lineColorsHandlerIndex,
            size = index + geometry._lineColorsLength;
        var a = this._lineStrokeColors;
        for (var i = index; i < size; i += 4) {
            a[i] = color.x;
            a[i + 1] = color.y;
            a[i + 2] = color.z;
            a[i + 3] = color.w;
        }
        this._changedBuffers[LINESTROKECOLORS_BUFFER] = true;
        !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry._id] = true;
    }

    setLineColorArr(geometry, color) {
        var index = geometry._lineColorsHandlerIndex,
            size = index + geometry._lineColorsLength;
        var a = this._lineColors;
        for (var i = index; i < size; i += 4) {
            a[i] = color.x;
            a[i + 1] = color.y;
            a[i + 2] = color.z;
            a[i + 3] = color.w;
        }
        this._changedBuffers[LINECOLORS_BUFFER] = true;
        !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry._id] = true;
    }

    setLineStrokeArr(geometry, width) {
        var index = geometry._lineStrokesHandlerIndex,
            size = index + geometry._lineStrokesLength;
        var a = this._lineStrokes;
        for (var i = index; i < size; i++) {
            a[i] = width;
        }
        this._changedBuffers[LINESTROKES_BUFFER] = true;
        !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry._id] = true;
    }

    setLineThicknessArr(geometry, width) {
        var index = geometry._lineThicknessHandlerIndex,
            size = index + geometry._lineThicknessLength;
        var a = this._lineThickness;
        for (var i = index; i < size; i++) {
            a[i] = width;
        }
        this._changedBuffers[LINETHICKNESS_BUFFER] = true;
        !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry._id] = true;
    }

    bringToFront(geometry) {

        var polyIndexes = this._polyIndexes.splice(geometry._polyIndexesHandlerIndex, geometry._polyIndexesLength);
        var lineIndexes = this._lineIndexes.splice(geometry._lineIndexesHandlerIndex, geometry._lineIndexesLength);

        this._geometries.splice(geometry._handlerIndex, 1);

        var g = this._geometries;
        for (var i = geometry._handlerIndex; i < g.length; i++) {
            var gi = g[i];
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

        !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry._id] = true;
    }

    createPolyVerticesBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._polyVerticesBufferMerc);
        this._polyVerticesBufferMerc = h.createArrayBuffer(new Float32Array(this._polyVerticesMerc), 2, this._polyVerticesMerc.length / 2);
    }

    createPolyIndexesBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._polyIndexesBuffer);
        this._polyIndexesBuffer = h.createElementArrayBuffer(new Uint32Array(this._polyIndexes), 1, this._polyIndexes.length);
    }

    createPolyColorsBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._polyColorsBuffer);
        this._polyColorsBuffer = h.createArrayBuffer(new Float32Array(this._polyColors), 4, this._polyColors.length / 4);
    }

    createPolyPickingColorsBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._polyPickingColorsBuffer);
        this._polyPickingColorsBuffer = h.createArrayBuffer(new Float32Array(this._polyPickingColors), 4, this._polyPickingColors.length / 4);
    }

    createLineVerticesBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._lineVerticesBufferMerc);
        this._lineVerticesBufferMerc = h.createArrayBuffer(new Float32Array(this._lineVerticesMerc), 2, this._lineVerticesMerc.length / 2);
    }

    createLineIndexesBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._lineIndexesBuffer);
        this._lineIndexesBuffer = h.createElementArrayBuffer(new Uint32Array(this._lineIndexes), 1, this._lineIndexes.length);
    }

    createLineOrdersBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._lineOrdersBuffer);
        this._lineOrdersBuffer = h.createArrayBuffer(new Float32Array(this._lineOrders), 1, this._lineOrders.length / 2);
    }

    createLineColorsBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._lineColorsBuffer);
        this._lineColorsBuffer = h.createArrayBuffer(new Float32Array(this._lineColors), 4, this._lineColors.length / 4);
    }

    createLinePickingColorsBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._linePickingColorsBuffer);
        this._linePickingColorsBuffer = h.createArrayBuffer(new Float32Array(this._linePickingColors), 4, this._linePickingColors.length / 4);
    }

    createLineThicknessBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._lineThicknessBuffer);
        this._lineThicknessBuffer = h.createArrayBuffer(new Float32Array(this._lineThickness), 1, this._lineThickness.length);
    }

    createLineStrokesBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._lineStrokesBuffer);
        this._lineStrokesBuffer = h.createArrayBuffer(new Float32Array(this._lineStrokes), 1, this._lineStrokes.length);
    }

    createLineStrokeColorsBuffer() {
        var h = this._handler;
        h.gl.deleteBuffer(this._lineStrokeColorsBuffer);
        this._lineStrokeColorsBuffer = h.createArrayBuffer(new Float32Array(this._lineStrokeColors), 4, this._lineStrokeColors.length / 4);
    }
};

export { GeometryHandler };