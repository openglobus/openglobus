import { QueueArray } from "../QueueArray";

export type HTMLImageElementExt = HTMLImageElement & {
    __nodeIndex?: number;
    atlasWidth?: number;
    atlasHeight?: number;
};
export type ImagesCacheManagerCallback = (image: HTMLImageElementExt) => void;

interface IImagesCacheRequest {
    src: string;
    success: ImagesCacheManagerCallback;
}

class ImagesCacheManager {
    public imagesCache: Record<string, HTMLImageElementExt>;

    protected _counter: number;
    protected _pendingsQueue: QueueArray<IImagesCacheRequest>;
    protected _imageIndexCounter: number;
    protected _loadingImages: HTMLImageElementExt[];

    constructor() {
        this.imagesCache = {};

        this._counter = 0;
        this._pendingsQueue = new QueueArray<IImagesCacheRequest>();
        this._imageIndexCounter = 0;
        this._loadingImages = [];
    }

    public abort() {
        this._pendingsQueue.clear();

        for (let i = 0; i < this._loadingImages.length; i++) {
            this._loadingImages[i].onload = null;
            this._loadingImages[i].onerror = null;
        }

        this._loadingImages = [];
        this._counter = 0;
    }

    public load(src: string, success: ImagesCacheManagerCallback) {
        if (this.imagesCache[src]) {
            success(this.imagesCache[src]);
        } else {
            let req = { src: src, success: success };
            if (this._counter >= 1) {
                this._pendingsQueue.unshift(req);
            } else {
                this._exec(req);
            }
        }
    }

    protected _exec(req: IImagesCacheRequest) {
        this._counter++;
        const that = this;

        let img: HTMLImageElementExt = new Image();
        img.crossOrigin = "";

        this._loadingImages.push(img);

        /** Takes the image off the in flight list, so abort() has nothing left to detach. */
        const settle = function () {
            img.onload = null;
            img.onerror = null;

            let i = that._loadingImages.indexOf(img);
            if (i !== -1) {
                that._loadingImages.splice(i, 1);
            }
        };

        img.onload = function () {
            settle();

            that.imagesCache[req.src] = img;
            img.__nodeIndex = that._imageIndexCounter++;
            req.success(img);
            that._dequeueRequest();
        };

        img.onerror = function () {
            settle();
            that._dequeueRequest();
        };

        img.src = req.src;
    }

    protected _dequeueRequest() {
        this._counter--;
        if (this._pendingsQueue.length && this._counter < 1) {
            while (this._pendingsQueue.length) {
                let req = this._pendingsQueue.pop();
                if (req) {
                    if (this.imagesCache[req.src]) {
                        if (this._counter <= 0) {
                            this._counter = 0;
                        } else {
                            this._counter--;
                        }
                        req.success(this.imagesCache[req.src]);
                    } else {
                        this._exec(req);
                        break;
                    }
                }
            }
        }
    }
}

export { ImagesCacheManager };
