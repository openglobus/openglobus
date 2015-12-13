goog.provide('og.Label');

goog.require('og.BaseBillboard');
goog.require('og.inheritance');
goog.require('og.math.Vector4');
goog.require('og.utils');

/**
 *
 *
 *
 */
og.Label = function (options) {

    og.inheritance.base(this, options);

    this._text = "";
    this._face = null;
    this._size = 32;
    this._style = null;
    this._weight = null;
    this._outline = 0.9;
    this._outlineColor = new og.math.Vector4(0.0, 0.0, 0.0, 1.0);
    this._align = og.Label.RIGHT;

    this._fontIndex = 0;
    this._fontAtlas = null;
};

og.inheritance.extend(og.Label, og.BaseBillboard);

og.Label.RIGHT = 0;
og.Label.LEFT = 1;
og.Label.CENTER = 2;

og.Label.ALIGN = {
    "left": og.Label.LEFT,
    "right": og.Label.RIGHT,
    "center": og.Label.CENTER
};

og.Label.prototype.setText = function (text) {
    this._text = text;
    this._handler && this._handler.setText(this._handlerIndex, text, this._fontIndex, this._align);
};

og.Label.prototype.getText = function () {
    return this._text;
};

og.Label.prototype.setAlign = function (align) {
    this._align = og.Label.ALIGN[align.trim().toLowerCase()];
    this._handler && this._handler.setText(this._handlerIndex, this._text, this._fontIndex, this._align);
};

og.Label.prototype.getAlign = function () {
    return this._align;
};

og.Label.prototype.setFace = function (face) {
    this._face = face.trim().toLowerCase();
    this.update();
};

og.Label.prototype.getFace = function () {
    return this._face;
};

og.Label.prototype.setSize = function (size) {
    this._size = size;
    this._handler && this._handler.setSizeArr(this._handlerIndex, size);
};

og.Label.prototype.getSize = function () {
    return this._size;
};

og.Label.prototype.setStyle = function (style) {
    this._style = style.trim().toLowerCase();
    this.update();
};

og.Label.prototype.getStyle = function () {
    return this._style;
};

og.Label.prototype.setWeight = function (weight) {
    this._weight = weight.trim().toLowerCase();
    this.update();
};

og.Label.prototype.getWeight = function () {
    return this._wight;
};

og.Label.prototype._applyFontIndex = function (fontIndex) {
    this._fontIndex = fontIndex;
    if (this._handler) {
        this._handler.setFontIndexArr(this._handlerIndex, this._fontIndex);
        this._handler.setText(this._handlerIndex, this._text, this._fontIndex, this._align);
    }
};

og.Label.prototype.setOutline = function (outline) {
    this._outline = outline;
    this._handler && this._handler.setOutlineArr(this._handlerIndex, 1.0 - outline);
};

og.Label.prototype.getOutline = function () {
    return this._outline;
};

og.Label.prototype.setOutlineColor4v = function (rgba) {
    this._outlineColor.x = rgba.x;
    this._outlineColor.y = rgba.y;
    this._outlineColor.z = rgba.z;
    this._outlineColor.w = rgba.w;
    this._handler && this._handler.setOutlineColorArr(this._handlerIndex, rgba);
};

og.Label.prototype.setOutlineColor = function (color) {
    this.setOutlineColor4v(og.utils.htmlColor2rgba(color));
};

og.Label.prototype.getOutlineColor = function () {
    return this._outlineColor;
};

og.Label.prototype.setOutlineOpacity = function (opacity) {
    this._outlineColor.w = opacity;
    this._handler && this._handler.setOutlineColorArr(this._handlerIndex, this._outlineColor);
};

og.Label.prototype.getOutlineOpacity = function () {
    return this._outlineColor.w;
};

og.Label.prototype.update = function () {
    if (this._fontAtlas) {
        var fontIndex = this._fontAtlas.getFontIndex(this._face, this._style, this._weight);
        if (fontIndex == undefined) {
            this._fontAtlas.createFontAsync(this._face, this._style, this._weight, this._applyFontIndex.bind(this));
        } else {
            this._applyFontIndex(fontIndex);
        }
    }
};

og.Label.prototype.assignFontAtlas = function (fontAtlas) {
    !this._fontAtlas && (this._fontAtlas = fontAtlas);
    this.update();
};