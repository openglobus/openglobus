import {Entity} from "../Entity";
import {LonLat} from "../../LonLat";
import {Vec3} from "../../math/Vec3";
import type {NumberArray3} from "../../math/Vec3";
import type {NumberArray2} from "../../math/Vec2";
import type {NumberArray4} from "../../math/Vec4";
import type {HTMLImageElementExt} from "../../utils/ImagesCacheManager";
import {PolylineHandler} from "./PolylineHandler";

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
    color?: string[];
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
 * @param {string[]} [options.color] - Per-segment HTML colors.
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

    protected _entity: Entity | null;

    public _handler: PolylineHandler | null;
    public _handlerIndex: number;

    public _batchRenderer: PolylineHandler | null;
    public _batchRendererIndexes: number[];

    protected _path3v: SegmentPath3vExt[];
    protected _pathLonLat: SegmentPathLonLatExt[];
    protected _pathColors: SegmentPathColor[];

    protected _src: StrokeSource;

    protected _isClosed: boolean;

    protected _visibility: boolean;

    protected _image: HTMLImageElement | null;

    constructor(options: IPolylineParams = {}) {
        this.__id = Polyline.__counter__++;

        this._path3v = options.path3v || [];

        this._pathLonLat = options.pathLonLat || [];

        this._pathColors = options.pathColors || [];

        this._entity = null;

        this._handler = null;
        this._handlerIndex = -1;

        this._batchRenderer = null;
        this._batchRendererIndexes = [];

        this._src = options.src || null;

        this._isClosed = options.isClosed || false;

        this._visibility = options.visibility !== undefined ? options.visibility : true;

        this._image = null;
    }

    public getPath3v(): SegmentPath3vExt[] {
        return this._path3v;
    }

    public getPathLonLat(): SegmentPathLonLatExt[] {
        return this._pathLonLat;
    }

    public getPathColors(): NumberArray4[][] {
        return this._pathColors;
    }

    public setImage(image: HTMLImageElement) {
        this._image = image;
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
    }

    public get isClosed(): boolean[] {
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

    }

    public setPointLonLat(lonlat: LonLat, index: number, segmentIndex: number) {

    }

    /**
     * Changes cartesian point coordinates of the path
     * @param {Vec3} coordinates - New coordinates
     * @param {number} [index=0] - Path segment index
     * @param {number} [segmentIndex=0] - Index of the point in the path segment
     * @param {boolean} [skipLonLat=false] - Do not update geodetic coordinates
     */
    public setPoint3v(coordinates: Vec3, index: number = 0, segmentIndex: number = 0, skipLonLat: boolean = false) {

    }

    /**
     * Remove multiline path segment
     * @param {number} index - Segment index in multiline
     */
    public removePath(index: number) {

    }

    public appendPath3v(path3v: SegmentPath3vExt, pathColors?: NumberArray4[]) {

    }

    public appendPathLonLat(pathLonLat: SegmentPathLonLatExt) {

    }

    /**
     * Remove point from the path
     * @param {number} index - Point index in a path segment
     * @param {number} [segmentIndex=0] - Segment path index
     */
    public removePoint(index: number, segmentIndex: number = 0) {

    }

    /**
     * Insert point coordinates in a path segment
     * @param {Vec3} point3v - Point coordinates
     * @param {number} [index=0] - Index in the path
     * @param {NumberArray4} [color] - Point color
     * @param {number} [segmentIndex=0] - Path segment index
     */
    public insertPoint3v(point3v: Vec3, index: number = 0, color?: NumberArray4, segmentIndex: number = 0) {

    }

    /**
     * Append new point in the end of the path.
     * @public
     * @param {Vec3} point3v - New point coordinates.
     * @param {number} [segmentIndex=0] - Path segment index, first by default.
     * @param {NumberArray4} [color] - Point color
     */
    public addPoint3v(point3v: Vec3, segmentIndex: number = 0, color?: NumberArray4) {

    }

    /**
     * Append new geodetic point in the end of the path.
     * @public
     * @param {LonLat} lonLat - New coordinate.
     * @param {number} [segmentIndex=0] - Path segment index, first by default.
     * @param {NumberArray4} [color] - Point color.
     */
    public addPointLonLat(lonLat: LonLat, segmentIndex: number = 0, color?: NumberArray4) {

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

    }

    /**
     * Gets polyline opacity.
     * @public
     */
    public getOpacity(): number {

    }

    /**
     * Sets Polyline thickness in screen pixels.
     * @public
     * @param {number} altitude - ALtitude value.
     */
    public setAltitude(altitude: number) {

    }

    /**
     * Sets Polyline thickness in screen pixels.
     * @public
     * @param {number} thickness - Thickness.
     */
    public setThickness(thickness: number): void{

    }

    /**
     * Sets polyline segment color.
     * @public
     * @param {string} htmlColor - HTML color.
     */
    public setColor(htmlColor: string): void {

    }

    public setPathTexOffset(texOffset: number, segmentIndex: number): void {

    }

    public setPathStrokeSize(strokeSize: number, segmentIndex: number): void {

    }

    public setPathTexOffsetSpeed(texOffsetSpeed: number, segmentIndex: number): void {

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

    /**
     * Removes from an entity.
     * @public
     */
    public remove() {

    }

    public setPickingColor3v(color: Vec3) {

    }

    public setPathColors(pathColors: SegmentPathColor[]): void;
    public setPathColors(pathColors: SegmentPathColor, segmentIndex: number): void;
    public setPathColors(pathColors: SegmentPathColor[] | SegmentPathColor, segmentIndex?: number) {

    }

    /**
     * Sets polyline color
     * @param {string} htmlColor - HTML color.
     */
    public setColorHTML(htmlColor: string) {

    }

    public setPathLonLatFast(pathLonLat: SegmentPathLonLatExt[], pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4) {

    }

    public setPath3vFast(path3v: SegmentPath3vExt[], pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4) {

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

    }
}

export {Polyline};
