import {Entity} from "../Entity";
import {LonLat} from "../../LonLat";
import {Vec3} from "../../math/Vec3";
import type {NumberArray3} from "../../math/Vec3";
import type {NumberArray2} from "../../math/Vec2";
import type {NumberArray4} from "../../math/Vec4";
import type {HTMLImageElementExt} from "../../utils/ImagesCacheManager";
import {htmlColorToRgba} from "../../utils/shared";
import {PolylineHandler} from "./PolylineHandler";
import {PolylineBatchRenderer} from "./PolylineBatchRenderer";
import {Extent} from "../../Extent";

export type Geodetic = LonLat | NumberArray2 | NumberArray3
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
    isTextured?: boolean;
    isClosed?: boolean;
    pathColors?: SegmentPathColor[];
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
 * @param {TexParam[]} [options.texParams] - Per-segment texture params: texOffset, strokeSize and texOffsetSpeed.
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
    protected _color: string[];

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
        this._color = Array.isArray(options.color) ? options.color.slice() : (options.color ? [options.color] : []);

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
                const seg = paths[this._batchRendererIndexes[i]];
                res.push(seg || []);
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

    public set altitude(alt:number  ){
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
                if (!this._path3v[i] || this._path3v[i].length === 0) continue;
                const batchIndex = br._path3v.length;
                br.appendPath3v(this._path3v[i], this._pathColors[i], this._opacity);
                this._batchRendererIndexes.push(batchIndex);
                this._applySegmentProps(batchIndex, i);
            }
        } else if (this._pathLonLat.length > 0) {
            for (let i = 0; i < this._pathLonLat.length; i++) {
                if (!this._pathLonLat[i] || this._pathLonLat[i].length === 0) continue;
                const batchIndex = br._pathLonLat.length;
                br.appendPathLonLat(this._pathLonLat[i], this._pathColors[i], this._opacity);
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
        const indices = this._batchRendererIndexes.slice().sort((a, b) => b - a);
        this._batchRendererIndexes.length = 0;
        for (let i = 0; i < indices.length; i++) {
            br.removePath(indices[i]);
            handler.reindexAfterRemoval(indices[i], br);
        }
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
        if (this._image) {
            br.setPathSrc(this._image, batchIndex);
        } else if (this._src) {
            br.setPathSrc(this._src, batchIndex);
        }
    }

    protected _tryAddSegmentToBatch(segmentIndex: number): boolean {
        const br = this._batchRenderer;
        if (!br || segmentIndex < 0 || segmentIndex < this._batchRendererIndexes.length) {
            return false;
        }

        const seg3v = this._path3v[segmentIndex];
        const segLL = this._pathLonLat[segmentIndex];
        const pointsCount = Math.max(seg3v ? seg3v.length : 0, segLL ? segLL.length : 0);
        if (pointsCount <= 1) {
            return false;
        }

        const batchIndex = br._path3v.length;

        if (seg3v && seg3v.length > 0) {
            br.appendPath3v(seg3v, this._pathColors[segmentIndex], this._opacity);
        } else if (segLL && segLL.length > 0) {
            br.appendPathLonLat(segLL, this._pathColors[segmentIndex], this._opacity);
        } else {
            return false;
        }

        if (segmentIndex <= this._batchRendererIndexes.length) {
            this._batchRendererIndexes.splice(segmentIndex, 0, batchIndex);
        } else {
            this._batchRendererIndexes.push(batchIndex);
        }

        this._applySegmentProps(batchIndex, segmentIndex);
        return true;
    }

    protected _updateExtent() {
        let lonmin = Infinity, lonmax = -Infinity,
            latmin = Infinity, latmax = -Infinity;
        let hasData = false;

        const hasBatchRendererPaths = !!this._batchRenderer && this._batchRendererIndexes.length > 0;
        const paths = hasBatchRendererPaths
            ? this._batchRenderer!._pathLonLat
            : this._pathLonLat;

        const pathsCount = hasBatchRendererPaths ? this._batchRendererIndexes.length : paths.length;

        for (let i = 0; i < pathsCount; i++) {
            const segIndex = hasBatchRendererPaths ? this._batchRendererIndexes[i] : i;
            const seg = paths[segIndex];
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
                res[i] = (paths[this._batchRendererIndexes[i]] || []) as SegmentPath3vExt;
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
                res[i] = (paths[this._batchRendererIndexes[i]] || []) as SegmentPathLonLatExt;
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
            for (let i = 0; i < this._batchRendererIndexes.length; i++) {
                this._batchRenderer.setPathSrc(image, this._batchRendererIndexes[i]);
            }
        }
    }

    public getImage(): (HTMLImageElementExt | null) {
        return this._image;
    }

    /**
     * Sets stroke source per segment (null = color-only).
     * @public
     */
    public setSrc(src: StrokeSource) {
        this._src = src;
        if (this._batchRenderer) {
            for (let i = 0; i < this._batchRendererIndexes.length; i++) {
                this._batchRenderer.setPathSrc(src, this._batchRendererIndexes[i]);
            }
        }
    }

    public getSrc(): StrokeSource {
        return this._src;
    }

    /**
     * Set closed/open state for one path segment.
     * @public
     */
    public set isClosed(isClosed: boolean) {
        this._isClosed = isClosed;
        if (this._batchRenderer) {
            for (let i = 0; i < this._batchRendererIndexes.length; i++) {
                this._batchRenderer.setPathClosed(isClosed, this._batchRendererIndexes[i]);
            }
        }
    }

    public get isClosed(): boolean {
        return this._isClosed;
    }

    public setTextureDisabled() {
    }

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

        if (this._batchRenderer && segmentIndex < this._batchRendererIndexes.length) {
            this._batchRenderer.setPointLonLat(lonlat, index, this._batchRendererIndexes[segmentIndex]);
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

        if (this._batchRenderer && segmentIndex < this._batchRendererIndexes.length) {
            this._batchRenderer.setPoint3v(coordinates, index, this._batchRendererIndexes[segmentIndex], skipLonLat);
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
        const seg3v = this._path3v[segmentIndex];
        if (seg3v) seg3v.splice(index, 1);

        const segLL = this._pathLonLat[segmentIndex];
        if (segLL) segLL.splice(index, 1);

        const segC = this._pathColors[segmentIndex];
        if (segC) segC.splice(index, 1);

        if (this._batchRenderer && segmentIndex < this._batchRendererIndexes.length) {
            const batchIndex = this._batchRendererIndexes[segmentIndex];
            const pointsCount = Math.max(seg3v ? seg3v.length : 0, segLL ? segLL.length : 0);

            if (pointsCount > 1) {
                this._batchRenderer.removePoint(index, batchIndex);
            } else if (this._handler) {
                this._batchRenderer.removePath(batchIndex);
                this._handler.reindexAfterRemoval(batchIndex, this._batchRenderer);
                this._batchRendererIndexes.splice(segmentIndex, 1);
            }
        }

        this._updateExtent();
    }

    /**
     * Insert point coordinates in a path segment
     * @param {Vec3} point3v - Point coordinates
     * @param {number} [index=0] - Index in the path
     * @param {NumberArray4} [color] - Point color
     * @param {number} [segmentIndex=0] - Path segment index
     */
    public insertPoint3v(point3v: Vec3, index: number = 0, color?: NumberArray4, segmentIndex: number = 0) {
        const seg = this._path3v[segmentIndex] || (this._path3v[segmentIndex] = []);
        seg.splice(index, 0, point3v);

        if (color) {
            const segC = this._pathColors[segmentIndex] || (this._pathColors[segmentIndex] = []);
            segC.splice(index, 0, color);
        }

        if (this._batchRenderer) {
            if (segmentIndex < this._batchRendererIndexes.length) {
                this._batchRenderer.insertPoint3v(point3v, index, color, this._batchRendererIndexes[segmentIndex]);
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
     */
    public addPoint3v(point3v: Vec3, segmentIndex: number = 0, color?: NumberArray4) {
        const seg = this._path3v[segmentIndex] || (this._path3v[segmentIndex] = []);
        seg.push(point3v);

        if (color) {
            const segC = this._pathColors[segmentIndex] || (this._pathColors[segmentIndex] = []);
            segC.push(color);
        }

        if (this._batchRenderer) {
            if (segmentIndex < this._batchRendererIndexes.length) {
                this._batchRenderer.addPoint3v(point3v, this._batchRendererIndexes[segmentIndex], color, this._opacity);
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
     */
    public addPointLonLat(lonLat: LonLat, segmentIndex: number = 0, color?: NumberArray4) {
        const seg = this._pathLonLat[segmentIndex] || (this._pathLonLat[segmentIndex] = []);
        seg.push(lonLat);

        if (color) {
            const segC = this._pathColors[segmentIndex] || (this._pathColors[segmentIndex] = []);
            segC.push(color);
        }

        if (this._batchRenderer) {
            if (segmentIndex < this._batchRendererIndexes.length) {
                this._batchRenderer.addPointLonLat(lonLat, this._batchRendererIndexes[segmentIndex], color, this._opacity);
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

        if (this._batchRenderer && segmentIndex < this._batchRendererIndexes.length) {
            this._batchRenderer.setPointColor(color, index, this._batchRendererIndexes[segmentIndex], this._opacity);
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

        if (batchIndex > -1 && this._batchRenderer && this._handler) {
            this._batchRenderer.removePath(batchIndex);
            this._handler.reindexAfterRemoval(batchIndex, this._batchRenderer);
        }

        this._updateExtent();
    }

    public appendPath3v(path3v: SegmentPath3vExt, pathColors?: NumberArray4[]) {
        this._path3v.push(path3v);
        if (pathColors) this._pathColors.push(pathColors);

        if (this._batchRenderer && path3v.length > 1) {
            const batchIndex = this._batchRenderer._path3v.length;
            this._batchRenderer.appendPath3v(path3v, pathColors, this._opacity);
            this._batchRendererIndexes.push(batchIndex);
            this._applySegmentProps(batchIndex, this._path3v.length - 1);
            this._path3v[this._path3v.length - 1] = this._batchRenderer._path3v[batchIndex];
        }

        this._updateExtent();
    }

    public appendPathLonLat(pathLonLat: SegmentPathLonLatExt) {
        this._pathLonLat.push(pathLonLat);

        if (this._batchRenderer && pathLonLat.length > 1) {
            const batchIndex = this._batchRenderer._path3v.length;
            this._batchRenderer.appendPathLonLat(pathLonLat, undefined, this._opacity);
            this._batchRendererIndexes.push(batchIndex);
            this._applySegmentProps(batchIndex, this._pathLonLat.length - 1);
            this._path3v[this._pathLonLat.length - 1] = this._batchRenderer._path3v[batchIndex];
        }

        this._updateExtent();
    }

    public setPathLonLatFast(pathLonLat: SegmentPathLonLatExt[], pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4) {
        if (!pathColors) {
            this.setPathLonLat(pathLonLat, undefined, true);
            return;
        }
        const isSingleColor = Array.isArray(pathColors) && pathColors.length > 0 && typeof pathColors[0] === "number";
        const normalized = isSingleColor ? [pathColors as NumberArray4] : pathColors as (SegmentPathColor | NumberArray4)[];
        this.setPathLonLat(pathLonLat, normalized, true);
    }

    public setPath3vFast(path3v: SegmentPath3vExt[], pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4) {
        if (!pathColors) {
            this.setPath3v(path3v, undefined, true);
            return;
        }
        const isSingleColor = Array.isArray(pathColors) && pathColors.length > 0 && typeof pathColors[0] === "number";
        const normalized = isSingleColor ? [pathColors as NumberArray4] : pathColors as (SegmentPathColor | NumberArray4)[];
        this.setPath3v(path3v, normalized, true);
    }

    /**
     * Sets Polyline cartesian coordinates.
     * @public
     * @param {SegmentPath3vExt[]} path3v - Polyline path cartesian coordinates. (exactly 3 entries)
     * @param {SegmentPathColor[]} [pathColors] - Polyline path cartesian coordinates. (exactly 3 entries)
     * @param {Boolean} [forceEqual=false] - Makes assigning faster for size equal coordinates array.
     */
    public setPath3v(path3v: SegmentPath3vExt[], pathColors?: (SegmentPathColor | NumberArray4)[], forceEqual?: boolean): void;
    public setPath3v(path3v: SegmentPath3vExt, pathColors?: SegmentPathColor | NumberArray4, forceEqual?: boolean, segmentIndex?: number): void;
    public setPath3v(path3v: SegmentPath3vExt[] | SegmentPath3vExt, pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4, forceEqual: boolean = false, segmentIndex?: number) {
        if (segmentIndex !== undefined) {
            this._path3v[segmentIndex] = path3v as SegmentPath3vExt;
            const resolvedPathColors = pathColors ?? this._getDefaultPathColor(segmentIndex);
            if (this._batchRenderer && segmentIndex < this._batchRendererIndexes.length) {
                this._batchRenderer.setPath3v(
                    path3v as SegmentPath3vExt,
                    resolvedPathColors as SegmentPathColor | NumberArray4,
                    forceEqual,
                    this._batchRendererIndexes[segmentIndex]
                );
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

            if (this._batchRenderer) {
                if (forceEqual && this._batchRendererIndexes.length === paths.length) {
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
    public setPathLonLat(pathLonLat: SegmentPathLonLatExt[], pathColors?: (SegmentPathColor | NumberArray4)[], forceEqual?: boolean): void;
    public setPathLonLat(pathLonLat: SegmentPathLonLatExt, pathColors?: SegmentPathColor | NumberArray4, forceEqual?: boolean, segmentIndex?: number): void;
    public setPathLonLat(pathLonLat: SegmentPathLonLatExt[] | SegmentPathLonLatExt, pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4, forceEqual: boolean = false, segmentIndex?: number) {
        if (segmentIndex !== undefined) {
            this._pathLonLat[segmentIndex] = pathLonLat as SegmentPathLonLatExt;
            const resolvedPathColors = pathColors ?? this._getDefaultPathColor(segmentIndex);
            if (this._batchRenderer && segmentIndex < this._batchRendererIndexes.length) {
                this._batchRenderer.setPathLonLat(
                    pathLonLat as SegmentPathLonLatExt,
                    resolvedPathColors as SegmentPathColor | NumberArray4,
                    forceEqual,
                    this._batchRendererIndexes[segmentIndex]
                );
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

            if (this._batchRenderer) {
                if (forceEqual && this._batchRendererIndexes.length === paths.length) {
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

        const targetRenderer = this._handler.getRendererByOpacity(opacity);
        if (this._batchRenderer !== targetRenderer) {
            this._removeFromBatchRenderer();
            this._batchRenderer = targetRenderer;
            this._addToBatchRenderer();
            return;
        }

        if (!this._batchRenderer) {
            return;
        }

        for (let i = 0; i < this._batchRendererIndexes.length; i++) {
            this._batchRenderer.setPathOpacity(this._opacity, this._batchRendererIndexes[i]);
        }
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
            for (let i = 0; i < this._batchRendererIndexes.length; i++) {
                this._batchRenderer.setThickness(thickness, this._batchRendererIndexes[i]);
            }
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
            for (let i = 0; i < this._batchRendererIndexes.length; i++) {
                this._batchRenderer.setColor(htmlColor, this._batchRendererIndexes[i], this._opacity);
            }
        }
    }

    public setPathTexOffset(texOffset: number, segmentIndex: number): void {
        if (this._batchRenderer && segmentIndex < this._batchRendererIndexes.length) {
            this._batchRenderer.setPathTexOffset(texOffset, this._batchRendererIndexes[segmentIndex]);
        }
    }

    public setPathStrokeSize(strokeSize: number, segmentIndex: number): void {
        if (this._batchRenderer && segmentIndex < this._batchRendererIndexes.length) {
            this._batchRenderer.setPathStrokeSize(strokeSize, this._batchRendererIndexes[segmentIndex]);
        }
    }

    public setPathTexOffsetSpeed(texOffsetSpeed: number, segmentIndex: number): void {
        if (this._batchRenderer && segmentIndex < this._batchRendererIndexes.length) {
            this._batchRenderer.setPathTexOffsetSpeed(texOffsetSpeed, this._batchRendererIndexes[segmentIndex]);
        }
    }

    /**
     * Sets visibility.
     * @public
     * @param {boolean} visibility - Polyline visibility.
     */
    public setVisibility(visibility: boolean) {
        this._visibility = visibility;
    }

    /**
     * Gets Polyline visibility.
     * @public
     * @return {boolean} Polyline visibility.
     */
    public getVisibility(): boolean {
        return this._visibility;
    }

    public setPickingColor3v(color: Vec3) {
        this._pickingColor = color;
        if (this._batchRenderer) {
            for (let i = 0; i < this._batchRendererIndexes.length; i++) {
                this._batchRenderer.setPathPickingColor3v(color, this._batchRendererIndexes[i]);
            }
        }
    }

    public setPathColors(pathColors: SegmentPathColor[]): void;
    public setPathColors(pathColors: SegmentPathColor, segmentIndex: number): void;
    public setPathColors(pathColors: SegmentPathColor[] | SegmentPathColor, segmentIndex?: number) {
        if (segmentIndex !== undefined) {
            this._pathColors[segmentIndex] = pathColors as SegmentPathColor;
            if (this._batchRenderer && segmentIndex < this._batchRendererIndexes.length) {
                this._batchRenderer.setPathColors(pathColors as SegmentPathColor, this._batchRendererIndexes[segmentIndex], this._opacity);
            }
        } else {
            this._pathColors = (pathColors as SegmentPathColor[]).slice();
            if (this._batchRenderer) {
                for (let i = 0; i < this._batchRendererIndexes.length && i < this._pathColors.length; i++) {
                    this._batchRenderer.setPathColors(this._pathColors[i], this._batchRendererIndexes[i], this._opacity);
                }
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
            for (let i = 0; i < this._batchRendererIndexes.length; i++) {
                this._batchRenderer.setColor(htmlColor, this._batchRendererIndexes[i], this._opacity);
            }
        }
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

export {Polyline};
