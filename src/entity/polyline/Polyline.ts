import { Entity } from "../Entity";
import { LonLat } from "../../LonLat";
import { Vec3 } from "../../math/Vec3";
import type { NumberArray3 } from "../../math/Vec3";
import type { NumberArray2 } from "../../math/Vec2";
import { Vec4 } from "../../math/Vec4";
import type { NumberArray4 } from "../../math/Vec4";
import type { HTMLImageElementExt } from "../../utils/ImagesCacheManager";
import { htmlColorToRgba } from "../../utils/shared";
import { PolylineHandler } from "./PolylineHandler";
import { PolylineBatchRenderer } from "./PolylineBatchRenderer";
import { Extent } from "../../Extent";

export type Geodetic = LonLat | NumberArray2 | NumberArray3;
export type Cartesian = Vec3 | NumberArray3;

export type SegmentPath3vExt = Cartesian[];
export type SegmentPathLonLatExt = Geodetic[];

export type SegmentPathColor = NumberArray4[];

export type SegmentPath3v = Vec3[];
export type SegmentPathLonLat = LonLat[];

export interface TexParam {
    texOffset: number;
    strokeSize: number;
    texOffsetSpeed: number;
}

type StrokeSource = string | HTMLImageElement | null;

export interface IPolylineParams {
    altitude?: number;
    thickness?: number;
    opacity?: number;
    color?: string | string[];
    visibility?: boolean;
    isClosed?: boolean;
    pathColors?: SegmentPathColor[];
    pathTimes?: number[][];
    path3v?: SegmentPath3vExt[];
    pathLonLat?: SegmentPathLonLatExt[];
    src?: StrokeSource;
    texParams?: Partial<TexParam>;
}

/**
 * Polyline object.
 * @class
 * @param {Object} [options] - Polyline options:
 * @param {number} [options.thickness] - Thickness in screen pixels 1.5 is default.
 * @param {Number} [options.altitude] - Relative to ground layers altitude value.
 * @param {string|string[]} [options.color] - Default line color or per-segment HTML colors.
 * @param {Boolean} [options.opacity] - Line opacity.
 * @param {Boolean} [options.visibility] - Polyline visibility. True default.
 * @param {Boolean[]} [options.isClosed] - Closed geometry type identification, per-segment.
 * @param {SegmentPathLonLatExt[]} [options.pathLonLat] - Polyline geodetic coordinates array. [[[0,0,0], [1,1,1],...]]
 * @param {SegmentPath3vExt[]} [options.path3v] - LinesString cartesian coordinates array. [[[0,0,0], [1,1,1],...]]
 * @param {SegmentPathColor[]} [options.pathColors] - Coordinates color. [[[1,0,0,1], [0,1,0,1],...]] for right and green colors.
 * @param {number[][]} [options.pathTimes] - Time of every point, per segment. Makes the line follow the
 * entity collection time, see {@link EntityCollection#setTime} and {@link EntityCollection#setTimeOpacity}.
 * @param {TexParam} [options.texParams] - Texture params for all segments: texOffset, strokeSize and texOffsetSpeed.
 */
class Polyline {
    static __counter__: number = 0;
    protected __id: number;

    public _entity: Entity | null;

    public _extent: Extent = new Extent();

    public _handler: PolylineHandler | null;
    public _handlerIndex: number;

    public _batchRenderer: PolylineBatchRenderer | null;
    public _batchRendererIndexes: number[];

    public _path3v: SegmentPath3vExt[];
    protected _pathLonLat: SegmentPathLonLatExt[];
    protected _pathColors: SegmentPathColor[];
    protected _pathTimes: number[][] | null;
    protected _color: string[];
    protected _segmentTexParams: Partial<TexParam> | null;

    protected _src: StrokeSource;

    protected _isClosed: boolean;

    protected _visibility: boolean;

    protected _image: HTMLImageElement | null;

    protected _opacity: number = 1.0;

    protected _thickness: number;
    protected _altitude: number;
    protected _pickingColor: Vec3 | null;

    constructor(options: IPolylineParams = {}) {
        this.__id = Polyline.__counter__++;

        this._path3v = options.path3v || [];

        this._pathLonLat = options.pathLonLat || [];

        this._pathColors = options.pathColors || [];
        this._pathTimes = options.pathTimes ? options.pathTimes.map((times) => (times ? times.slice() : [])) : null;
        this._color = Array.isArray(options.color) ? options.color.slice() : options.color ? [options.color] : [];
        this._segmentTexParams = options.texParams ? { ...options.texParams } : null;

        this._entity = null;

        this._handler = null;
        this._handlerIndex = -1;

        this._batchRenderer = null;
        this._batchRendererIndexes = [];

        this._src = options.src || null;

        this._isClosed = options.isClosed || false;

        this._visibility = options.visibility !== undefined ? options.visibility : true;

        this._image = null;
        this._opacity = options.opacity !== undefined ? options.opacity : 1.0;

        this._thickness = options.thickness || 1.5;
        this._altitude = options.altitude || 0;
        this._pickingColor = null;
    }

    public get _pathLonLatMerc(): LonLat[][] {
        let res: LonLat[][] = [];
        if (this._batchRenderer && this._batchRendererIndexes.length > 0) {
            const paths = this._batchRenderer._pathLonLatMerc;
            for (let i = 0; i < this._batchRendererIndexes.length; i++) {
                const batchIndex = this._batchRendererIndexes[i];
                res.push((batchIndex >= 0 && paths[batchIndex]) || []);
            }
            return res;
        }
        return this._pathLonLatMercFromLocal();
    }

    protected _pathLonLatMercFromLocal(): LonLat[][] {
        const res: LonLat[][] = new Array(this._pathLonLat.length);
        for (let i = 0; i < this._pathLonLat.length; i++) {
            const seg = this._pathLonLat[i] || [];
            const mercSeg: LonLat[] = new Array(seg.length);
            for (let j = 0; j < seg.length; j++) {
                const p = seg[j];
                if (p instanceof LonLat) {
                    mercSeg[j] = p.forwardMercator();
                } else if (p instanceof Array) {
                    mercSeg[j] = new LonLat(p[0], p[1], (p as number[])[2]).forwardMercator();
                } else {
                    mercSeg[j] = new LonLat();
                }
            }
            res[i] = mercSeg;
        }
        return res;
    }

    public set altitude(alt: number) {
        this._altitude = alt;
    }

    public get altitude(): number {
        return this._altitude;
    }

    public _addToBatchRenderer() {
        const br = this._batchRenderer;
        if (!br) return;

        if (this._path3v.length > 0) {
            for (let i = 0; i < this._path3v.length; i++) {
                if (!this._path3v[i] || this._path3v[i].length === 0) {
                    this._batchRendererIndexes.push(-1);
                    continue;
                }
                const batchIndex = br._path3v.length;
                br.appendPath3v(this._path3v[i], this._pathColors[i], this._opacity, this._pathTimes?.[i]);
                this._batchRendererIndexes.push(batchIndex);
                this._applySegmentProps(batchIndex, i);
            }
        } else if (this._pathLonLat.length > 0) {
            for (let i = 0; i < this._pathLonLat.length; i++) {
                if (!this._pathLonLat[i] || this._pathLonLat[i].length === 0) {
                    this._batchRendererIndexes.push(-1);
                    continue;
                }
                const batchIndex = br._pathLonLat.length;
                br.appendPathLonLat(this._pathLonLat[i], this._pathColors[i], this._opacity, this._pathTimes?.[i]);
                this._batchRendererIndexes.push(batchIndex);
                this._applySegmentProps(batchIndex, i);
            }
        }

        this._updateExtent();
    }

    public _removeFromBatchRenderer() {
        const br = this._batchRenderer;
        const handler = this._handler;
        if (!br || !handler) return;

        // Highest-first removal keeps lower indices stable
        const indices = this._batchRendererIndexes.filter((i) => i >= 0).sort((a, b) => b - a);
        this._batchRendererIndexes.length = 0;
        for (let i = 0; i < indices.length; i++) {
            br.removePath(indices[i]);
            handler.reindexAfterRemoval(indices[i], br);
        }
    }

    // One entry per segment, -1 for empty segments that have no batch path.
    protected _batchIndex(segmentIndex: number): number {
        return this._batchRendererIndexes[segmentIndex] ?? -1;
    }

    protected _forEachBatchPath(callback: (batchIndex: number, segmentIndex: number) => void) {
        const indexes = this._batchRendererIndexes;
        for (let i = 0; i < indexes.length; i++) {
            if (indexes[i] >= 0) {
                callback(indexes[i], i);
            }
        }
    }

    protected _removeBatchPath(segmentIndex: number) {
        const batchIndex = this._batchIndex(segmentIndex);

        if (batchIndex < 0 || !this._batchRenderer || !this._handler) {
            return;
        }

        this._batchRenderer.removePath(batchIndex);
        this._handler.reindexAfterRemoval(batchIndex, this._batchRenderer);
        this._batchRendererIndexes[segmentIndex] = -1;
    }

    protected _hasSameBatchPaths(paths: SegmentPath3vExt[] | SegmentPathLonLatExt[]): boolean {
        const indexes = this._batchRendererIndexes;
        return (
            indexes.length === paths.length && indexes.every((batchIndex, i) => batchIndex >= 0 && paths[i].length > 0)
        );
    }

    protected _getDefaultHtmlColor(segmentIndex: number = 0): string | undefined {
        return this._color[segmentIndex] || this._color[0];
    }

    protected _getDefaultPathColor(segmentIndex: number = 0): NumberArray4 | undefined {
        const htmlColor = this._getDefaultHtmlColor(segmentIndex);
        if (!htmlColor) return;
        const c = htmlColorToRgba(htmlColor);
        return [c.x, c.y, c.z, c.w];
    }

    protected _applySegmentProps(batchIndex: number, segmentIndex: number = 0) {
        const br = this._batchRenderer!;
        const htmlColor = this._getDefaultHtmlColor(segmentIndex);
        const segPathColors = this._pathColors[segmentIndex];
        const hasSegmentPathColors = !!segPathColors && segPathColors.length > 0;
        if (htmlColor && !hasSegmentPathColors) {
            const defaultColor = this._getDefaultPathColor(segmentIndex);
            if (defaultColor) {
                br.setPathColors([defaultColor], batchIndex, this._opacity);
            }
        }
        if (this._pickingColor) {
            br.setPathPickingColor3v(this._pickingColor, batchIndex);
        }
        br.setThickness(this._thickness, batchIndex);
        if (this._isClosed) {
            br.setPathClosed(this._isClosed, batchIndex);
        }
        if (this._src != null) {
            br.setPathSrc(this._src, batchIndex);
        } else if (this._image) {
            br.setPathSrc(this._image, batchIndex);
        }
        const texParams = this._segmentTexParams;
        if (texParams) {
            br.setPathTexParams(texParams.texOffset, texParams.strokeSize, texParams.texOffsetSpeed, batchIndex);
        }
    }

    protected _tryAddSegmentToBatch(segmentIndex: number): boolean {
        const br = this._batchRenderer;
        if (!br || !this._visibility || segmentIndex < 0 || this._batchIndex(segmentIndex) >= 0) {
            return false;
        }

        const seg3v = this._path3v[segmentIndex];
        const segLL = this._pathLonLat[segmentIndex];
        const pointsCount = Math.max(seg3v ? seg3v.length : 0, segLL ? segLL.length : 0);
        if (pointsCount === 0) {
            return false;
        }

        const batchIndex = br._path3v.length;

        if (seg3v && seg3v.length > 0) {
            br.appendPath3v(seg3v, this._pathColors[segmentIndex], this._opacity, this._pathTimes?.[segmentIndex]);
        } else if (segLL && segLL.length > 0) {
            br.appendPathLonLat(segLL, this._pathColors[segmentIndex], this._opacity, this._pathTimes?.[segmentIndex]);
        } else {
            return false;
        }

        while (this._batchRendererIndexes.length < segmentIndex) {
            this._batchRendererIndexes.push(-1);
        }

        this._batchRendererIndexes[segmentIndex] = batchIndex;

        this._applySegmentProps(batchIndex, segmentIndex);
        return true;
    }

    protected _updateExtent() {
        let lonmin = Infinity,
            lonmax = -Infinity,
            latmin = Infinity,
            latmax = -Infinity;
        let hasData = false;

        const hasBatchRendererPaths = !!this._batchRenderer && this._batchRendererIndexes.length > 0;
        const paths = hasBatchRendererPaths ? this._batchRenderer!._pathLonLat : this._pathLonLat;

        const pathsCount = hasBatchRendererPaths ? this._batchRendererIndexes.length : paths.length;

        for (let i = 0; i < pathsCount; i++) {
            const segIndex = hasBatchRendererPaths ? this._batchRendererIndexes[i] : i;
            const seg = segIndex >= 0 ? paths[segIndex] : undefined;
            if (!seg) continue;
            for (let j = 0; j < seg.length; j++) {
                const p = seg[j];
                if (!p) continue;
                let lon: number, lat: number;
                if (p instanceof LonLat) {
                    lon = p.lon;
                    lat = p.lat;
                } else if (p instanceof Array) {
                    lon = (p as number[])[0];
                    lat = (p as number[])[1];
                } else {
                    continue;
                }
                if (lon < lonmin) lonmin = lon;
                if (lon > lonmax) lonmax = lon;
                if (lat < latmin) latmin = lat;
                if (lat > latmax) latmax = lat;
                hasData = true;
            }
        }

        if (hasData) {
            this._extent.southWest.lon = lonmin;
            this._extent.southWest.lat = latmin;
            this._extent.northEast.lon = lonmax;
            this._extent.northEast.lat = latmax;
        } else {
            this._extent.southWest.lon = 180.0;
            this._extent.southWest.lat = 90.0;
            this._extent.northEast.lon = -180.0;
            this._extent.northEast.lat = -90.0;
        }
    }

    public getExtent(): Extent {
        return this._extent;
    }

    public getPath3v(): SegmentPath3vExt[] {
        if (this._batchRenderer && this._batchRendererIndexes.length > 0) {
            const paths = this._batchRenderer._path3v;
            const res: SegmentPath3vExt[] = new Array(this._batchRendererIndexes.length);
            for (let i = 0; i < this._batchRendererIndexes.length; i++) {
                const batchIndex = this._batchRendererIndexes[i];
                res[i] = ((batchIndex >= 0 ? paths[batchIndex] : this._path3v[i]) || []) as SegmentPath3vExt;
            }
            return res;
        }
        return this._path3v;
    }

    public getPathLonLat(): SegmentPathLonLatExt[] {
        if (this._batchRenderer && this._batchRendererIndexes.length > 0) {
            const paths = this._batchRenderer._pathLonLat;
            const res: SegmentPathLonLatExt[] = new Array(this._batchRendererIndexes.length);
            for (let i = 0; i < this._batchRendererIndexes.length; i++) {
                const batchIndex = this._batchRendererIndexes[i];
                res[i] = ((batchIndex >= 0 ? paths[batchIndex] : this._pathLonLat[i]) || []) as SegmentPathLonLatExt;
            }
            return res;
        }
        return this._pathLonLat;
    }

    public getPathColors(): NumberArray4[][] {
        return this._pathColors;
    }

    public setImage(image: HTMLImageElement) {
        this._image = image;
        if (this._batchRenderer) {
            this._forEachBatchPath((batchIndex) => this._batchRenderer!.setPathSrc(image, batchIndex));
        }
    }

    public getImage(): HTMLImageElementExt | null {
        return this._image;
    }

    /**
     * Sets stroke source per segment (null = color-only).
     * @public
     */
    public setSrc(src: StrokeSource) {
        this._src = src;

        if (src == null) {
            this._image = null;
        }

        if (!this._handler || !this._batchRenderer) {
            return;
        }

        const targetRenderer = this._handler.getRenderer(this._opacity, src != null, this.isTimed());
        if (this._batchRenderer !== targetRenderer) {
            this._removeFromBatchRenderer();
            this._batchRenderer = targetRenderer;
            if (this._visibility) {
                this._addToBatchRenderer();
            }
            return;
        }

        if (!this._batchRenderer.isTextured) {
            return;
        }

        this._forEachBatchPath((batchIndex) => this._batchRenderer!.setPathSrc(src, batchIndex));
    }

    public getSrc(): StrokeSource {
        return this._src;
    }

    /**
     * Sets closed/open state for one path segment.
     * @public
     */
    public set isClosed(isClosed: boolean) {
        this._isClosed = isClosed;
        if (this._batchRenderer) {
            this._forEachBatchPath((batchIndex) => this._batchRenderer!.setPathClosed(isClosed, batchIndex));
        }
    }

    public get isClosed(): boolean {
        return this._isClosed;
    }

    public setTextureDisabled() {}

    static setPathColors(
        pathLonLat: SegmentPathLonLatExt[],
        pathColors: SegmentPathColor[],
        defaultColor: NumberArray4,
        outColors: number[]
    ) {
        PolylineBatchRenderer.setPathColors(pathLonLat, pathColors, defaultColor, outColors);
    }

    public setPointLonLat(lonlat: LonLat, index: number, segmentIndex: number) {
        const seg = this._pathLonLat[segmentIndex];
        if (seg) seg[index] = lonlat;

        const batchIndex = this._batchIndex(segmentIndex);
        if (this._batchRenderer && batchIndex >= 0) {
            this._batchRenderer.setPointLonLat(lonlat, index, batchIndex);
        }

        this._updateExtent();
    }

    /**
     * Changes cartesian point coordinates of the path
     * @param {Vec3} coordinates - New coordinates
     * @param {number} [index=0] - Path segment index
     * @param {number} [segmentIndex=0] - Index of the point in the path segment
     * @param {boolean} [skipLonLat=false] - Do not update geodetic coordinates
     */
    public setPoint3v(coordinates: Vec3, index: number = 0, segmentIndex: number = 0, skipLonLat: boolean = false) {
        const seg = this._path3v[segmentIndex];
        if (seg) seg[index] = coordinates;

        const batchIndex = this._batchIndex(segmentIndex);
        if (this._batchRenderer && batchIndex >= 0) {
            this._batchRenderer.setPoint3v(coordinates, index, batchIndex, skipLonLat);
        }

        if (!skipLonLat) {
            this._updateExtent();
        }
    }

    /**
     * Remove point from the path
     * @param {number} index - Point index in a path segment
     * @param {number} [segmentIndex=0] - Segment path index
     */
    public removePoint(index: number, segmentIndex: number = 0) {
        const batchIndex = this._batchIndex(segmentIndex);

        const seg3v = this._path3v[segmentIndex];
        if (seg3v) seg3v.splice(index, 1);

        const segLL = this._pathLonLat[segmentIndex];
        if (segLL) segLL.splice(index, 1);

        const segC = this._pathColors[segmentIndex];
        if (segC) segC.splice(index, 1);

        const segT = this._pathTimes?.[segmentIndex];
        if (segT) segT.splice(index, 1);

        if (this._batchRenderer && batchIndex >= 0) {
            const pointsCount = Math.max(seg3v ? seg3v.length : 0, segLL ? segLL.length : 0);

            if (pointsCount > 0) {
                this._batchRenderer.removePoint(index, batchIndex);
            } else if (this._handler) {
                this._batchRenderer.removePath(batchIndex);
                this._handler.reindexAfterRemoval(batchIndex, this._batchRenderer);
            }
        }

        const remaining = Math.max(seg3v ? seg3v.length : 0, segLL ? segLL.length : 0);
        if ((seg3v || segLL) && remaining === 0) {
            if (seg3v) this._path3v.splice(segmentIndex, 1);
            if (segLL) this._pathLonLat.splice(segmentIndex, 1);
            if (segmentIndex < this._pathColors.length) this._pathColors.splice(segmentIndex, 1);
            if (this._pathTimes && segmentIndex < this._pathTimes.length) this._pathTimes.splice(segmentIndex, 1);
            if (segmentIndex < this._batchRendererIndexes.length) this._batchRendererIndexes.splice(segmentIndex, 1);
        }

        this._updateExtent();
    }

    /**
     * Insert point coordinates in a path segment
     * @param {Vec3} point3v - Point coordinates
     * @param {number} [index=0] - Index in the path
     * @param {NumberArray4} [color] - Point color
     * @param {number} [segmentIndex=0] - Path segment index
     * @param {number} [time] - Point time
     */
    public insertPoint3v(
        point3v: Vec3,
        index: number = 0,
        color?: NumberArray4,
        segmentIndex: number = 0,
        time?: number
    ) {
        const seg = this._path3v[segmentIndex] || (this._path3v[segmentIndex] = []);
        seg.splice(index, 0, point3v);

        const segC = this._pathColors[segmentIndex];
        if (segC && index <= segC.length) {
            segC.splice(index, 0, color || segC[Math.max(0, index - 1)]);
        } else if (color) {
            const colors = segC || (this._pathColors[segmentIndex] = []);
            colors.length = index;
            colors.push(color);
        }

        if (this._pathTimes) {
            const segT = this._pathTimes[segmentIndex];
            if (segT && index <= segT.length) {
                segT.splice(index, 0, time ?? segT[Math.max(0, index - 1)]);
            } else if (time !== undefined) {
                const times = segT || (this._pathTimes[segmentIndex] = []);
                times.length = index;
                times.push(time);
            }
        }

        const batchIndex = this._batchIndex(segmentIndex);
        if (this._batchRenderer) {
            if (batchIndex >= 0) {
                this._batchRenderer.insertPoint3v(point3v, index, color, batchIndex, time);
            } else {
                this._tryAddSegmentToBatch(segmentIndex);
            }
        }

        this._updateExtent();
    }

    /**
     * Append new point in the end of the path.
     * @public
     * @param {Vec3} point3v - New point coordinates.
     * @param {number} [segmentIndex=0] - Path segment index, first by default.
     * @param {NumberArray4} [color] - Point color
     * @param {number} [time] - Point time
     */
    public addPoint3v(point3v: Vec3, segmentIndex: number = 0, color?: NumberArray4, time?: number) {
        const seg = this._path3v[segmentIndex] || (this._path3v[segmentIndex] = []);
        seg.push(point3v);

        if (color) {
            const segC = this._pathColors[segmentIndex] || (this._pathColors[segmentIndex] = []);
            segC.length = seg.length - 1;
            segC.push(color);
        }

        this._pushPointTime(segmentIndex, seg.length - 1, time);

        const batchIndex = this._batchIndex(segmentIndex);
        if (this._batchRenderer) {
            if (batchIndex >= 0) {
                this._batchRenderer.addPoint3v(point3v, batchIndex, color, this._opacity, time);
            } else {
                this._tryAddSegmentToBatch(segmentIndex);
            }
        }

        this._updateExtent();
    }

    /**
     * Append new geodetic point in the end of the path.
     * @public
     * @param {LonLat} lonLat - New coordinate.
     * @param {number} [segmentIndex=0] - Path segment index, first by default.
     * @param {NumberArray4} [color] - Point color.
     * @param {number} [time] - Point time.
     */
    public addPointLonLat(lonLat: LonLat, segmentIndex: number = 0, color?: NumberArray4, time?: number) {
        const seg = this._pathLonLat[segmentIndex] || (this._pathLonLat[segmentIndex] = []);
        seg.push(lonLat);

        this._pushPointTime(segmentIndex, seg.length - 1, time);

        if (color) {
            const segC = this._pathColors[segmentIndex] || (this._pathColors[segmentIndex] = []);
            segC.push(color);
        }

        const batchIndex = this._batchIndex(segmentIndex);
        if (this._batchRenderer) {
            if (batchIndex >= 0) {
                this._batchRenderer.addPointLonLat(lonLat, batchIndex, color, this._opacity, time);
            } else {
                this._tryAddSegmentToBatch(segmentIndex);
            }
        }

        this._updateExtent();
    }

    /**
     * Change path point color
     * @param {NumberArray4} color - New color
     * @param {number} [index=0] - Point index
     * @param {number} [segmentIndex=0] - Path segment index
     */
    public setPointColor(color: NumberArray4, index: number = 0, segmentIndex: number = 0) {
        const segC = this._pathColors[segmentIndex] || (this._pathColors[segmentIndex] = []);
        segC[index] = color;

        const batchIndex = this._batchIndex(segmentIndex);
        if (this._batchRenderer && batchIndex >= 0) {
            this._batchRenderer.setPointColor(color, index, batchIndex, this._opacity);
        }
    }

    /**
     * Remove multiline path segment
     * @param {number} index - Segment index in multiline
     */
    public removePath(index: number) {
        if (index < 0) return;

        const hasBatchIndex = index < this._batchRendererIndexes.length;
        const batchIndex = hasBatchIndex ? this._batchRendererIndexes[index] : -1;

        if (hasBatchIndex) {
            this._batchRendererIndexes.splice(index, 1);
        }
        this._path3v.splice(index, 1);
        if (index < this._pathLonLat.length) this._pathLonLat.splice(index, 1);
        if (index < this._pathColors.length) this._pathColors.splice(index, 1);
        if (this._pathTimes && index < this._pathTimes.length) this._pathTimes.splice(index, 1);

        if (batchIndex > -1 && this._batchRenderer && this._handler) {
            this._batchRenderer.removePath(batchIndex);
            this._handler.reindexAfterRemoval(batchIndex, this._batchRenderer);
        }

        this._updateExtent();
    }

    public appendPath3v(path3v: SegmentPath3vExt, pathColors?: NumberArray4[], pathTimes?: number[]) {
        this._path3v.push(path3v);
        if (pathColors) this._pathColors.push(pathColors);
        if (this._pathTimes) this._pathTimes[this._path3v.length - 1] = pathTimes ? pathTimes.slice() : [];

        if (this._batchRenderer && this._visibility) {
            if (path3v.length > 0) {
                const batchIndex = this._batchRenderer._path3v.length;
                this._batchRenderer.appendPath3v(path3v, pathColors, this._opacity, pathTimes);
                this._batchRendererIndexes.push(batchIndex);
                this._applySegmentProps(batchIndex, this._path3v.length - 1);
            } else {
                this._batchRendererIndexes.push(-1);
            }
        }

        this._updateExtent();
    }

    public appendPathLonLat(pathLonLat: SegmentPathLonLatExt, pathColors?: NumberArray4[], pathTimes?: number[]) {
        this._pathLonLat.push(pathLonLat);
        if (pathColors) this._pathColors[this._pathLonLat.length - 1] = pathColors;
        if (this._pathTimes) this._pathTimes[this._pathLonLat.length - 1] = pathTimes ? pathTimes.slice() : [];

        if (this._batchRenderer && this._visibility) {
            if (pathLonLat.length > 0) {
                const batchIndex = this._batchRenderer._path3v.length;
                this._batchRenderer.appendPathLonLat(pathLonLat, pathColors, this._opacity, pathTimes);
                this._batchRendererIndexes.push(batchIndex);
                this._applySegmentProps(batchIndex, this._pathLonLat.length - 1);
            } else {
                this._batchRendererIndexes.push(-1);
            }
        }

        this._updateExtent();
    }

    public setPathLonLatFast(
        pathLonLat: SegmentPathLonLatExt[],
        pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4
    ) {
        if (!pathColors) {
            this.setPathLonLat(pathLonLat, undefined, true);
            return;
        }
        const isSingleColor = Array.isArray(pathColors) && pathColors.length > 0 && typeof pathColors[0] === "number";
        const normalized = isSingleColor
            ? [pathColors as NumberArray4]
            : (pathColors as (SegmentPathColor | NumberArray4)[]);
        this.setPathLonLat(pathLonLat, normalized, true);
    }

    public setPath3vFast(
        path3v: SegmentPath3vExt[],
        pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4
    ) {
        if (!pathColors) {
            this.setPath3v(path3v, undefined, true);
            return;
        }
        const isSingleColor = Array.isArray(pathColors) && pathColors.length > 0 && typeof pathColors[0] === "number";
        const normalized = isSingleColor
            ? [pathColors as NumberArray4]
            : (pathColors as (SegmentPathColor | NumberArray4)[]);
        this.setPath3v(path3v, normalized, true);
    }

    /**
     * Sets Polyline cartesian coordinates.
     * @public
     * @param {SegmentPath3vExt[]} path3v - Polyline path cartesian coordinates. (exactly 3 entries)
     * @param {SegmentPathColor[]} [pathColors] - Polyline path cartesian coordinates. (exactly 3 entries)
     * @param {Boolean} [forceEqual=false] - Makes assigning faster for size equal coordinates array.
     */
    public setPath3v(
        path3v: SegmentPath3vExt[],
        pathColors?: (SegmentPathColor | NumberArray4)[],
        forceEqual?: boolean
    ): void;
    public setPath3v(
        path3v: SegmentPath3vExt,
        pathColors?: SegmentPathColor | NumberArray4,
        forceEqual?: boolean,
        segmentIndex?: number
    ): void;
    public setPath3v(
        path3v: SegmentPath3vExt[] | SegmentPath3vExt,
        pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4,
        forceEqual: boolean = false,
        segmentIndex?: number
    ) {
        if (segmentIndex !== undefined) {
            const segmentPath = path3v as SegmentPath3vExt;
            const batchIndex = this._batchIndex(segmentIndex);
            this._path3v[segmentIndex] = segmentPath;
            const resolvedPathColors = pathColors ?? this._getDefaultPathColor(segmentIndex);
            if (this._batchRenderer && batchIndex >= 0 && segmentPath.length > 0) {
                this._batchRenderer.setPath3v(
                    segmentPath,
                    resolvedPathColors as SegmentPathColor | NumberArray4,
                    forceEqual,
                    batchIndex
                );
            } else if (batchIndex >= 0) {
                this._removeBatchPath(segmentIndex);
            } else {
                this._tryAddSegmentToBatch(segmentIndex);
            }
        } else {
            const paths = path3v as SegmentPath3vExt[];
            this._path3v = paths;
            if (pathColors) {
                const pc = pathColors as (SegmentPathColor | NumberArray4)[];
                this._pathColors = new Array(paths.length);
                for (let i = 0; i < paths.length; i++) {
                    this._pathColors[i] = (pc[i] as SegmentPathColor) || [];
                }
            }

            if (this._batchRenderer && this._visibility) {
                if (forceEqual && this._hasSameBatchPaths(paths)) {
                    const pc = pathColors as (SegmentPathColor | NumberArray4)[] | undefined;
                    for (let i = 0; i < paths.length; i++) {
                        this._batchRenderer.setPath3v(
                            paths[i],
                            pc?.[i] ?? this._getDefaultPathColor(i),
                            true,
                            this._batchRendererIndexes[i]
                        );
                    }
                } else {
                    this._removeFromBatchRenderer();
                    this._addToBatchRenderer();
                }
            }
        }

        this._updateExtent();
    }

    /**
     * Sets polyline geodetic coordinates.
     * @public
     * @param {SegmentPathLonLat[]} pathLonLat - Polyline path cartesian coordinates.
     * @param {SegmentPathColor[]} pathColors - Polyline path points colors.
     * @param {Boolean} [forceEqual=false] - OPTIMIZATION FLAG: Makes assigning faster for size equal coordinates array.
     */
    public setPathLonLat(
        pathLonLat: SegmentPathLonLatExt[],
        pathColors?: (SegmentPathColor | NumberArray4)[],
        forceEqual?: boolean
    ): void;
    public setPathLonLat(
        pathLonLat: SegmentPathLonLatExt,
        pathColors?: SegmentPathColor | NumberArray4,
        forceEqual?: boolean,
        segmentIndex?: number
    ): void;
    public setPathLonLat(
        pathLonLat: SegmentPathLonLatExt[] | SegmentPathLonLatExt,
        pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4,
        forceEqual: boolean = false,
        segmentIndex?: number
    ) {
        if (segmentIndex !== undefined) {
            const segmentPath = pathLonLat as SegmentPathLonLatExt;
            const batchIndex = this._batchIndex(segmentIndex);
            this._pathLonLat[segmentIndex] = segmentPath;
            const resolvedPathColors = pathColors ?? this._getDefaultPathColor(segmentIndex);
            if (this._batchRenderer && batchIndex >= 0 && segmentPath.length > 0) {
                this._batchRenderer.setPathLonLat(
                    segmentPath,
                    resolvedPathColors as SegmentPathColor | NumberArray4,
                    forceEqual,
                    batchIndex
                );
            } else if (batchIndex >= 0) {
                this._removeBatchPath(segmentIndex);
            } else {
                this._tryAddSegmentToBatch(segmentIndex);
            }
        } else {
            const paths = pathLonLat as SegmentPathLonLatExt[];
            this._pathLonLat = paths;
            if (pathColors) {
                const pc = pathColors as (SegmentPathColor | NumberArray4)[];
                this._pathColors = new Array(paths.length);
                for (let i = 0; i < paths.length; i++) {
                    this._pathColors[i] = (pc[i] as SegmentPathColor) || [];
                }
            }

            if (this._batchRenderer && this._visibility) {
                if (forceEqual && this._hasSameBatchPaths(paths)) {
                    const pc = pathColors as (SegmentPathColor | NumberArray4)[] | undefined;
                    for (let i = 0; i < paths.length; i++) {
                        this._batchRenderer.setPathLonLat(
                            paths[i],
                            pc?.[i] ?? this._getDefaultPathColor(i),
                            true,
                            this._batchRendererIndexes[i]
                        );
                    }
                } else {
                    this._removeFromBatchRenderer();
                    this._addToBatchRenderer();
                }
            }
        }

        this._updateExtent();
    }

    protected _pushPointTime(segmentIndex: number, index: number, time?: number) {
        if (!this._pathTimes) return;
        const times = this._pathTimes[segmentIndex] || (this._pathTimes[segmentIndex] = []);
        times.length = Math.min(times.length, index);
        if (time !== undefined) {
            times.length = index;
            times.push(time);
        }
    }

    /**
     * Returns true when the polyline has point times and follows the entity collection time.
     * @public
     * @returns {boolean}
     */
    public isTimed(): boolean {
        return this._pathTimes !== null;
    }

    public getPathTimes(): number[][] | null {
        return this._pathTimes;
    }

    /**
     * Sets point times. Null removes them and the line stops following the entity collection time.
     * @public
     * @param {number[][] | number[] | null} times - Times per segment, or times of one segment.
     * @param {number} [segmentIndex] - Segment index when times of one segment are given.
     */
    public setPathTimes(pathTimes: number[][] | null): void;
    public setPathTimes(times: number[], segmentIndex: number): void;
    public setPathTimes(times: number[][] | number[] | null, segmentIndex?: number) {
        const wasTimed = this.isTimed();

        if (segmentIndex !== undefined) {
            const pathTimes = this._pathTimes || [];
            pathTimes[segmentIndex] = (times as number[]).slice();
            this._pathTimes = pathTimes;
        } else {
            this._pathTimes = times ? (times as number[][]).map((t) => (t ? t.slice() : [])) : null;
        }

        if (!this._handler || !this._batchRenderer) return;

        if (wasTimed !== this.isTimed()) {
            this._removeFromBatchRenderer();
            this._batchRenderer = this._handler.getRenderer(this._opacity, this._src != null, this.isTimed());
            if (this._visibility) {
                this._addToBatchRenderer();
            }
            return;
        }

        if (!this._pathTimes) return;

        this._forEachBatchPath((batchIndex, i) => {
            if (segmentIndex === undefined || segmentIndex === i) {
                this._batchRenderer!.setPathTimes(this._pathTimes![i], batchIndex);
            }
        });

        this._handler.requestRedraw();
    }

    // ─── Visual properties ──────────────────────────────────────────────

    /**
     * Sets polyline opacity.
     * @public
     * @param {number} opacity - Opacity.
     */
    public setOpacity(opacity: number) {
        if (this._opacity === opacity) {
            return;
        }
        this._opacity = opacity;

        if (!this._handler) {
            return;
        }

        const targetRenderer = this._handler.getRenderer(opacity, this._src != null, this.isTimed());
        if (this._batchRenderer !== targetRenderer) {
            this._removeFromBatchRenderer();
            this._batchRenderer = targetRenderer;
            if (this._visibility) {
                this._addToBatchRenderer();
            }
            return;
        }

        if (!this._batchRenderer) {
            return;
        }

        this._forEachBatchPath((batchIndex) => this._batchRenderer!.setPathOpacity(this._opacity, batchIndex));
    }

    /**
     * Gets polyline opacity.
     * @public
     */
    public getOpacity(): number {
        return this._opacity;
    }

    /**
     * Sets Polyline thickness in screen pixels.
     * @public
     * @param {number} altitude - ALtitude value.
     */
    public setAltitude(altitude: number) {
        this._altitude = altitude;
        // Altitude is renderer-wide property
        if (this._batchRenderer) {
            this._batchRenderer.setAltitude(altitude);
        }
    }

    /**
     * Sets Polyline thickness in screen pixels.
     * @public
     * @param {number} thickness - Thickness.
     */
    public setThickness(thickness: number): void {
        this._thickness = thickness;
        if (this._batchRenderer) {
            this._forEachBatchPath((batchIndex) => this._batchRenderer!.setThickness(thickness, batchIndex));
        }
    }

    /**
     * Sets polyline segment color.
     * @public
     * @param {string} htmlColor - HTML color.
     */
    public setColor(htmlColor: string): void {
        this._color[0] = htmlColor;
        if (this._batchRenderer) {
            this._forEachBatchPath((batchIndex) => this._batchRenderer!.setColor(htmlColor, batchIndex, this._opacity));
        }
    }

    public setPathTexOffset(texOffset: number, segmentIndex: number): void {
        const texParams = this._segmentTexParams || (this._segmentTexParams = {});
        texParams.texOffset = texOffset;
        const batchIndex = this._batchIndex(segmentIndex);
        if (this._batchRenderer && batchIndex >= 0) {
            this._batchRenderer.setPathTexOffset(texOffset, batchIndex);
        }
    }

    public setPathStrokeSize(strokeSize: number, segmentIndex: number): void {
        const texParams = this._segmentTexParams || (this._segmentTexParams = {});
        texParams.strokeSize = strokeSize;
        const batchIndex = this._batchIndex(segmentIndex);
        if (this._batchRenderer && batchIndex >= 0) {
            this._batchRenderer.setPathStrokeSize(strokeSize, batchIndex);
        }
    }

    public setPathTexOffsetSpeed(texOffsetSpeed: number, segmentIndex: number): void {
        const texParams = this._segmentTexParams || (this._segmentTexParams = {});
        texParams.texOffsetSpeed = texOffsetSpeed;
        const batchIndex = this._batchIndex(segmentIndex);
        if (this._batchRenderer && batchIndex >= 0) {
            this._batchRenderer.setPathTexOffsetSpeed(texOffsetSpeed, batchIndex);
        }
    }

    /**
     * Sets visibility.
     * @public
     * @param {boolean} visibility - Polyline visibility.
     */
    public setVisibility(visibility: boolean) {
        if (this._visibility === visibility) return;

        this._visibility = visibility;

        if (!this._handler || !this._batchRenderer) return;

        // Segments live in a batch that is drawn with a single call, so there is nothing
        // per polyline to switch off: hiding takes its segments out of the batch, showing
        // appends them back from the local path.
        if (visibility) {
            this._addToBatchRenderer();
        } else {
            this._removeFromBatchRenderer();
        }

        this._handler.requestRedraw();
    }

    /**
     * Gets Polyline visibility.
     * @public
     * @returns {boolean} Polyline visibility.
     */
    public getVisibility(): boolean {
        return this._visibility;
    }

    public setPickingColor3v(color: Vec3) {
        this._pickingColor = color;
        if (this._batchRenderer) {
            this._forEachBatchPath((batchIndex) => this._batchRenderer!.setPathPickingColor3v(color, batchIndex));
        }
    }

    public setPathColors(pathColors: SegmentPathColor[]): void;
    public setPathColors(pathColors: SegmentPathColor, segmentIndex: number): void;
    public setPathColors(pathColors: SegmentPathColor[] | SegmentPathColor, segmentIndex?: number) {
        if (segmentIndex !== undefined) {
            this._pathColors[segmentIndex] = pathColors as SegmentPathColor;
            const batchIndex = this._batchIndex(segmentIndex);
            if (this._batchRenderer && batchIndex >= 0) {
                this._batchRenderer.setPathColors(pathColors as SegmentPathColor, batchIndex, this._opacity);
            }
        } else {
            this._pathColors = (pathColors as SegmentPathColor[]).slice();
            if (this._batchRenderer) {
                this._forEachBatchPath((batchIndex, i) => {
                    if (this._pathColors[i]) {
                        this._batchRenderer!.setPathColors(this._pathColors[i], batchIndex, this._opacity);
                    }
                });
            }
        }
    }

    /**
     * Sets polyline color
     * @param {string} htmlColor - HTML color.
     */
    public setColorHTML(htmlColor: string) {
        this._color[0] = htmlColor;
        if (this._batchRenderer) {
            this._forEachBatchPath((batchIndex) => this._batchRenderer!.setColor(htmlColor, batchIndex, this._opacity));
        }
    }

    /**
     * Gets polyline HTML color.
     * @public
     * @param {number} [index=0] - Segment index.
     * @returns {string | undefined} HTML color, or undefined when no color is set.
     */
    public getColorHTML(index: number = 0): string | undefined {
        return this._getDefaultHtmlColor(index);
    }

    /**
     * Gets polyline color as a normalized RGBA vector.
     * @public
     * @param {number} [index=0] - Segment index.
     * @returns {Vec4 | undefined} Normalized RGBA color, or undefined when no color is set.
     */
    public getColor4v(index: number = 0): Vec4 | undefined {
        const htmlColor = this._getDefaultHtmlColor(index);
        if (!htmlColor) return;
        return htmlColorToRgba(htmlColor);
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────

    /**
     * Clear polyline data.
     * @public
     */
    public clear() {
        this._removeFromBatchRenderer();
        this._path3v = [];
        this._pathLonLat = [];
        this._pathColors = [];
        this._pathTimes = this._pathTimes ? [] : null;
        this._segmentTexParams = null;
    }

    /**
     * Removes from an entity.
     * @public
     */
    public remove() {
        if (this._handler) {
            this._handler.remove(this);
        }
    }
}

export { Polyline };
