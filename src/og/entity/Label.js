/**
 * @module og/entity/Label
 */

'use strict';

import * as utils from '../utils/shared.js';
import { BaseBillboard } from './BaseBillboard.js';
import { Vec4 } from '../math/Vec4.js';

const ALIGN = {
    RIGHT: 0,
    LEFT: 1,
    CENTER: 2
};

/**
 * Text align options.
 * @readonly
 * @enum {number}
 */
const STR2ALIGN = {
    left: ALIGN.LEFT,
    right: ALIGN.RIGHT,
    center: ALIGN.CENTER
};

/**
 * Billboard text label.
 * @class
 * @extends {og.BaseBillboard}
 * @param {Object} [options] - Label options:
 * @param {og.Vec3|Array.<number>} [options.position] - Billboard spatial position.
 * @param {number} [options.rotation] - Screen angle rotaion.
 * @param {og.Vec4|string|Array.<number>} [options.color] - Billboard color.
 * @param {og.Vec3|Array.<number>} [options.alignedAxis] - Billboard aligned vector.
 * @param {og.Vec3|Array.<number>} [options.offset] - Billboard center screen offset.
 * @param {boolean} [options.visibility] - Visibility.
 * @param {string} [options.text] - Text string.
 * @param {string} [options.face] - HTML5 font face.
 * @param {number} [options.size] - Font size in pixels.
 * @param {string} [options.style] - HTML5 font style. Example 'normal', 'italic'.
 * @param {string} [options.weight] - HTML5 font weight. Example 'normal', 'bold'.
 * @param {number} [options.outline] - Text outline size. 0 - no outline, 1 - maximum outline. Default 0.58.
 * @param {og.Vec4|string|Array.<number>} [options.outlineColor] - Outline color.
 * @param {og.Label.ALIGN} [options.align] - Text horizontal align: "left", "right" and "center".
 */
class Label extends BaseBillboard {
    constructor(options) {
        super(options);

        options = options || {};

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
        this._face = utils.defaultString(options.face, "arial");

        /**
         * Font size in pixels.
         * @private
         * @type {number}
         */
        this._size = options.size || 24;

        /**
         * Label outline.
         * @private
         * @type {number}
         */
        this._outline = options.outline != undefined ? options.outline : 0.0;

        /**
         * Label outline color.
         * @private
         * @type {og.Vec4}
         */
        this._outlineColor = utils.createColorRGBA(options.outlineColor, new Vec4(0.0, 0.0, 0.0, 1.0));

        /**
         * Text horizontal align: "left", "right" and "center".
         * @private
         * @type {og.Label.ALIGN}
         */
        this._align = options.align ? STR2ALIGN[options.align.trim().toLowerCase()] || ALIGN.RIGHT : ALIGN.RIGHT;

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
    }

    /**
     * Sets lablel text.
     * @public
     * @param {string} text - Text string. 
     * It can't be bigger than maximum labelHandler _maxLetters value.
     */
    setText(text) {
        this._text = text.toString();
        this._handler && this._handler.setText(this._handlerIndex, text, this._fontIndex, this._align);
    }

    /**
     * Gets current text string.
     * @public
     * @returns {string}
     */
    getText() {
        return this._text;
    }

    /**
     * Sets label text align. Could be center, left or right. Left is default.
     * @public
     * @param {og.Label.ALIGN} align - Text align.
     */
    setAlign(align) {
        this._align = STR2ALIGN[align.trim().toLowerCase()];
        this._handler && this._handler.setText(this._handlerIndex, this._text, this._fontIndex, this._align);
    }

    /**
     * Gets label text current alignment.
     * @public
     * @returns {og.Label.ALIGN}
     */
    getAlign() {
        return this._align;
    }

    /**
     * Sets font face family.
     * @public
     * @param {string} face - Font face family.
     */
    setFace(face) {
        this._face = face.trim().toLowerCase();
        this.update();
    }

    /**
     * Gets current font face.
     * @public
     * @returns {string}
     */
    getFace() {
        return this._face;
    }

    /**
     * Sets label font size in pixels.
     * @public
     * @param {number} size - Label size in pixels.
     */
    setSize(size) {
        this._size = size;
        this._handler && this._handler.setSizeArr(this._handlerIndex, size);
    }

    /**
     * Gets label size in pixels.
     * @public
     * @returns {number}
     */
    getSize() {
        return this._size;
    }

    /**
     * Sets text outline border size. Where 0 - is no outline and 1 - is the maximum outline size.
     * @public
     * @param {number} outline - Text outline size.
     */
    setOutline(outline) {
        this._outline = outline;
        this._handler && this._handler.setOutlineArr(this._handlerIndex, outline);
    }

    /**
     * Gets text current outline size.
     * @public
     * @returns {number}
     */
    getOutline() {
        return this._outline;
    }

    /**
     * Sets label opacity.
     * @public
     * @param {number} a - Label opacity.
     */
    setOpacity(a) {
        this._color.w = a;
        this.setColor4v(this._color);
        this._outlineColor.w = a;
        this.setOutlineColor4v(this._outlineColor);
    }

    /**
     * Sets text outline color.
     * @public
     * @param {number} r - Red.
     * @param {number} g - Green.
     * @param {number} b - Blue.
     * @param {number} a - Alpha.
     */
    setOutlineColor(r, g, b, a) {
        this._outlineColor.x = r;
        this._outlineColor.y = g;
        this._outlineColor.z = b;
        this._outlineColor.w = a;
        this._handler && this._handler.setOutlineColorArr(this._handlerIndex, this._outlineColor);
    }

    /**
     * Sets text outline color.
     * @public
     * @param {og.Vec4} rgba - Color vector.
     */
    setOutlineColor4v(rgba) {
        this._outlineColor.x = rgba.x;
        this._outlineColor.y = rgba.y;
        this._outlineColor.z = rgba.z;
        this._outlineColor.w = rgba.w;
        this._handler && this._handler.setOutlineColorArr(this._handlerIndex, rgba);
    }

    /**
     * Sets text outline color HTML string.
     * @public
     * @param {string} color - HTML string color.
     */
    setOutlineColorHTML(color) {
        this.setOutlineColor4v(utils.htmlColorToRgba(color));
    }

    /**
     * Gets outline color vector.
     * @public
     * @returns {og.Vec4}
     */
    getOutlineColor() {
        return this._outlineColor;
    }

    /**
     * Sets outline opacity. Actually outline color alpha value.
     * @public
     * @param {number} opacity - Outline opacity.
     */
    setOutlineOpacity(opacity) {
        this._outlineColor.w = opacity;
        this._handler && this._handler.setOutlineColorArr(this._handlerIndex, this._outlineColor);
    }

    /**
     * Gets outline opacity value.
     * @public
     * @returns {number}
     */
    getOutlineOpacity() {
        return this._outlineColor.w;
    }

    /**
     * Updates label parameters.
     * @public
     */
    async update() {
        if (this._fontAtlas) {
            const fontIndex = await this._fontAtlas.getFontIndex(this._face);
            this._applyFontIndex(fontIndex);
        }
    }

    _applyFontIndex(fontIndex) {
        this._fontIndex = fontIndex;
        if (this._handler) {
            this._handler.setFontIndexArr(this._handlerIndex, this._fontIndex);
            this._handler.setText(this._handlerIndex, this._text, this._fontIndex, this._align);
        }
    }

    /**
     * Assigns font atlas and update.
     * @public
     * @param {og.utils.FontAtlas} fontAtlas - Font atlas.
     */
    assignFontAtlas(fontAtlas) {
        !this._fontAtlas && (this._fontAtlas = fontAtlas);
        this.update();
    }
}

export { Label, ALIGN };