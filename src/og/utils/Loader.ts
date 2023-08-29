import {EventsHandler, createEvents} from '../Events';
import {Planet} from "../scene/Planet";
import {Segment} from "../segment/Segment";

type LoaderEventsList = ["loadend", "layerloadend"];

const LOADER_EVENTS: LoaderEventsList = ["loadend", "layerloadend"];

interface IResponse {
    status: string;
    data?: any;
    msg?: string;
}

type IResponseCallback = (response: IResponse) => void;

// interface IResponseHandler {
//     json: (r: Response) => Promise<any>;
//     blob: (r: Response) => Promise<Blob>;
//     arrayBuffer: (r: Response) => Promise<ArrayBuffer>;
//     imageBitmap: (r: Response) => Promise<ImageBitmap>;
//     text: (r: Response) => Promise<string>;
// }

interface Obj<T> {
    __id: number;
    isIdle: boolean;
    isEqual: (obj: T) => boolean;
    events: EventsHandler<any>
    _planet: Planet | null;

}

type QueryParams<T> = {
    sender?: T,
    src: string,
    type: string,
    filter?: (val: QueryParams<T>) => boolean,
    options?: any,
    segment?: Segment
};

type QueueData<T> = {
    params: QueryParams<T>,
    callback: IResponseCallback
};

type RequestCounter<T> = {
    sender: T,
    counter: number,
    __requestCounterFrame__: number
};


export class Loader<T extends Obj<T>> {
    public MAX_REQUESTS: number;

    public events: EventsHandler<LoaderEventsList>;

    protected _loading: number;

    protected _queue: QueueData<T>[];//new QueueArray();

    protected _senderRequestCounter: RequestCounter<T>[];

    protected _promises: { [key: string]: (r: Response) => Promise<any> };//IResponseHandler;

    constructor(maxRequests: number = 24) {

        this.MAX_REQUESTS = maxRequests;

        this.events = createEvents(LOADER_EVENTS);

        this._loading = 0;

        this._queue = [];//new QueueArray();

        this._senderRequestCounter = [];

        this._promises = {
            'json': r => r.json(),
            'blob': r => r.blob(),
            'arrayBuffer': r => r.arrayBuffer(),
            'imageBitmap': r => r.blob().then(
                (r: Blob) => createImageBitmap(r, {
                    premultiplyAlpha: "premultiply"
                })),
            'text': r => r.text()
        };
    }

    public load(params: QueryParams<T>, callback: IResponseCallback) {
        if (params.sender) {
            if (!this._senderRequestCounter[params.sender.__id]) {
                this._senderRequestCounter[params.sender.__id] = {
                    sender: params.sender, counter: 0, __requestCounterFrame__: 0
                };
            }
            this._senderRequestCounter[params.sender.__id].counter++;
        }
        this._queue.push({params, callback});
        this._exec();
    }

    public fetch(params: QueryParams<T>) {
        return fetch(params.src, params.options || {})
            .then((response: Response) => {
                if (!response.ok) {
                    throw Error(`Unable to load '${params.src}'`);
                }
                return this._promises[params.type || "blob"](response);
            })

            .then((data: any) => {
                return {status: "ready", data: data};

            })

            .catch((err: Error) => {
                return {status: "error", msg: err.toString()};
            });
    }

    public getRequestCounter(sender: T): number {
        if (sender) {
            let r = this._senderRequestCounter[sender.__id];
            if (r) {
                return r.counter;
            }
        }
        return 0;
    }

    public isIdle(sender: T): boolean {
        return sender.isIdle;
    }

    protected _checkLoadend(request: RequestCounter<T>, sender: T) {
        if (request.counter === 0 && (!sender._planet || sender._planet._terrainCompletedActivated)) {
            sender.events.dispatch(sender.events.loadend, sender);
            this.events.dispatch(this.events.layerloadend, sender);
            request.__requestCounterFrame__ = 0;
        } else {
            request.__requestCounterFrame__ = requestAnimationFrame(() => {
                this._checkLoadend(request, sender);
            });
        }
    }

    protected _handleResponse(q: QueueData<T>, response: IResponse) {
        q.callback(response);
        let sender = q.params.sender;
        if (sender && (sender.events.loadend!.handlers.length || this.events.layerloadend!.handlers.length)) {
            let request = this._senderRequestCounter[sender.__id];
            if (request && request.counter > 0) {
                request.counter--;
                cancelAnimationFrame(request.__requestCounterFrame__!);
                request.__requestCounterFrame__ = requestAnimationFrame(() => {
                    this._checkLoadend(request, sender!);
                });
            }
        }
        this._exec();
    }

    protected _exec() {

        if (this._queue.length > 0 && this._loading < this.MAX_REQUESTS) {

            let q = this._queue.pop()!;

            if (!q) return;

            let p = q.params;

            if (!p.filter || p.filter(p)) {

                this._loading++;

                return fetch(p.src!, p.options || {})
                    .then((response: Response) => {
                        if (!response.ok) {
                            throw Error(`Unable to load '${p.src}'`);
                        }
                        return this._promises[p.type || "blob"](response);
                    })
                    .then((data: any) => {
                        this._loading--;
                        this._handleResponse(q, {status: "ready", data: data});
                    })
                    .catch((err: Error) => {
                        this._loading--;
                        this._handleResponse(q, {status: "error", msg: err.toString()});
                    });

            } else {
                this._handleResponse(q, {status: "abort"});
            }
        } else if (this._loading === 0) {
            this.events.dispatch(this.events.loadend);
        }
    }

    public abort(sender: T) {

        if (this._senderRequestCounter[sender.__id]) {
            this._senderRequestCounter[sender.__id].counter = 0;
            cancelAnimationFrame(this._senderRequestCounter[sender.__id].__requestCounterFrame__);
            this._senderRequestCounter[sender.__id].__requestCounterFrame__ = 0;
        }

        for (let i = 0, len = this._queue.length; i < len; i++) {
            let qi = this._queue[i];
            if (qi && qi.params.sender && sender.isEqual(qi.params.sender)) {
                qi.callback({'status': "abort"});
                //@ts-ignore
                this._queue[i] = null;
            }
        }
    }

    public abortAll() {
        for (let i = 0, len = this._queue.length; i < len; i++) {
            let qi = this._queue[i];
            if (qi) {
                let sender = qi.params.sender;
                if (sender && this._senderRequestCounter[sender.__id]) {
                    this._senderRequestCounter[sender.__id].counter = 0;
                    cancelAnimationFrame(this._senderRequestCounter[sender.__id].__requestCounterFrame__);
                    this._senderRequestCounter[sender.__id].__requestCounterFrame__ = 0;
                }
                qi.callback({'status': "abort"});
                //@ts-ignore
                this._queue[i] = null;
            }
        }
        this._queue = [];
    }
}