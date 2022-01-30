'use strict';

import { Events } from '../Events.js';

if (window && !('createImageBitmap' in window)) {
    window.createImageBitmap = function (blob) {
        return new Promise((resolve, reject) => {
            let img = document.createElement('img');
            img.addEventListener('load', function () {
                resolve(this);
            });
            img.src = URL.createObjectURL(blob);
        });
    };
}

export class Loader {

    constructor(maxRequests = 24) {

        this.MAX_REQUESTS = maxRequests;

        this.events = new Events(["loadend"]);

        this._loading = 0;

        this._queue = [];//new QueueArray();

        this._promises = {
            'json': r => r.json(),
            'blob': r => r.blob(),
            'arrayBuffer': r => r.arrayBuffer(),
            'imageBitmap': r => r.blob().then(createImageBitmap),
            'text': r => r.text()
        };
    }

    load(params, callback) {
        this._queue.push({ 'params': params, 'callback': callback });
        this._exec();
    }

    fetch(params) {
        return fetch(
            params.src,
            params.options || {})

            .then(response => {
                if (!response.ok) {
                    throw Error(`Unable to load '${params.src}'`);
                }
                return this._promises[params.type || "blob"](response);
            })

            .then(data => {
                return { 'status': "ready", 'data': data };

            })

            .catch(err => {
                return { 'status': "error", 'msg': err.toString() };
            });
    }

    _exec() {

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
    }

    abort() {
        //this._queue.each(e => e.callback({ 'status': "abort" }));
        //this._queue.clear();

        for (let i = 0, len = this._queue.length; i < len; i++) {
            this._queue[i].callback({ 'status': "abort" });
            this._queue[i] = null;
        }
        this._queue = [];
    }
}