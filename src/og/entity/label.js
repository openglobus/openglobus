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
    this.size = 32;
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
    this.font = font.trim().toLowerCase();
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

og.Label.prototype.update = function () {
    if (this._fontAtlas) {
        this._fontIndex = this._fontAtlas.createFont(this.font, this.style, this.weight);
        if (this._handler) {
            this._handler.setFontIndexArr(this._handlerIndex, this._fontIndex);
            this._handler.setText(this._handlerIndex, this.text, this._fontIndex);
        }
    }
};

og.Label.prototype.assignFontAtlas = function (fontAtlas) {
    !this._fontAtlas && (this._fontAtlas = fontAtlas);
    this.update();
};