import { BaseBillboard } from "./BaseBillboard";
import type { IBaseBillboardParams } from "./BaseBillboard";
import { BillboardHandler } from "./BillboardHandler";
import type { HTMLImageElementExt } from "../../utils/ImagesCacheManager";
import { Vec2 } from "../../math/Vec2";
import { LOCK_FREE, LOCK_UPDATE } from "../label/LabelWorker";

export interface IBillboardParams extends IBaseBillboardParams {
    src?: string;
    image?: HTMLImageElement;
    size?: [number, number] | null;
    width?: number | null;
    height?: number | null;
    scale?: number | null;
}

/**
 * Represents basic quad billboard image.
 * @class
 * @extends {BaseBillboard}
 * @param {Object} [options] - Options:
 * @param {Vec3|Array.<number>} [options.position] - Billboard spatial position.
 * @param {number} [options.rotation] - Screen angle rotation.
 * @param {Vec4|string|Array.<number>} [options.color] - Billboard color.
 * @param {Vec3|Array.<number>} [options.alignedAxis] - Billboard aligned vector.
 * @param {Vec2|Array.<number>} [options.offset] - Billboard center screen offset.
 * @param {boolean} [options.visibility] - Visibility.
 * @param {string} [options.src] - Billboard image url source.
 * @param {Image} [options.image] - Billboard image object.
 * @param {number} [options.width] - Screen width.
 * @param {number} [options.height] - Screen height.
 * @param {number} [options.scale] - Billboard scale.
 */
class Billboard extends BaseBillboard {
    public override _handler: BillboardHandler | null;

    /**
     * Image src.
     * @protected
     * @type {string}
     */
    protected _src: string | null;

    /**
     * Image object.
     * @protected
     * @type {Object}
     */
    protected _image: (HTMLImageElement & { __nodeIndex?: number }) | null;

    protected _scale: number;

    /**
     * Billboard screen width.
     * @public
     * @type {number}
     */
    public _width: number;

    /**
     * Billboard screen height.
     * @public
     * @type {number}
     */
    public _height: number;

    constructor(options: IBillboardParams = {}) {
        super(options);

        this._handler = null;

        this._src = options.src || null;

        this._image = options.image || null;

        this._scale = options.scale ?? 1.0;

        this._width = options.width ?? (options.size ? options.size[0] : 0);

        this._height = options.height ?? (options.size ? options.size[1] : 0);

        this._applyImageSize(this._image);
    }

    protected _applyImageSize(image: HTMLImageElementExt | HTMLImageElement | null) {
        if (!image) {
            return;
        }

        if (this._width === 0) {
            this._width = image.width;
        }

        if (this._height === 0) {
            this._height = image.height;
        }

        this._handler &&
            this._handler.setSizeArr(this._handlerIndex, this._width * this._scale, this._height * this._scale);
    }

    /**
     * Sets billboard image url source.
     * @public
     * @param {string} src - Image url.
     */
    public setSrc(src: string | null) {
        this._src = src;
        let bh = this._handler;
        if (bh && src && src.length) {
            let rn = bh._entityCollection.scene;
            if (rn && rn.renderer) {
                let ta = rn.renderer.billboardsTextureAtlas;
                let that = this;
                ta.loadImage(src, function (img: HTMLImageElementExt) {
                    if (img.__nodeIndex != undefined && ta.get(img.__nodeIndex)) {
                        that._image = img;
                        that._applyImageSize(img);
                        bh!.setTexCoordArr(that._handlerIndex, ta.get(that._image!.__nodeIndex!)!.texCoords);
                    } else {
                        ta.addImage(img);
                        ta.createTexture();
                        that._image = img;
                        that._applyImageSize(img);
                        rn!.updateBillboardsTexCoords();
                    }
                });
            }
        }
    }

    public getSrc(): string | null {
        return this._src;
    }

    /**
     * Sets image object.
     * @public
     * @param {Object} image - JavaScript image object.
     */
    public setImage(image: HTMLImageElement) {
        this.setSrc(image.src);
    }

    public getImage(): HTMLImageElementExt | null {
        return this._image;
    }

    /**
     * Sets billboard screen size in pixels.
     * @public
     * @param {number} width - Billboard width.
     * @param {number} height - Billboard height.
     */
    public setSize(width: number, height: number) {
        this._width = width;
        this._height = height;
        this._handler && this._handler.setSizeArr(this._handlerIndex, width * this._scale, height * this._scale);
    }

    public getScale(): number {
        return this._scale;
    }

    public override setOffset(x: number, y: number) {
        this._offset.x = x;
        this._offset.y = y;

        if (this._isReady && this._handler) {
            this._handler.setOffsetArr(this._handlerIndex, new Vec2(x * this._scale, y * this._scale));
        } else if (this._lockId !== LOCK_FREE) {
            this._lockId = LOCK_UPDATE;
        }
    }

    /**
     * Returns billboard screen size.
     * @public
     * @returns {Object}
     */
    public getSize(): { width: number; height: number } {
        return {
            width: this._width,
            height: this._height
        };
    }

    /**
     * Sets billboard screen width.
     * @public
     * @param {number} width - Width.
     */
    public setWidth(width: number) {
        this.setSize(width, this._height);
    }

    /**
     * Gets billboard screen width.
     * @public
     * @returns {number}
     */
    public getWidth(): number {
        return this._width;
    }

    /**
     * Sets billboard screen heigh.
     * @public
     * @param {number} height - Height.
     */
    public setHeight(height: number) {
        this.setSize(this._width, height);
    }

    /**
     * Gets billboard screen height.
     * @public
     * @returns {number}
     */
    public getHeight(): number {
        return this._height;
    }
}

export { Billboard };
