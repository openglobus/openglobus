/**
 * @module og/utils/FontAtlas
 */

'use strict';

import { TextureAtlas } from './TextureAtlas.js';
import { ImageCanvas } from '../ImageCanvas.js';
import { QueueArray } from '../QueueArray.js';
import { FontDetector } from './FontDetector.js';
import { SDFCreator } from './SDFCreator.js';

const tokens = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ь', 'э', 'ъ', 'ю', 'я', 'й',
    'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ь', 'Э', 'Ъ', 'Ю', 'Я', 'Й',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
    '`', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', '\\', '|', ';', ':', '"', ',', '.', '/', '<', '>', '?', ' ', '    ', "'",
    'Á', 'á', 'Ć', 'ć', 'É', 'é', 'Í', 'í', 'Ĺ', 'ĺ', 'Ń', 'ń', 'Ó', 'ó', 'Ŕ', 'ŕ', 'Ś', 'ś', 'Ú', 'ú', 'Ý', 'ý', 'Ź', 'ź',
    'ď', 'Ľ', 'ľ', 'ť',
    'Ă', 'ă', 'Ğ', 'ğ', 'Ŭ', 'ŭ',
    'Č', 'č', 'Ď', 'Ě', 'ě', 'Ň', 'ň', 'Ř', 'ř', 'Š', 'š', 'Ť', 'Ž', 'ž',
    'Ç', 'ç', 'Ģ', 'ģ', 'Ķ', 'ķ', 'Ļ', 'ļ', 'Ņ', 'ņ', 'Ŗ', 'ŗ', 'Ş', 'ş', 'Ţ', 'ţ',
    'Â', 'â', 'Ĉ', 'ĉ', 'Ê', 'ê', 'Ĝ', 'ĝ', 'Ĥ', 'ĥ', 'Î', 'î', 'Ĵ', 'ĵ', 'Ô', 'ô', 'Ŝ', 'ŝ', 'Û', 'û', 'Ŵ', 'ŵ', 'Ŷ', 'ŷ',
    'Ä', 'ä', 'Ë', 'ë', 'Ï', 'ï', 'Ö', 'ö', 'Ü', 'ü', 'Ÿ', 'ÿ',
    'Ċ', 'ċ', 'Ė', 'ė', 'Ġ', 'ġ', 'İ', 'ı', 'Ż', 'ż',
    'Ő', 'ő', 'Ű', 'ű',
    'À', 'à', 'È', 'è', 'Ì', 'ì', 'Ò', 'ò', 'Ù', 'ù',
    'Ơ', 'ơ', 'Ư', 'ư',
    'Ā', 'ā', 'Ē', 'ē', 'Ī', 'ī', 'Ō', 'ō', 'Ū', 'ū',
    'Ą', 'ą', 'Ę', 'ę', 'Į', 'į', 'Ų', 'ų',
    'Å', 'å', 'Ů', 'ů',
    'Đ', 'đ', 'Ħ', 'ħ', 'Ł', 'ł', 'Ø', 'ø',
    'Ã', 'ã', 'Ñ', 'ñ', 'Õ', 'õ',
    'Æ', 'æ', 'Œ', 'œ',
    'Ð', 'ð', 'Þ', 'þ',
    'ß', 'ſ',
    'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ', 'Ν', 'Ξ', 'Ο', 'Π', 'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω',
    'Ά', 'Έ', 'Ή', 'Ί', 'Ό', 'Ύ', 'Ώ',
    'Ϊ', 'Ϋ',
    'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'ς', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
    'ά', 'έ', 'ή', 'ί', 'ό', 'ύ', 'ώ',
    'ϊ', 'ϋ',
    'ΐ', 'ΰ',
    '’', '‘',
    'ḩ', 'Ḩ',
    'ţ', 'Ţ', 'bٍ', '°', '´'
];

class FontAtlas {
    constructor() {
        this.atlasesArr = [];
        this.atlasIndexes = {};
        this.tokenImageSize = 64;
        this.samplerArr = [0];
        this._handler = null;
        this.defaultFace = "arial";

        this._counter = 0;
        this._pendingsQueue = new QueueArray();
        this.fontDetector = new FontDetector();

        this._sdfCreator = new SDFCreator(256, 256);
    }

    assignHandler(handler) {
        this._handler = handler;
    }

    getFontIndex(face, style, weight) {
        return this.atlasIndexes[this.getFullIndex(face, style, weight)];
    }

    getFullIndex(face, style, weight) {
        face = face && face.trim().toLowerCase();
        if (!face || (face && !this.fontDetector.detect(face))) {
            face = this.defaultFace;
        }
        return face + " " + ((style && style.toLowerCase()) || "normal") + " " + ((weight && weight.toLowerCase()) || "normal");
    }

    createFont(face, style, weight) {
        var fontIndex = this.getFontIndex(face, style, weight);
        if (fontIndex == undefined) {
            var tis = this.tokenImageSize;
            var atlasSize = 2048;//math.nextHighestPowerOfTwo(Math.ceil(Math.sqrt(tokens.length)) / tis + (tokens.length - 1) * TextureAtlas.BORDER_SIZE);
            var fontName = this.getFullIndex(face, style, weight);
            fontIndex = this.atlasIndexes[fontName] = this.atlasesArr.length;
            var atlas = new TextureAtlas(atlasSize, atlasSize);
            atlas.assignHandler(this._handler);
            atlas.borderSize = 6;
            this.samplerArr[this.atlasesArr.length] = this.atlasesArr.length;
            this.atlasesArr.push(atlas);
            atlas.canvas.fillColor("black");

            var t = tokens;

            var sdfSize = 512;
            var sdfCanvas = new ImageCanvas(sdfSize, sdfSize);
            var sc = this._sdfCreator;
            var pT = Math.round(sdfSize * 0.66);
            var tF = (style || "normal") + " " + (weight || "normal") + " " + pT + "px " + (face || this.defaultFace);

            for (var i = 0; i < t.length; i++) {
                var ti = t[i];

                sdfCanvas.fillColor("black");
                sdfCanvas.drawText(ti, 49, pT, tF, "white");
                var res = sc.createSDF(sdfCanvas._canvas, tis, tis);
                res.__nodeIndex = ti;
                var n = atlas.addImage(res, true);

                var tokenWidth = sdfCanvas.getTextWidth(ti);
                n.emptySize = tokenWidth / sdfSize;
            }

            atlas.createTexture();
            sdfCanvas.destroy();
            sdfCanvas = null;
        }

        return fontIndex;
    }

    createFontAsync(face, style, weight, callback) {
        var obj = { "face": face, "style": style, "weight": weight, "callback": callback };
        if (this._counter >= 1) {
            this._pendingsQueue.push(obj);
        } else {
            this._exec(obj);
        }
    }

    _exec(obj) {
        this._counter++;
        var that = this;
        setTimeout(function () {
            var fontIndex = that.createFont(obj.face, obj.style, obj.weight);
            obj.callback(fontIndex);
            that._dequeueRequest();
        }, 0);
    }

    _dequeueRequest() {
        this._counter--;
        if (this._pendingsQueue.length && this._counter < 1) {
            var obj = this._whilePendings();
            if (obj) {
                this._exec(obj);
            }
        }
    }

    _whilePendings() {
        while (this._pendingsQueue.length) {
            var f = this._pendingsQueue.pop();
            var fontIndex = this.getFontIndex(f.face, f.style, f.weight);
            if (fontIndex != undefined) {
                f.callback(fontIndex);
                continue;
            }
            return f;
        }
    }
}

export { FontAtlas };