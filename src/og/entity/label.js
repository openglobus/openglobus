goog.provide('og.Label');

goog.require('og.BaseBillboard');
goog.require('og.inheritance');
goog.require('og.math.Vector4');
goog.require('og.utils');

/**
 * Billboard text label.
 * @class
 * @extends {og.BaseBillboard}
 * @param {Object} [options] - Label options:
 * @param {og.math.Vector3|Array.<number>} [options.position] - Billboard spatial position.
 * @param {number} [options.rotation] - Screen angle rotaion.
 * @param {og.math.Vector4|string|Array.<number>} [options.color] - Billboard color.
 * @param {og.math.Vector3|Array.<number>} [options.alignedAxis] - Billboard aligned vector.
 * @param {og.math.Vector3|Array.<number>} [options.offset] - Billboard center screen offset.
 * @param {boolean} [options.visibility] - Visibility.
 * @param {string} [options.text] - Text string.
 * @param {string} [options.face] - HTML5 font face.
 * @param {number} [options.size] - Font size in pixels.
 * @param {string} [options.style] - HTML5 font style. Example 'normal', 'italic'.
 * @param {string} [options.weight] - HTML5 font weight. Example 'normal', 'bold'.
 * @param {number} [options.outline] - Text outline size. 0 - no outline, 1 - maximum outline. Default 0.58.
 * @param {og.math.Vector4|string|Array.<number>} [options.outlineColor] - Outline color.
 * @param {og.Label.ALIGN} [options.align] - Text horizontal align: "left", "right" and "center".
 */
og.Label = function (options) {
    options = options || {};

    og.inheritance.base(this, options);

    /**
     * Label text string.
     * @private
     * @type {string}
     */
    this._text = options.text;

    /**
     * HTML5 font face.
     * @private
     * @type {string}
     */
    this._face = og.utils.defaultString(options.face, null);

    /**
     * Font size in pixels.
     * @private
     * @type {number}
     */
    this._size = options.size || 32;

    /**
     * HTML5 font style. Example 'normal', 'italic'.
     * @private
     * @type {string}
     */
    this._style = og.utils.defaultString(options.style, null);

    /**
     * HTML5 font weight style. Example 'normal', 'bold'.
     * @private
     * @type {string}
     */
    this._weight = og.utils.defaultString(options.weight, null);

    /**
     * Label outline.
     * @private
     * @type {number}
     */
    this._outline = options.outline != undefined ? options.outline : 0.58;

    /**
     * Label outline color.
     * @private
     * @type {og.math.Vector4}
     */
    this._outlineColor = og.utils.createColorRGBA(options.outlineColor, new og.math.Vector4(0.0, 0.0, 0.0, 1.0));

    /**
     * Text horizontal align: "left", "right" and "center".
     * @private
     * @type {og.Label.ALIGN}
     */
    this._align = options.align ? og.Label.ALIGN[options.align.trim().toLowerCase()] || og.Label.RIGHT : og.Label.RIGHT;

    /**
     * Label font atlas index.
     * @private
     * @type {number}
     */
    this._fontIndex = 0;

    /**
     * Font atlas pointer.
     * @private
     * @type {og.utils.FontAtlas}
     */
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
 * Sets label opacity.
 * @public
 * @param {number} a - Label opacity.
 */
og.Label.prototype.setOpacity = function (a) {
    this._color.w = a;
    this.setColor4v(this._color);
    this._outlineColor.w = a;
    this.setOutlineColor4v(this._outlineColor);
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
    this.setOutlineColor4v(og.utils.htmlColorToRgba(color));
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
 * Updates label parameters.
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

og.Label.prototype._applyFontIndex = function (fontIndex) {
    this._fontIndex = fontIndex;
    if (this._handler) {
        this._handler.setFontIndexArr(this._handlerIndex, this._fontIndex);
        this._handler.setText(this._handlerIndex, this._text, this._fontIndex, this._align);
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