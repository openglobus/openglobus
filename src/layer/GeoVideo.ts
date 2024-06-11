import {BaseGeoImage, IBaseGeoImageParams} from "./BaseGeoImage";
import {Material} from "./Material";

export interface IGeoVideoParams extends IBaseGeoImageParams {
    videoElement?: HTMLVideoElement;
    src?: string;
}

/**
 * Used to load and display a video stream by specific corners coordinates on the globe.
 * @class
 * @extends {BaseGeoImage}
 */
class GeoVideo extends BaseGeoImage {

    /**
     * HTML5 video element object.
     * @protected
     * @type {HTMLVideoElement}
     */
    protected _video: HTMLVideoElement | null;

    /**
     * Video source url path.
     * @protected
     * @type {string}
     */
    protected _src: string | null;

    constructor(name: string | null, options: IGeoVideoParams = {}) {
        super(name, options);

        this._animate = true;

        this._video = options.videoElement || null;

        this._src = options.src || null;
    }

    public override get instanceName(): string {
        return "GeoVideo";
    }

    /**
     * Sets video source url path.
     * @public
     * @param {string} src - Video url path.
     */
    public  setSrc(src: string) {
        this._planet && this._planet._geoImageCreator.remove(this);
        this._src = src;
        this._sourceReady = false;
    }

    /**
     * Sets HTML5 video object.
     * @public
     * @param {HTMLVideoElement} video - HTML5 video element object.
     */
    public setVideoElement(video: HTMLVideoElement) {
        this._planet && this._planet._geoImageCreator.remove(this);
        this._video = video;
        this._src = video.src;
        this._sourceReady = false;
    }

    /**
     * Sets layer visibility.
     * @public
     * @param {boolean} visibility - Layer visibility.
     */
    public override setVisibility(visibility: boolean) {
        if (visibility != this._visibility) {
            super.setVisibility(visibility);
            if (this._planet) {
                if (visibility) {
                    this._sourceReady && this._planet._geoImageCreator.add(this);
                    this._video && this._video.play();
                } else {
                    this._sourceReady && this._planet._geoImageCreator.remove(this);
                    this._video && this._video.pause();
                }
            }
        }
    }

    /**
     * Creates or refresh source video GL texture.
     * @virtual
     * @protected
     */
    protected override _createSourceTexture() {
        let gl = this._planet!.renderer!.handler.gl!;
        if (this._sourceCreated) {
            gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture!);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._video!);
        } else {
            this._sourceTexture = this._planet!.renderer!.handler.createTexture_n_webgl1(this._video!);
            this._sourceCreated = true;
        }
    }

    /**
     * @private
     */
    protected _onCanPlay(video: HTMLVideoElement) {
        this._frameWidth = video.videoWidth;
        this._frameHeight = video.videoHeight;
        video.width = video.videoWidth;
        video.height = video.videoHeight;
        video.play();
        this._sourceReady = true;
        this._planet!._geoImageCreator.add(this);
    }

    protected _onError(video: HTMLVideoElement) {
        let err = "unknown error";
        switch (video.error!.code) {
            case 1:
                err = "video loading aborted";
                break;
            case 2:
                err = "network loading error";
                break;
            case 3:
                err = "video decoding failed / corrupted data or unsupported codec";
                break;
            case 4:
                err = "video not supported";
                break;
        }
        console.warn(`Error: ${err} error-code=${video.error!.code})`);
    }

    /**
     * Loads planet segment material. In this case - GeoImage source video.
     * @public
     * @param {Material} material - GeoImage planet material.
     */
    public override loadMaterial(material: Material) {
        material.isLoading = true;
        this._creationProceeding = true;
        if (!this._sourceReady && this._src) {
            if (this._video) {
                if (this._video.readyState === this._video.HAVE_ENOUGH_DATA) {
                    this._onCanPlay(this._video);
                } else if (this._video.src) {
                    let that = this;
                    this._video.addEventListener("canplay", function (e: Event) {
                        that._onCanPlay(this);
                    });
                }
            } else {
                this._video = document.createElement("video");
                this._video.crossOrigin = "Anonymous";
                let that = this;
                this._video.addEventListener("canplay", function () {
                    that._onCanPlay(this);
                });
                this._video.addEventListener("error", function () {
                    that._onError(this);
                });
            }
            this._video.autoplay = true;
            this._video.loop = true;
            this._video.src = this._src;
            this._video.muted = true;
            this._video.setAttribute("playsinline", "true");
            this._video.setAttribute("webkit-playsinline", "true");
        } else {
            this._planet!._geoImageCreator.add(this);
        }
    }

    /**
     * @virtual
     * @param {Material} material - GeoImage material.
     */
    public override abortMaterialLoading(material: Material) {
        this._video && (this._video.src = "");
        this._creationProceeding = false;
        material.isLoading = false;
        material.isReady = false;
    }
}

export {GeoVideo};
