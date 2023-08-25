import * as mercator from "../mercator";
import {Extent} from "../Extent";
import {EventsHandler} from "../Events";
import {doubleToTwoFloats2} from "../math/coder";
import {Layer, LayerEventsList, ILayerParams} from "./Layer";
import {LonLat} from "../LonLat";
import {Material} from "./Material";
import {Planet} from "../scene/Planet";
import {WebGLBufferExt, WebGLTextureExt} from "../webgl/Handler";
import {NumberArray2} from "../math/Vec2";
import {NumberArray4} from "../math/Vec4";

export interface IBaseGeoImageParams extends ILayerParams {
    fullExtent?: boolean;
    corners?: NumberArray2[];
}

type BaseGeoImageEventsList = [
    "loadend"
];

const BASEGEOIMAGE_EVENTS: BaseGeoImageEventsList = [
    /**
     * Triggered when image data is loaded
     * @event EventsHandler<BaseGeoImageEventsList>#loadend
     */
    "loadend"
];

export type BaseGeoImageEventsType = EventsHandler<BaseGeoImageEventsList> & EventsHandler<LayerEventsList>;

/**
 * BaseGeoImage layer represents square imagery layer that
 * could be a static image, or animated video or webgl buffer
 * object displayed on the globe.
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

    protected _animate: boolean;
    protected _ready: boolean;
    protected _creationProceeding: boolean;
    protected _isRendering: boolean;

    protected _extentWgs84: Extent;
    protected _cornersWgs84: LonLat[];
    protected _cornersMerc: LonLat[];

    protected _isFullExtent: number;

    /**
     * rendering function pointer
     * @type {Function}
     */
    public rendering: Function;

    protected _onLoadend_: Function | null;

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

        /**
         * rendering function pointer
         */
        this.rendering = this._renderingProjType0.bind(this);

        this._onLoadend_ = null;

        options.corners && this.setCorners(options.corners);
    }

    public override get isIdle(): boolean {
        return super.isIdle && this._ready;
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
     * @return {Array.<LonLat>} - (exactly 4 entries)
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
     * @return {Array.<Array<number>>} - (exactly 3 entries)
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
     * @param {Array.<Array.<number>>} corners - GeoImage corners coordinates. Where first coordinate (exactly 3 entries)
     * coincedents to the left top image corner, secont to the right top image corner, third to the right bottom
     * and fourth - left bottom image corner.
     */
    public setCorners(corners: NumberArray2[]) {
        this.setCornersLonLat(LonLat.join(corners));
    }

    /**
     * Sets geoImage geographical corners coordinates.
     * @public
     * @param {Array.<LonLat>} corners - GeoImage corners coordinates. Where first coordinate
     * coincedents to the left top image corner, secont to the right top image corner, third to the right bottom
     * and fourth - left bottom image corner. (exactly 4 entries)
     */
    public setCornersLonLat(corners: LonLat[]) {
        this._refreshFrame = true;
        this._cornersWgs84 = [
            corners[0].clone(),
            corners[1].clone(),
            corners[2].clone(),
            corners[3].clone()
        ];

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

        if (this._ready && !this._creationProceeding) {
            this._planet!._geoImageCreator.add(this);
        }
    }

    /**
     * Creates geoImage frame.
     * @protected
     */
    protected _createFrame() {
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

            let gridBufferArr = this._planet._geoImageCreator.createGridBuffer(this._cornersWgs84, this._projType === 1);

            this._gridBufferHigh = gridBufferArr[0];
            this._gridBufferLow = gridBufferArr[1];

            this._refreshFrame = false;
        }
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
            this._creationProceeding && p._geoImageCreator.remove(this);
            p._clearLayerMaterial(this);

            if (gl) {
                gl.deleteBuffer(this._gridBufferHigh as WebGLBuffer);
                gl.deleteBuffer(this._gridBufferLow as WebGLBuffer);
                gl.deleteTexture(this._sourceTexture as WebGLTexture);
                this._materialTexture && !this._materialTexture.default && gl.deleteTexture(this._materialTexture);
            }
        }

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

    /**
     * @public
     * @override
     * @returns {Array<number>} -
     */
    public override applyMaterial(material: Material): NumberArray4 {
        let segment = material.segment;

        if (this._ready) {
            material.applyTexture(this._materialTexture);
        } else {
            material.texture = this._planet!.transparentTexture;
            !this._creationProceeding && this.loadMaterial(material);
        }

        let v0s, v0t;
        if (this._projType === 0) {
            v0s = this._extentWgs84;
            v0t = segment._extent;
        } else {
            v0s = this._extentMerc;
            v0t = segment.getExtentMerc();
        }

        let sSize_x = v0s.northEast.lon - v0s.southWest.lon;
        let sSize_y = v0s.northEast.lat - v0s.southWest.lat;
        let dV0s_x = (v0t.southWest.lon - v0s.southWest.lon) / sSize_x;
        let dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
        let dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
        let dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;

        return [dV0s_x, dV0s_y, dSize_x, dSize_y];
    }

    /**
     * Gets frame width size in pixels.
     * @public
     * @returns {Number} Frame width.
     */
    public get getFrameWidth(): number {
        return this._frameWidth;
    }

    /**
     * Gets frame height size in pixels.
     * @public
     * @returns {Number} Frame height.
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
        let sh = h.programs.geoImageTransform._program;
        let sha = sh.attributes,
            shu = sh.uniforms;

        gl.disable(gl.CULL_FACE);

        f.bindOutputTexture(this._materialTexture as WebGLTexture);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1i(shu.isFullExtent, this._isFullExtent);

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
        let sh = h.programs.geoImageTransform._program;
        let sha = sh.attributes,
            shu = sh.uniforms;

        gl.disable(gl.CULL_FACE);

        f.bindOutputTexture(this._materialTexture as WebGLTexture);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer as WebGLBuffer);

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

        gl.enable(gl.CULL_FACE);

        this._ready = true;

        this._creationProceeding = false;
    }
}

export {BaseGeoImage};
