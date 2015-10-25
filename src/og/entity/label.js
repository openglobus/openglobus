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

    this.text = "";
    this.face = null;
    this.size = 32;
    this.style = null;
    this.weight = null;
    this.outline = 0.9;
    this.outlineColor = new og.math.Vector4(0.0, 0.0, 0.0, 1.0);
    this.align = og.Label.RIGHT;

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
    this.text = text;
    this._handler && this._handler.setText(this._handlerIndex, text, this._fontIndex, this.align);
};

og.Label.prototype.setAlign = function (align) {
    this.align = og.Label.ALIGN[align.trim().toLowerCase()];
    this._handler && this._handler.setText(this._handlerIndex, this.text, this._fontIndex, this.align);
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

og.Label.prototype.setOutline = function (outline) {
    this.outline = outline;
    this._handler && this._handler.setOutlineArr(this._handlerIndex, 1.0 - outline);
};

og.Label.prototype.setOutlineColor4v = function (rgba) {
    this.outlineColor.x = rgba.x;
    this.outlineColor.y = rgba.y;
    this.outlineColor.z = rgba.z;
    this.outlineColor.w = rgba.w;
    this._handler && this._handler.setOutlineColorArr(this._handlerIndex, rgba);
};

og.Label.prototype.setOutlineColor = function (color) {
    this.setOutlineColor4v(og.utils.htmlColor2rgba(color));
};

og.Label.prototype.setOutlineOpacity = function (opacity) {
    this.outlineColor.w = opacity;
    this._handler && this._handler.setOutlineColorArr(this._handlerIndex, this.outlineColor);
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