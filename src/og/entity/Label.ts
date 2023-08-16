"use strict";

import * as utils from "../utils/shared";
import {BaseBillboard, IBaseBillboardParams} from "./BaseBillboard";
import {LOCK_FREE, LOCK_UPDATE} from "./LabelWorker.js";
import {NumberArray4, Vec4} from "../math/Vec4";
import {FontAtlas} from "../utils/FontAtlas";
import {LabelHandler} from "./LabelHandler";

interface ILabelParams extends IBaseBillboardParams {
    text?: string;
    face?: string;
    size?: number;
    outline?: number;
    outlineColor?: string | NumberArray4 | Vec4;
    align?: string;
    isRTL?: boolean;
}

const ALIGN: Record<string, number> = {
    RIGHT: 0,
    LEFT: 1,
    CENTER: 2
};

/**
 * Text align options.
 * @readonly
 * @enum {number}
 */
const STR2ALIGN: Record<string, number> = {
    left: ALIGN.LEFT,
    right: ALIGN.RIGHT,
    center: ALIGN.CENTER
};

/**
 * Billboard text label.
 * @class
 * @extends {BaseBillboard}
 * @param {Object} [options] - Label options:
 * @param {Vec3|Array.<number>} [options.position] - Billboard spatial position.
 * @param {number} [options.rotation] - Screen angle rotation.
 * @param {Vec4|string|Array.<number>} [options.color] - Billboard color.
 * @param {Vec3|Array.<number>} [options.alignedAxis] - Billboard aligned vector.
 * @param {Vec3|Array.<number>} [options.offset] - Billboard center screen offset.
 * @param {boolean} [options.visibility] - Visibility.
 * @param {string} [options.text] - Text string.
 * @param {string} [options.face] - HTML5 font face.
 * @param {number} [options.size] - Font size in pixels.
 * @param {string} [options.style] - HTML5 font style. Example 'normal', 'italic'.
 * @param {string} [options.weight] - HTML5 font weight. Example 'normal', 'bold'.
 * @param {number} [options.outline] - Text outline size. 0 - no outline, 1 - maximum outline. Default 0.58.
 * @param {Vec4|string|Array.<number>} [options.outlineColor] - Outline color.
 * @param {string} [options.align] - Text horizontal align: "left", "right" and "center".
 */
class Label extends BaseBillboard {

    protected override _handler: LabelHandler | null;

    /**
     * Label text string.
     * @protected
     * @type {string}
     */
    protected _text: string;

    /**
     * HTML5 font face.
     * @private
     * @type {string}
     */
    protected _face: string;

    /**
     * Font size in pixels.
     * @protected
     * @type {number}
     */
    protected _size: number;

    /**
     * Label outline.
     * @protected
     * @type {number}
     */
    protected _outline: number;

    /**
     * Label outline color.
     * @protected
     * @type {Vec4}
     */
    protected _outlineColor: Vec4;

    /**
     * Text horizontal align: "left", "right" and "center".
     * @private
     * @type {Label.ALIGN}
     */
    protected _align: number;

    /**
     * Label font atlas index.
     * @protected
     * @type {number}
     */
    protected _fontIndex: number;

    /**
     * Font atlas pointer.
     * @private
     * @type {FontAtlas}
     */
    protected _fontAtlas: FontAtlas | null;

    protected _isRTL: boolean;

    constructor(options: ILabelParams = {}) {
        super(options);

        this._handler = null;

        this._text = options.text || "";

        this._face = utils.defaultString(options.face, "arial");

        this._size = options.size || 24;

        this._outline = options.outline != undefined ? options.outline : 0.0;

        this._outlineColor = utils.createColorRGBA(
            options.outlineColor,
            new Vec4(0.0, 0.0, 0.0, 1.0)
        );

        this._align = options.align ? STR2ALIGN[options.align.trim().toLowerCase()] as number || ALIGN.RIGHT : ALIGN.RIGHT;

        this._fontIndex = 0;

        this._fontAtlas = null;

        this._isRTL = options.isRTL || false;
    }

    /**
     * Set label text.
     * @public
     * @param {string} text - Text string.
     * It can't be bigger than maximum labelHandler _maxLetters value.
     */
    public setText(text: string) {
        this._text = text.toString();
        if (this._isReady && this._handler) {
            this._handler.setText(this._handlerIndex, text, this._fontIndex, this._align, this._isRTL);
        }
    }

    /**
     * Gets current text string.
     * @public
     * @returns {string}
     */
    public getText(): string {
        return this._text;
    }

    /**
     * Sets label text align. Could be center, left or right. Left is default.
     * @public
     * @param {string} align - Text align.
     */
    public setAlign(align: string) {
        this._align = STR2ALIGN[align.trim().toLowerCase()] as number;
        if (this._isReady && this._handler) {
            this._handler.setText(this._handlerIndex, this._text, this._fontIndex, this._align, this._isRTL);
        } else if (this._lockId !== LOCK_FREE) {
            this._lockId = LOCK_UPDATE;
        }
    }

    /**
     * Gets label text current alignment.
     * @public
     * @returns {string}
     */
    public getAlign(): number {
        return this._align;
    }

    /**
     * Sets font face family.
     * @public
     * @param {string} face - Font face family.
     */
    public setFace(face: string) {
        this._face = face.trim().toLowerCase();
        this.update();
    }

    /**
     * Gets current font face.
     * @public
     * @returns {string}
     */
    public getFace(): string {
        return this._face;
    }

    /**
     * Sets label font size in pixels.
     * @public
     * @param {number} size - Label size in pixels.
     */
    public setSize(size: number) {
        if (size !== this._size) {
            this._size = size;
            if (this._isReady && this._handler) {
                this._handler.setSizeArr(this._handlerIndex, size);
            } else if (this._lockId !== LOCK_FREE) {
                this._lockId = LOCK_UPDATE;
            }
        }
    }

    /**
     * Gets label size in pixels.
     * @public
     * @returns {number}
     */
    public getSize(): number {
        return this._size;
    }

    /**
     * Sets text outline border size. Where 0 - is no outline, and 1 - is the maximum outline size.
     * @public
     * @param {number} outline - Text outline size.
     */
    public setOutline(outline: number) {
        this._outline = outline;
        if (this._isReady && this._handler) {
            this._handler.setOutlineArr(this._handlerIndex, outline);
        } else if (this._lockId !== LOCK_FREE) {
            this._lockId = LOCK_UPDATE;
        }
    }

    /**
     * Gets text current outline size.
     * @public
     * @returns {number}
     */
    public getOutline(): number {
        return this._outline;
    }

    /**
     * Sets label opacity.
     * @public
     * @param {number} a - Label opacity.
     */
    public override setOpacity(a: number) {
        super.setOpacity(a);
        this.setOutlineOpacity(a);
    }

    /**
     * Sets text outline color.
     * @public
     * @param {number} r - Red.
     * @param {number} g - Green.
     * @param {number} b - Blue.
     * @param {number} a - Alpha.
     */
    public setOutlineColor(r: number, g: number, b: number, a: number) {
        if (a !== this._outlineColor.w || r !== this._outlineColor.x || g !== this._outlineColor.y || b !== this._outlineColor.z) {
            this._outlineColor.x = r;
            this._outlineColor.y = g;
            this._outlineColor.z = b;
            this._outlineColor.w = a;
            if (this._isReady && this._handler) {
                this._handler.setOutlineColorArr(this._handlerIndex, this._outlineColor);
            } else if (this._lockId !== LOCK_FREE) {
                this._lockId = LOCK_UPDATE;
            }
        }
    }

    /**
     * Sets text outline color.
     * @public
     * @param {Vec4} rgba - Color vector.
     */
    public setOutlineColor4v(rgba: Vec4) {
        this.setOutlineColor(rgba.x, rgba.y, rgba.z, rgba.w);
    }

    /**
     * Sets text outline color HTML string.
     * @public
     * @param {string} color - HTML string color.
     */
    public setOutlineColorHTML(color: string) {
        this.setOutlineColor4v(utils.htmlColorToRgba(color));
    }

    /**
     * Gets outline color vector.
     * @public
     * @returns {Vec4}
     */
    public getOutlineColor(): Vec4 {
        return this._outlineColor;
    }

    /**
     * Sets outline opacity. Actually outline color alpha value.
     * @public
     * @param {number} opacity - Outline opacity.
     */
    public setOutlineOpacity(opacity: number) {
        if (opacity !== this._outlineColor.w) {
            this._outlineColor.w = opacity;
            if (this._isReady && this._handler) {
                this._handler.setOutlineColorArr(this._handlerIndex, this._outlineColor);
            } else if (this._lockId !== LOCK_FREE) {
                this._lockId = LOCK_UPDATE;
            }
        }
    }

    /**
     * Gets outline opacity value.
     * @public
     * @returns {number}
     */
    public getOutlineOpacity(): number {
        return this._outlineColor.w;
    }

    /**
     * Updates label parameters.
     * @public
     */
    public async update() {
        if (this._fontAtlas) {
            const fontIndex = await this._fontAtlas.getFontIndex(this._face);
            this._applyFontIndex(fontIndex);
        }
    }

    protected _applyFontIndex(fontIndex: number) {
        this._fontIndex = fontIndex;
        if (this._isReady && this._handler) {
            this._handler.setFontIndexArr(this._handlerIndex, this._fontIndex);
            this._handler.setText(this._handlerIndex, this._text, this._fontIndex, this._align, this._isRTL);
        } else if (this._lockId !== LOCK_FREE) {
            this._lockId = LOCK_UPDATE;
        }
    }

    /**
     * Assigns font atlas and update.
     * @public
     * @param {FontAtlas} fontAtlas - Font atlas.
     */
    public assignFontAtlas(fontAtlas: FontAtlas) {
        if (!this._fontAtlas) {
            this._fontAtlas = fontAtlas;
        }
        this.update();
    }
}

export {Label, ALIGN};
