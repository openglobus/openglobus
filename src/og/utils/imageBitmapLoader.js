goog.provide('og.utils.ImageBitmapLoader');

og.utils.ImageBitmapLoader = function () {
    var p = new Blob([og.utils.ImageBitmapLoader.Program], { type: 'application/javascript' });
    this._worker = new Worker(URL.createObjectURL(p));
};

og.utils.ImageBitmapLoader.Program =
    'var _maxCount = 48;\n\
    var _counter = 0;\n\
    var _queue = [];\n\
    \n\
    var processQueue = function() {\n\
        if (_queue.length > 0 && _counter < _maxCount) {\n\
            \n\
            var url = _queue.shift();\n\
            _counter++;\n\
            \n\
            return fetch(url, {})\n\
                .then(function(response) {\n\
                    _counter--;\n\
                    if (response.status !== 200) {\n\
                        return self.postMessage({"error":"Unable to load resource with url " + url});\n\
                    }\n\
                    return response.blob();\n\
                })\n\
                .then(createImageBitmap)\n\
                .then(function(imageBitmap) {\n\
                    self.postMessage({ "imageBitmap": imageBitmap }, [imageBitmap]);\n\
                }, function(err) {\n\
                    _counter--;\n\
                    self.postMessage({ "error":err.toString() });\n\
                })\n\
                .then(processQueue)\n\
                .catch(processQueue)\n\
        }\n\
    }\n\
    self.onmessage = function (e) {\n\
        var toEnqueue = e.data;\n\
        if (_queue.indexOf(toEnqueue) < 0) {\n\
            _queue.push(toEnqueue);\n\
            processQueue();\n\
        }\n\
    }';

og.utils.ImageBitmapLoader.prototype.load = function (url) {

    this._worker.onmessage = function (e) {
        console.log(e);
    };

    this._worker.postMessage(url);
};