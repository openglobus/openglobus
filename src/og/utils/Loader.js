'use strict';

import { Events } from '../Events.js';
import { QueueArray } from '../QueueArray.js';


const Loader = function (maxRequests = 12) {

    this.MAX_REQUESTS = maxRequests;

    this.events = new Events(["loadend"]);

    this._loading = 0;

    this._queue = new QueueArray();

    this._promises = {
        'json': r => r.json(),
        'blob': r => r.blob(),
        'arrayBuffer': r => r.arrayBuffer(),
        'imageBitmap': r => r.blob().then(createImageBitmap),
        'text': r => r.text()
    };
};

Loader.prototype.load = function (params, callback) {
    this._queue.push({ 'params': params, 'callback': callback });
    this._exec();
};

Loader.prototype._exec = function () {

    if (this._queue.length > 0 && this._loading < this.MAX_REQUESTS) {

        let q = this._queue.pop(),
            p = q.params;

        if (!p.filter || p.filter(p)) {

            this._loading++;

            return fetch(p.src, p.options || {})
                .then(response => {
                    if (!response.ok) {
                        throw Error(`Unable to load '${p.src}'`);
                    }
                    return this._promises[p.type || "blob"](response);
                })
                .then(data => {
                    this._loading--;
                    q.callback({ 'status': "ready", 'data': data });
                    this._exec();
                })
                .catch(err => {
                    this._loading--;
                    q.callback({ 'status': "error", 'msg': err.toString() });
                    this._exec();
                });

        } else {
            q.callback({ 'status': "abort" });
            this._exec();
        }
    } else if (this._loading === 0) {
        this.events.dispatch(this.events.loadend);
    }
};

Loader.prototype.abort = function () {
    this._queue.each(e => e.callback({ 'status': "abort" }));
    this._queue.clear();
};

export { Loader };