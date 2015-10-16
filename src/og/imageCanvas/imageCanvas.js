goog.provide('og.ImageCanvas');

og.ImageCanvas = function (width, height) {
    this._canvas = document.createElement("canvas");
    this._canvas.width = width || 256;
    this._canvas.height = height || 256;
    this._context = this._canvas.getContext('2d');
};

og.ImageCanvas.prototype.getCanvas = function () {
    return this._canvas;
};

og.ImageCanvas.prototype.getContext = function () {
    return this._context;
};

og.ImageCanvas.prototype.fillEmpty = function () {
    var imgd = this._context.getImageData(0, 0, this._canvas.width, this._canvas.height);
    var pixels = imgd.data;
    for (var i = 0, n = pixels.length; i < n; i += 4) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = pixels[i + 3] = 0;
    }
    this._context.putImageData(imgd, 0, 0);
};

og.ImageCanvas.prototype.getData = function () {
    var imgd = this._context.getImageData(0, 0, this._canvas.width, this._canvas.height);
    return imgd.data;
};

og.ImageCanvas.prototype.fillColor = function (color) {
    this._context.fillStyle = color;
    this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);
};

og.ImageCanvas.prototype.setData = function (data) {
    var imageData = this._context.createImageData(this._canvas.width, this._canvas.height);
    imageData.data.set(data);
    this._context.putImageData(imageData, 0, 0);
};

og.ImageCanvas.prototype.resize = function (width, height) {
    this._canvas.width = width;
    this._canvas.height = height;
    this._context = this._canvas.getContext('2d');
};

og.ImageCanvas.prototype.drawImage = function (img, x, y) {
    this._context = this._canvas.getContext('2d');
    this._context.drawImage(img, x || 0, y || 0);
};

og.ImageCanvas.prototype.getImage = function () {
    var img = new Image();
    img.width = this.getWidth();
    img.height = this.getHeight();
    img.src = this._canvas.toDataURL("image/png");
    return img;
};

og.ImageCanvas.prototype.getTextWidth = function (text) {
    var metrics = this._context.measureText(text);
    return Math.round(metrics.width);
};

og.ImageCanvas.prototype.drawText = function (text, x, y, font, color) {
    this._context.fillStyle = color || 'black';
    this._context.font = font || 'normal 14px Verdana';
    this._context.fillText(text, x || 0, y || 14);
};

og.ImageCanvas.prototype.getWidth = function () {
    return this._canvas.width;
};

og.ImageCanvas.prototype.getHeight = function () {
    return this._canvas.height;
};

og.ImageCanvas.prototype.loadImage = function (url, callback) {
    var img = new Image();
    var that = this;
    img.onload = function () {
        that.resize(img.width, img.height);
        that._context.drawImage(img, 0, 0, img.width, img.height);
        if (callback)
            callback(img);
    }
    img.src = url;
};