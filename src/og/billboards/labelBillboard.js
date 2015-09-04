goog.provide('og.LabelBillboard');

goog.require('og.BaseBillboard');
goog.require('og.inheritance');

/**
 *
 *
 *
 */
og.LabelBillboard = function (billboard) {

    og.inheritance.base(this, billboard);

    this.text = "";
    this.font = null;
    this.size = 12;
    this.style = null;
    this.weight = null;
    this._fontIndex;
};

og.inheritance.extend(og.LabelBillboard, og.BaseBillboard);

og.LabelBillboard.prototype.setText = function (text) {
    this.text = text;
    this._billboardsHandler && this._billboardsHandler.setText(this._billboardsHandlerIndex, text);
};

og.LabelBillboard.prototype.setFont = function (font) {
    this.font = font;
    this._fontIndex;
};

og.LabelBillboard.prototype.setSize = function (size) {
    this.size = size;
};

og.LabelBillboard.prototype.setStyle = function (style) {
    this.style = style;
};

og.LabelBillboard.prototype.setWeight = function (weight) {
    this.weight = weight;
};