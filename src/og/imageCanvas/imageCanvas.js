goog.provide('og.ImageCanvas');

og.ImageCanvas = function (width, height) {
    this._canvas = document.createElement("canvas");
    this._canvas.width = width || 256;
    this._canvas.height = height || 256;
    this.context = this._canvas.getContext('2d');
};

og.ImageCanvas.prototype.fillEmpty = function () {
    var imgd = this.context.getImageData(0, 0, this._canvas.width, this._canvas.height);
    var pixels = imgd.data;
    for (var i = 0, n = pixels.length; i < n; i += 4) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = pixels[i + 3] = 0;
    }
    this.context.putImageData(imgd, 0, 0);
};

og.ImageCanvas.prototype.fillColor = function (color) {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this._canvas.width, this._canvas.height);
};

og.ImageCanvas.prototype.setData = function (data) {
    var imageData = this.context.createImageData(this._canvas.width, this._canvas.height);
    imageData.data.set(data);
    this.context.putImageData(imageData, 0, 0);
};

og.ImageCanvas.prototype.resize = function (width, height) {
    this._canvas.width = width;
    this._canvas.height = height;
    this.context = this._canvas.getContext('2d');
};

og.ImageCanvas.prototype.setImage = function (img) {
    this._canvas.width = img.width;
    this._canvas.height = img.height;
    this.context = this._canvas.getContext('2d');
    this.context.drawImage(img, 0, 0, img.width, img.height);
};

og.ImageCanvas.prototype.getImage = function () {
    var img = new Image();
    img.src = this._canvas.toDataURL("image/png");
    return img;
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
        that.context.drawImage(img, 0, 0, img.width, img.height);
        if (callback)
            callback(img);
    }
    img.src = url;
};