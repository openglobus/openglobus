import {QueueArray} from '../QueueArray';

type HTMLImageElementExt = HTMLImageElement & { __nodeIndex?: number };
type ImagesCacheCallback = (image: HTMLImageElementExt) => void;

interface IImagesCacheRequest {
    "src": string;
    "success": ImagesCacheCallback;
}

class ImagesCacheManager {

    public imagesCache: Record<string, HTMLImageElementExt>;

    protected _counter: number;
    protected _pendingsQueue: QueueArray<IImagesCacheRequest>;
    protected _imageIndexCounter: number;

    constructor() {
        this.imagesCache = {};

        this._counter = 0;
        this._pendingsQueue = new QueueArray<IImagesCacheRequest>();
        this._imageIndexCounter = 0;
    }

    public load(src: string, success: ImagesCacheCallback) {
        if (this.imagesCache[src]) {
            success(this.imagesCache[src]);
        } else {
            let req = {"src": src, "success": success};
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
        img.crossOrigin = '';
        img.onload = function () {
            that.imagesCache[req.src] = img;
            img.__nodeIndex = that._imageIndexCounter++;
            req.success(img);
            that._dequeueRequest();
        };

        img.onerror = function () {
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

export {ImagesCacheManager};