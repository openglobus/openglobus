import {ImageCanvas} from "../ImageCanvas";
import {Rectangle} from "../Rectangle";
import {ImagesCacheManager} from "./ImagesCacheManager";
import type {HTMLImageElementExt, ImagesCacheManagerCallback} from "./ImagesCacheManager";
import {Handler} from "../webgl/Handler";
import type {WebGLTextureExt} from "../webgl/Handler";

/**
 * Texture atlas stores images in one texture. Each image has its own
 * atlas texture coordinates.
 * @class
 * @param {number} [width=1024] - Texture atlas width, if it hasn't 1024 default.
 * @param {number} [height=1024] - Texture atlas height, if it hasn't 1024 default.
 */
class TextureAtlas {
    /**
     * Atlas nodes where input images store. It can be accessed by image.__nodeIndex.
     * @public
     * @type {Map<number, TextureAtlasNode>}
     */
    public nodes: Map<number, TextureAtlasNode>;

    /**
     * Created gl texture.
     * @public
     */
    public texture: WebGLTextureExt | null;

    /**
     * Atlas canvas.
     * @public
     * @type {ImageCanvas}
     */
    public canvas: ImageCanvas;

    public borderSize: number;

    protected _handler: Handler | null;
    protected _images: HTMLImageElementExt[];
    protected _btree: TextureAtlasNode | null;
    protected _imagesCacheManager: ImagesCacheManager;

    constructor(width: number = 1024, height: number = 1024) {

        this.nodes = new Map<number, TextureAtlasNode>();

        this.texture = null;

        this.canvas = new ImageCanvas(width, height);

        this.clearCanvas();

        this._handler = null;

        this._images = [];

        this._btree = null;

        this._imagesCacheManager = new ImagesCacheManager();

        this.borderSize = 4;
    }

    /**
     * Returns atlas javascript image object.
     * @public
     * @returns {HTMLImageElement} -
     */
    public getImage() {
        return this.canvas.getImage();
    }

    /**
     * Returns canvas object.
     * @public
     * @returns {HTMLCanvasElement} -
     */
    public getCanvas(): HTMLCanvasElement {
        return this.canvas.getCanvas();
    }

    /**
     * Clear atlas with black.
     * @public
     */
    public clearCanvas() {
        this.canvas.fillEmpty();
    }

    /**
     * Sets openglobus gl handler that creates gl texture.
     * @public
     * @param {Handler} handler - WebGL handler.
     */
    public assignHandler(handler: Handler) {
        this._handler = handler;
        this.createTexture();
    }

    /**
     * Returns image diagonal size.
     * @param {HTMLImageElementExt} image - Image object.
     * @returns {number} -
     */
    public getDiagonal(image: HTMLImageElementExt): number {
        let w = image.atlasWidth || image.width,
            h = image.atlasHeight || image.height;
        return Math.sqrt(w * w + h * h);
    }

    /**
     * Adds image to the atlas and returns created node with texture coordinates of the stored image.
     * @public
     * @param {HTMLImageElementExt} image - Input javascript image object.
     * @param {boolean} [fastInsert] - If it's true atlas doesn't restore all images again
     * and store image in the current atlas scheme.
     * @returns {TextureAtlasNode | undefined} -
     */
    public addImage(image: HTMLImageElementExt, fastInsert: boolean = false): TextureAtlasNode | undefined {
        if (!(image.width && image.height)) {
            return;
        }

        this._images.push(image);

        this._makeAtlas(fastInsert);

        if (image.__nodeIndex != undefined) {
            return this.get(image.__nodeIndex);
        }
    }

    protected _completeNode(nodes: Map<number, TextureAtlasNode>, node?: TextureAtlasNode | null) {
        if (node) {

            let w = this.canvas.getWidth(),
                h = this.canvas.getHeight();

            let im = node.image!;
            let r = node.rect;
            let bs = Math.round(this.borderSize * 0.5);
            this.canvas.drawImage(im, r.left + bs, r.top + bs, im.atlasWidth || 0, im.atlasHeight || 0);

            let tc = node.texCoords;

            tc[0] = (r.left + bs) / w;
            tc[1] = (r.top + bs) / h;

            tc[2] = (r.left + bs) / w;
            tc[3] = (r.bottom - bs) / h;

            tc[4] = (r.right - bs) / w;
            tc[5] = (r.bottom - bs) / h;

            tc[6] = (r.right - bs) / w;
            tc[7] = (r.bottom - bs) / h;

            tc[8] = (r.right - bs) / w;
            tc[9] = (r.top + bs) / h;

            tc[10] = (r.left + bs) / w;
            tc[11] = (r.top + bs) / h;

            nodes.set(im.__nodeIndex!, node);
        }
    }

    /**
     * Main atlas making function.
     * @protected
     * @param {boolean} [fastInsert] - If it's true atlas doesn't restore all images again
     * and store image in the current atlas scheme.
     */
    protected _makeAtlas(fastInsert: boolean = false) {
        if (fastInsert && this._btree) {
            let im = this._images[this._images.length - 1];
            this._completeNode(this.nodes, this._btree.insert(im));
        } else {
            let im = this._images.slice(0);

            im.sort(function (b: HTMLImageElementExt, a: HTMLImageElementExt) {
                return (
                    (a.atlasWidth || a.width) - (b.atlasWidth || b.width) ||
                    (a.atlasHeight || a.height) - (b.atlasHeight || b.height)
                );
            });

            this._btree = new TextureAtlasNode(
                new Rectangle(0, 0, this.canvas.getWidth(), this.canvas.getHeight())
            );
            this._btree.atlas = this;

            this.clearCanvas();

            let newNodes = new Map<number, TextureAtlasNode>();
            for (let i = 0; i < im.length; i++) {
                this._completeNode(newNodes, this._btree.insert(im[i]));
            }
            //@ts-ignore
            this.nodes = null;
            this.nodes = newNodes;
        }
    }

    public get(key: number): TextureAtlasNode | undefined {
        return this.nodes.get(key);
    }

    public set(key: number, value: TextureAtlasNode) {
        this.nodes.set(key, value);
    }

    /**
     * Creates atlas gl texture.
     * @public
     */
    public createTexture(img?: HTMLImageElement | null, internalFormat?: number) {
        if (this._handler) {
            this._handler.gl!.deleteTexture(this.texture!);
            if (img) {
                this.canvas.resize(img.width, img.height);
                this.canvas.drawImage(img, 0, 0, img.width, img.height);
            }
            this.texture = this._handler.createTexture_l(this.canvas.getCanvas(), internalFormat)!;
        }
    }

    /**
     * Asynchronous function that loads and creates image to the image cache, and call success callback when it's done.
     * @public
     * @param {string} src - Image object src string.
     * @param {ImagesCacheManagerCallback} success - The callback that handles the image loads done.
     */
    public loadImage(src: string, success: ImagesCacheManagerCallback) {
        this._imagesCacheManager.load(src, success);
    }

    public getImageTexCoordinates(img: HTMLImageElementExt): number[] | undefined {
        if (img.__nodeIndex != null) {
            let n = this.get(img.__nodeIndex);
            if (n) {
                return n.texCoords;
            }
        }
    }
}

/**
 * Atlas binary tree node.
 * @class
 * @param {Rectangle} rect - Node image rectangle.
 * @param {number[]} texCoords - Node image rectangle.
 */
class TextureAtlasNode {
    public childNodes: TextureAtlasNode[] | null;
    public image: HTMLImageElementExt | null;
    public rect: Rectangle;
    public texCoords: number[];
    public atlas: TextureAtlas | null;

    constructor(rect?: Rectangle, texCoords?: number[]) {
        this.childNodes = null;
        this.image = null;
        this.rect = rect || new Rectangle();
        this.texCoords = texCoords || [];
        this.atlas = null;
    }

    public insert(img: HTMLImageElementExt): TextureAtlasNode | undefined {
        if (this.childNodes) {
            let newNode = this.childNodes[0].insert(img);

            if (newNode) {
                return newNode;
            }

            return this.childNodes[1].insert(img);
        } else {
            if (this.image != null) {
                return;
            }

            let rc = this.rect;
            const w = (img.atlasWidth || img.width) + this.atlas!.borderSize;
            const h = (img.atlasHeight || img.height) + this.atlas!.borderSize;

            if (w > rc.getWidth() || h > rc.getHeight()) {
                return;
            }

            if (rc.fit(w, h)) {
                this.image = img;
                return this;
            }

            this.childNodes = new Array(2);
            this.childNodes[0] = new TextureAtlasNode();
            this.childNodes[0].atlas = this.atlas;
            this.childNodes[1] = new TextureAtlasNode();
            this.childNodes[1].atlas = this.atlas;

            const dw = rc.getWidth() - w;
            const dh = rc.getHeight() - h;

            if (dw > dh) {
                this.childNodes[0].rect.set(rc.left, rc.top, rc.left + w, rc.bottom);
                this.childNodes[1].rect.set(rc.left + w, rc.top, rc.right, rc.bottom);
            } else {
                this.childNodes[0].rect.set(rc.left, rc.top, rc.right, rc.top + h);
                this.childNodes[1].rect.set(rc.left, rc.top + h, rc.right, rc.bottom);
            }

            return this.childNodes[0].insert(img);
        }
    }
}

export {TextureAtlas, TextureAtlasNode};
