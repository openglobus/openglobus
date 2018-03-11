/**
 * @module og/utils/ImageBitmapLoader
 */

'use strict';

const NUM_WORKERS = 1;
const MAX_REQUESTS = 12;

function program(maxRequests = 12) {
    return `var maxRequests = ${maxRequests};
    var _loading = 0;
    var _queue = [];
    
    var processQueue = function() {
        if (_queue.length > 0 && _loading < maxRequests) {
            
            var q = _queue.shift(),
                src = q.src,
                options = q.options || {};

            _loading++;
            
            return fetch(src, options).then((response) => {
                if (!response.ok) {
                    throw Error("Unable to load '" + src + "'");
                }
                return response.blob();
            })
            .then(createImageBitmap)
            .then((imageBitmap) => {
                _loading--;
                self.postMessage({ 'ok': true, 'imageBitmap': imageBitmap, 'queue': _queue.length }, [imageBitmap]);
            })
            .then(processQueue)
            .catch((err) => {
                _loading--;
                self.postMessage({ 'ok': false, 'error': err.toString(), 'queue': _queue.length });
                processQueue();
            });
        }
    }
    self.onmessage = function (e) {
        var toEnqueue = e.data;
        if (_queue.indexOf(toEnqueue.src) < 0) {
            _queue.push(toEnqueue);
            processQueue();
        }
    }`;
};

class ImageBitmapLoader {
    constructor(options) {
        options = options || {};

        this._workers = new Array(options.numWorkers || NUM_WORKERS);
        this._counter = 0;

        var p = new Blob([program(options.maxRequests || MAX_REQUESTS)], { type: 'application/javascript' });

        for (var i = 0; i < this._workers.length; i++) {
            this._workers[i] = new Worker(URL.createObjectURL(p));
        }
    }

    load(src, callback, options) {
        var _w = this._workers[this._counter++ % this._workers.length];
        _w.onmessage = (e) => callback && callback(e);
        _w.postMessage({ 'src': src, 'options': options });
    }
};

export { ImageBitmapLoader };