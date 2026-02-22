import {Entity} from "./Entity";
import {Extent} from "../Extent";
import {LonLat} from "../LonLat";
import {Vec3} from "../math/Vec3";
import type {NumberArray3} from "../math/Vec3";
import type {NumberArray2} from "../math/Vec2";
import type {NumberArray4} from "../math/Vec4";
import {Planet} from "../scene/Planet";
import {PolylineHandler} from "./PolylineHandler";
import {RenderNode} from "../scene/RenderNode";
import type {WebGLBufferExt} from "../webgl/Handler";
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

const VERTICES_BUFFER = 0;
const INDEX_BUFFER = 1;
const COLORS_BUFFER = 2;
const TEXCOORD_BUFFER = 3;
const THICKNESS_BUFFER = 4;
const PICKINGCOLORS_BUFFER = 5;

const DEFAULT_COLOR = "#0000FF";

const R = 0;
const G = 1;
const B = 2;
const A = 3;

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

    protected _pickingColor: Float32Array | NumberArray4;

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

    protected _pathPickingColors: NumberArray3[][];

    /**
     * Polyline geodetic extent.
     * @protected
     * @type {Extent}
     */
    public _extent: Extent;
    protected _verticesHigh: TypedArray | number[];
    protected _verticesLow: TypedArray | number[];
    protected _orders: TypedArray | number[];
    protected _indexes: TypedArray | number[];
    protected _colors: TypedArray | number[];
    protected _thicknessArr: TypedArray | number[];
    protected _texCoordArr: TypedArray | number[];
    protected _pickingColors: TypedArray | number[];

    protected _atlasTexCoords: number[];

    protected _verticesHighBuffer: WebGLBufferExt | null;
    protected _verticesLowBuffer: WebGLBufferExt | null;
    protected _ordersBuffer: WebGLBufferExt | null;
    protected _indexesBuffer: WebGLBufferExt | null;
    protected _colorsBuffer: WebGLBufferExt | null;
    protected _texCoordBuffer: WebGLBufferExt | null;
    protected _thicknessBuffer: WebGLBufferExt | null;
    protected _pickingColorsBuffer: WebGLBufferExt | null;

    protected _renderNode: RenderNode | null;

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
    public _handler: PolylineHandler | null;
    public _handlerIndex: number;
    protected _buffersUpdateCallbacks: Function[];
    protected _changedBuffers: boolean[];

    protected _visibleSphere: Float32Array;

    public __doubleToTwoFloats: (pos: Vec3, highPos: Vec3, lowPos: Vec3) => void;

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

        this.__doubleToTwoFloats = Vec3.doubleToTwoFloats;

        this.altitude = options.altitude || 0.0;

        this._thickness = options.thickness || 1.5;

        this._opacity = options.opacity != undefined ? options.opacity : 1.0;

        this._defaultColor = htmlColorToFloat32Array(
            options.color || DEFAULT_COLOR,
            options.opacity
        );

        this._pickingColor = new Float32Array([0, 0, 0]);

        this.visibility = options.visibility != undefined ? options.visibility : true;

        this._closedLine = options.isClosed || false;

        this._path3v = [];

        this._pathLengths = [];

        this._pathLonLat = [];

        this._pathLonLatMerc = [];

        this._pathColors = options.pathColors ? cloneArray(options.pathColors) : [];
        this._segmentThickness = [];

        this._pathPickingColors = [];

        this._extent = new Extent();

        this._verticesHigh = [];
        this._verticesLow = [];
        this._orders = [];
        this._indexes = [];
        this._colors = [];
        this._thicknessArr = [];
        this._texCoordArr = [];
        this._pickingColors = [];

        this._atlasTexCoords = [];

        this._verticesHighBuffer = null;
        this._verticesLowBuffer = null;
        this._ordersBuffer = null;
        this._indexesBuffer = null;
        this._colorsBuffer = null;
        this._texCoordBuffer = null;
        this._thicknessBuffer = null;
        this._pickingColorsBuffer = null;

        this._renderNode = null;

        this._entity = null;


        this._handler = null;
        this._handlerIndex = -1;

        this._image = options.image || null;

        this._src = options.src ?? null;

        this._texOffset = options.texOffset || 0;

        this._strokeSize = options.strokeSize != undefined ? options.strokeSize : 32;

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[VERTICES_BUFFER] = this._createVerticesBuffer;
        this._buffersUpdateCallbacks[INDEX_BUFFER] = this._createIndexBuffer;
        this._buffersUpdateCallbacks[COLORS_BUFFER] = this._createColorsBuffer;
        this._buffersUpdateCallbacks[TEXCOORD_BUFFER] = this._createTexCoordBuffer;
        this._buffersUpdateCallbacks[THICKNESS_BUFFER] = this._createThicknessBuffer;
        this._buffersUpdateCallbacks[PICKINGCOLORS_BUFFER] = this._createPickingColorsBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

        let c = createVector3(options.visibleSpherePosition).toArray();
        let r = options.visibleSphereRadius || 0;
        this._visibleSphere = new Float32Array([...c, r]);

        // create path
        if (options.pathLonLat) {
            this.setPathLonLat(options.pathLonLat);
        } else if (options.path3v) {
            this.setPath3v(options.path3v);
        }

        this._refresh();
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

    public setImage(image: HTMLImageElement) {
        this.setSrc(image.src);
    }

    public getImage(): HTMLImageElementExt | (HTMLImageElementExt | null)[] | null {
        return this._image;
    }

    /**
     * Sets image template url source. string = all segments, array = per-segment (null/undefined = color-only).
     * @public
     */
    public setSrc(src: string | (string | null | undefined)[] | null) {
        this._src = src ?? null;
        const bh = this._handler;
        if (!bh) return;
        const rn = bh._entityCollection.renderNode;
        if (!rn?.renderer) return;
        const ta = rn.renderer.strokeTextureAtlas;

        const isArray = Array.isArray(src);
        const getSegSrc = (j: number): string | null => {
            if (!src) return null;
            if (!isArray) return (src as string)?.length ? (src as string) : null;
            const arr = src as (string | null | undefined)[];
            const s = arr[j];
            if (s !== undefined) return (s && String(s).length) ? String(s) : null;
            const last = arr[arr.length - 1];
            return (last && String(last).length) ? String(last) : null;
        };
        const segCount = Math.max(this._path3v?.length || 0, 1);

        if (!isArray && typeof src === "string" && src.length) {
            ta.loadImage(src, (img: HTMLImageElementExt) => {
                if (img.__nodeIndex != undefined && ta.get(img.__nodeIndex)) {
                    this._image = img;
                    this._setTexCoordArr(ta.get(img.__nodeIndex!)!.texCoords);
                } else {
                    ta.addImage(img);
                    ta.createTexture();
                    this._image = img;
                    rn!.updateStrokeTexCoords();
                }
            });
            return;
        }
        if (isArray && (src as any[]).some((s) => s && String(s).length)) {
            const pending = new Map<string, number[]>();
            for (let j = 0; j < segCount; j++) {
                const s = getSegSrc(j);
                if (s) {
                    if (!pending.has(s)) pending.set(s, []);
                    pending.get(s)!.push(j);
                }
            }
            const segTexCoords: (number[] | null)[] = new Array(segCount).fill(null);
            const segImages: (HTMLImageElement & { __nodeIndex?: number } | null)[] = new Array(segCount).fill(null);
            let loaded = 0;
            const needed = pending.size;
            const onLoaded = () => {
                loaded++;
                if (loaded === needed) {
                    this._image = segImages;
                    this._setTexCoordArr(segTexCoords);
                    rn!.updateStrokeTexCoords();
                }
            };
            pending.forEach((segIndices, url) => {
                ta.loadImage(url, (img: HTMLImageElementExt) => {
                    let taData = img.__nodeIndex != undefined ? ta.get(img.__nodeIndex) : undefined;
                    if (!taData) {
                        ta.addImage(img);
                        ta.createTexture();
                        taData = ta.get(img.__nodeIndex!)!;
                    }
                    for (const j of segIndices) {
                        segTexCoords[j] = taData!.texCoords;
                        segImages[j] = img;
                    }
                    onLoaded();
                });
            });
            return;
        }
        this.setTextureDisabled();
        this._image = null;
        const empty: (number[] | null)[] = new Array(segCount);
        for (let j = 0; j < segCount; j++) empty[j] = null;
        this._setTexCoordArr(empty);
        rn!.updateStrokeTexCoords();
    }

    /**
     * Set stroke image source for a segment index.
     * @public
     */
    public setPathSrc(src: string | null | undefined, segmentIndex: number = 0) {
        const segIdx = Math.max(0, Math.trunc(segmentIndex));

        if (segIdx === 0 && !Array.isArray(this._src)) {
            this.setSrc(src ?? null);
            return;
        }

        const baseSrc = this._src;
        const segCount = Math.max(this._path3v?.length || 0, 1, segIdx + 1);
        const perSegmentSrc: (string | null | undefined)[] = new Array(segCount);

        if (Array.isArray(baseSrc)) {
            for (let i = 0; i < segCount; i++) {
                perSegmentSrc[i] = baseSrc[i];
            }
        } else {
            for (let i = 0; i < segCount; i++) {
                perSegmentSrc[i] = baseSrc ?? null;
            }
        }

        perSegmentSrc[segIdx] = src ?? null;
        this.setSrc(perSegmentSrc);
    }

    public getSrc(): string | (string | null | undefined)[] | null {
        return this._src;
    }

    public _setTexCoordArr(tcoordArrOrArrs: number[] | (number[] | null)[]) {
        this._texCoordArr = [];
        const perSegment = tcoordArrOrArrs.length > 0 && typeof tcoordArrOrArrs[0] !== "number";
        if (!perSegment) this._atlasTexCoords = tcoordArrOrArrs as number[];
        Polyline.setPathTexCoords(this._path3v, tcoordArrOrArrs, this._texCoordArr);
        this._changedBuffers[TEXCOORD_BUFFER] = true;
    }

    public setTextureDisabled() {
        this._strokeSize = 0;
    }

    /** Get atlas tex coords for segment (null = color-only) */
    protected _getAtlasTexCoordsForSegment(segIndex: number): number[] | null {
        const img = this._image;
        if (Array.isArray(img) && segIndex < img.length) {
            const m = img[segIndex];
            if (m == null) return null;
            const rn = this._handler?._entityCollection?.renderNode;
            const d = rn?.renderer && m.__nodeIndex != null ? rn.renderer.strokeTextureAtlas.get(m.__nodeIndex) : null;
            return d?.texCoords ?? null;
        }
        return (this._atlasTexCoords?.length) ? this._atlasTexCoords : null;
    }

    /**
     * Appends to the line array new cartesian coordinates line data.
     */
    protected __appendLineData3v(
        path3v: SegmentPath3vExt[],
        pathColors: SegmentPathColor[],
        pathPickingColors: NumberArray3[][],
        defaultColor: NumberArray4,
        isClosed: boolean,
        outVerticesHigh: number[],
        outVerticesLow: number[],
        outOrders: number[],
        outIndexes: number[],
        ellipsoid: Ellipsoid,
        outTransformedPathLonLat: SegmentPathLonLatExt[],
        outPath3v: SegmentPath3vExt[],
        outTransformedPathMerc: LonLat[][],
        outExtent: Extent,
        outColors: number[],
        outThickness: number[],
        outTexCoords: number[],
        outPickingColors: number[]
    ) {
        var index = 0;

        var v_high = new Vec3(),
            v_low = new Vec3();

        if (outExtent) {
            outExtent.southWest.set(180.0, 90.0);
            outExtent.northEast.set(-180.0, -90.0);
        }

        if (outIndexes.length > 0) {
            index = outIndexes[outIndexes.length - 5] + 9;
            outIndexes.push(index, index);
        } else {
            outIndexes.push(0, 0);
        }

        for (let j = 0, len = path3v.length; j < len; j++) {
            var path = path3v[j],
                pathColors_j = pathColors[j];
            const pathPickingColors_j = pathPickingColors[j];

            outTransformedPathLonLat[j] = [];
            outTransformedPathMerc[j] = [];
            outPath3v[j] = [];

            if (path.length === 0) {
                continue;
            }

            var startIndex = index;

            var last;

            if (isClosed) {
                last = path[path.length - 1];
                if (last instanceof Array) {
                    last = new Vec3(last[0], last[1], last[2]);
                }
            } else {
                var p0 = path[0],
                    p1 = path[1] || p0;
                if (p0 instanceof Array) {
                    p0 = new Vec3(p0[0], p0[1], p0[2]);
                }
                if (p1 instanceof Array) {
                    p1 = new Vec3(p1[0], p1[1], p1[2]);
                }

                p0 = p0 as Vec3;
                p1 = p1 as Vec3;

                last = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            let color = defaultColor;

            if (pathColors_j && pathColors_j[0]) {
                color = pathColors_j[0];
            }

            this.__doubleToTwoFloats(last as Vec3, v_high, v_low);
            outVerticesHigh.push(
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z
            );
            outVerticesLow.push(
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z
            );

            let r = color[R],
                g = color[G],
                b = color[B],
                a = color[A] != undefined ? color[A] : 1.0;
            let pickingColor: any = (pathPickingColors_j && pathPickingColors_j[0]) ? pathPickingColors_j[0] : (this._pickingColor as any);
            let pr = pickingColor[R], pg = pickingColor[G], pb = pickingColor[B];

            let thickness = this._segmentThickness[j];
            if (thickness == undefined) {
                thickness = this._thickness;
                this._segmentThickness[j] = thickness;
            }

            if (j > 0) {
                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
                outThickness.push(thickness, thickness, thickness, thickness);
                outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
                const segAtlas = this._getAtlasTexCoordsForSegment(j);
                if (segAtlas && segAtlas.length >= 10) {
                    const my = segAtlas[1], ih = segAtlas[3] - my;
                    outTexCoords.push(segAtlas[4], segAtlas[5], my, ih, segAtlas[2], segAtlas[3], my, ih, segAtlas[8], segAtlas[9], my, ih, segAtlas[0], segAtlas[1], my, ih);
                } else {
                    outTexCoords.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
                }
            }

            outOrders.push(1, -1, 2, -2);

            for (let i = 0, len = path.length; i < len; i++) {
                var cur = path[i];

                if (cur instanceof Array) {
                    cur = new Vec3(cur[0], cur[1], cur[2]);
                }

                outPath3v[j].push(cur as Vec3);

                if (ellipsoid) {
                    var lonLat = ellipsoid.cartesianToLonLat(cur as Vec3);
                    outTransformedPathLonLat[j].push(lonLat);
                    outTransformedPathMerc[j].push(lonLat.forwardMercator());

                    if (lonLat.lon < outExtent.southWest.lon) {
                        outExtent.southWest.lon = lonLat.lon;
                    }
                    if (lonLat.lat < outExtent.southWest.lat) {
                        outExtent.southWest.lat = lonLat.lat;
                    }
                    if (lonLat.lon > outExtent.northEast.lon) {
                        outExtent.northEast.lon = lonLat.lon;
                    }
                    if (lonLat.lat > outExtent.northEast.lat) {
                        outExtent.northEast.lat = lonLat.lat;
                    }
                }

                if (pathColors_j && pathColors_j[i]) {
                    color = pathColors_j[i];
                }
                if (pathPickingColors_j && pathPickingColors_j[i]) {
                    pickingColor = pathPickingColors_j[i];
                }

                r = color[R];
                g = color[G];
                b = color[B];
                a = color[A] != undefined ? color[A] : 1.0;
                pr = pickingColor[R];
                pg = pickingColor[G];
                pb = pickingColor[B];

                this.__doubleToTwoFloats(cur as Vec3, v_high, v_low);
                outVerticesHigh.push(
                    v_high.x, v_high.y, v_high.z,
                    v_high.x, v_high.y, v_high.z,
                    v_high.x, v_high.y, v_high.z,
                    v_high.x, v_high.y, v_high.z
                );
                outVerticesLow.push(
                    v_low.x, v_low.y, v_low.z,
                    v_low.x, v_low.y, v_low.z,
                    v_low.x, v_low.y, v_low.z,
                    v_low.x, v_low.y, v_low.z
                );

                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
                outThickness.push(thickness, thickness, thickness, thickness);
                outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
                const segAtlas = this._getAtlasTexCoordsForSegment(j);
                if (segAtlas && segAtlas.length >= 10) {
                    const my = segAtlas[1], ih = segAtlas[3] - my;
                    outTexCoords.push(segAtlas[4], segAtlas[5], my, ih, segAtlas[2], segAtlas[3], my, ih, segAtlas[8], segAtlas[9], my, ih, segAtlas[0], segAtlas[1], my, ih);
                } else {
                    outTexCoords.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
                }

                outOrders.push(1, -1, 2, -2);
                outIndexes.push(index++, index++, index++, index++);
            }

            var first;
            if (isClosed) {
                first = path[0];
                if (first instanceof Array) {
                    first = new Vec3(first[0], first[1], first[2]);
                }
                outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
            } else {
                let p0 = path[path.length - 1],
                    p1 = path[path.length - 2] || p0;

                if (p0 instanceof Array) {
                    p0 = new Vec3(p0[0], p0[1], p0[2]);
                } else {
                    p0 = p0 as Vec3;
                }

                if (p1 instanceof Array) {
                    p1 = new Vec3(p1[0], p1[1], p1[2]);
                } else {
                    p1 = p1 as Vec3;
                }

                first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
                outIndexes.push(index - 1, index - 1, index - 1, index - 1);
            }

            if (pathColors_j && pathColors_j[path.length - 1]) {
                color = pathColors_j[path.length - 1];
            }

            r = color[R];
            g = color[G];
            b = color[B];
            a = color[A] != undefined ? color[A] : 1.0;
            if (pathPickingColors_j && pathPickingColors_j[path.length - 1]) {
                pickingColor = pathPickingColors_j[path.length - 1];
            }
            pr = pickingColor[R];
            pg = pickingColor[G];
            pb = pickingColor[B];

            this.__doubleToTwoFloats(first as Vec3, v_high, v_low);
            outVerticesHigh.push(
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z
            );
            outVerticesLow.push(
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z
            );

            outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            outThickness.push(thickness, thickness, thickness, thickness);
            outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
            const lastAtlas = this._getAtlasTexCoordsForSegment(j);
            if (lastAtlas && lastAtlas.length >= 10) {
                const my = lastAtlas[1], ih = lastAtlas[3] - my;
                outTexCoords.push(lastAtlas[4], lastAtlas[5], my, ih, lastAtlas[2], lastAtlas[3], my, ih, lastAtlas[8], lastAtlas[9], my, ih, lastAtlas[0], lastAtlas[1], my, ih);
            } else {
                outTexCoords.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
            }

            outOrders.push(1, -1, 2, -2);

            if (j < path3v.length - 1 && path3v[j + 1].length !== 0) {
                index += 8;
                outIndexes.push(index, index);
            }
        }
    }

    // /**
    //  * Appends to the line new cartesian coordinates point data.
    //  */
    // protected __appendPoint3v(
    //     path3v: SegmentPath3vExt[],
    //     point3v: Vec3,
    //     pathColors: SegmentPathColor[],
    //     pickingPathColors: NumberArray3[][],
    //     color: NumberArray4,
    //     isClosed: boolean,
    //     outVerticesHigh: number[],
    //     outVerticesLow: number[],
    //     outColors: number[],
    //     outThickness: number[],
    //     outOrders: number[],
    //     outIndexes: number[],
    //     ellipsoid: Ellipsoid | null,
    //     outTransformedPathLonLat: SegmentPathLonLatExt[],
    //     outTransformedPathMerc: LonLat[][],
    //     outExtent: Extent,
    //     outTexCoords: number[],
    //     outPickingColors: number[],
    // ) {
    //     var v_high = new Vec3(),
    //         v_low = new Vec3();
    //
    //     var ii = outIndexes.length - 4,
    //         index = outIndexes[ii - 1] + 1;
    //
    //     if (path3v.length === 0) {
    //         path3v.push([]);
    //         if (!pathColors[0]) {
    //             pathColors[0] = [];
    //         }
    //     } else if (!pathColors[path3v.length - 1]) {
    //         pathColors[path3v.length - 1] = [];
    //     }
    //
    //     var path = path3v[path3v.length - 1],
    //         len = path.length;
    //
    //     path.push(point3v);
    //
    //     let r = color[R],
    //         g = color[G],
    //         b = color[B],
    //         a = color[A] != undefined ? color[A] : 1.0,
    //         pathColors_last = pathColors[path3v.length - 1];
    //
    //     if (pathColors_last[len]) {
    //         pathColors_last[len][R] = r;
    //         pathColors_last[len][G] = g;
    //         pathColors_last[len][B] = b;
    //         pathColors_last[len][A] = a;
    //     } else {
    //         pathColors_last.push(color);
    //     }
    //
    //     if (len === 1) {
    //         var last;
    //         if (isClosed) {
    //             last = path[len - 1];
    //             if (last instanceof Array) {
    //                 last = new Vec3(last[0], last[1], last[2]);
    //             }
    //         } else {
    //             let p0 = path[0],
    //                 p1 = path[1] || p0;
    //
    //             if (p0 instanceof Array) {
    //                 p0 = new Vec3(p0[0], p0[1], p0[2]);
    //             } else {
    //                 p0 = p0 as Vec3;
    //             }
    //
    //             if (p1 instanceof Array) {
    //                 p1 = new Vec3(p1[0], p1[1], p1[2]);
    //             } else {
    //                 p1 = p1 as Vec3;
    //             }
    //
    //             last = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
    //         }
    //
    //         this.__doubleToTwoFloats(last as Vec3, v_high, v_low);
    //
    //         let vi = outVerticesHigh.length - 3 * 12;
    //
    //         outVerticesHigh[vi] = v_high.x;
    //         outVerticesHigh[vi + 1] = v_high.y;
    //         outVerticesHigh[vi + 2] = v_high.z;
    //         outVerticesHigh[vi + 3] = v_high.x;
    //         outVerticesHigh[vi + 4] = v_high.y;
    //         outVerticesHigh[vi + 5] = v_high.z;
    //         outVerticesHigh[vi + 6] = v_high.x;
    //         outVerticesHigh[vi + 7] = v_high.y;
    //         outVerticesHigh[vi + 8] = v_high.z;
    //         outVerticesHigh[vi + 9] = v_high.x;
    //         outVerticesHigh[vi + 10] = v_high.y;
    //         outVerticesHigh[vi + 11] = v_high.z;
    //
    //         outVerticesLow[vi] = v_low.x;
    //         outVerticesLow[vi + 1] = v_low.y;
    //         outVerticesLow[vi + 2] = v_low.z;
    //         outVerticesLow[vi + 3] = v_low.x;
    //         outVerticesLow[vi + 4] = v_low.y;
    //         outVerticesLow[vi + 5] = v_low.z;
    //         outVerticesLow[vi + 6] = v_low.x;
    //         outVerticesLow[vi + 7] = v_low.y;
    //         outVerticesLow[vi + 8] = v_low.z;
    //         outVerticesLow[vi + 9] = v_low.x;
    //         outVerticesLow[vi + 10] = v_low.y;
    //         outVerticesLow[vi + 11] = v_low.z;
    //     }
    //
    //     var startIndex = index;
    //
    //     if (ellipsoid) {
    //         if (outTransformedPathLonLat.length === 0) {
    //             outTransformedPathLonLat.push([]);
    //         }
    //
    //         if (outTransformedPathMerc.length === 0) {
    //             outTransformedPathMerc.push([]);
    //         }
    //
    //         var transformedPathLonLat = outTransformedPathLonLat[outTransformedPathLonLat.length - 1],
    //             transformedPathMerc = outTransformedPathMerc[outTransformedPathMerc.length - 1];
    //
    //         let lonLat = ellipsoid.cartesianToLonLat(point3v);
    //         transformedPathLonLat.push(lonLat);
    //         transformedPathMerc.push(lonLat.forwardMercator());
    //
    //         if (lonLat.lon < outExtent.southWest.lon) {
    //             outExtent.southWest.lon = lonLat.lon;
    //         }
    //         if (lonLat.lat < outExtent.southWest.lat) {
    //             outExtent.southWest.lat = lonLat.lat;
    //         }
    //         if (lonLat.lon > outExtent.northEast.lon) {
    //             outExtent.northEast.lon = lonLat.lon;
    //         }
    //         if (lonLat.lat > outExtent.northEast.lat) {
    //             outExtent.northEast.lat = lonLat.lat;
    //         }
    //     }
    //
    //     this.__doubleToTwoFloats(point3v, v_high, v_low);
    //
    //     let vi = outVerticesHigh.length - 12;
    //
    //     outVerticesHigh[vi] = v_high.x;
    //     outVerticesHigh[vi + 1] = v_high.y;
    //     outVerticesHigh[vi + 2] = v_high.z;
    //     outVerticesHigh[vi + 3] = v_high.x;
    //     outVerticesHigh[vi + 4] = v_high.y;
    //     outVerticesHigh[vi + 5] = v_high.z;
    //     outVerticesHigh[vi + 6] = v_high.x;
    //     outVerticesHigh[vi + 7] = v_high.y;
    //     outVerticesHigh[vi + 8] = v_high.z;
    //     outVerticesHigh[vi + 9] = v_high.x;
    //     outVerticesHigh[vi + 10] = v_high.y;
    //     outVerticesHigh[vi + 11] = v_high.z;
    //
    //     outVerticesLow[vi] = v_low.x;
    //     outVerticesLow[vi + 1] = v_low.y;
    //     outVerticesLow[vi + 2] = v_low.z;
    //     outVerticesLow[vi + 3] = v_low.x;
    //     outVerticesLow[vi + 4] = v_low.y;
    //     outVerticesLow[vi + 5] = v_low.z;
    //     outVerticesLow[vi + 6] = v_low.x;
    //     outVerticesLow[vi + 7] = v_low.y;
    //     outVerticesLow[vi + 8] = v_low.z;
    //     outVerticesLow[vi + 9] = v_low.x;
    //     outVerticesLow[vi + 10] = v_low.y;
    //     outVerticesLow[vi + 11] = v_low.z;
    //
    //     let ci = outColors.length - 16;
    //     let ti = outThickness.length - 4;
    //
    //     let thickness = this._segmentThickness[path3v.length - 1];
    //     if (thickness == undefined) {
    //         thickness = this._thickness;
    //         this._segmentThickness[path3v.length - 1] = thickness;
    //     }
    //
    //     outColors[ci] = r;
    //     outColors[ci + 1] = g;
    //     outColors[ci + 2] = b;
    //     outColors[ci + 3] = a;
    //     outColors[ci + 4] = r;
    //     outColors[ci + 5] = g;
    //     outColors[ci + 6] = b;
    //     outColors[ci + 7] = a;
    //     outColors[ci + 8] = r;
    //     outColors[ci + 9] = g;
    //     outColors[ci + 10] = b;
    //     outColors[ci + 11] = a;
    //     outColors[ci + 12] = r;
    //     outColors[ci + 13] = g;
    //     outColors[ci + 14] = b;
    //     outColors[ci + 15] = a;
    //
    //     outThickness[ti] = thickness;
    //     outThickness[ti + 1] = thickness;
    //     outThickness[ti + 2] = thickness;
    //     outThickness[ti + 3] = thickness;
    //
    //     const tcBase = outTexCoords.length - 16;
    //     const atlas = this._getAtlasTexCoordsForSegment(path3v.length - 1);
    //     if (atlas && atlas.length >= 10) {
    //         const minY = atlas[1], imgHeight = atlas[3] - minY;
    //         const tc = [atlas[4], atlas[5], minY, imgHeight, atlas[2], atlas[3], minY, imgHeight, atlas[8], atlas[9], minY, imgHeight, atlas[0], atlas[1], minY, imgHeight];
    //         for (let k = 0; k < 16; k++) outTexCoords[tcBase + k] = tc[k];
    //     } else {
    //         for (let k = 0; k < 16; k++) outTexCoords[tcBase + k] = 0;
    //     }
    //
    //     outIndexes[ii] = index++;
    //     outIndexes[ii + 1] = index++;
    //     outIndexes[ii + 2] = index++;
    //     outIndexes[ii + 3] = index++;
    //
    //     //
    //     // Close path
    //     //
    //     var first;
    //     if (isClosed) {
    //         first = path[0] as Vec3;
    //         outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
    //     } else {
    //         let p0 = path[path.length - 1] as Vec3,
    //             p1 = path[path.length - 2] as Vec3 || p0;
    //
    //         first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
    //         outIndexes.push(index - 1, index - 1, index - 1, index - 1);
    //     }
    //
    //     this.__doubleToTwoFloats(first, v_high, v_low);
    //     outVerticesHigh.push(
    //         v_high.x, v_high.y, v_high.z,
    //         v_high.x, v_high.y, v_high.z,
    //         v_high.x, v_high.y, v_high.z,
    //         v_high.x, v_high.y, v_high.z
    //     );
    //     outVerticesLow.push(
    //         v_low.x, v_low.y, v_low.z,
    //         v_low.x, v_low.y, v_low.z,
    //         v_low.x, v_low.y, v_low.z,
    //         v_low.x, v_low.y, v_low.z
    //     );
    //
    //     outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
    //     outThickness.push(thickness, thickness, thickness, thickness);
    //
    //     const lastAtlas = this._getAtlasTexCoordsForSegment(path3v.length - 1);
    //     if (lastAtlas && lastAtlas.length >= 10) {
    //         const minY = lastAtlas[1], imgHeight = lastAtlas[3] - minY;
    //         outTexCoords.push(lastAtlas[4], lastAtlas[5], minY, imgHeight, lastAtlas[2], lastAtlas[3], minY, imgHeight, lastAtlas[8], lastAtlas[9], minY, imgHeight, lastAtlas[0], lastAtlas[1], minY, imgHeight);
    //     } else {
    //         outTexCoords.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    //     }
    //
    //     outOrders.push(1, -1, 2, -2);
    //
    //     // Keep picking colors synchronized with path vertices using pathPickingColors.
    //     outPickingColors.length = 0;
    //     for (let si = 0, slen = path3v.length; si < slen; si++) {
    //         const seg = path3v[si];
    //         if (!seg || seg.length === 0) continue;
    //
    //         const segPickingColors = pickingPathColors[si];
    //         let p: any = (segPickingColors && segPickingColors[0]) ? segPickingColors[0] : (this._pickingColor as any);
    //         let pr = p[R], pg = p[G], pb = p[B];
    //
    //         if (si > 0) {
    //             outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
    //         }
    //
    //         for (let pi = 0, plen = seg.length; pi < plen; pi++) {
    //             if (segPickingColors && segPickingColors[pi]) {
    //                 p = segPickingColors[pi];
    //                 pr = p[R];
    //                 pg = p[G];
    //                 pb = p[B];
    //             }
    //             outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
    //         }
    //
    //         if (segPickingColors && segPickingColors[seg.length - 1]) {
    //             p = segPickingColors[seg.length - 1];
    //             pr = p[R];
    //             pg = p[G];
    //             pb = p[B];
    //         }
    //         outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
    //     }
    // }

    /**

     [1, -1, 2, -2] - orders for triangle strip line segment
     t2        t3
     (2)-------(-2)
     |          |
     |          |
     |          |
     |          |
     (1)-------(-1)
     t0        t1
     */
    static setPathTexCoords(
        path3v: SegmentPath3vExt[],
        tCoordArrOrArrs: number[] | (number[] | null)[],
        outTexCoords: number[]
    ) {
        const isPerSegment = tCoordArrOrArrs.length > 0 && typeof tCoordArrOrArrs[0] !== "number";
        const tArr = tCoordArrOrArrs as (number[] | null)[];

        const ZEROS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const pushTc = (tc: number[] | null) => {
            if (tc && tc.length >= 10) {
                const minY = tc[1], imgHeight = tc[3] - minY;
                const t0x = tc[4], t0y = tc[5], t1x = tc[2], t1y = tc[3];
                const t2x = tc[8], t2y = tc[9], t3x = tc[0], t3y = tc[1];
                outTexCoords.push(t0x, t0y, minY, imgHeight, t1x, t1y, minY, imgHeight, t2x, t2y, minY, imgHeight, t3x, t3y, minY, imgHeight);
            } else {
                outTexCoords.push(...ZEROS);
            }
        };

        for (let j = 0, len = path3v.length; j < len; j++) {
            const path = path3v[j];
            if (path.length === 0) continue;

            const tc = isPerSegment ? (tArr[j] !== undefined ? tArr[j] : (tArr[0] ?? null)) : (tCoordArrOrArrs as number[]);
            if (j > 0) pushTc(tc);

            for (let i = 0; i < path.length; i++) pushTc(tc);
            pushTc(tc);
        }
    }

    static setPathColors(
        pathLonLat: SegmentPathLonLatExt[],
        pathColors: SegmentPathColor[],
        defaultColor: NumberArray4,
        outColors: number[]
    ) {
        for (let j = 0, len = pathLonLat.length; j < len; j++) {
            var path = pathLonLat[j],
                pathColors_j = pathColors[j];

            if (path.length === 0) {
                continue;
            }

            let color = defaultColor;
            if (pathColors_j && pathColors_j[0]) {
                color = pathColors_j[0];
            }

            let r = color[R],
                g = color[G],
                b = color[B],
                a = color[A] != undefined ? color[A] : 1.0;

            if (j > 0) {
                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            }

            for (let i = 0, len = path.length; i < len; i++) {

                if (pathColors_j && pathColors_j[i]) {
                    color = pathColors_j[i];
                }

                r = color[R];
                g = color[G];
                b = color[B];
                a = color[A] != undefined ? color[A] : 1.0;

                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            }

            if (pathColors_j && pathColors_j[path.length - 1]) {
                color = pathColors_j[path.length - 1];
            }

            r = color[R];
            g = color[G];
            b = color[B];
            a = color[A] != undefined ? color[A] : 1.0;

            outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
        }
    }

    /**
     * Appends to the line array new geodetic coordinates line data.
     * @static
     */
    protected __appendLineDataLonLat(
        pathLonLat: SegmentPathLonLatExt[],
        pathColors: SegmentPathColor[],
        pathPickingColors: NumberArray3[][],
        defaultColor: NumberArray4,
        isClosed: boolean,
        outVerticesHigh: number[],
        outVerticesLow: number[],
        outOrders: number[],
        outIndexes: number[],
        outTexCoords: number[],
        ellipsoid: Ellipsoid,
        outTransformedPathCartesian: SegmentPath3vExt[],
        outPathLonLat: SegmentPathLonLatExt[],
        outTransformedPathMerc: LonLat[][],
        outExtent: Extent,
        outColors: number[],
        outThickness: number[],
        outPickingColors: number[]
    ) {
        var index = 0;

        var v_high = new Vec3(),
            v_low = new Vec3();

        if (outExtent) {
            outExtent.southWest.set(180.0, 90.0);
            outExtent.northEast.set(-180.0, -90.0);
        }

        if (outIndexes.length > 0) {
            index = outIndexes[outIndexes.length - 5] + 9;
            outIndexes.push(index);
        } else {
            outIndexes.push(0);
        }

        for (let j = 0, len = pathLonLat.length; j < len; j++) {
            var path = pathLonLat[j],
                pathColors_j = pathColors[j];

            outTransformedPathCartesian[j] = [];
            outTransformedPathMerc[j] = [];
            outPathLonLat[j] = [];

            if (path.length === 0) {
                continue;
            }

            var startIndex = index;

            var last;

            if (isClosed) {
                let pp = path[path.length - 1];
                if (pp instanceof Array) {
                    last = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    last = ellipsoid.lonLatToCartesian(pp as LonLat);
                }
            } else {
                let p0, p1;
                let pp = path[0];
                if (pp instanceof Array) {
                    p0 = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    p0 = ellipsoid.lonLatToCartesian(pp as LonLat);
                }

                pp = path[1];

                if (!pp) {
                    pp = path[0];
                }

                if (pp instanceof Array) {
                    p1 = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    p1 = ellipsoid.lonLatToCartesian(pp as LonLat);
                }

                last = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            let color = defaultColor;

            if (pathColors_j && pathColors_j[0]) {
                color = pathColors_j[0];
            }

            this.__doubleToTwoFloats(last, v_high, v_low);
            outVerticesHigh.push(
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z
            );
            outVerticesLow.push(
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z
            );

            let r = color[R],
                g = color[G],
                b = color[B],
                a = color[A] != undefined ? color[A] : 1.0;

            let thickness = this._segmentThickness[j];
            if (thickness == undefined) {
                thickness = this._thickness;
                this._segmentThickness[j] = thickness;
            }

            if (j > 0) {
                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
                outThickness.push(thickness, thickness, thickness, thickness);
            }

            outOrders.push(1, -1, 2, -2);
            outTexCoords.push(0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0);

            for (let i = 0, len = path.length; i < len; i++) {
                var cur = path[i];

                if (cur instanceof Array) {
                    cur = new LonLat(cur[0], cur[1], cur[2]);
                }

                if (pathColors_j && pathColors_j[i]) {
                    color = pathColors_j[i];
                }

                r = color[R];
                g = color[G];
                b = color[B];
                a = color[A] != undefined ? color[A] : 1.0;

                var cartesian = ellipsoid.lonLatToCartesian(cur as LonLat);
                outTransformedPathCartesian[j].push(cartesian);
                outPathLonLat[j].push(cur as LonLat);
                outTransformedPathMerc[j].push((cur as LonLat).forwardMercator());

                this.__doubleToTwoFloats(cartesian, v_high, v_low);
                outVerticesHigh.push(
                    v_high.x, v_high.y, v_high.z,
                    v_high.x, v_high.y, v_high.z,
                    v_high.x, v_high.y, v_high.z,
                    v_high.x, v_high.y, v_high.z
                );
                outVerticesLow.push(
                    v_low.x, v_low.y, v_low.z,
                    v_low.x, v_low.y, v_low.z,
                    v_low.x, v_low.y, v_low.z,
                    v_low.x, v_low.y, v_low.z
                );

                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
                outThickness.push(thickness, thickness, thickness, thickness);

                outOrders.push(1, -1, 2, -2);
                outIndexes.push(index++, index++, index++, index++);
                outTexCoords.push(0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0);

                if ((cur as LonLat).lon < outExtent.southWest.lon) {
                    outExtent.southWest.lon = (cur as LonLat).lon;
                }
                if ((cur as LonLat).lat < outExtent.southWest.lat) {
                    outExtent.southWest.lat = (cur as LonLat).lat;
                }
                if ((cur as LonLat).lon > outExtent.northEast.lon) {
                    outExtent.northEast.lon = (cur as LonLat).lon;
                }
                if ((cur as LonLat).lat > outExtent.northEast.lat) {
                    outExtent.northEast.lat = (cur as LonLat).lat;
                }
            }

            var first;
            if (isClosed) {
                let pp = path[0];
                if (pp instanceof Array) {
                    first = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    first = ellipsoid.lonLatToCartesian(pp as LonLat);
                }
                outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
            } else {
                let p0, p1;
                let pp = path[path.length - 1];
                if (pp instanceof Array) {
                    p0 = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    p0 = ellipsoid.lonLatToCartesian(pp as LonLat);
                }

                pp = path[path.length - 2];

                if (!pp) {
                    pp = path[0];
                }

                if (pp instanceof Array) {
                    p1 = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    p1 = ellipsoid.lonLatToCartesian(pp as LonLat);
                }
                first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
                outIndexes.push(index - 1, index - 1, index - 1, index - 1);
            }

            if (pathColors_j && pathColors_j[path.length - 1]) {
                color = pathColors_j[path.length - 1];
            }

            r = color[R];
            g = color[G];
            b = color[B];
            a = color[A] != undefined ? color[A] : 1.0;

            this.__doubleToTwoFloats(first, v_high, v_low);
            outVerticesHigh.push(
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z,
                v_high.x, v_high.y, v_high.z
            );
            outVerticesLow.push(
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z,
                v_low.x, v_low.y, v_low.z
            );

            outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            outThickness.push(thickness, thickness, thickness, thickness);

            outOrders.push(1, -1, 2, -2);
            outTexCoords.push(0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0);

            if (j < pathLonLat.length - 1 && pathLonLat[j + 1].length !== 0) {
                index += 8;
                outIndexes.push(index, index);
            }
        }
    }

    /**
     * Sets polyline path with cartesian coordinates.
     * @protected
     * @param {SegmentPath3vExt[]} path3v - Cartesian coordinates.
     */
    protected _setEqualPath3v(path3v: SegmentPath3vExt[]) {

        var extent = this._extent;
        extent.southWest.set(180, 90);
        extent.northEast.set(-180, -90);

        var v_high = new Vec3(),
            v_low = new Vec3();

        var vh = this._verticesHigh,
            vl = this._verticesLow,
            l = this._pathLonLat,
            m = this._pathLonLatMerc,
            k = 0;

        var ellipsoid = (this._renderNode as Planet).ellipsoid;

        for (let j = 0; j < path3v.length; j++) {
            var path = path3v[j] as Vec3[];

            var last;
            if (this._closedLine) {
                last = path[path.length - 1];
            } else {
                last = new Vec3(
                    path[0].x + path[0].x - path[1].x,
                    path[0].y + path[0].y - path[1].y,
                    path[0].z + path[0].z - path[1].z
                );
            }

            this.__doubleToTwoFloats(last, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;

            for (let i = 0; i < path.length; i++) {
                var cur = path[i] as Vec3,
                    pji = this._path3v[j][i] as Vec3;

                pji.x = cur.x;
                pji.y = cur.y;
                pji.z = cur.z;

                if (ellipsoid) {
                    var lonLat = ellipsoid.cartesianToLonLat(cur);

                    this._pathLonLat[j][i] = lonLat;

                    l[j][i] = lonLat;
                    m[j][i] = lonLat.forwardMercator();

                    if (lonLat.lon < extent.southWest.lon) {
                        extent.southWest.lon = lonLat.lon;
                    }
                    if (lonLat.lat < extent.southWest.lat) {
                        extent.southWest.lat = lonLat.lat;
                    }
                    if (lonLat.lon > extent.northEast.lon) {
                        extent.northEast.lon = lonLat.lon;
                    }
                    if (lonLat.lat > extent.northEast.lat) {
                        extent.northEast.lat = lonLat.lat;
                    }
                }

                this.__doubleToTwoFloats(cur, v_high, v_low);

                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
            }

            var first;
            if (this._closedLine) {
                first = path[0];
            } else {
                var l1 = path.length - 1;
                first = new Vec3(
                    path[l1].x + path[l1].x - path[l1 - 1].x,
                    path[l1].y + path[l1].y - path[l1 - 1].y,
                    path[l1].z + path[l1].z - path[l1 - 1].z
                );
            }

            this.__doubleToTwoFloats(first as Vec3, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
        }
    }

    /**
     * Sets one polyline segment with cartesian coordinates.
     * @protected
     * @param {SegmentPath3vExt} path3v - Cartesian coordinates for one segment.
     * @param {number} segmentIndex - Segment index to update.
     */
    protected _setSegmentEqualPath3v(path3v: SegmentPath3vExt, segmentIndex: number) {
        const path = path3v as Vec3[];
        const targetPath = this._path3v[segmentIndex] as Vec3[];
        if (!path || !targetPath || !path.length || path.length !== targetPath.length) return;

        const v_high = new Vec3();
        const v_low = new Vec3();
        const vh = this._verticesHigh;
        const vl = this._verticesLow;
        const l = this._pathLonLat;
        const m = this._pathLonLatMerc;
        const ellipsoid = (this._renderNode as Planet).ellipsoid;
        const k0 = this._pathLengths[segmentIndex] * 12 + 24 * segmentIndex;
        let k = k0;

        const last = this._closedLine
            ? path[path.length - 1]
            : new Vec3(
                path[0].x + path[0].x - path[1].x,
                path[0].y + path[0].y - path[1].y,
                path[0].z + path[0].z - path[1].z
            );

        this.__doubleToTwoFloats(last, v_high, v_low);

        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;

        for (let i = 0; i < targetPath.length; i++) {
            const cur = path[i];
            const p = targetPath[i];
            p.x = cur.x;
            p.y = cur.y;
            p.z = cur.z;

            if (ellipsoid) {
                const lonLat = ellipsoid.cartesianToLonLat(cur);
                l[segmentIndex][i] = lonLat;
                m[segmentIndex][i] = lonLat.forwardMercator();
            }

            this.__doubleToTwoFloats(cur, v_high, v_low);
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
        }

        const first = this._closedLine
            ? path[0]
            : new Vec3(
                path[path.length - 1].x + path[path.length - 1].x - path[path.length - 2].x,
                path[path.length - 1].y + path[path.length - 1].y - path[path.length - 2].y,
                path[path.length - 1].z + path[path.length - 1].z - path[path.length - 2].z
            );
        this.__doubleToTwoFloats(first, v_high, v_low);
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
    }

    /**
     * Sets polyline with geodetic coordinates.
     * @protected
     * @param {SegmentPathLonLat[]} pathLonLat - Geodetic polyline path coordinates.
     */
    protected _setEqualPathLonLat(pathLonLat: SegmentPathLonLat[]) {
        var extent = this._extent;
        extent.southWest.set(180.0, 90.0);
        extent.northEast.set(-180.0, -90.0);

        var v_high = new Vec3(),
            v_low = new Vec3();

        var vh = this._verticesHigh,
            vl = this._verticesLow,
            l = this._pathLonLat,
            m = this._pathLonLatMerc,
            c = this._path3v,
            k = 0;

        var ellipsoid = (this._renderNode as Planet).ellipsoid;

        for (let j = 0; j < pathLonLat.length; j++) {
            var path = pathLonLat[j] as LonLat[];

            var last;
            if (this._closedLine) {
                last = ellipsoid.lonLatToCartesian(path[path.length - 1]);
            } else {
                let p0 = ellipsoid.lonLatToCartesian(path[0]),
                    p1 = ellipsoid.lonLatToCartesian(path[1]);
                last = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            this.__doubleToTwoFloats(last, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;

            for (let i = 0; i < path.length; i++) {
                var cur = path[i] as LonLat;
                var cartesian = ellipsoid.lonLatToCartesian(cur);
                c[j][i] = cartesian;
                m[j][i] = cur.forwardMercator();
                l[j][i] = cur;

                this.__doubleToTwoFloats(cartesian, v_high, v_low);

                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;

                if (cur.lon < extent.southWest.lon) {
                    extent.southWest.lon = cur.lon;
                }
                if (cur.lat < extent.southWest.lat) {
                    extent.southWest.lat = cur.lat;
                }
                if (cur.lon > extent.northEast.lon) {
                    extent.northEast.lon = cur.lon;
                }
                if (cur.lat > extent.northEast.lat) {
                    extent.northEast.lat = cur.lat;
                }
            }

            var first;
            if (this._closedLine) {
                first = ellipsoid.lonLatToCartesian(path[0]);
            } else {
                let p0 = ellipsoid.lonLatToCartesian(path[path.length - 1]),
                    p1 = ellipsoid.lonLatToCartesian(path[path.length - 2]);
                first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            this.__doubleToTwoFloats(first, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
        }
    }

    /**
     * Sets one polyline segment with geodetic coordinates.
     * @protected
     * @param {SegmentPathLonLatExt} pathLonLat - Geodetic coordinates for one segment.
     * @param {number} segmentIndex - Segment index to update.
     */
    protected _setSegmentEqualLonLat(pathLonLat: SegmentPathLonLatExt, segmentIndex: number) {
        const path = pathLonLat as SegmentPathLonLat;
        const targetPathLonLat = this._pathLonLat[segmentIndex] as SegmentPathLonLat;
        const targetPath3v = this._path3v[segmentIndex] as SegmentPath3v;
        if (!path || !targetPathLonLat || !targetPath3v || !path.length || path.length !== targetPathLonLat.length || path.length !== targetPath3v.length) return;

        const ellipsoid = (this._renderNode as Planet).ellipsoid;
        const v_high = new Vec3();
        const v_low = new Vec3();
        const vh = this._verticesHigh;
        const vl = this._verticesLow;
        const l = this._pathLonLat;
        const m = this._pathLonLatMerc;
        const c = this._path3v;
        const k0 = this._pathLengths[segmentIndex] * 12 + 24 * segmentIndex;
        let k = k0;

        const p0 = ellipsoid.lonLatToCartesian(path[0]);
        const p1 = ellipsoid.lonLatToCartesian(path[1] || path[0]);
        const last = this._closedLine
            ? ellipsoid.lonLatToCartesian(path[path.length - 1])
            : new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);

        this.__doubleToTwoFloats(last, v_high, v_low);
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;

        for (let i = 0; i < path.length; i++) {
            const cur = path[i] as LonLat;
            const cartesian = ellipsoid.lonLatToCartesian(cur);

            l[segmentIndex][i] = cur;
            m[segmentIndex][i] = cur.forwardMercator();
            c[segmentIndex][i] = cartesian;

            this.__doubleToTwoFloats(cartesian, v_high, v_low);
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
        }

        const lp0 = ellipsoid.lonLatToCartesian(path[path.length - 1]);
        const lp1 = ellipsoid.lonLatToCartesian(path[path.length - 2] || path[path.length - 1]);
        const first = this._closedLine
            ? ellipsoid.lonLatToCartesian(path[0])
            : new Vec3(lp0.x + lp0.x - lp1.x, lp0.y + lp0.y - lp1.y, lp0.z + lp0.z - lp1.z);

        this.__doubleToTwoFloats(first, v_high, v_low);
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
    }

    public setPointLonLat(lonlat: LonLat, index: number, segmentIndex: number) {
        if (this._renderNode && (this._renderNode as Planet).ellipsoid) {
            let l = this._pathLonLat,
                m = this._pathLonLatMerc;

            l[segmentIndex][index] = lonlat;
            m[segmentIndex][index] = lonlat.forwardMercator();

            //
            // Apply new extent(TODO: think about optimization)
            //
            var extent = this._extent;
            extent.southWest.set(180.0, 90.0);
            extent.northEast.set(-180.0, -90.0);
            for (let i = 0; i < l.length; i++) {
                var pi = l[i] as LonLat[];
                for (let j = 0; j < pi.length; j++) {
                    var lon = pi[j].lon,
                        lat = pi[j].lat;
                    if (lon > extent.northEast.lon) {
                        extent.northEast.lon = lon;
                    }
                    if (lat > extent.northEast.lat) {
                        extent.northEast.lat = lat;
                    }
                    if (lon < extent.southWest.lon) {
                        extent.southWest.lon = lon;
                    }
                    if (lat < extent.southWest.lat) {
                        extent.southWest.lat = lat;
                    }
                }
            }

            this.setPoint3v(
                (this._renderNode as Planet).ellipsoid.lonLatToCartesian(lonlat),
                index,
                segmentIndex,
                true
            );
        } else {
            let path = this._pathLonLat[segmentIndex] as LonLat[];
            path[index].lon = lonlat.lon;
            path[index].lat = lonlat.lat;
            path[index].height = lonlat.height;
        }
    }

    /**
     * Changes cartesian point coordinates of the path
     * @param {Vec3} coordinates - New coordinates
     * @param {number} [index=0] - Path segment index
     * @param {number} [segmentIndex=0] - Index of the point in the path segment
     * @param {boolean} [skipLonLat=false] - Do not update geodetic coordinates
     */
    public setPoint3v(coordinates: Vec3, index: number = 0, segmentIndex: number = 0, skipLonLat: boolean = false) {

        if (this._renderNode) {
            var v_high = new Vec3(),
                v_low = new Vec3();

            var vh = this._verticesHigh,
                vl = this._verticesLow,
                l = this._pathLonLat,
                m = this._pathLonLatMerc,
                k = 0,
                kk = 0;

            //for (let i = 0; i < segmentIndex; i++) {
            //    kk += this._path3v[i].length * 12 + 24;
            //}
            kk = this._pathLengths[segmentIndex] * 12 + 24 * segmentIndex;

            let path = this._path3v[segmentIndex] as Vec3[];

            path[index].x = coordinates.x;
            path[index].y = coordinates.y;
            path[index].z = coordinates.z;

            let _closedLine = this._closedLine || path.length === 1;

            if (index === 0 || index === 1) {
                var last;
                if (_closedLine) {
                    last = path[path.length - 1];
                } else {
                    last = new Vec3(
                        path[0].x + path[0].x - path[1].x,
                        path[0].y + path[0].y - path[1].y,
                        path[0].z + path[0].z - path[1].z
                    );
                }

                k = kk;

                this.__doubleToTwoFloats(last, v_high, v_low);

                vh[k] = v_high.x;
                vh[k + 1] = v_high.y;
                vh[k + 2] = v_high.z;
                vh[k + 3] = v_high.x;
                vh[k + 4] = v_high.y;
                vh[k + 5] = v_high.z;
                vh[k + 6] = v_high.x;
                vh[k + 7] = v_high.y;
                vh[k + 8] = v_high.z;
                vh[k + 9] = v_high.x;
                vh[k + 10] = v_high.y;
                vh[k + 11] = v_high.z;

                vl[k] = v_low.x;
                vl[k + 1] = v_low.y;
                vl[k + 2] = v_low.z;
                vl[k + 3] = v_low.x;
                vl[k + 4] = v_low.y;
                vl[k + 5] = v_low.z;
                vl[k + 6] = v_low.x;
                vl[k + 7] = v_low.y;
                vl[k + 8] = v_low.z;
                vl[k + 9] = v_low.x;
                vl[k + 10] = v_low.y;
                vl[k + 11] = v_low.z;
            }

            if (!skipLonLat && (this._renderNode as Planet).ellipsoid) {
                var lonLat = (this._renderNode as Planet).ellipsoid.cartesianToLonLat(coordinates);
                l[segmentIndex][index] = lonLat;
                m[segmentIndex][index] = lonLat.forwardMercator();

                //
                // Apply new extent(TODO: think about optimization)
                //
                var extent = this._extent;
                extent.southWest.set(180.0, 90.0);
                extent.northEast.set(-180.0, -90.0);
                for (let i = 0; i < l.length; i++) {
                    var pi = l[i] as LonLat[];
                    for (let j = 0; j < pi.length; j++) {
                        var lon = pi[j].lon,
                            lat = pi[j].lat;
                        if (lon > extent.northEast.lon) {
                            extent.northEast.lon = lon;
                        }
                        if (lat > extent.northEast.lat) {
                            extent.northEast.lat = lat;
                        }
                        if (lon < extent.southWest.lon) {
                            extent.southWest.lon = lon;
                        }
                        if (lat < extent.southWest.lat) {
                            extent.southWest.lat = lat;
                        }
                    }
                }
            }

            k = kk + index * 12 + 12;

            this.__doubleToTwoFloats(coordinates, v_high, v_low);

            vh[k] = v_high.x;
            vh[k + 1] = v_high.y;
            vh[k + 2] = v_high.z;
            vh[k + 3] = v_high.x;
            vh[k + 4] = v_high.y;
            vh[k + 5] = v_high.z;
            vh[k + 6] = v_high.x;
            vh[k + 7] = v_high.y;
            vh[k + 8] = v_high.z;
            vh[k + 9] = v_high.x;
            vh[k + 10] = v_high.y;
            vh[k + 11] = v_high.z;

            vl[k] = v_low.x;
            vl[k + 1] = v_low.y;
            vl[k + 2] = v_low.z;
            vl[k + 3] = v_low.x;
            vl[k + 4] = v_low.y;
            vl[k + 5] = v_low.z;
            vl[k + 6] = v_low.x;
            vl[k + 7] = v_low.y;
            vl[k + 8] = v_low.z;
            vl[k + 9] = v_low.x;
            vl[k + 10] = v_low.y;
            vl[k + 11] = v_low.z;

            if (index === path.length - 1 || index === path.length - 2) {
                var first;
                if (_closedLine) {
                    first = path[0];
                } else {
                    var l1 = path.length - 1;
                    first = new Vec3(
                        path[l1].x + path[l1].x - path[l1 - 1].x,
                        path[l1].y + path[l1].y - path[l1 - 1].y,
                        path[l1].z + path[l1].z - path[l1 - 1].z
                    );
                }

                k = kk + path.length * 12 + 12;

                this.__doubleToTwoFloats(first, v_high, v_low);

                vh[k] = v_high.x;
                vh[k + 1] = v_high.y;
                vh[k + 2] = v_high.z;
                vh[k + 3] = v_high.x;
                vh[k + 4] = v_high.y;
                vh[k + 5] = v_high.z;
                vh[k + 6] = v_high.x;
                vh[k + 7] = v_high.y;
                vh[k + 8] = v_high.z;
                vh[k + 9] = v_high.x;
                vh[k + 10] = v_high.y;
                vh[k + 11] = v_high.z;

                vl[k] = v_low.x;
                vl[k + 1] = v_low.y;
                vl[k + 2] = v_low.z;
                vl[k + 3] = v_low.x;
                vl[k + 4] = v_low.y;
                vl[k + 5] = v_low.z;
                vl[k + 6] = v_low.x;
                vl[k + 7] = v_low.y;
                vl[k + 8] = v_low.z;
                vl[k + 9] = v_low.x;
                vl[k + 10] = v_low.y;
                vl[k + 11] = v_low.z;
            }

            this._changedBuffers[VERTICES_BUFFER] = true;
        } else {
            let path = this._path3v[segmentIndex] as Vec3[];
            path[index].x = coordinates.x;
            path[index].y = coordinates.y;
            path[index].z = coordinates.z;
        }
    }

    protected _resizePathLengths(index: number = 0) {
        this._pathLengths[0] = 0;
        for (let i = index + 1, len = this._path3v.length; i <= len; i++) {
            this._pathLengths[i] = this._pathLengths[i - 1] + this._path3v[i - 1].length;
        }
    }

    protected _rebuildIndexes() {
        const oldIdx = this._indexes as number[];
        const is3vIndexFormat = oldIdx.length > 1 && oldIdx[0] === 0 && oldIdx[1] === 0;

        const newIndexes: number[] = [];
        let index = 0;

        if (is3vIndexFormat) newIndexes.push(0, 0);
        else newIndexes.push(0);

        for (let j = 0; j < this._path3v.length; j++) {
            const seg = this._path3v[j];
            if (!seg || seg.length === 0) continue;

            if (j > 0) {
                if (is3vIndexFormat) newIndexes.push(index, index);
                else newIndexes.push(index);
            }

            const startIndex = index;
            for (let i = 0; i < seg.length; i++) {
                newIndexes.push(index++, index++, index++, index++);
            }

            if (this._closedLine) {
                newIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
            } else {
                newIndexes.push(index - 1, index - 1, index - 1, index - 1);
            }

            if (j < this._path3v.length - 1 && this._path3v[j + 1].length !== 0) {
                index += 8;
                newIndexes.push(index, index);
            }
        }

        this._indexes = newIndexes;
    }

    /**
     * Remove multiline path segment
     * @param {number} index - Segment index in multiline
     */
    public removePath(index: number) {
        if (index < 0 || index >= this._path3v.length) {
            return;
        }

        const removedLen = this._path3v[index].length;

        this._path3v.splice(index, 1);

        if (this._pathColors && index < this._pathColors.length) {
            this._pathColors.splice(index, 1);
        }

        if (this._pathPickingColors && index < this._pathPickingColors.length) {
            this._pathPickingColors.splice(index, 1);
        }

        if (this._segmentThickness && index < this._segmentThickness.length) {
            this._segmentThickness.splice(index, 1);
        }

        if (Array.isArray(this._image) && index < this._image.length) {
            this._image.splice(index, 1);
        }

        if (this._pathLonLat && index < this._pathLonLat.length) {
            this._pathLonLat.splice(index, 1);
        }

        if (this._pathLonLatMerc && index < this._pathLonLatMerc.length) {
            this._pathLonLatMerc.splice(index, 1);
        }

        this._pathLengths.length = this._path3v.length + 1;
        this._resizePathLengths(index > 0 ? index - 1 : 0);

        if (!this._renderNode || removedLen === 0) {
            return;
        }

        this._verticesHigh = makeArrayTyped(this._verticesHigh);
        this._verticesLow = makeArrayTyped(this._verticesLow);
        this._colors = makeArrayTyped(this._colors);
        this._thicknessArr = makeArrayTyped(this._thicknessArr);
        this._texCoordArr = makeArrayTyped(this._texCoordArr);
        this._orders = makeArrayTyped(this._orders);
        this._pickingColors = makeArrayTyped(this._pickingColors);

        const pointsBefore = this._pathLengths[index];

        const vertexGroupStart = pointsBefore + 2 * index;
        const vertexGroupCount = removedLen + 2;
        const v0 = vertexGroupStart * 12;
        const vN = vertexGroupCount * 12;

        this._verticesHigh = spliceTypedArray(this._verticesHigh as TypedArray, v0, vN);
        this._verticesLow = spliceTypedArray(this._verticesLow as TypedArray, v0, vN);

        const o0 = vertexGroupStart * 4;
        const oN = vertexGroupCount * 4;
        this._orders = spliceTypedArray(this._orders as TypedArray, o0, oN);

        const attrGroupStart = pointsBefore + (index === 0 ? 0 : 2 * index - 1);
        const attrGroupCount = removedLen + (index === 0 ? 1 : 2);

        this._colors = spliceTypedArray(this._colors as TypedArray, attrGroupStart * 16, attrGroupCount * 16);
        this._thicknessArr = spliceTypedArray(this._thicknessArr as TypedArray, attrGroupStart * 4, attrGroupCount * 4);
        this._texCoordArr = spliceTypedArray(this._texCoordArr as TypedArray, attrGroupStart * 16, attrGroupCount * 16);
        this._pickingColors = spliceTypedArray(this._pickingColors as TypedArray, attrGroupStart * 12, attrGroupCount * 12);

        if (index === 0 && this._path3v.length > 0) {
            this._colors = spliceTypedArray(this._colors as TypedArray, 0, 16);
            this._thicknessArr = spliceTypedArray(this._thicknessArr as TypedArray, 0, 4);
            this._texCoordArr = spliceTypedArray(this._texCoordArr as TypedArray, 0, 16);
            this._pickingColors = spliceTypedArray(this._pickingColors as TypedArray, 0, 12);
        }

        this._rebuildIndexes();

        this._changedBuffers[VERTICES_BUFFER] = true;
        this._changedBuffers[INDEX_BUFFER] = true;
        this._changedBuffers[COLORS_BUFFER] = true;
        this._changedBuffers[THICKNESS_BUFFER] = true;
        this._changedBuffers[TEXCOORD_BUFFER] = true;
        this._changedBuffers[PICKINGCOLORS_BUFFER] = true;
    }

    public appendPath3v(path3v: SegmentPath3vExt, pathColors?: NumberArray4[]) {
        if (!path3v || path3v.length === 0) return;

        const segIndex = this._path3v.length;
        this._path3v.push(path3v);
        this._pathColors[segIndex] = pathColors && pathColors.length ? pathColors : (this._pathColors[segIndex] || []);
        const segPickingColors = this._pathPickingColors[segIndex] || (this._pathPickingColors[segIndex] = []);
        if (!segPickingColors.length) {
            segPickingColors.push([
                this._pickingColor[R],
                this._pickingColor[G],
                this._pickingColor[B]
            ]);
        }
        this._segmentThickness[segIndex] = this._segmentThickness[segIndex] ?? this._thickness;

        this._pathLengths.length = this._path3v.length + 1;
        this._pathLengths[segIndex + 1] = (this._pathLengths[segIndex] || 0) + path3v.length;

        if (!this._renderNode) return;

        const ellipsoid = (this._renderNode as Planet).ellipsoid;

        this._verticesHigh = makeArray(this._verticesHigh);
        this._verticesLow = makeArray(this._verticesLow);
        this._colors = makeArray(this._colors);
        this._thicknessArr = makeArray(this._thicknessArr);
        this._orders = makeArray(this._orders);
        this._indexes = makeArray(this._indexes);
        this._texCoordArr = makeArray(this._texCoordArr);
        this._pickingColors = makeArray(this._pickingColors);

        this._pathLonLat[segIndex] = [];
        this._pathLonLatMerc[segIndex] = [];
        this._path3v[segIndex] = [];

        const outVH = this._verticesHigh as number[],
            outVL = this._verticesLow as number[],
            outC = this._colors as number[],
            outT = this._thicknessArr as number[],
            outO = this._orders as number[],
            outI = this._indexes as number[],
            outTC = this._texCoordArr as number[],
            outPC = this._pickingColors as number[];

        const segColors = this._pathColors[segIndex];
        let color: any = (segColors && segColors[0]) ? segColors[0] : (this._defaultColor as any);
        let r = color[R], g = color[G], b = color[B], a = color[A] != undefined ? color[A] : 1.0;

        let pickingColor: any = segPickingColors[0] || (this._pickingColor as any);
        let pr = pickingColor[R], pg = pickingColor[G], pb = pickingColor[B];

        let thickness = this._segmentThickness[segIndex];
        if (thickness == undefined) thickness = this._thickness;

        const is3vIndexFormat = outI.length > 1 && outI[0] === 0 && outI[1] === 0;
        let index = 0;
        if (outI.length > 0) {
            index = outI[outI.length - 5] + 9;
            outI.push(index);
            is3vIndexFormat && outI.push(index);
        } else {
            outI.push(0);
            is3vIndexFormat && outI.push(0);
        }
        const startIndex = index;

        const v_high = new Vec3(), v_low = new Vec3();

        const p0 = path3v[0] instanceof Array ? new Vec3((path3v[0] as any)[0], (path3v[0] as any)[1], (path3v[0] as any)[2]) : (path3v[0] as Vec3);
        const p1src = path3v[1] || path3v[0];
        const p1 = p1src instanceof Array ? new Vec3((p1src as any)[0], (p1src as any)[1], (p1src as any)[2]) : (p1src as Vec3);
        const last = this._closedLine
            ? (path3v[path3v.length - 1] instanceof Array
                ? new Vec3((path3v[path3v.length - 1] as any)[0], (path3v[path3v.length - 1] as any)[1], (path3v[path3v.length - 1] as any)[2])
                : (path3v[path3v.length - 1] as Vec3))
            : new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);

        this.__doubleToTwoFloats(last, v_high, v_low);
        outVH.push(v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z);
        outVL.push(v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z);

        if (segIndex > 0) {
            outC.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            outT.push(thickness, thickness, thickness, thickness);
            outPC.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
        }

        const atlas = this._getAtlasTexCoordsForSegment(segIndex);
        const hasAtlas = atlas && atlas.length >= 10;
        let t0x = 0, t0y = 0, t1x = 0, t1y = 0, t2x = 0, t2y = 0, t3x = 0, t3y = 0, minY = 0, imgHeight = 0;
        if (hasAtlas) {
            minY = atlas[1];
            imgHeight = atlas[3] - minY;
            t0x = atlas[4];
            t0y = atlas[5];
            t1x = atlas[2];
            t1y = atlas[3];
            t2x = atlas[8];
            t2y = atlas[9];
            t3x = atlas[0];
            t3y = atlas[1];
            if (segIndex > 0) outTC.push(t0x, t0y, minY, imgHeight, t1x, t1y, minY, imgHeight, t2x, t2y, minY, imgHeight, t3x, t3y, minY, imgHeight);
        } else if (segIndex > 0) {
            outTC.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }

        outO.push(1, -1, 2, -2);

        for (let i = 0; i < path3v.length; i++) {
            let cur: any = path3v[i];
            if (cur instanceof Array) cur = new Vec3(cur[0], cur[1], cur[2]);

            (this._path3v[segIndex] as any).push(cur);

            if (ellipsoid) {
                const lonLat = ellipsoid.cartesianToLonLat(cur);
                this._pathLonLat[segIndex].push(lonLat);
                this._pathLonLatMerc[segIndex].push(lonLat.forwardMercator());

                if (lonLat.lon < this._extent.southWest.lon) this._extent.southWest.lon = lonLat.lon;
                if (lonLat.lat < this._extent.southWest.lat) this._extent.southWest.lat = lonLat.lat;
                if (lonLat.lon > this._extent.northEast.lon) this._extent.northEast.lon = lonLat.lon;
                if (lonLat.lat > this._extent.northEast.lat) this._extent.northEast.lat = lonLat.lat;
            }

            if (segColors && segColors[i]) {
                color = segColors[i];
            }
            r = color[R];
            g = color[G];
            b = color[B];
            a = color[A] != undefined ? color[A] : 1.0;

            if (segPickingColors && segPickingColors[i]) {
                pickingColor = segPickingColors[i];
            }
            pr = pickingColor[R];
            pg = pickingColor[G];
            pb = pickingColor[B];

            this.__doubleToTwoFloats(cur, v_high, v_low);
            outVH.push(v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z);
            outVL.push(v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z);

            outC.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            outT.push(thickness, thickness, thickness, thickness);
            outPC.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);

            if (hasAtlas) outTC.push(t0x, t0y, minY, imgHeight, t1x, t1y, minY, imgHeight, t2x, t2y, minY, imgHeight, t3x, t3y, minY, imgHeight);
            else outTC.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

            outO.push(1, -1, 2, -2);
            outI.push(index++, index++, index++, index++);
        }

        let first: Vec3;
        if (this._closedLine) {
            const f: any = path3v[0];
            first = f instanceof Array ? new Vec3(f[0], f[1], f[2]) : f;
            outI.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
        } else {
            const l0src: any = path3v[path3v.length - 1];
            const l1src: any = path3v[path3v.length - 2] || l0src;
            const l0 = l0src instanceof Array ? new Vec3(l0src[0], l0src[1], l0src[2]) : l0src as Vec3;
            const l1 = l1src instanceof Array ? new Vec3(l1src[0], l1src[1], l1src[2]) : l1src as Vec3;
            first = new Vec3(l0.x + l0.x - l1.x, l0.y + l0.y - l1.y, l0.z + l0.z - l1.z);
            outI.push(index - 1, index - 1, index - 1, index - 1);
        }

        if (segColors && segColors[path3v.length - 1]) {
            color = segColors[path3v.length - 1];
        }
        r = color[R];
        g = color[G];
        b = color[B];
        a = color[A] != undefined ? color[A] : 1.0;

        if (segPickingColors && segPickingColors[path3v.length - 1]) {
            pickingColor = segPickingColors[path3v.length - 1];
        }
        pr = pickingColor[R];
        pg = pickingColor[G];
        pb = pickingColor[B];

        this.__doubleToTwoFloats(first, v_high, v_low);
        outVH.push(v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z);
        outVL.push(v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z);

        outC.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
        outT.push(thickness, thickness, thickness, thickness);
        outPC.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);

        if (hasAtlas) {
            outTC.push(t0x, t0y, minY, imgHeight, t1x, t1y, minY, imgHeight, t2x, t2y, minY, imgHeight, t3x, t3y, minY, imgHeight);
        } else {
            outTC.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }

        outO.push(1, -1, 2, -2);

        this._changedBuffers[VERTICES_BUFFER] = true;
        this._changedBuffers[INDEX_BUFFER] = true;
        this._changedBuffers[COLORS_BUFFER] = true;
        this._changedBuffers[THICKNESS_BUFFER] = true;
        this._changedBuffers[TEXCOORD_BUFFER] = true;
        this._changedBuffers[PICKINGCOLORS_BUFFER] = true;
    }

    public appendPathLonLat(pathLonLat: SegmentPathLonLatExt) {
        if (!pathLonLat || pathLonLat.length === 0) return;

        const segIndex = this._pathLonLat.length;
        this._pathLonLat.push(pathLonLat);
        this._pathColors[segIndex] = this._pathColors[segIndex] || [];
        this._segmentThickness[segIndex] = this._segmentThickness[segIndex] ?? this._thickness;
        this._pathPickingColors[segIndex] = this._pathPickingColors[segIndex] || [];

        this._pathLengths.length = segIndex + 2;
        this._pathLengths[segIndex + 1] = (this._pathLengths[segIndex] || 0) + pathLonLat.length;

        if (!this._renderNode) return;

        const ellipsoid = (this._renderNode as Planet).ellipsoid;
        if (!ellipsoid) return;

        this._verticesHigh = makeArray(this._verticesHigh);
        this._verticesLow = makeArray(this._verticesLow);
        this._colors = makeArray(this._colors);
        this._thicknessArr = makeArray(this._thicknessArr);
        this._orders = makeArray(this._orders);
        this._indexes = makeArray(this._indexes);
        this._texCoordArr = makeArray(this._texCoordArr);
        this._pickingColors = makeArray(this._pickingColors);

        this._path3v[segIndex] = [];
        this._pathLonLatMerc[segIndex] = [];

        const outVH = this._verticesHigh as number[],
            outVL = this._verticesLow as number[],
            outC = this._colors as number[],
            outT = this._thicknessArr as number[],
            outO = this._orders as number[],
            outI = this._indexes as number[],
            outTC = this._texCoordArr as number[],
            outPC = this._pickingColors as number[];

        const segColors = this._pathColors[segIndex];
        let color: any = (segColors && segColors[0]) ? segColors[0] : (this._defaultColor as any);
        let r = color[R], g = color[G], b = color[B], a = color[A] != undefined ? color[A] : 1.0;

        const segPickingColors = this._pathPickingColors[segIndex];
        let pickingColor: any = (segPickingColors && segPickingColors[0]) ? segPickingColors[0] : (this._pickingColor as any);
        let pr = pickingColor[R], pg = pickingColor[G], pb = pickingColor[B];

        let thickness = this._segmentThickness[segIndex];
        if (thickness == undefined) thickness = this._thickness;

        const is3vIndexFormat = outI.length > 1 && outI[0] === 0 && outI[1] === 0;
        let index = 0;
        if (outI.length > 0) {
            index = outI[outI.length - 5] + 9;
            outI.push(index);
            is3vIndexFormat && outI.push(index);
        } else {
            outI.push(0);
            is3vIndexFormat && outI.push(0);
        }
        const startIndex = index;

        const v_high = new Vec3(), v_low = new Vec3();

        const ll0src: any = pathLonLat[0];
        const ll1src: any = pathLonLat[1] || ll0src;
        const ll0 = ll0src instanceof Array ? new LonLat(ll0src[0], ll0src[1], ll0src[2]) : ll0src as LonLat;
        const ll1 = ll1src instanceof Array ? new LonLat(ll1src[0], ll1src[1], ll1src[2]) : ll1src as LonLat;

        const last = this._closedLine
            ? (pathLonLat[pathLonLat.length - 1] instanceof Array
                ? ellipsoid.lonLatToCartesian(new LonLat((pathLonLat[pathLonLat.length - 1] as any)[0], (pathLonLat[pathLonLat.length - 1] as any)[1], (pathLonLat[pathLonLat.length - 1] as any)[2]))
                : ellipsoid.lonLatToCartesian(pathLonLat[pathLonLat.length - 1] as LonLat))
            : new Vec3(
                ...(() => {
                    const p0 = ellipsoid.lonLatToCartesian(ll0);
                    const p1 = ellipsoid.lonLatToCartesian(ll1);
                    return [p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z] as any;
                })()
            );

        this.__doubleToTwoFloats(last, v_high, v_low);
        outVH.push(v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z);
        outVL.push(v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z);

        if (segIndex > 0) {
            outC.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            outT.push(thickness, thickness, thickness, thickness);
            outPC.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
        }

        const atlas = this._getAtlasTexCoordsForSegment(segIndex);
        const hasAtlas = atlas && atlas.length >= 10;
        let t0x = 0, t0y = 0, t1x = 0, t1y = 0, t2x = 0, t2y = 0, t3x = 0, t3y = 0, minY = 0, imgHeight = 0;
        if (hasAtlas) {
            minY = atlas[1];
            imgHeight = atlas[3] - minY;
            t0x = atlas[4];
            t0y = atlas[5];
            t1x = atlas[2];
            t1y = atlas[3];
            t2x = atlas[8];
            t2y = atlas[9];
            t3x = atlas[0];
            t3y = atlas[1];
            if (segIndex > 0) outTC.push(t0x, t0y, minY, imgHeight, t1x, t1y, minY, imgHeight, t2x, t2y, minY, imgHeight, t3x, t3y, minY, imgHeight);
        } else if (segIndex > 0) {
            outTC.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }

        outO.push(1, -1, 2, -2);

        for (let i = 0; i < pathLonLat.length; i++) {
            let ll: any = pathLonLat[i];
            if (ll instanceof Array) ll = new LonLat(ll[0], ll[1], ll[2]);

            const cart = ellipsoid.lonLatToCartesian(ll);
            (this._path3v[segIndex] as any).push(cart);
            this._pathLonLatMerc[segIndex].push((ll as LonLat).forwardMercator());

            if (ll.lon < this._extent.southWest.lon) this._extent.southWest.lon = ll.lon;
            if (ll.lat < this._extent.southWest.lat) this._extent.southWest.lat = ll.lat;
            if (ll.lon > this._extent.northEast.lon) this._extent.northEast.lon = ll.lon;
            if (ll.lat > this._extent.northEast.lat) this._extent.northEast.lat = ll.lat;

            if (segColors && segColors[i]) {
                color = segColors[i];
            }
            r = color[R];
            g = color[G];
            b = color[B];
            a = color[A] != undefined ? color[A] : 1.0;

            if (segPickingColors && segPickingColors[i]) {
                pickingColor = segPickingColors[i];
            }
            pr = pickingColor[R];
            pg = pickingColor[G];
            pb = pickingColor[B];

            this.__doubleToTwoFloats(cart, v_high, v_low);
            outVH.push(v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z);
            outVL.push(v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z);

            outC.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            outT.push(thickness, thickness, thickness, thickness);
            outPC.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);

            if (hasAtlas) {
                outTC.push(t0x, t0y, minY, imgHeight, t1x, t1y, minY, imgHeight, t2x, t2y, minY, imgHeight, t3x, t3y, minY, imgHeight);
            } else {
                outTC.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
            }

            outO.push(1, -1, 2, -2);
            outI.push(index++, index++, index++, index++);
        }

        let first: Vec3;
        if (this._closedLine) {
            const f: any = pathLonLat[0];
            const ll = f instanceof Array ? new LonLat(f[0], f[1], f[2]) : f;
            first = ellipsoid.lonLatToCartesian(ll);
            outI.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
        } else {
            const l0s: any = pathLonLat[pathLonLat.length - 1];
            const l1s: any = pathLonLat[pathLonLat.length - 2] || l0s;
            const l0 = l0s instanceof Array ? new LonLat(l0s[0], l0s[1], l0s[2]) : l0s as LonLat;
            const l1 = l1s instanceof Array ? new LonLat(l1s[0], l1s[1], l1s[2]) : l1s as LonLat;
            const p0 = ellipsoid.lonLatToCartesian(l0);
            const p1 = ellipsoid.lonLatToCartesian(l1);
            first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            outI.push(index - 1, index - 1, index - 1, index - 1);
        }

        if (segColors && segColors[pathLonLat.length - 1]) {
            color = segColors[pathLonLat.length - 1];
        }
        r = color[R];
        g = color[G];
        b = color[B];
        a = color[A] != undefined ? color[A] : 1.0;

        if (segPickingColors && segPickingColors[pathLonLat.length - 1]) {
            pickingColor = segPickingColors[pathLonLat.length - 1];
        }
        pr = pickingColor[R];
        pg = pickingColor[G];
        pb = pickingColor[B];

        this.__doubleToTwoFloats(first, v_high, v_low);
        outVH.push(v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z);
        outVL.push(v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z);

        outC.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
        outT.push(thickness, thickness, thickness, thickness);
        outPC.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);

        if (hasAtlas) {
            outTC.push(t0x, t0y, minY, imgHeight, t1x, t1y, minY, imgHeight, t2x, t2y, minY, imgHeight, t3x, t3y, minY, imgHeight);
        } else {
            outTC.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }

        outO.push(1, -1, 2, -2);

        this._changedBuffers[VERTICES_BUFFER] = true;
        this._changedBuffers[INDEX_BUFFER] = true;
        this._changedBuffers[COLORS_BUFFER] = true;
        this._changedBuffers[THICKNESS_BUFFER] = true;
        this._changedBuffers[TEXCOORD_BUFFER] = true;
        this._changedBuffers[PICKINGCOLORS_BUFFER] = true;
    }

    /**
     * Remove point from the path
     * @param {number} index - Point index in a path segment
     * @param {number} [segmentIndex=0] - Segment path index
     */
    public removePoint(index: number, segmentIndex: number = 0) {
        if (!Number.isInteger(segmentIndex) || segmentIndex < 0) {
            return;
        }

        const segment = this._path3v[segmentIndex];
        if (!segment || !Number.isInteger(index) || index < 0 || index >= segment.length) {
            return;
        }

        segment.splice(index, 1);

        if (segment.length === 0) {
            this._path3v.splice(segmentIndex, 1);
            if (segmentIndex < this._pathPickingColors.length) {
                this._pathPickingColors.splice(segmentIndex, 1);
            }
        }
        this.setPath3v(([] as SegmentPath3vExt[]).concat(this._path3v));
    }

    /**
     * Insert point coordinates in a path segment
     * @param {Vec3} point3v - Point coordinates
     * @param {number} [index=0] - Index in the path
     * @param {NumberArray4} [color] - Point color
     * @param {number} [segmentIndex=0] - Path segment index
     */
    public insertPoint3v(point3v: Vec3, index: number = 0, color?: NumberArray4, segmentIndex: number = 0) {
        let p = ([] as SegmentPath3vExt[]).concat(this._path3v),
            pp = p[segmentIndex];
        if (pp) {
            let c = ([] as SegmentPathColor[]).concat(this._pathColors);

            pp.splice(index, 0, point3v);

            if (color) {
                let cc = c[segmentIndex];
                if (!cc) {
                    cc = new Array(pp.length);
                }
                cc.splice(index, 0, color);
            }

            this.setPath3v(p, c);
        } else {
            this.addPoint3v(point3v, segmentIndex);
        }
    }

    // /**
    //  * Adds a new cartesian point in the end of the path in a last line segment.
    //  * @public
    //  * @param {Vec3} point3v - New coordinates.
    //  * @param {NumberArray4} [color] -
    //  * @param {boolean} [skipEllipsoid] -
    //  */
    // public appendPoint3v(point3v: Vec3, color?: NumberArray4, skipEllipsoid?: boolean) {
    //     if (this._path3v.length === 0 || !this._renderNode) {
    //         this._pathColors.push([color || this._defaultColor as NumberArray4]);
    //         this.addPoint3v(point3v);
    //     } else {
    //         //
    //         // Making typedArrays suitable for appendPoint function
    //         //
    //         this._verticesHigh = makeArray(this._verticesHigh);
    //         this._verticesLow = makeArray(this._verticesLow);
    //         this._colors = makeArray(this._colors);
    //         this._thicknessArr = makeArray(this._thicknessArr);
    //         this._orders = makeArray(this._orders);
    //         this._indexes = makeArray(this._indexes);
    //         this._texCoordArr = makeArray(this._texCoordArr);
    //         this._pickingColors = makeArray(this._pickingColors);
    //
    //         this.__appendPoint3v(
    //             this._path3v,
    //             point3v,
    //             this._pathColors,
    //             this._pathPickingColors,
    //             color || this._defaultColor as NumberArray4,
    //             this._closedLine,
    //             this._verticesHigh,
    //             this._verticesLow,
    //             this._colors,
    //             this._thicknessArr,
    //             this._orders,
    //             this._indexes,
    //             !skipEllipsoid ? (this._renderNode as Planet).ellipsoid : null,
    //             this._pathLonLat,
    //             this._pathLonLatMerc,
    //             this._extent,
    //             this._texCoordArr,
    //             this._pickingColors
    //         );
    //
    //         // Keep picking attribute buffer strictly aligned with vertex groups.
    //         this._rebuildPickingColorsFromPath();
    //
    //         this._pathLengths[this._path3v.length] += 1;
    //
    //         this._changedBuffers[VERTICES_BUFFER] = true;
    //         this._changedBuffers[COLORS_BUFFER] = true;
    //         this._changedBuffers[INDEX_BUFFER] = true;
    //         this._changedBuffers[THICKNESS_BUFFER] = true;
    //         this._changedBuffers[TEXCOORD_BUFFER] = true;
    //         this._changedBuffers[PICKINGCOLORS_BUFFER] = true;
    //     }
    // }

    /**
     * Append new point in the end of the path.
     * @public
     * @param {Vec3} point3v - New point coordinates.
     * @param {number} [segmentIndex=0] - Path segment index, first by default.
     * @param {NumberArray4} [color] - Point color
     */
    public addPoint3v(point3v: Vec3, segmentIndex: number = 0, color?: NumberArray4) {
        if (segmentIndex < 0) return;

        if (!this._renderNode) {
            while (segmentIndex >= this._path3v.length) {
                this._path3v.push([]);
            }
            this._path3v[segmentIndex].push(point3v);
            if (!this._pathColors[segmentIndex]) {
                this._pathColors[segmentIndex] = [];
            }
            this._pathColors[segmentIndex].push(color || this._defaultColor as NumberArray4);
            this._segmentThickness[segmentIndex] = this._segmentThickness[segmentIndex] || this._thickness;
            this._pathLengths.length = this._path3v.length + 1;
            this._resizePathLengths(0);
            return;
        }

        if (segmentIndex >= this._path3v.length) {
            this.appendPath3v([point3v], color ? [color] : undefined);
            return;
        }

        const segIndex = segmentIndex;
        const seg = this._path3v[segIndex] as Vec3[];
        const oldLen = seg.length;
        const pointsBefore = this._pathLengths[segIndex];

        seg.push(point3v);

        const segColors = this._pathColors[segIndex] || (this._pathColors[segIndex] = []);
        segColors.push(color || this._defaultColor as NumberArray4);

        const segPickingColors = this._pathPickingColors[segIndex] || (this._pathPickingColors[segIndex] = []);
        segPickingColors.push([
            this._pickingColor[R],
            this._pickingColor[G],
            this._pickingColor[B]
        ]);

        const ellipsoid = (this._renderNode as Planet).ellipsoid;
        if (ellipsoid) {
            const lonLat = ellipsoid.cartesianToLonLat(point3v);
            this._pathLonLat[segIndex] && this._pathLonLat[segIndex].push(lonLat);
            this._pathLonLatMerc[segIndex] && this._pathLonLatMerc[segIndex].push(lonLat.forwardMercator());

            if (lonLat.lon < this._extent.southWest.lon) this._extent.southWest.lon = lonLat.lon;
            if (lonLat.lat < this._extent.southWest.lat) this._extent.southWest.lat = lonLat.lat;
            if (lonLat.lon > this._extent.northEast.lon) this._extent.northEast.lon = lonLat.lon;
            if (lonLat.lat > this._extent.northEast.lat) this._extent.northEast.lat = lonLat.lat;
        }

        // update pathLengths tail (+1 from segIndex+1)
        for (let i = segIndex + 1; i < this._pathLengths.length; i++) {
            this._pathLengths[i] += 1;
        }

        this._verticesHigh = makeArrayTyped(this._verticesHigh);
        this._verticesLow = makeArrayTyped(this._verticesLow);
        this._orders = makeArrayTyped(this._orders);
        this._colors = makeArrayTyped(this._colors);
        this._thicknessArr = makeArrayTyped(this._thicknessArr);
        this._texCoordArr = makeArrayTyped(this._texCoordArr);
        this._pickingColors = makeArrayTyped(this._pickingColors);

        const vertexGroupStart = pointsBefore + 2 * segIndex;
        const oldCapGroup = vertexGroupStart + oldLen + 1;
        const insertGroup = oldCapGroup + 1;

        const v_high = new Vec3(), v_low = new Vec3();

        // overwrite old cap with new point
        this.__doubleToTwoFloats(point3v, v_high, v_low);
        const vh = this._verticesHigh as Float32Array;
        const vl = this._verticesLow as Float32Array;
        const vBase = oldCapGroup * 12;

        for (let k = 0; k < 12; k += 3) {
            vh[vBase + k] = v_high.x;
            vh[vBase + k + 1] = v_high.y;
            vh[vBase + k + 2] = v_high.z;
            vl[vBase + k] = v_low.x;
            vl[vBase + k + 1] = v_low.y;
            vl[vBase + k + 2] = v_low.z;
        }

        // compute new cap
        let cap: Vec3;
        if (this._closedLine) {
            cap = seg[0];
        } else {
            const p0 = seg[seg.length - 1];
            const p1 = seg[seg.length - 2] || p0;
            cap = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
        }

        this.__doubleToTwoFloats(cap, v_high, v_low);
        const capBlock = new Float32Array([
            v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z
        ]);
        const capBlockL = new Float32Array([
            v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z
        ]);

        this._verticesHigh = insertTypedArray(this._verticesHigh as Float32Array, insertGroup * 12, capBlock);
        this._verticesLow = insertTypedArray(this._verticesLow as Float32Array, insertGroup * 12, capBlockL);

        const orderBlock = new Float32Array([1, -1, 2, -2]);
        this._orders = insertTypedArray(this._orders as Float32Array, insertGroup * 4, orderBlock);

        // overwrite cap group then insert new cap group
        const attrGroupStart = pointsBefore + (segIndex === 0 ? 0 : 2 * segIndex - 1);
        const oldAttrGroups = oldLen + (segIndex === 0 ? 1 : 2);
        const oldAttrCapGroup = attrGroupStart + oldAttrGroups - 1;
        const insertAttrGroup = oldAttrCapGroup + 1;

        //
        // thickness block
        const thickness = this._segmentThickness[segIndex] ?? this._thickness;
        const tArr = this._thicknessArr as Float32Array;
        const tBase = oldAttrCapGroup * 4;
        tArr[tBase] = tArr[tBase + 1] = tArr[tBase + 2] = tArr[tBase + 3] = thickness;
        this._thicknessArr = insertTypedArray(tArr, insertAttrGroup * 4, new Float32Array([thickness, thickness, thickness, thickness]));

        //
        // colors block
        const cArr = this._colors as Float32Array;
        const cBase = oldAttrCapGroup * 16;
        const cc: NumberArray4 = segColors[segColors.length - 1] || this._defaultColor;
        const cr = cc[R], cg = cc[G], cb = cc[B], ca = cc[A] != undefined ? cc[A] : 1.0;

        for (let k = 0; k < 16; k += 4) {
            cArr[cBase + k] = cr;
            cArr[cBase + k + 1] = cg;
            cArr[cBase + k + 2] = cb;
            cArr[cBase + k + 3] = ca;
        }

        const cBlock = new Float32Array([cr, cg, cb, ca, cr, cg, cb, ca, cr, cg, cb, ca, cr, cg, cb, ca]);
        this._colors = insertTypedArray(cArr, insertAttrGroup * 16, cBlock);

        //
        // picking colors block
        const pcArr = this._pickingColors as Float32Array;
        const pcBase = oldAttrCapGroup * 12;
        const pcc: NumberArray3 = segPickingColors[segPickingColors.length - 1] || this._pickingColor;
        const pcr = pcc[R], pcg = pcc[G], pcb = pcc[B];

        for (let k = 0; k < 12; k += 3) {
            pcArr[pcBase + k] = pcr;
            pcArr[pcBase + k + 1] = pcg;
            pcArr[pcBase + k + 2] = pcb;
        }

        const pcBlock = new Float32Array([pcr, pcg, pcb, pcr, pcg, pcb, pcr, pcg, pcb, pcr, pcg, pcb]);
        this._pickingColors = insertTypedArray(pcArr, insertAttrGroup * 12, pcBlock);

        //
        // textures block
        const atlas = this._getAtlasTexCoordsForSegment(segmentIndex);
        const tcArr = this._texCoordArr as Float32Array;
        const tcBase = oldAttrCapGroup * 16;
        let tcBlock: Float32Array;
        if (atlas) {
            const minY = atlas[1], imgHeight = atlas[3] - minY;
            tcBlock = new Float32Array([atlas[4], atlas[5], minY, imgHeight, atlas[2], atlas[3], minY, imgHeight, atlas[8], atlas[9], minY, imgHeight, atlas[0], atlas[1], minY, imgHeight]);
        } else {
            tcBlock = new Float32Array(16);
        }
        tcArr.set(tcBlock, tcBase);
        this._texCoordArr = insertTypedArray(tcArr, insertAttrGroup * 16, tcBlock);

        this._rebuildIndexes();

        this._changedBuffers[VERTICES_BUFFER] = true;
        this._changedBuffers[INDEX_BUFFER] = true;
        this._changedBuffers[COLORS_BUFFER] = true;
        this._changedBuffers[THICKNESS_BUFFER] = true;
        this._changedBuffers[TEXCOORD_BUFFER] = true;
        this._changedBuffers[PICKINGCOLORS_BUFFER] = true;
    }

    /**
     * Append new geodetic point in the end of the path.
     * @public
     * @param {LonLat} lonLat - New coordinate.
     * @param {number} [segmentIndex=0] - Path segment index, first by default.
     */
    public addPointLonLat(lonLat: LonLat, segmentIndex: number = 0) {
        //
        // TODO: could be optimized
        //
        if (segmentIndex >= this._pathLonLat.length) {
            this._pathLonLat.push([]);
        }
        this._pathLonLat[segmentIndex].push(lonLat);
        this.setPathLonLat(([] as SegmentPathLonLatExt[]).concat(this._pathLonLat));
    }

    /**
     * Clear polyline data.
     * @public
     */
    public clear() {
        this._clearData();
    }

    /**
     * Change path point color
     * @param {NumberArray4} color - New color
     * @param {number} [index=0] - Point index
     * @param {number} [segmentIndex=0] - Path segment index
     */
    public setPointColor(color: NumberArray4, index: number = 0, segmentIndex: number = 0) {
        if (this._renderNode && index < this._path3v[segmentIndex].length) {
            let colors = this._pathColors[segmentIndex];

            if (!colors) {
                if (this._path3v[segmentIndex] && index < this._path3v[segmentIndex].length) {
                    this._pathColors[segmentIndex] = new Array(this._path3v[segmentIndex].length);
                } else {
                    return;
                }
            }

            if (!colors[index]) {
                colors[index] = [color[R], color[G], color[B], color[A] || 1.0];
            } else {
                colors[index][R] = color[R];
                colors[index][G] = color[G];
                colors[index][B] = color[B];
                colors[index][A] = color[A] || 1.0;
            }

            let c = this._colors;

            let k = index * 16 + this._pathLengths[segmentIndex] * 16 + 32 * segmentIndex;

            c[k] = c[k + 4] = c[k + 8] = c[k + 12] = color[R];
            c[k + 1] = c[k + 5] = c[k + 9] = c[k + 13] = color[G];
            c[k + 2] = c[k + 6] = c[k + 10] = c[k + 14] = color[B];
            c[k + 3] = c[k + 7] = c[k + 11] = c[k + 15] = color[A] || 1.0;

            this._changedBuffers[COLORS_BUFFER] = true;
        } else {
            let pathColors = this._pathColors[segmentIndex];
            pathColors[index] = color;
        }
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

        const segIndex = segmentIndex !== undefined ? segmentIndex : Math.max(0, this._path3v.length - 1);

        if (this._path3v.length === 0) {
            this._thickness = thickness;
            return;
        }

        if (segIndex < 0 || segIndex >= this._path3v.length) return;

        this._segmentThickness[segIndex] = thickness;

        if (this._renderNode) {

            const groupsBefore = segIndex === 0 ? 0 : (this._pathLengths[segIndex] + 2 * segIndex - 1);
            const groupsCount = this._path3v[segIndex].length + 1 + (segIndex > 0 ? 1 : 0);
            const start = groupsBefore * 4;
            const end = (groupsBefore + groupsCount) * 4;
            const ta = this._thicknessArr as TypedArray;

            for (let i = start; i < end; i++) {
                ta[i] = thickness;
            }

            this._changedBuffers[THICKNESS_BUFFER] = true;
        }
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

    /**
     * Assign with render node.
     * @public
     * @param {RenderNode} renderNode -
     */
    public setRenderNode(renderNode: RenderNode) {
        if (renderNode) {
            this._renderNode = renderNode;
            if (this._pathLonLat.length) {
                this._createDataLonLat(([] as SegmentPathLonLatExt[]).concat(this._pathLonLat));
            } else {
                this._createData3v(([] as SegmentPath3vExt[]).concat(this._path3v));
            }
            this._refresh();
            if (renderNode.renderer && renderNode.renderer.isInitialized()) {
                this._update();
            }
        }
    }

    protected _clearData() {
        //@ts-ignore
        this._verticesHigh = null;
        //@ts-ignore
        this._verticesLow = null;
        //@ts-ignore
        this._orders = null;
        //@ts-ignore
        this._indexes = null;
        //@ts-ignore
        this._colors = null;
        //@ts-ignore
        this._thicknessArr = null;
        //@ts-ignore
        this._texCoordArr = null;
        //@ts-ignore
        this._pickingColors = null;

        this._verticesHigh = [];
        this._verticesLow = [];
        this._orders = [];
        this._indexes = [];
        this._colors = [];
        this._thicknessArr = [];
        this._texCoordArr = [];
        this._pickingColors = [];

        this._path3v.length = 0;
        this._pathLonLat.length = 0;
        this._pathLonLatMerc.length = 0;

        this._path3v = [];
        this._pathLonLat = [];
        this._pathLonLatMerc = [];
    }

    protected _createData3v(path3v: SegmentPath3vExt[]) {
        this._clearData();
        this.__appendLineData3v(
            path3v,
            this._pathColors,
            this._pathPickingColors,
            this._defaultColor as NumberArray4,
            this._closedLine,
            this._verticesHigh as number[],
            this._verticesLow as number[],
            this._orders as number[],
            this._indexes as number[],
            (this._renderNode as Planet).ellipsoid,
            this._pathLonLat,
            this._path3v,
            this._pathLonLatMerc,
            this._extent,
            this._colors as number[],
            this._thicknessArr as number[],
            this._texCoordArr as number[],
            this._pickingColors as number[]
        );
        this._resizePathLengths(0);
    }

    protected _createDataLonLat(pathLonlat: SegmentPathLonLatExt[]) {
        this._clearData();
        this.__appendLineDataLonLat(
            pathLonlat,
            this._pathColors,
            this._pathPickingColors,
            this._defaultColor as NumberArray4,
            this._closedLine,
            this._verticesHigh as number[],
            this._verticesLow as number[],
            this._orders as number[],
            this._indexes as number[],
            this._texCoordArr as number[],
            (this._renderNode as Planet).ellipsoid,
            this._path3v,
            this._pathLonLat,
            this._pathLonLatMerc,
            this._extent,
            this._colors as number[],
            this._thicknessArr as number[],
            this._pickingColors as number[]
        );
        this._resizePathLengths(0);
    }

    /**
     * Removes from an entity.
     * @public
     */
    public remove() {
        this._entity = null;

        this._pathColors.length = 0;
        this._pathColors = [];

        this._segmentThickness.length = 0;
        this._segmentThickness = [];

        //@ts-ignore
        this._verticesHigh = null;
        //@ts-ignore
        this._verticesLow = null;
        //@ts-ignore
        this._orders = null;
        //@ts-ignore
        this._indexes = null;
        //@ts-ignore
        this._colors = null;
        //@ts-ignore
        this._thicknessArr = null;
        //@ts-ignore
        this._texCoordArr = null;
        //@ts-ignore
        this._pickingColors = null;

        this._verticesHigh = [];
        this._verticesLow = [];
        this._orders = [];
        this._indexes = [];
        this._colors = [];
        this._thicknessArr = [];
        this._texCoordArr = [];
        this._pickingColors = [];

        this._deleteBuffers();

        this._handler && this._handler.remove(this);
    }

    protected _rebuildPickingColorsFromPath() {
        this._pickingColors = [];
        const outPickingColors = this._pickingColors as number[];
        for (let i = 0, len = this._path3v.length; i < len; i++) {
            const segment = this._path3v[i];

            if (!segment || segment.length === 0) continue;

            const segmentPickingColors = this._pathPickingColors[i];

            const p = (segmentPickingColors && segmentPickingColors[0]) ? segmentPickingColors[0] : [
                this._pickingColor[R],
                this._pickingColor[G],
                this._pickingColor[B]
            ];

            const pr = p[R], pg = p[G], pb = p[B];

            if (i > 0) {
                outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
            }

            for (let j = 0, segmentLen = segment.length; j < segmentLen; j++) {
                outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
            }

            outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
        }
    }

    public setPickingColor3v(color: Vec3) {
        const r = color.x / 255.0;
        const g = color.y / 255.0;
        const b = color.z / 255.0;

        this._pickingColor[0] = r;
        this._pickingColor[1] = g;
        this._pickingColor[2] = b;

        const segmentsCount = Math.max(this._path3v.length, this._pathLonLat.length);

        for (let i = 0; i < segmentsCount; i++) {
            const segmentPickingColors = this._pathPickingColors[i] || (this._pathPickingColors[i] = []);
            const hasPoints = (this._path3v[i]?.length || this._pathLonLat[i]?.length || 0) > 0;

            if (!hasPoints) continue;

            if (segmentPickingColors.length === 0) {
                segmentPickingColors.push([r, g, b]);
                continue;
            }

            for (let j = 0; j < segmentPickingColors.length; j++) {
                const p = segmentPickingColors[j];
                if (!p) continue;
                p[R] = r;
                p[G] = g;
                p[B] = b;
            }
        }

        this._rebuildPickingColorsFromPath();

        this._changedBuffers[PICKINGCOLORS_BUFFER] = true;
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
     * Sets polyline colors.
     * @todo - Test the function.
     * @param {NumberArray4[][]} pathColors
     */
    setPathColors(pathColors: SegmentPathColor[]) {
        if (pathColors) {
            this._colors = [];
            this._pathColors = ([] as SegmentPathColor[]).concat(pathColors);
            Polyline.setPathColors(
                this._pathLonLat,
                pathColors,
                this._defaultColor as NumberArray4,
                this._colors
            );
            this._changedBuffers[COLORS_BUFFER] = true;
        }
    }

    /**
     * Sets polyline color
     * @param {string} htmlColor - HTML color.
     */
    public setColorHTML(htmlColor: string) {
        this._defaultColor = htmlColorToFloat32Array(htmlColor);

        let color = htmlColorToRgba(htmlColor),
            p = this._pathColors;

        for (let i = 0, len = p.length; i < len; i++) {
            let s = p[i];
            for (let j = 0, slen = s.length; j < slen; j++) {
                s[j][0] = color.x;
                s[j][1] = color.y;
                s[j][2] = color.z;
                s[j][3] = color.w;
            }
        }

        let c = this._colors;
        for (let i = 0, len = c.length; i < len; i += 4) {
            c[i] = color.x;
            c[i + 1] = color.y;
            c[i + 2] = color.z;
            c[i + 3] = color.w;
        }

        this._changedBuffers[COLORS_BUFFER] = true;
    }

    public setPathLonLatFast(pathLonLat: SegmentPathLonLatExt[]) {
        this.setPathLonLat(pathLonLat, undefined, true);
    }

    public setPath3vFast(path3v: SegmentPath3vExt[]) {
        this.setPath3v(path3v, undefined, true);
    }

    /**
     * Sets polyline geodetic coordinates.
     * @public
     * @param {SegmentPathLonLat[]} pathLonLat - Polyline path cartesian coordinates.
     * @param {SegmentPathColor[]} pathColors - Polyline path points colors.
     * @param {Boolean} [forceEqual=false] - OPTIMIZATION FLAG: Makes assigning faster for size equal coordinates array.
     */
    public setPathLonLat(pathLonLat: SegmentPathLonLatExt[], pathColors?: SegmentPathColor[], forceEqual?: boolean): void;
    public setPathLonLat(pathLonLat: SegmentPathLonLatExt, pathColors?: SegmentPathColor[], forceEqual?: boolean, segmentIndex?: number): void;
    public setPathLonLat(pathLonLat: SegmentPathLonLatExt[] | SegmentPathLonLatExt, pathColors?: SegmentPathColor[], forceEqual: boolean = false, segmentIndex?: number) {

        if (pathColors) {
            this._pathColors = ([] as SegmentPathColor[]).concat(pathColors);
        }

        if (this._renderNode && (this._renderNode as Planet).ellipsoid) {
            if (forceEqual) {
                if (segmentIndex !== undefined) {
                    this._setSegmentEqualLonLat(pathLonLat as SegmentPathLonLatExt, segmentIndex);
                } else {
                    this._setEqualPathLonLat(pathLonLat as SegmentPathLonLat[]);
                }
                this._changedBuffers[VERTICES_BUFFER] = true;
                this._changedBuffers[COLORS_BUFFER] = true;
            } else {
                this._createDataLonLat(pathLonLat as SegmentPathLonLatExt[]);
                this._changedBuffers[VERTICES_BUFFER] = true;
                this._changedBuffers[INDEX_BUFFER] = true;
                this._changedBuffers[COLORS_BUFFER] = true;
                this._changedBuffers[THICKNESS_BUFFER] = true;
                this._changedBuffers[PICKINGCOLORS_BUFFER] = true;
            }
        } else {
            this._pathLonLat = ([] as SegmentPathLonLatExt[]).concat(pathLonLat);
        }
    }

    public getSize(index: number = 0): number {
        return this._path3v[index].length;
    }

    /**
     * Sets Polyline cartesian coordinates.
     * @public
     * @param {SegmentPath3vExt[]} path3v - Polyline path cartesian coordinates. (exactly 3 entries)
     * @param {SegmentPathColor[]} [pathColors] - Polyline path cartesian coordinates. (exactly 3 entries)
     * @param {Boolean} [forceEqual=false] - Makes assigning faster for size equal coordinates array.
     */
    public setPath3v(path3v: SegmentPath3vExt[], pathColors?: SegmentPathColor[], forceEqual?: boolean): void;
    public setPath3v(path3v: SegmentPath3vExt, pathColors?: SegmentPathColor[], forceEqual?: boolean, segmentIndex?: number): void;
    public setPath3v(path3v: SegmentPath3vExt[] | SegmentPath3vExt, pathColors?: SegmentPathColor[], forceEqual: boolean = false, segmentIndex?: number) {
        if (pathColors) {
            this._pathColors = ([] as SegmentPathColor[]).concat(pathColors);
        }

        if (this._renderNode) {
            if (forceEqual) {
                if (segmentIndex !== undefined) {
                    this._setSegmentEqualPath3v(path3v as SegmentPath3vExt, segmentIndex);
                } else {
                    this._setEqualPath3v(path3v as SegmentPath3vExt[]);
                }
                this._changedBuffers[VERTICES_BUFFER] = true;
            } else {
                this._createData3v(path3v as SegmentPath3vExt[]);
                this._changedBuffers[VERTICES_BUFFER] = true;
                this._changedBuffers[INDEX_BUFFER] = true;
                this._changedBuffers[COLORS_BUFFER] = true;
                this._changedBuffers[THICKNESS_BUFFER] = true;
                this._changedBuffers[TEXCOORD_BUFFER] = true;
                this._changedBuffers[PICKINGCOLORS_BUFFER] = true;
            }
        } else {
            this._path3v = ([] as SegmentPath3vExt[]).concat(path3v as SegmentPath3vExt[]);
        }
    }

    public draw() {
        if (this.visibility && this._path3v.length) {
            this._update();

            let rn = this._renderNode!;
            let r = rn.renderer!;
            let sh = r.handler.programs.polylineForward;
            let p = sh._program;
            let gl = r.handler.gl!,
                sha = p.attributes,
                shu = p.uniforms;

            let ec = this._handler!._entityCollection;

            sh.activate();

            gl.disable(gl.CULL_FACE);
            gl.uniform1f(shu.depthOffset, ec.polygonOffsetUnits);

            gl.uniformMatrix4fv(shu.proj, false, r.activeCamera!.getProjectionMatrix());
            gl.uniformMatrix4fv(shu.view, false, r.activeCamera!.getViewMatrix());

            // gl.uniform4fv(shu.color, [this.color.x, this.color.y, this.color.z, this.color.w * this._handler._entityCollection._fadingOpacity]);

            gl.uniform3fv(shu.rtcEyePositionHigh, this._handler!._rtcEyePositionHigh);
            gl.uniform3fv(shu.rtcEyePositionLow, this._handler!._rtcEyePositionLow);

            gl.uniform4fv(shu.visibleSphere, this._visibleSphere);

            //gl.uniform2fv(shu.uFloatParams, [(rn as Planet)._planetRadius2 || 0.0, r.activeCamera!._tanViewAngle_hradOneByHeight]);
            gl.uniform2fv(shu.viewport, [r.handler.canvas!.width, r.handler.canvas!.height]);
            gl.uniform1f(shu.thicknessScale, 0.5);
            gl.uniform1f(shu.opacity, this._opacity * ec._fadingOpacity);

            gl.uniform1f(shu.texOffset, this._texOffset);
            gl.uniform1f(shu.strokeSize, this._strokeSize);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._colorsBuffer!);
            gl.vertexAttribPointer(sha.color, this._colorsBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer!);
            gl.vertexAttribPointer(sha.texCoord, this._texCoordBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._thicknessBuffer!);
            gl.vertexAttribPointer(sha.thickness, this._thicknessBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            let v = this._verticesHighBuffer!;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevHigh, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentHigh, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextHigh, v.itemSize, gl.FLOAT, false, 12, 96);

            v = this._verticesLowBuffer!;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevLow, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentLow, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextLow, v.itemSize, gl.FLOAT, false, 12, 96);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._ordersBuffer!);
            gl.vertexAttribPointer(sha.order, this._ordersBuffer!.itemSize, gl.FLOAT, false, 4, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer!);
            gl.drawElements(gl.TRIANGLE_STRIP, this._indexesBuffer!.numItems, gl.UNSIGNED_INT, 0);

            gl.enable(gl.CULL_FACE);
        }
    }

    public drawPicking() {
        if (this.visibility && this._path3v.length) {
            this._update();
            let rn = this._renderNode!;
            let r = rn.renderer!;
            let sh = r.handler.programs.polyline_picking;
            let p = sh._program;
            let gl = r.handler.gl!,
                sha = p.attributes,
                shu = p.uniforms;

            let ec = this._handler!._entityCollection;

            sh.activate();

            gl.disable(gl.CULL_FACE);

            gl.uniform1f(shu.depthOffset, ec.polygonOffsetUnits);

            gl.uniformMatrix4fv(shu.proj, false, r.activeCamera!.getProjectionMatrix());
            gl.uniformMatrix4fv(shu.view, false, r.activeCamera!.getViewMatrix());

            gl.bindBuffer(gl.ARRAY_BUFFER, this._pickingColorsBuffer!);
            gl.vertexAttribPointer(sha.pickingColor, this._pickingColorsBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.uniform3fv(shu.rtcEyePositionHigh, this._handler!._rtcEyePositionHigh);
            gl.uniform3fv(shu.rtcEyePositionLow, this._handler!._rtcEyePositionLow);

            gl.uniform4fv(shu.visibleSphere, this._visibleSphere);

            gl.uniform2fv(shu.viewport, [r.handler.canvas!.width, r.handler.canvas!.height]);
            gl.uniform1f(shu.thicknessScale, 0.5 * ec.pickingScale[0]);

            let v = this._verticesHighBuffer!;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevHigh, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentHigh, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextHigh, v.itemSize, gl.FLOAT, false, 12, 96);

            v = this._verticesLowBuffer!;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevLow, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentLow, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextLow, v.itemSize, gl.FLOAT, false, 12, 96);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._ordersBuffer as WebGLBuffer);
            gl.vertexAttribPointer(sha.order, this._ordersBuffer!.itemSize, gl.FLOAT, false, 4, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._thicknessBuffer!);
            gl.vertexAttribPointer(sha.thickness, this._thicknessBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer as WebGLBuffer);
            gl.drawElements(gl.TRIANGLE_STRIP, this._indexesBuffer!.numItems, gl.UNSIGNED_INT, 0);

            gl.enable(gl.CULL_FACE);
        }
    }

    /**
     * Refresh buffers.
     * @protected
     */
    protected _refresh() {
        let i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    /**
     * Updates render buffers.
     * @protected
     */
    protected _update() {
        if (this._renderNode) {
            let i = this._changedBuffers.length;
            while (i--) {
                if (this._changedBuffers[i]) {
                    this._buffersUpdateCallbacks[i].call(this);
                    this._changedBuffers[i] = false;
                }
            }
        }
    }

    /**
     * Clear GL buffers.
     * @public
     */
    public _deleteBuffers() {
        if (this._renderNode) {
            let r = this._renderNode.renderer!,
                gl = r.handler.gl!;

            gl.deleteBuffer(this._verticesHighBuffer!);
            gl.deleteBuffer(this._verticesLowBuffer!);
            gl.deleteBuffer(this._ordersBuffer!);
            gl.deleteBuffer(this._indexesBuffer!);
            gl.deleteBuffer(this._colorsBuffer!);
            gl.deleteBuffer(this._texCoordBuffer!);
            gl.deleteBuffer(this._thicknessBuffer!);
            gl.deleteBuffer(this._pickingColorsBuffer!);

            this._verticesHighBuffer = null;
            this._verticesLowBuffer = null;
            this._ordersBuffer = null;
            this._indexesBuffer = null;
            this._colorsBuffer = null;
            this._texCoordBuffer = null;
            this._thicknessBuffer = null;
            this._pickingColorsBuffer = null;
        }
    }

    /**
     * Creates vertices buffers.
     * @protected
     */
    protected _createVerticesBuffer() {
        let h = this._renderNode!.renderer!.handler;

        let numItems = this._verticesHigh.length / 3;

        if (!this._verticesHighBuffer || this._verticesHighBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._verticesHighBuffer!);
            h.gl!.deleteBuffer(this._verticesLowBuffer!);
            this._verticesHighBuffer = h.createStreamArrayBuffer(3, numItems);
            this._verticesLowBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._verticesHigh = makeArrayTyped(this._verticesHigh);
        this._verticesLow = makeArrayTyped(this._verticesLow);

        h.setStreamArrayBuffer(this._verticesHighBuffer!, this._verticesHigh as TypedArray);
        h.setStreamArrayBuffer(this._verticesLowBuffer!, this._verticesLow as TypedArray);
    }

    /**
     * Creates gl index and order buffer.
     * @protected
     */
    protected _createIndexBuffer() {
        let h = this._renderNode!.renderer!.handler;
        h.gl!.deleteBuffer(this._ordersBuffer!);
        h.gl!.deleteBuffer(this._indexesBuffer!);

        this._orders = makeArrayTyped(this._orders);
        this._ordersBuffer = h.createArrayBuffer(this._orders as TypedArray, 1, this._orders.length / 2);

        this._indexes = makeArrayTyped(this._indexes, Uint32Array);
        this._indexesBuffer = h.createElementArrayBuffer(this._indexes as TypedArray, 1, this._indexes.length);
    }

    protected _createColorsBuffer() {
        let h = this._renderNode!.renderer!.handler;
        this._colors = makeArrayTyped(this._colors);

        const ta = this._colors as TypedArray;
        const numItems = ta.length / 4;
        if (!this._colorsBuffer || this._colorsBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._colorsBuffer!);
            this._colorsBuffer = h.createStreamArrayBuffer(4, numItems);
        }
        h.setStreamArrayBuffer(this._colorsBuffer!, ta);
    }

    protected _createPickingColorsBuffer() {
        let h = this._renderNode!.renderer!.handler;
        this._pickingColors = makeArrayTyped(this._pickingColors);

        const ta = this._pickingColors as TypedArray;
        const numItems = ta.length / 3;
        if (!this._pickingColorsBuffer || this._pickingColorsBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._pickingColorsBuffer!);
            this._pickingColorsBuffer = h.createStreamArrayBuffer(3, numItems);
        }
        h.setStreamArrayBuffer(this._pickingColorsBuffer!, ta);
    }

    protected _createThicknessBuffer() {
        let h = this._renderNode!.renderer!.handler;
        this._thicknessArr = makeArrayTyped(this._thicknessArr);
        const ta = this._thicknessArr as TypedArray;

        if (!this._thicknessBuffer || this._thicknessBuffer.numItems !== ta.length) {
            h.gl!.deleteBuffer(this._thicknessBuffer!);
            this._thicknessBuffer = h.createStreamArrayBuffer(1, ta.length);
        }

        h.setStreamArrayBuffer(this._thicknessBuffer!, ta);
    }

    public _createTexCoordBuffer() {
        let h = this._renderNode!.renderer!.handler;
        h.gl!.deleteBuffer(this._texCoordBuffer!);
        this._texCoordArr = makeArrayTyped(this._texCoordArr);
        this._texCoordBuffer = h.createArrayBuffer(this._texCoordArr as TypedArray, 4, this._texCoordArr.length / 4);
    }

    public setVisibleSphere(p: Vec3, r: number) {
        if (this._handler) {
            this._visibleSphere[0] = p.x - this._handler._relativeCenter.x;
            this._visibleSphere[1] = p.y - this._handler._relativeCenter.y;
            this._visibleSphere[2] = p.z - this._handler._relativeCenter.z;
        }
        this._visibleSphere[3] = r;
    }

    public updateRTCPosition() {
        if (this._handler && this._renderNode) {
            this._visibleSphere[0] = this._visibleSphere[0] - this._handler._relativeCenter.x;
            this._visibleSphere[1] = this._visibleSphere[1] - this._handler._relativeCenter.y;
            this._visibleSphere[2] = this._visibleSphere[2] - this._handler._relativeCenter.z;
            this._setEqualPath3v(this._path3v);
        }
        this._changedBuffers[VERTICES_BUFFER] = true;
    }

}

export {Polyline};
