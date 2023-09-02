import {BaseBillboard, IBaseBillboardParams} from "./BaseBillboard";
import {BillboardHandler} from "./BillboardHandler";
export interface IBillboardParams extends IBaseBillboardParams {
    src?: string;
    image?: HTMLImageElement;
    size?: [number, number];
    width?: number;
    height?: number;
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
 * @param {Vec3|Array.<number>} [options.offset] - Billboard center screen offset.
 * @param {boolean} [options.visibility] - Visibility.
 * @param {string} [options.src] - Billboard image url source.
 * @param {Image} [options.image] - Billboard image object.
 * @param {number} [options.width] - Screen width.
 * @param {number} [options.height] - Screen height.
 * @param {number} [options.scale] - Billboard scale.
 */
class Billboard extends BaseBillboard {

    protected override _handler: BillboardHandler | null;

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
    protected _image: HTMLImageElement & { __nodeIndex?: number } | null;

    protected _scale: number;

    /**
     * Billboard screen width.
     * @protected
     * @type {number}
     */
    protected _width: number;

    /**
     * Billboard screen height.
     * @protected
     * @type {number}
     */
    protected _height: number;

    constructor(options: IBillboardParams = {}) {

        super(options);

        this._handler = null;

        this._src = options.src || null;

        this._image = options.image || null;

        this._scale = 1.0;

        this._width = options.width || (options.size ? options.size[0] : 30);

        this._height = options.height || (options.size ? options.size[1] : 30);
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
            //@ts-ignore
            let rn = bh._entityCollection.renderNode;
            if (rn && rn.renderer) {
                let ta = rn.renderer.billboardsTextureAtlas;
                let that = this;
                ta.loadImage(src, function (img: any) {
                    if (ta.get(img.__nodeIndex)) {
                        that._image = img;
                        bh!.setTexCoordArr(
                            that._handlerIndex,
                            ta.get(that._image!.__nodeIndex!)!.texCoords
                        );
                    } else {
                        ta.addImage(img);
                        ta.createTexture();
                        that._image = img;
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

    public getImage(): HTMLImageElement | null {
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
        this._handler &&
        this._handler.setSizeArr(this._handlerIndex, width * this._scale, height * this._scale);
    }

    /**
     * Returns billboard screen size.
     * @public
     * @returns {Object}
     */
    public getSize(): { width: number, height: number } {
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

export {Billboard};
