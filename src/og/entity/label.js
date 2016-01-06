goog.provide('og.Label');

goog.require('og.BaseBillboard');
goog.require('og.inheritance');
goog.require('og.math.Vector4');
goog.require('og.utils');

/**
 * Billboard text label.
 * @class
 * @extends {og.BaseBillboard}
 * @param {Object} [options] - Options:
 */
og.Label = function (options) {
    options = options || {};

    og.inheritance.base(this, options);

    this._text = options.text;
    this._face = og.utils.defaultString(options.face, null);
    this._size = options.size || 32;
    this._style = og.utils.defaultString(options.style, null);
    this._weight = og.utils.defaultString(options.weight, null);
    this._outline = options.outline || 0.9;
    this._outlineColor = og.utils.defaultVector4(options.outlineColor, new og.math.Vector4(0.0, 0.0, 0.0, 1.0));
    this._align = options.align ? og.Label.ALIGN[options.align.trim().toLowerCase()] || og.Label.RIGHT : og.Label.RIGHT;

    this._fontIndex = 0;
    this._fontAtlas = null;
};

og.inheritance.extend(og.Label, og.BaseBillboard);

/** @constant {number} */
og.Label.RIGHT = 0;
/** @constant {number} */
og.Label.LEFT = 1;
/** @constant {number} */
og.Label.CENTER = 2;

/**
 * Text align options.
 * @readonly
 * @enum {number}
 */
og.Label.ALIGN = {
    "left": og.Label.LEFT,
    "right": og.Label.RIGHT,
    "center": og.Label.CENTER
};

/**
 * Sets lablel text.
 * @public
 * @param {string} text - Text string. 
 * It can't be bigger than maximum labelHandler _maxLetters value.
 */
og.Label.prototype.setText = function (text) {
    this._text = text;
    this._handler && this._handler.setText(this._handlerIndex, text, this._fontIndex, this._align);
};

/**
 * Gets current text string.
 * @public
 * @returns {string}
 */
og.Label.prototype.getText = function () {
    return this._text;
};

/**
 * Sets label text align. Could be center, left or right. Left is default.
 * @public
 * @param {og.Label.ALIGN} align - Text align.
 */
og.Label.prototype.setAlign = function (align) {
    this._align = og.Label.ALIGN[align.trim().toLowerCase()];
    this._handler && this._handler.setText(this._handlerIndex, this._text, this._fontIndex, this._align);
};

/**
 * Gets label text current alignment.
 * @public
 * @returns {og.Label.ALIGN}
 */
og.Label.prototype.getAlign = function () {
    return this._align;
};

/**
 * Sets font face family.
 * @public
 * @param {string} face - Font face family.
 */
og.Label.prototype.setFace = function (face) {
    this._face = face.trim().toLowerCase();
    this.update();
};

/**
 * Gets current font face.
 * @public
 * @returns {string}
 */
og.Label.prototype.getFace = function () {
    return this._face;
};

/**
 * Sets label font size in pixels.
 * @public
 * @param {number} size - Label size in pixels.
 */
og.Label.prototype.setSize = function (size) {
    this._size = size;
    this._handler && this._handler.setSizeArr(this._handlerIndex, size);
};

/**
 * Gets label size in pixels.
 * @public
 * @returns {number}
 */
og.Label.prototype.getSize = function () {
    return this._size;
};

/**
 * Sets font HTML5 style. It's can be Italic or Normal values.
 * @public
 * @param {string} style - HTML5 font style.
 */
og.Label.prototype.setStyle = function (style) {
    this._style = style.trim().toLowerCase();
    this.update();
};

/**
 * Gets label font style.
 * @public
 * @returns {string}
 */
og.Label.prototype.getStyle = function () {
    return this._style;
};

/**
 * Sets label font HTML5 weight style. It's can be bold or normal.
 * @public
 * @param {string} weight - HTML5 font weight style.
 */
og.Label.prototype.setWeight = function (weight) {
    this._weight = weight.trim().toLowerCase();
    this.update();
};

/**
 * Gets label font weight.
 * @public
 * @returns {string}
 */
og.Label.prototype.getWeight = function () {
    return this._wight;
};

/**
 * Sets text outline border size. Where 0 - is no outline and 1 - is the maximum outline size.
 * @public
 * @param {number} outline - Text outline size.
 */
og.Label.prototype.setOutline = function (outline) {
    this._outline = outline;
    this._handler && this._handler.setOutlineArr(this._handlerIndex, 1.0 - outline);
};

/**
 * Gets text current outline size.
 * @public
 * @returns {number}
 */
og.Label.prototype.getOutline = function () {
    return this._outline;
};

/**
 * Sets text outline color.
 * @public
 * @param {number} r - Red.
 * @param {number} g - Green.
 * @param {number} b - Blue.
 * @param {number} a - Alpha.
 */
og.Label.prototype.setOutlineColor = function (r, g, b, a) {
    this._outlineColor.x = r;
    this._outlineColor.y = g;
    this._outlineColor.z = b;
    this._outlineColor.w = a;
    this._handler && this._handler.setOutlineColorArr(this._handlerIndex, this._outlineColor);
};

/**
 * Sets text outline color.
 * @public
 * @param {og.math.Vector4} rgba - Color vector.
 */
og.Label.prototype.setOutlineColor4v = function (rgba) {
    this._outlineColor.x = rgba.x;
    this._outlineColor.y = rgba.y;
    this._outlineColor.z = rgba.z;
    this._outlineColor.w = rgba.w;
    this._handler && this._handler.setOutlineColorArr(this._handlerIndex, rgba);
};

/**
 * Sets text outline color HTML string.
 * @public
 * @param {string} color - HTML string color.
 */
og.Label.prototype.setOutlineColorHTML = function (color) {
    this.setOutlineColor4v(og.utils.htmlColor2rgba(color));
};

/**
 * Gets outline color vector.
 * @public
 * @returns {og.math.Vector4}
 */
og.Label.prototype.getOutlineColor = function () {
    return this._outlineColor;
};

/**
 * Sets outline opacity. Actually outline color alpha value.
 * @public
 * @param {number} opacity - Outline opacity.
 */
og.Label.prototype.setOutlineOpacity = function (opacity) {
    this._outlineColor.w = opacity;
    this._handler && this._handler.setOutlineColorArr(this._handlerIndex, this._outlineColor);
};

/**
 * Gets outline opacity value.
 * @public
 * @returns {number}
 */
og.Label.prototype.getOutlineOpacity = function () {
    return this._outlineColor.w;
};

/**
 * Function updates label.
 * @public
 */
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

/**
 * Assigns font atlas and update.
 * @public
 * @param {og.utils.FontAtlas} fontAtlas - Font atlas.
 */
og.Label.prototype.assignFontAtlas = function (fontAtlas) {
    !this._fontAtlas && (this._fontAtlas = fontAtlas);
    this.update();
};

/**
 * Used in update function.
 * @private
 * @param {number} fontIndex - Font array index in the assigned font atlas.
 */
og.Label.prototype._applyFontIndex = function (fontIndex) {
    this._fontIndex = fontIndex;
    if (this._handler) {
        this._handler.setFontIndexArr(this._handlerIndex, this._fontIndex);
        this._handler.setText(this._handlerIndex, this._text, this._fontIndex, this._align);
    }
};