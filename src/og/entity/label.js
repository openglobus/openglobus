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

    this._fontIndex = 0;
    this._fontAtlas = null;
};

og.inheritance.extend(og.Label, og.BaseBillboard);

og.Label.prototype.setText = function (text) {
    this.text = text;
    this._handler && this._handler.setText(this._handlerIndex, text, this._fontIndex);
};

og.Label.prototype.setFont = function (font) {
    this.font = font.trim();
    if (this._fontAtlas) {
        this._fontIndex = this._fontAtlas.createFont(this.font, this.style, this.weight);
        this._handler && this._handler.setFontIndexArr(this._handlerIndex, this._fontIndex);
    }
};

og.Label.prototype.setSize = function (size) {
    this.size = size;
    this._handler && this._handler.setSizeArr(this._handlerIndex, size);
};

og.Label.prototype.setStyle = function (style) {
    this.style = style.trim();
    if (this._fontAtlas) {
        this._fontIndex = this._fontAtlas.createFont(this.font, this.style, this.weight);
        this._handler && this._handler.setFontIndexArr(this._handlerIndex, this._fontIndex);
    }
};

og.Label.prototype.setWeight = function (weight) {
    this.weight = weight.trim();
    if (this._fontAtlas) {
        this._fontIndex = this._fontAtlas.createFont(this.font, this.style, this.weight);
        this._handler && this._handler.setFontIndexArr(this._handlerIndex, this._fontIndex);
    }
};