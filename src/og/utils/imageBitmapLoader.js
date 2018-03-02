goog.provide('og.utils.ImageBitmapLoader');

og.utils.ImageBitmapLoader = function (options) {
    options = options || {};
    var p = new Blob([og.utils.ImageBitmapLoader.Program(options.maxCount)], { type: 'application/javascript' });
    this._worker = new Worker(URL.createObjectURL(p));
};

og.utils.ImageBitmapLoader.Program = function (maxCount = 12) {
    return `var _maxCount = ${maxCount};
    var _loading = 0;
    var _queue = [];
    
    var processQueue = function() {
        if (_queue.length > 0 && _loading < _maxCount) {
            
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
                self.postMessage({ 'ok': true, 'imageBitmap': imageBitmap }, [imageBitmap]);
            })
            .then(processQueue)
            .catch((err) => {
                _loading--;
                self.postMessage({ 'ok': false, 'error': err.toString() });
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

og.utils.ImageBitmapLoader.prototype.load = function (src, callback, options) {

    this._worker.onmessage = function (e) {
        callback && callback(e);
    };

    this._worker.postMessage({ 'src': src, 'options': options });
};