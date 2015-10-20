goog.provide('og.Label');

goog.require('og.BaseBillboard');
goog.require('og.inheritance');
goog.require('og.math.Vector4');

/**
 *
 *
 *
 */
og.Label = function (options) {

    og.inheritance.base(this, options);

    this.text = "";
    this.face = null;
    this.size = 32;
    this.style = null;
    this.weight = null;
    this.buffer = 0.5;
    this.rgbaBuffer = new og.math.Vector4(0.0, 0.0, 0.0, 1.0);

    this._fontIndex = 0;
    this._fontAtlas = null;
};

og.inheritance.extend(og.Label, og.BaseBillboard);

og.Label.prototype.setText = function (text) {
    this.text = text;
    this._handler && this._handler.setText(this._handlerIndex, text, this._fontIndex);
};

og.Label.prototype.setFace = function (face) {
    this.face = face.trim().toLowerCase();
    this.update();
};

og.Label.prototype.setSize = function (size) {
    this.size = size;
    this._handler && this._handler.setSizeArr(this._handlerIndex, size);
};

og.Label.prototype.setStyle = function (style) {
    this.style = style.trim().toLowerCase();
    this.update();
};

og.Label.prototype.setWeight = function (weight) {
    this.weight = weight.trim().toLowerCase();
    this.update();
};

og.Label.prototype._applyFontIndex = function (fontIndex) {
    this._fontIndex = fontIndex;
    if (this._handler) {
        this._handler.setFontIndexArr(this._handlerIndex, this._fontIndex);
        this._handler.setText(this._handlerIndex, this.text, this._fontIndex);
    }
};

og.Label.prototype.setBuffer = function (buffer) {
    this.buffer = buffer;
    this._handler && this._handler.setBufferAAArr(this._handlerIndex, 1.0 - buffer);
};

og.Label.prototype.setBufferRGBA = function (rgba) {
    this.rgbaBuffer.x = rgba.x;
    this.rgbaBuffer.y = rgba.y;
    this.rgbaBuffer.z = rgba.z;
    this.rgbaBuffer.w = rgba.w;
    this._handler && this._handler.setRgbaBufferArr(this._handlerIndex, rgba);
};

og.Label.prototype.update = function () {
    if (this._fontAtlas) {
        var fontIndex = this._fontAtlas.getFontIndex(this.face, this.style, this.weight);
        if (fontIndex == undefined) {
            this._fontAtlas.createFontAsync(this.face, this.style, this.weight, this._applyFontIndex.bind(this));
        } else {
            this._applyFontIndex(fontIndex);
        }
    }
};

og.Label.prototype.assignFontAtlas = function (fontAtlas) {
    !this._fontAtlas && (this._fontAtlas = fontAtlas);
    this.update();
};