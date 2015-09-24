goog.provide('og.Label');

goog.require('og.BaseBillboard');
goog.require('og.inheritance');

/**
 *
 *
 *
 */
og.Label = function (options) {

    og.inheritance.base(this, options);

    this.text = "";
    this.font = null;
    this.size = 12;
    this.style = null;
    this.weight = null;
};

og.inheritance.extend(og.Label, og.BaseBillboard);

og.Label.prototype.setText = function (text) {
    this.text = text;
    this._handler && this._handler.setText(this._handlerIndex, text);
};

og.Label.prototype.setFont = function (font) {
    this.font = font;
    var fontIndex = 0;
    this._handler && this._handler.setFontIndexArr(this._handlerIndex, fontIndex);
};

og.Label.prototype.setSize = function (size) {
    this.size = size;
    this._handler && this._handler.setSizeArr(this._handlerIndex, size);
};

og.Label.prototype.setStyle = function (style) {
    this.style = style;
    var fontIndex = 0;
    this._handler && this._handler.setFontIndexArr(this._handlerIndex, fontIndex);
};

og.Label.prototype.setWeight = function (weight) {
    this.weight = weight;
    var fontIndex = 0;
    this._handler && this._handler.setFontIndexArr(this._handlerIndex, fontIndex);
};