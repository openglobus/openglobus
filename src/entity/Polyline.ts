import {Entity} from "./Entity";
import {Extent} from "../Extent";
import {LonLat} from "../LonLat";
import {Vec3} from "../math/Vec3";
import type {NumberArray3} from "../math/Vec3";
import type {NumberArray2} from "../math/Vec2";
import type {NumberArray4} from "../math/Vec4";
import {Planet} from "../scene/Planet";
import {RenderNode} from "../scene/RenderNode";
import {
    cloneArray,
    createVector3,
    htmlColorToFloat32Array,
    htmlColorToRgba,
    makeArray,
    makeArrayTyped,
    insertTypedArray,
    spliceTypedArray
} from "../utils/shared";
import type {TypedArray} from "../utils/shared";
import {Ellipsoid} from "../ellipsoid/Ellipsoid";
import type {HTMLImageElementExt} from "../utils/ImagesCacheManager";
import {PolylineBatchRenderer} from "./PolylineBatchRenderer";

const DEFAULT_COLOR = "#0000FF";

export type Geodetic = LonLat | NumberArray2 | NumberArray3
export type Cartesian = Vec3 | NumberArray3;

export type SegmentPath3vExt = Cartesian[];
export type SegmentPathLonLatExt = Geodetic[];

export type SegmentPathColor = NumberArray4[];

export type SegmentPath3v = Vec3[];
export type SegmentPathLonLat = LonLat[];

export interface IPolylineParams {
    altitude?: number;
    thickness?: number;
    opacity?: number;
    color?: string;
    visibility?: boolean;
    isClosed?: boolean;
    pathColors?: SegmentPathColor[];
    path3v?: SegmentPath3vExt[];
    pathLonLat?: SegmentPathLonLatExt[];
    visibleSpherePosition?: Cartesian;
    visibleSphereRadius?: number;
    /** Single texture for all segments, or per-segment: ["src1","src2"], null/undefined = color-only */
    src?: string | (string | null | undefined)[];
    image?: HTMLImageElement;
    texOffset?: number;
    strokeSize?: number;
}

/**
 * Polyline object.
 * @class
 * @param {Object} [options] - Polyline options:
 * @param {number} [options.thickness] - Thickness in screen pixels 1.5 is default.
 * @param {Number} [options.altitude] - Relative to ground layers altitude value.
 * @param {Vec4} [options.color] - RGBA color.
 * @param {Boolean} [options.opacity] - Line opacity.
 * @param {Boolean} [options.visibility] - Polyline visibility. True default.
 * @param {Boolean} [options.isClosed] - Closed geometry type identification.
 * @param {SegmentPathLonLatExt[]} [options.pathLonLat] - Polyline geodetic coordinates array. [[[0,0,0], [1,1,1],...]]
 * @param {SegmentPath3vExt[]} [options.path3v] - LinesString cartesian coordinates array. [[[0,0,0], [1,1,1],...]]
 * @param {SegmentPathColor[]} [options.pathColors] - Coordinates color. [[[1,0,0,1], [0,1,0,1],...]] for right and green colors.
 */
class Polyline {
    static __counter__: number = 0;

    /**
     * Object uniq identifier.
     * @protected
     * @type {number}
     */
    protected __id: number;

    public altitude: number;

    /**
     * Polyline thickness in screen pixels.
     * @type {number}
     */
    protected _thickness: number;

    protected _opacity: number;

    /**
     * Polyline RGBA color.
     * @protected
     * @type {Float32Array}
     */
    protected _defaultColor: Float32Array | NumberArray4;

    /**
     * Polyline visibility.
     * @public
     * @type {boolean}
     */
    public visibility: boolean;

    /**
     * Polyline geometry ring type identification.
     * @protected
     * @type {Boolean}
     */
    protected _closedLine: boolean;

    /**
     * Polyline cartesian coordinates.
     * @public
     * @type {Array.<Vec3>}
     */
    public _path3v: SegmentPath3vExt[];

    protected _pathLengths: number[];

    /**
     * Polyline geodetic degrees coordinates.
     * @private
     * @type {Array.<LonLat>}
     */
    protected _pathLonLat: SegmentPathLonLatExt[];

    /**
     * Polyline geodetic mercator coordinates.
     * @public
     * @type {Array.<LonLat>}
     */
    public _pathLonLatMerc: LonLat[][];

    protected _pathColors: SegmentPathColor[];
    protected _segmentThickness: number[];

    /**
     * Polyline geodetic extent.
     * @protected
     * @type {Extent}
     */
    public _extent: Extent;

    protected _pickingColor: NumberArray3;

    /**
     * Entity instance that holds this Polyline.
     * @public
     * @type {Entity}
     */
    public _entity: Entity | null;

    /**
     * Handler that stores and renders this Polyline object.
     * @public
     * @type {PolylineHandler | null}
     */
    public _renderer: PolylineBatchRenderer | null;
    public _rendererIndex: number;

    protected _visibleSphere: Float32Array;

    /**
     * Stroke image src: string (all segments) or per-segment array.
     * @protected
     */
    protected _src: string | (string | null | undefined)[] | null;

    /**
     * Stroke image(s): single or per-segment. null = color-only.
     * @protected
     */
    protected _image: (HTMLImageElement & { __nodeIndex?: number }) | (HTMLImageElement & { __nodeIndex?: number } | null)[] | null;

    protected _texOffset: number;

    protected _strokeSize: number;

    constructor(options: IPolylineParams = {}) {

        this.__id = Polyline.__counter__++;

        this.altitude = options.altitude || 0.0;

        this._renderer = null;

        this._thickness = options.thickness || 1.5;

        this._opacity = options.opacity != undefined ? options.opacity : 1.0;

        this._defaultColor = htmlColorToFloat32Array(
            options.color || DEFAULT_COLOR,
            options.opacity
        );

        this.visibility = options.visibility != undefined ? options.visibility : true;

        this._closedLine = options.isClosed || false;

        this._path3v = [];

        this._pathLengths = [];

        this._pathLonLat = [];

        this._pathLonLatMerc = [];

        this._pathColors = options.pathColors ? cloneArray(options.pathColors) : [];
        this._segmentThickness = [];

        this._extent = new Extent();

        this._pickingColor = [0, 0, 0];

        this._entity = null;

        this._image = options.image || null;

        this._src = options.src ?? null;

        this._texOffset = options.texOffset || 0;

        this._strokeSize = options.strokeSize != undefined ? options.strokeSize : 32;
    }

    public get texOffset(): number {
        return this._texOffset;
    }

    public set texOffset(value: number) {
        this._texOffset = value;
    }

    public get strokeSize(): number {
        return this._strokeSize;
    }

    public set strokeSize(value: number) {
        this._strokeSize = value;
    }

    /**
     * Sets image template url source. string = all segments, array = per-segment (null/undefined = color-only).
     * @public
     */
    public setSrc(src: string | (string | null | undefined)[] | null) {

    }

    public getSrc(): string | (string | null | undefined)[] | null {
        return this._src;
    }

    /**
     * Sets image template object.
     * @public
     * @param {Object} image - JavaScript image object.
     */
    public setImage(image: HTMLImageElement) {
        this.setSrc(image.src);
    }

    public getImage(): HTMLImageElementExt | (HTMLImageElementExt | null)[] | null {
        return this._image;
    }

    public setTextureDisabled() {
        this._strokeSize = 0;
    }

    public setPointLonLat(lonlat: LonLat, index: number, segmentIndex: number) {
        let path = this._pathLonLat[segmentIndex] as LonLat[];
        path[index].lon = lonlat.lon;
        path[index].lat = lonlat.lat;
        path[index].height = lonlat.height;
    }

    /**
     * Changes cartesian point coordinates of the path
     * @param {Vec3} coordinates - New coordinates
     * @param {number} [index=0] - Path segment index
     * @param {number} [segmentIndex=0] - Index of the point in the path segment
     * @param {boolean} [skipLonLat=false] - Do not update geodetic coordinates
     */
    public setPoint3v(coordinates: Vec3, index: number = 0, segmentIndex: number = 0, skipLonLat: boolean = false) {
        let path = this._path3v[segmentIndex] as Vec3[];
        path[index].x = coordinates.x;
        path[index].y = coordinates.y;
        path[index].z = coordinates.z;
    }

    /**
     * Remove multiline path segment
     * @param {number} index - Segment index in multiline
     */
    public removePath(index: number) {

    }

    public appendPath3v(path3v: SegmentPath3vExt, pathColors?: NumberArray4[]) {
        if (!path3v || path3v.length === 0) return;
    }

    public appendPathLonLat(pathLonLat: SegmentPathLonLatExt) {
        if (!pathLonLat || pathLonLat.length === 0) return;
    }

    /**
     * Remove point from the path
     * @param {number} index - Point index in a path segment
     * @param {number} [multiLineIndex=0] - Segment path index
     */
    public removePoint(index: number, multiLineIndex: number = 0) {
        this._path3v[multiLineIndex].splice(index, 1);
        if (this._path3v[multiLineIndex].length === 0) {
            this._path3v.splice(multiLineIndex, 1);
        }
        this.setPath3v(([] as SegmentPath3vExt[]).concat(this._path3v));
    }

    /**
     * Insert point coordinates in a path segment
     * @param {Vec3} point3v - Point coordinates
     * @param {number} [index=0] - Index in the path
     * @param {NumberArray4} [color] - Point color
     * @param {number} [multilineIndex=0] - Path segment index
     */
    public insertPoint3v(point3v: Vec3, index: number = 0, color?: NumberArray4, multilineIndex: number = 0) {
        let p = ([] as SegmentPath3vExt[]).concat(this._path3v),
            pp = p[multilineIndex];
        if (pp) {
            let c = ([] as SegmentPathColor[]).concat(this._pathColors);

            pp.splice(index, 0, point3v);

            if (color) {
                let cc = c[multilineIndex];
                if (!cc) {
                    cc = new Array(pp.length);
                }
                cc.splice(index, 0, color);
            }

            this.setPath3v(p, c);
        } else {
            this.addPoint3v(point3v, multilineIndex);
        }
    }

    /**
     * Adds a new cartesian point in the end of the path in a last line segment.
     * @public
     * @param {Vec3} point3v - New coordinates.
     * @param {NumberArray4} [color] -
     * @param {boolean} [skipEllipsoid] -
     */
    public appendPoint3v(point3v: Vec3, color?: NumberArray4, skipEllipsoid?: boolean) {
        if (this._path3v.length === 0 || !this._renderNode) {
            this._pathColors.push([color || this._defaultColor as NumberArray4]);
            this.addPoint3v(point3v);
        } else {

        }
    }

    /**
     * Append new point in the end of the path.
     * @public
     * @param {Vec3} point3v - New point coordinates.
     * @param {number} [multiLineIndex=0] - Path segment index, first by default.
     * @param {NumberArray4} [color] - Point color
     */
    public addPoint3v(point3v: Vec3, multiLineIndex: number = 0, color?: NumberArray4) {

    }

    /**
     * Append new geodetic point in the end of the path.
     * @public
     * @param {LonLat} lonLat - New coordinate.
     * @param {number} [multiLineIndex=0] - Path segment index, first by default.
     */
    public addPointLonLat(lonLat: LonLat, multiLineIndex: number = 0) {

    }

    /**
     * Clear polyline data.
     * @public
     */
    public clear() {

    }

    /**
     * Change path point color
     * @param {NumberArray4} color - New color
     * @param {number} [index=0] - Point index
     * @param {number} [segmentIndex=0] - Path segment index
     */
    public setPointColor(color: NumberArray4, index: number = 0, segmentIndex: number = 0) {

    }

    /**
     * Sets polyline opacity.
     * @public
     * @param {number} opacity - Opacity.
     */
    public setOpacity(opacity: number) {
        this._opacity = opacity;
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
        this.altitude = altitude;
    }

    /**
     * Sets Polyline thickness in screen pixels.
     * @public
     * @param {number} thickness - Thickness.
     * @param {number} [segmentIndex] - Segment index. If not set, applies to the last segment.
     */
    public setThickness(thickness: number): void;
    public setThickness(thickness: number, segmentIndex: number): void;
    public setThickness(thickness: number, segmentIndex?: number): void {

    }

    /**
     * Returns thickness.
     * @public
     * @return {number} Thickness in screen pixels.
     */
    public getThickness(): number {
        return this._thickness;
    }

    /**
     * Sets visibility.
     * @public
     * @param {boolean} visibility - Polyline visibility.
     */
    public setVisibility(visibility: boolean) {
        this.visibility = visibility;
    }

    /**
     * Gets Polyline visibility.
     * @public
     * @return {boolean} Polyline visibility.
     */
    public getVisibility(): boolean {
        return this.visibility;
    }

    protected _clearData() {
        this._path3v.length = 0;
        this._pathLonLat.length = 0;
        this._pathLonLatMerc.length = 0;

        this._path3v = [];
        this._pathLonLat = [];
        this._pathLonLatMerc = [];
    }


    /**
     * Removes from an entity.
     * @public
     */
    public remove() {

    }

    public setPickingColor3v(color: Vec3) {
        this._pickingColor[0] = color.x / 255.0;
        this._pickingColor[1] = color.y / 255.0;
        this._pickingColor[2] = color.z / 255.0;
    }

    /**
     * Returns polyline geodetic extent.
     * @public
     * @returns {Extent} - Geodetic extent
     */
    public getExtent(): Extent {
        return this._extent.clone();
    }

    /**
     * Returns path cartesian coordinates.
     * @return {SegmentPath3vExt[]} Polyline path.
     */
    public getPath3v(): SegmentPath3vExt[] {
        return this._path3v;
    }

    /**
     * Returns geodetic path coordinates.
     * @return {SegmentPathLonLatExt[]} Polyline path.
     */
    public getPathLonLat(): SegmentPathLonLatExt[] {
        return this._pathLonLat;
    }

    public getPathColors(): NumberArray4[][] {
        return this._pathColors;
    }

    /**
     * Sets polyline color
     * @param {string} htmlColor - HTML color.
     */
    public setColorHTML(htmlColor: string) {
        this._defaultColor = htmlColorToFloat32Array(htmlColor);

    }

    public setPathLonLatFast(pathLonLat: SegmentPathLonLatExt[], pathColors?: SegmentPathColor[]) {
        this.setPathLonLat(pathLonLat, pathColors, true);
    }

    public setPath3vFast(path3v: SegmentPath3vExt[], pathColors?: SegmentPathColor[]) {
        this.setPath3v(path3v, pathColors, true);
    }

    /**
     * Sets polyline geodetic coordinates.
     * @public
     * @param {SegmentPathLonLat[]} pathLonLat - Polyline path cartesian coordinates.
     * @param {Boolean} [forceEqual=false] - OPTIMIZATION FLAG: Makes assigning faster for size equal coordinates array.
     */
    public setPathLonLat(pathLonLat: SegmentPathLonLatExt[], pathColors?: SegmentPathColor[], forceEqual: boolean = false) {

    }

    /**
     * Sets Polyline cartesian coordinates.
     * @public
     * @param {SegmentPath3vExt[]} path3v - Polyline path cartesian coordinates. (exactly 3 entries)
     * @param {SegmentPathColor[]} [pathColors] - Polyline path cartesian coordinates. (exactly 3 entries)
     * @param {Boolean} [forceEqual=false] - Makes assigning faster for size equal coordinates array.
     */
    public setPath3v(path3v: SegmentPath3vExt[], pathColors?: SegmentPathColor[], forceEqual: boolean = false) {

    }

}

export {Polyline};
