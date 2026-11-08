import * as mercator from "../mercator";
import { doubleToTwoFloats2 } from "../math/doubleToTwoFloats";
import { Extent } from "../Extent";
import type { EventCallback, EventsHandler } from "../Events";
import { Layer } from "./Layer";
import type { LayerEventsList, ILayerParams } from "./Layer";
import { LonLat } from "../LonLat";
import { Material } from "./Material";
import type { NumberArray2 } from "../math/Vec2";
import type { NumberArray4 } from "../math/Vec4";
import { Planet } from "../scene/Planet";
import type { WebGLBufferExt, WebGLTextureExt } from "../webgl/Handler";
import { SRGB } from "../utils/colorSpace";
import { RADIANS } from "../math";
import { CUBE_FACES, CubeProj } from "../proj/cube";

export interface IBaseGeoImageParams extends ILayerParams {
    fullExtent?: boolean;
    corners?: NumberArray2[];
}

type BaseGeoImageEventsList = ["loadend"];

const BASEGEOIMAGE_EVENTS: BaseGeoImageEventsList = [
    /**
     * Triggered when image data is loaded
     * @event EventsHandler<BaseGeoImageEventsList>#loadend
     */
    "loadend"
];

const ANIMATED_MIPMAP_UPDATE_INTERVAL = 4;
const LON_WRAP = 360.0;
const LON_HALF_WRAP = 180.0;
const FULL_WORLD_EDGE_EPS = 1e-6;

/**
 * Returns the rectangles of the image points on the cube faces, in the native coordinates of the faces, null for a
 * face the image does not reach. A rectangle is of the points in front of the face plane, on its extension, cut by
 * the face.
 * @param {Array.<LonLat>} points - Points of the image grid.
 * @param {CubeProj} proj - Cube projection.
 * @returns {Array.<Extent | null>} -
 */
export function getCubeFaceExtents(points: LonLat[], proj: CubeProj): (Extent | null)[] {
    const bounds = CUBE_FACES.map(() => [Infinity, Infinity, -Infinity, -Infinity]);

    for (let i = 0; i < points.length; i++) {
        const lon = points[i].lon * RADIANS,
            lat = points[i].lat * RADIANS,
            x = Math.cos(lat) * Math.cos(lon),
            y = Math.cos(lat) * Math.sin(lon),
            z = Math.sin(lat);

        for (let face = 0; face < CUBE_FACES.length; face++) {
            const f = CUBE_FACES[face],
                c = x * f[0] + y * f[1] + z * f[2];

            if (c <= 0) continue;

            const s = proj.fromPlane((x * f[3] + y * f[4] + z * f[5]) / c),
                t = proj.fromPlane((x * f[6] + y * f[7] + z * f[8]) / c),
                b = bounds[face];

            b[0] = Math.min(b[0], s);
            b[1] = Math.min(b[1], t);
            b[2] = Math.max(b[2], s);
            b[3] = Math.max(b[3], t);
        }
    }

    return bounds.map((b, face) => {
        const s0 = Math.max(b[0], 0),
            t0 = Math.max(b[1], 0),
            s1 = Math.min(b[2], 1),
            t1 = Math.min(b[3], 1);

        return s1 > s0 && t1 > t0 ? Extent.createFromArray([face + s0, t0, face + s1, t1]) : null;
    });
}

export type BaseGeoImageEventsType = EventsHandler<BaseGeoImageEventsList> & EventsHandler<LayerEventsList>;

/**
 * BaseGeoImage represents a square imagery layer displayed on the globe.
 * It can use a static image, animated video, or WebGL buffer as a source.
 * @class
 * @extends {Layer}
 */
class BaseGeoImage extends Layer {
    public override events: BaseGeoImageEventsType;

    protected _projType: number;

    protected _frameWidth: number;
    protected _frameHeight: number;

    protected _sourceReady: boolean;
    protected _sourceTexture: WebGLTextureExt | null;
    protected _materialTexture: WebGLTextureExt | null;

    protected _gridBufferLow: WebGLBufferExt | null;
    protected _gridBufferHigh: WebGLBufferExt | null;

    protected _extentWgs84ParamsHigh: Float32Array;
    protected _extentWgs84ParamsLow: Float32Array;

    protected _extentMercParamsHigh: Float32Array;
    protected _extentMercParamsLow: Float32Array;

    protected _refreshFrame: boolean;
    protected _frameCreated: boolean;
    protected _sourceCreated: boolean;

    public _animate: boolean;
    protected _ready: boolean;
    public _creationProceeding: boolean;
    public _isRendering: boolean;

    protected _extentWgs84: Extent;
    protected _cornersWgs84: LonLat[];
    protected _cornersMerc: LonLat[];

    protected _isFullExtent: number;
    protected _crossesAntimeridian: boolean;

    /**
     * rendering function pointer
     * @type {Function}
     */
    public rendering: Function;

    protected _onLoadend_: EventCallback | null;
    protected _materialMipmapUpdateCounter: number;

    // On a cube the image is drawn to a texture of each face it reaches, in the native coordinates of the face
    protected _faceExtents: (Extent | null)[];
    protected _faceTextures: (WebGLTextureExt | null)[];

    constructor(name: string | null, options: IBaseGeoImageParams = {}) {
        super(name, options);

        // @ts-ignore
        this.events = this.events.registerNames(BASEGEOIMAGE_EVENTS);

        this._projType = 0;

        this._frameWidth = 256;
        this._frameHeight = 256;

        this._sourceReady = false;
        this._sourceTexture = null;
        this._materialTexture = null;

        this._gridBufferLow = null;
        this._gridBufferHigh = null;

        this._extentWgs84ParamsHigh = new Float32Array(4);
        this._extentWgs84ParamsLow = new Float32Array(4);

        this._extentMercParamsHigh = new Float32Array(4);
        this._extentMercParamsLow = new Float32Array(4);

        this._refreshFrame = true;
        this._frameCreated = false;
        this._sourceCreated = false;

        this._animate = false;
        this._ready = false;
        this._creationProceeding = false;
        this._isRendering = false;

        this._extentWgs84 = new Extent();
        this._cornersWgs84 = [];
        this._cornersMerc = [];

        this._isFullExtent = options.fullExtent ? 1 : 0;
        this._crossesAntimeridian = false;

        /**
         * rendering function pointer
         */
        this.rendering = this._renderingProjType0.bind(this);

        this._onLoadend_ = null;
        this._materialMipmapUpdateCounter = 0;

        this._faceExtents = [];
        this._faceTextures = [];

        options.corners && this.setCorners(options.corners);
    }

    public override get isIdle(): boolean {
        return super.isIdle && this._ready;
    }

    public override _assignPlanet(planet: Planet) {
        super._assignPlanet(planet);

        if (this._cornersWgs84.length === 4 && this._isCube()) {
            this._projType = 2;
            this.rendering = this._renderingProjTypePlane;
            this._refreshFrame = true;
        }
    }

    protected _isCube(): boolean {
        return !!this._planet && this._planet.quadTreeStrategy.projection instanceof CubeProj;
    }

    public override addTo(planet: Planet) {
        this._onLoadend_ = this._onLoadend.bind(this);
        this.events.on("loadend", this._onLoadend_, this);
        return super.addTo(planet);
    }

    protected _onLoadend() {
        if (this._planet) {
            this._planet.events.dispatch(this._planet.events.layerloadend, this);
        }
    }

    public override remove() {
        if (this._planet) {
            this._planet._geoImageCreator.remove(this);
        }
        this.events.off("loadend", this._onLoadend_);
        this._onLoadend_ = null;
        return super.remove();
    }

    public override get instanceName(): string {
        return "BaseGeoImage";
    }

    /**
     * Gets corners coordinates.
     * @public
     * @returns {Array.<LonLat>} - (exactly 4 entries)
     */
    public getCornersLonLat(): LonLat[] {
        let c = this._cornersWgs84;
        return [
            new LonLat(c[0].lon, c[0].lat),
            new LonLat(c[1].lon, c[1].lat),
            new LonLat(c[2].lon, c[2].lat),
            new LonLat(c[3].lon, c[3].lat)
        ];
    }

    /**
     * Gets corners coordinates.
     * @public
     * @returns {Array.<Array<number>>} - (exactly 4 entries)
     */
    public getCorners(): NumberArray2[] {
        let c = this._cornersWgs84;
        return [
            [c[0].lon, c[0].lat],
            [c[1].lon, c[1].lat],
            [c[2].lon, c[2].lat],
            [c[3].lon, c[3].lat]
        ];
    }

    /**
     * Sets geoImage geographical corners coordinates.
     * @public
     * @param {Array.<Array.<number>>} corners - GeoImage corner coordinates. Each coordinate has exactly 2 entries.
     * The first corner is top-left, the second is top-right, the third is bottom-right, and the fourth is bottom-left.
     */
    public setCorners(corners: NumberArray2[]) {
        this.setCornersLonLat(LonLat.join(corners));
    }

    /**
     * Sets geoImage geographical corners coordinates.
     * @public
     * @param {Array.<LonLat>} corners - GeoImage corner coordinates.
     * The first corner is top-left, the second is top-right, the third is bottom-right, and the fourth is bottom-left.
     * (exactly 4 entries)
     */
    public setCornersLonLat(corners: LonLat[]) {
        this._refreshFrame = true;
        const cornersUnwrapped = this._unwrapCornersLonLat(corners);
        this._cornersWgs84 = [
            cornersUnwrapped[0].clone(),
            cornersUnwrapped[1].clone(),
            cornersUnwrapped[2].clone(),
            cornersUnwrapped[3].clone()
        ];
        this._crossesAntimeridian = this._detectAntimeridianCrossing(this._cornersWgs84);

        for (let i = 0; i < this._cornersWgs84.length; i++) {
            if (this._cornersWgs84[i].lat >= 89.9) {
                this._cornersWgs84[i].lat = 89.9;
            }
            if (this._cornersWgs84[i].lat <= -89.9) {
                this._cornersWgs84[i].lat = -89.9;
            }
        }
        this._extent.setByCoordinates(this._cornersWgs84);

        let me = this._extent;
        if (me.southWest.lat > mercator.MAX_LAT || me.northEast.lat < mercator.MIN_LAT) {
            this._projType = 0;
            this.rendering = this._renderingProjType0;
        } else {
            this._projType = 1;
            this.rendering = this._renderingProjType1;
        }

        if (this._isCube()) {
            this._projType = 2;
            this.rendering = this._renderingProjTypePlane;
        }

        if (this._ready && !this._creationProceeding) {
            this._planet!._geoImageCreator.add(this);
        }
    }

    protected _isExplicitFullWorldLonEdge(lonA: number, lonB: number): boolean {
        return Math.abs(Math.abs(lonB - lonA) - LON_WRAP) <= FULL_WORLD_EDGE_EPS;
    }

    protected _unwrapCornersLonLat(corners: LonLat[]): LonLat[] {
        if (corners.length !== 4) {
            return [corners[0].clone(), corners[1].clone(), corners[2].clone(), corners[3].clone()];
        }

        const out = [corners[0].clone(), corners[1].clone(), corners[2].clone(), corners[3].clone()];

        for (let i = 1; i < out.length; i++) {
            const prevLon = out[i - 1].lon;
            const sourcePrevLon = corners[i - 1].lon;
            const sourceCurrLon = corners[i].lon;

            if (this._isExplicitFullWorldLonEdge(sourcePrevLon, sourceCurrLon)) {
                out[i].lon = prevLon + (sourceCurrLon - sourcePrevLon);
                continue;
            }

            let lon = sourceCurrLon;
            let delta = lon - prevLon;

            while (delta > LON_HALF_WRAP) {
                lon -= LON_WRAP;
                delta = lon - prevLon;
            }

            while (delta < -LON_HALF_WRAP) {
                lon += LON_WRAP;
                delta = lon - prevLon;
            }

            out[i].lon = lon;
        }

        return out;
    }

    protected _detectAntimeridianCrossing(corners: LonLat[]): boolean {
        let minLon = 180.0;
        let maxLon = -180.0;

        for (let i = 0; i < corners.length; i++) {
            let lon = corners[i].lon;
            if (lon < -180.0 || lon > 180.0) {
                lon = ((((lon + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
            }
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
        }

        return maxLon - minLon > 180.0;
    }

    /**
     * Creates geoImage frame.
     * @protected
     */
    protected _createFrame() {
        if (this._projType === 2) {
            this._createCubeFrame();
            return;
        }

        this._extentWgs84 = this._extent.clone();

        this._cornersMerc = [
            this._cornersWgs84[0].forwardMercatorEPS01(),
            this._cornersWgs84[1].forwardMercatorEPS01(),
            this._cornersWgs84[2].forwardMercatorEPS01(),
            this._cornersWgs84[3].forwardMercatorEPS01()
        ];

        this._extentMerc = new Extent(
            this._extentWgs84.southWest.forwardMercatorEPS01(),
            this._extentWgs84.northEast.forwardMercatorEPS01()
        );

        let tempArr = new Float32Array(2);

        if (this._projType === 0) {
            doubleToTwoFloats2(this._extentWgs84.southWest.lon, tempArr);
            this._extentWgs84ParamsHigh[0] = tempArr[0];
            this._extentWgs84ParamsLow[0] = tempArr[1];

            doubleToTwoFloats2(this._extentWgs84.southWest.lat, tempArr);
            this._extentWgs84ParamsHigh[1] = tempArr[0];
            this._extentWgs84ParamsLow[1] = tempArr[1];

            this._extentWgs84ParamsHigh[2] = 2.0 / this._extentWgs84.getWidth();
            this._extentWgs84ParamsHigh[3] = 2.0 / this._extentWgs84.getHeight();
        } else {
            doubleToTwoFloats2(this._extentMerc.southWest.lon, tempArr);
            this._extentMercParamsHigh[0] = tempArr[0];
            this._extentMercParamsLow[0] = tempArr[1];

            doubleToTwoFloats2(this._extentMerc.southWest.lat, tempArr);
            this._extentMercParamsHigh[1] = tempArr[0];
            this._extentMercParamsLow[1] = tempArr[1];

            this._extentMercParamsHigh[2] = 2.0 / this._extentMerc.getWidth();
            this._extentMercParamsHigh[3] = 2.0 / this._extentMerc.getHeight();
        }

        // creates material frame textures
        if (this._planet) {
            let p = this._planet,
                h = p.renderer!.handler,
                gl = h.gl!;

            gl.deleteTexture(this._materialTexture as WebGLTexture);
            this._materialTexture = h.createEmptyTexture_l(this._frameWidth, this._frameHeight);
            this._materialMipmapUpdateCounter = 0;

            let gridBufferArr = this._planet._geoImageCreator.createGridBuffer(
                this._cornersWgs84,
                this._projType === 1
            );

            this._gridBufferHigh = gridBufferArr[0];
            this._gridBufferLow = gridBufferArr[1];

            this._refreshFrame = false;
        }
    }

    protected _createCubeFrame() {
        const p = this._planet;

        if (!p) return;

        const h = p.renderer!.handler,
            gl = h.gl!,
            creator = p._geoImageCreator,
            points = creator.createGridLonLat(this._cornersWgs84);

        this._faceExtents = getCubeFaceExtents(points, p.quadTreeStrategy.projection as CubeProj);

        gl.deleteBuffer(this._gridBufferHigh as WebGLBuffer);
        gl.deleteBuffer(this._gridBufferLow as WebGLBuffer);
        [this._gridBufferHigh, this._gridBufferLow] = creator.createGridDirectionsBuffer(points);

        this._deleteFaceTextures();
        this._faceTextures = this._faceExtents.map((e) =>
            e ? h.createEmptyTexture_l(this._frameWidth, this._frameHeight) : null
        );
        this._materialMipmapUpdateCounter = 0;

        this._refreshFrame = false;
    }

    protected _deleteFaceTextures() {
        const gl = this._planet?.renderer?.handler.gl;
        if (gl) {
            for (const t of this._faceTextures) {
                t && gl.deleteTexture(t);
            }
        }
        this._faceTextures = [];
    }

    /**
     * @public
     * @override
     * @param {Material} material - GeoImage material.
     */
    public override abortMaterialLoading(material: Material) {
        this._creationProceeding = false;
        material.isLoading = false;
        material.isReady = false;
    }

    /**
     * Clear layer material.
     * @public
     * @override
     */
    public override clear() {
        let p = this._planet;

        if (p) {
            let gl = p.renderer!.handler.gl;
            p._geoImageCreator.remove(this);
            p._clearLayerMaterial(this);

            if (gl) {
                gl.deleteBuffer(this._gridBufferHigh as WebGLBuffer);
                gl.deleteBuffer(this._gridBufferLow as WebGLBuffer);
                gl.deleteTexture(this._sourceTexture as WebGLTexture);
                this._materialTexture && !this._materialTexture.default && gl.deleteTexture(this._materialTexture);
            }
        }

        this._deleteFaceTextures();
        this._faceExtents = [];

        this._sourceTexture = null;
        this._materialTexture = null;

        this._gridBufferHigh = null;
        this._gridBufferLow = null;

        this._refreshFrame = true;
        this._sourceCreated = false;

        this._ready = false;
        this._creationProceeding = false;
    }

    /**
     * Sets layer visibility.
     * @public
     * @override
     * @param {boolean} visibility - GeoImage visibility.
     */
    public override setVisibility(visibility: boolean) {
        if (visibility !== this._visibility) {
            super.setVisibility(visibility);

            // remove from creator
            if (this._planet && this._sourceReady) {
                if (visibility) {
                    this._planet._geoImageCreator.add(this);
                } else {
                    this._planet._geoImageCreator.remove(this);
                }
            }
        }
    }

    /**
     * @public
     * @param {Material} material - GeoImage material.
     */
    public override clearMaterial(material: Material) {
        material.texture = null;
        material.isLoading = false;
        material.isReady = false;
    }

    protected _getCyclicLonShift(sourceExtent: Extent, targetExtent: Extent, worldWidth: number): number {
        const sourceCenter = (sourceExtent.southWest.lon + sourceExtent.northEast.lon) * 0.5;
        const targetCenter = (targetExtent.southWest.lon + targetExtent.northEast.lon) * 0.5;
        const sourceWidth = sourceExtent.northEast.lon - sourceExtent.southWest.lon;

        if (worldWidth <= 0.0 || sourceWidth >= worldWidth) {
            return 0.0;
        }

        const k0 = Math.round((targetCenter - sourceCenter) / worldWidth);
        let bestShift = k0 * worldWidth;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let dk = -1; dk <= 1; dk++) {
            const shift = (k0 + dk) * worldWidth;
            const shiftedSw = sourceExtent.southWest.lon + shift;
            const shiftedNe = sourceExtent.northEast.lon + shift;
            const shiftedCenter = (shiftedSw + shiftedNe) * 0.5;
            const overlapsX = targetExtent.southWest.lon <= shiftedNe && targetExtent.northEast.lon >= shiftedSw;
            const score = Math.abs(shiftedCenter - targetCenter) + (overlapsX ? 0.0 : worldWidth);

            if (score < bestScore) {
                bestScore = score;
                bestShift = shift;
            }
        }

        return bestShift;
    }

    /**
     * @public
     * @override
     * @returns {NumberArray4}
     */
    public override applyMaterial(material: Material): NumberArray4 {
        if (this._projType === 2) {
            return this._applyCubeMaterial(material);
        }

        let segment = material.segment;

        if (this._ready) {
            if (!material.isReady || material.texture !== this._materialTexture) {
                material.applyTexture(this._materialTexture);
            }
        } else {
            material.texture = this._planet!.transparentTexture;
            !this._creationProceeding && this.loadMaterial(material);
        }

        let v0s: Extent, v0t: Extent, worldWidth: number;
        if (this._projType === 0) {
            v0s = this._extentWgs84;
            v0t = segment._extent;
            worldWidth = 360.0;
        } else {
            v0s = this._extentMerc;
            v0t = segment.getExtentMerc();
            worldWidth = mercator.POLE2;
        }

        const lonShift = this._getCyclicLonShift(v0s, v0t, worldWidth);
        const sourceSwLon = v0s.southWest.lon + lonShift;
        const sourceNeLon = v0s.northEast.lon + lonShift;

        let sSize_x = sourceNeLon - sourceSwLon;
        let sSize_y = v0s.northEast.lat - v0s.southWest.lat;
        let dV0s_x = (v0t.southWest.lon - sourceSwLon) / sSize_x;
        let dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
        let dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
        let dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;

        return [dV0s_x, dV0s_y, dSize_x, dSize_y];
    }

    // The texture of the face of the tile, the face the image does not reach puts the tile out of the texture
    protected _applyCubeMaterial(material: Material): NumberArray4 {
        const segment = material.segment,
            face = segment.tileGroup,
            e = this._faceExtents[face],
            texture = this._faceTextures[face] || this._planet!.transparentTexture;

        if (this._ready) {
            if (!material.isReady || material.texture !== texture) {
                material.applyTexture(texture);
            }
        } else {
            material.texture = this._planet!.transparentTexture;
            !this._creationProceeding && this.loadMaterial(material);
        }

        if (!e) {
            return [2, 2, 1, 1];
        }

        const t = segment.getExtent(),
            width = e.northEast.lon - e.southWest.lon,
            height = e.northEast.lat - e.southWest.lat;

        return [
            (t.southWest.lon - e.southWest.lon) / width,
            (e.northEast.lat - t.northEast.lat) / height,
            (t.northEast.lon - t.southWest.lon) / width,
            (t.northEast.lat - t.southWest.lat) / height
        ];
    }

    /**
     * Gets frame width size in pixels.
     * @public
     * @returns {number} Frame width.
     */
    public get getFrameWidth(): number {
        return this._frameWidth;
    }

    /**
     * Gets frame height size in pixels.
     * @public
     * @returns {number} Frame height.
     */
    public get getFrameHeight(): number {
        return this._frameHeight;
    }

    /**
     * Method depends on GeoImage instance
     * @protected
     */
    protected _createSourceTexture() {
        //empty
    }

    protected _updateMaterialTextureMipmap() {
        const p = this._planet;
        if (!p || !this._materialTexture) return;

        const gl = p.renderer!.handler.gl!;
        const shouldUpdateMipmaps = !this._animate || this._materialMipmapUpdateCounter <= 0;

        gl.bindTexture(gl.TEXTURE_2D, this._materialTexture as WebGLTexture);

        if (shouldUpdateMipmaps) {
            gl.generateMipmap(gl.TEXTURE_2D);
            this._materialMipmapUpdateCounter = this._animate ? ANIMATED_MIPMAP_UPDATE_INTERVAL : 0;
        } else {
            this._materialMipmapUpdateCounter--;
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    public _renderingProjType1() {
        let p = this._planet!,
            h = p.renderer!.handler,
            gl = h.gl!,
            creator = p._geoImageCreator;

        this._refreshFrame && this._createFrame();
        this._createSourceTexture();

        let f = creator._framebuffer!;
        f.setSize(this._frameWidth, this._frameHeight);
        f.activate();

        h.programs.geoImageTransform.activate();
        let sh = h.programs.geoImageTransform;
        let sha = sh.attributes,
            shu = sh.uniforms;

        gl.disable(gl.CULL_FACE);

        f.bindOutputTexture(this._materialTexture as WebGLTexture);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Keep edge-discard disabled for antimeridian-crossing images to avoid a seam on +/-180.
        gl.uniform1i(shu.isFullExtent, this._isFullExtent || this._crossesAntimeridian ? 1 : 0);
        gl.uniform1i(shu.decodeSourceSRGB, this._colorSpace === SRGB ? 1 : 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer as WebGLBuffer);

        gl.vertexAttribPointer(sha.texCoords, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferHigh as WebGLBuffer);
        gl.vertexAttribPointer(sha.cornersHigh, this._gridBufferHigh!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferLow as WebGLBuffer);
        gl.vertexAttribPointer(sha.cornersLow, this._gridBufferLow!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform4fv(shu.extentParamsHigh, this._extentMercParamsHigh);
        gl.uniform4fv(shu.extentParamsLow, this._extentMercParamsLow);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture as WebGLTexture);
        gl.uniform1i(shu.sourceTexture, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, creator._indexBuffer as WebGLBuffer);
        gl.drawElements(gl.TRIANGLE_STRIP, creator._indexBuffer!.numItems, gl.UNSIGNED_INT, 0);
        f.deactivate();
        this._updateMaterialTextureMipmap();

        gl.enable(gl.CULL_FACE);

        this._ready = true;

        this._creationProceeding = false;
    }

    // Draws the image grid to the texture of each face it reaches, on the plane of the face
    public _renderingProjTypePlane() {
        const p = this._planet!,
            h = p.renderer!.handler,
            gl = h.gl!,
            creator = p._geoImageCreator,
            proj = p.quadTreeStrategy.projection as CubeProj;

        this._refreshFrame && this._createFrame();
        this._createSourceTexture();

        const f = creator._framebuffer!;
        f.setSize(this._frameWidth, this._frameHeight);
        f.activate();

        const sh = h.programs.geoImageTransformPlane;
        sh.activate();
        const sha = sh.attributes,
            shu = sh.uniforms;

        gl.disable(gl.CULL_FACE);

        gl.uniform1i(shu.isFullExtent, this._isFullExtent || this._crossesAntimeridian ? 1 : 0);
        gl.uniform1i(shu.decodeSourceSRGB, this._colorSpace === SRGB ? 1 : 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.texCoords, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferHigh as WebGLBuffer);
        gl.vertexAttribPointer(sha.cornersHigh, this._gridBufferHigh!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferLow as WebGLBuffer);
        gl.vertexAttribPointer(sha.cornersLow, this._gridBufferLow!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform1i(shu.sourceTexture, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, creator._indexBuffer as WebGLBuffer);

        const updateMipmaps = !this._animate || this._materialMipmapUpdateCounter <= 0;

        for (let face = 0; face < this._faceTextures.length; face++) {
            const e = this._faceExtents[face],
                texture = this._faceTextures[face];

            if (!e || !texture) continue;

            f.bindOutputTexture(texture as WebGLTexture);
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Binding the output texture leaves no texture on the unit, the source goes after it
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture as WebGLTexture);

            creator.setCubePlaneUniforms(
                shu,
                proj,
                face,
                e.southWest.lon - face,
                e.northEast.lon - face,
                e.southWest.lat,
                e.northEast.lat
            );

            gl.drawElements(gl.TRIANGLE_STRIP, creator._indexBuffer!.numItems, gl.UNSIGNED_INT, 0);
        }

        f.deactivate();

        for (const texture of this._faceTextures) {
            if (!texture) continue;
            gl.bindTexture(gl.TEXTURE_2D, texture as WebGLTexture);
            updateMipmaps && gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);

        if (updateMipmaps) {
            this._materialMipmapUpdateCounter = this._animate ? ANIMATED_MIPMAP_UPDATE_INTERVAL : 0;
        } else {
            this._materialMipmapUpdateCounter--;
        }

        gl.enable(gl.CULL_FACE);

        this._ready = true;

        this._creationProceeding = false;
    }

    protected _renderingProjType0() {
        let p = this._planet!,
            h = p.renderer!.handler,
            gl = h.gl!,
            creator = p._geoImageCreator;

        this._refreshFrame && this._createFrame();
        this._createSourceTexture();

        let f = creator._framebuffer!;
        f.setSize(this._frameWidth, this._frameHeight);
        f.activate();

        h.programs.geoImageTransform.activate();
        let sh = h.programs.geoImageTransform;
        let sha = sh.attributes,
            shu = sh.uniforms;

        gl.disable(gl.CULL_FACE);

        f.bindOutputTexture(this._materialTexture as WebGLTexture);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer as WebGLBuffer);
        gl.uniform1i(shu.isFullExtent, this._isFullExtent || this._crossesAntimeridian ? 1 : 0);
        gl.uniform1i(shu.decodeSourceSRGB, this._colorSpace === SRGB ? 1 : 0);

        gl.vertexAttribPointer(sha.texCoords, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferHigh as WebGLBuffer);
        gl.vertexAttribPointer(sha.cornersHigh, this._gridBufferHigh!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferLow as WebGLBuffer);
        gl.vertexAttribPointer(sha.cornersLow, this._gridBufferLow!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform4fv(shu.extentParamsHigh, this._extentWgs84ParamsHigh);
        gl.uniform4fv(shu.extentParamsLow, this._extentWgs84ParamsLow);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture as WebGLTexture);
        gl.uniform1i(shu.sourceTexture, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, creator._indexBuffer as WebGLBuffer);
        gl.drawElements(gl.TRIANGLE_STRIP, creator._indexBuffer!.numItems, gl.UNSIGNED_INT, 0);
        f.deactivate();
        this._updateMaterialTextureMipmap();

        gl.enable(gl.CULL_FACE);

        this._ready = true;

        this._creationProceeding = false;
    }
}

export { BaseGeoImage };
