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
    this._fontIndex;
};

og.inheritance.extend(og.Label, og.BaseBillboard);

og.Label.prototype.setText = function (text) {
    this.text = text;
    this._billboardHandler && this._billboardHandler.setText(this._billboardHandlerIndex, text);
};

og.Label.prototype.setFont = function (font) {
    this.font = font;
    this._fontIndex;
};

og.Label.prototype.setSize = function (size) {
    this.size = size;
};

og.Label.prototype.setStyle = function (style) {
    this.style = style;
};

og.Label.prototype.setWeight = function (weight) {
    this.weight = weight;
};