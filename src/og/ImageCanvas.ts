"use strict";

/**
 * Usefull class for working with JS canvas object.
 * @class
 * @param {number} [width] - Canvas width. Default 256.
 * @param {number} [height] - Canvas height. Default 256.
 */
class ImageCanvas {

    /**
     * Canvas object.
     * @protected
     * @type {Object}
     */
    protected _canvas: HTMLCanvasElement;

    /**
     * Canvas context.
     * @protected
     * @type {Object}
     */
    protected _context: CanvasRenderingContext2D;

    constructor(width: number = 256, height: number = 256) {
        this._canvas = document.createElement("canvas");
        this._canvas.width = width;
        this._canvas.height = height;

        this._context = this._canvas.getContext("2d", {
            willReadFrequently: true
        }) as CanvasRenderingContext2D;

    }

    /**
     * Returns canvas object.
     * @public
     * @returns {Object}
     */
    public getCanvas(): HTMLCanvasElement {
        return this._canvas;
    }

    /**
     * Returns canvas context pointer.
     * @public
     * @returns {Object}
     */
    public getContext(): CanvasRenderingContext2D {
        return this._context;
    }

    /**
     * Fills canvas RGBA with zeroes.
     * @public
     */
    public fillEmpty() {
        let imgd = this._context.getImageData(0, 0, this._canvas.width, this._canvas.height);
        let pixels = imgd.data;
        for (let i = 0, n = pixels.length; i < n; i += 4) {
            pixels[i] = pixels[i + 1] = pixels[i + 2] = pixels[i + 3] = 0;
        }
        this._context.putImageData(imgd, 0, 0);
    }

    /**
     * Fills canvas RGBA with color.
     * @public
     * @param {string} color - CSS string color.
     */
    public fill(color: string) {
        this._context.fillStyle = color
        this._context.fill()
    }

    /**
     * Gets canvas pixels RGBA data.
     * @public
     * @returns {Uint8ClampedArray}
     */
    public getData(): Uint8ClampedArray {
        let imgd = this._context.getImageData(0, 0, this._canvas.width, this._canvas.height);
        return imgd.data;
    }

    /**
     * Fill the canvas by color.
     * @public
     * @param {string} color - CSS string color.
     */
    public fillColor(color: string) {
        this._context.fillStyle = color;
        this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);
    }

    /**
     * Sets RGBA pixel data.
     * @public
     * @param {Array.<number>} data - Array RGBA data.
     */
    public setData(data: ArrayLike<number>) {
        let imageData = this._context.createImageData(this._canvas.width, this._canvas.height);
        imageData.data.set(data);
        this._context.putImageData(imageData, 0, 0);
    }

    /**
     * Resize canvas.
     * @public
     * @param {number} width - Width.
     * @param {number} height - Height.
     */
    public resize(width: number, height: number) {
        this._canvas.width = width;
        this._canvas.height = height;
        this._context = this._canvas.getContext("2d") as CanvasRenderingContext2D;
    }

    /**
     * Draw an image on the canvas.
     * @public
     * @param {Image} img - Draw image.
     * @param {number} [x] - Left top image corner X coordinate on the canvas.
     * @param {number} [y] - Left top image corner Y coordinate on the canvas.
     * @param {number} [width] - Image width slice. Image width is default.
     * @param {number} [height] - Image height slice. Image height is default.
     */
    public drawImage(img: HTMLImageElement, x: number, y: number, width: number, height: number) {
        this._context.drawImage(img, x || 0, y || 0, width || img.width, height || img.height);
    }

    /**
     * Converts canvas to JS image object.
     * @public
     * @returns {Image}
     */
    public getImage(): HTMLImageElement {
        let img = new Image();
        img.width = this.getWidth();
        img.height = this.getHeight();
        img.src = this._canvas.toDataURL("image/png");
        return img;
    }

    /**
     * Get measured text width.
     * @public
     * @param {string} text - Measured text.
     * @returns {number}
     */
    public getTextWidth(text: string): number {
        let metrics = this._context.measureText(text);
        return Math.round(metrics.width);
    }

    /**
     * Draw a text on the canvas.
     * @public
     * @param {string} text - Text.
     * @param {number} [x] - Canvas X - coordinate. 0 - default.
     * @param {number} [y] - Canvas Y - coordinate. 0 - default.
     * @param {string} [font] - Font style. 'normal 14px Verdana' - is default.
     * @param {string} [color] - Css font color.
     */
    public drawText(text: string, x: number = 0, y: number = 14, font: string = "normal 14px Verdana", color: string = "black") {
        this._context.fillStyle = color;
        this._context.font = font;
        this._context.fillText(text, x, y);
    }

    /**
     * Gets canvas width.
     * @public
     * @returns {number}
     */
    public getWidth(): number {
        return this._canvas.width;
    }

    /**
     * Gets canvas height.
     * @public
     * @returns {number}
     */
    public getHeight(): number {
        return this._canvas.height;
    }

    /**
     * Load image to canvas.
     * @public
     * @param {string} url - Image url.
     * @param {Function} [callback] - Image onload callback.
     */
    public load(url: string, callback: Function) {
        let img = new Image();
        let that = this;
        img.onload = function () {
            that.resize(img.width, img.height);
            that._context.drawImage(img, 0, 0, img.width, img.height);
            callback && callback(img);
        };
        img.src = url;
    }

    /**
     * Open canvas image in the new window.
     * @public
     */
    public openImage() {
        let img = this.getImage();
        let dataUrl = img.src;

        let windowContent = "<!DOCTYPE html>";
        windowContent += "<html>";
        windowContent += "<head><title>Print</title></head>";
        windowContent += "<body>";
        windowContent += '<img src="' + dataUrl + '">';
        windowContent += "</body>";
        windowContent += "</html>";

        let printWin = window.open(
            "",
            "",
            "width=" + img.width + "px ,height=" + img.height + "px"
        );

        if (printWin) {
            printWin.document.open();
            printWin.document.write(windowContent);
            printWin.document.close();
            printWin.focus();
        }
    }

    public destroy() {
        this._canvas.width = 1;
        this._canvas.height = 1;
        //@ts-ignore
        this._canvas = null;
        //@ts-ignore
        this._context = null;
    }
}

export {ImageCanvas};
