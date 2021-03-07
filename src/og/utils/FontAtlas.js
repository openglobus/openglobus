/**
 * @module og/utils/FontAtlas
 */

'use strict';

import { TextureAtlas } from './TextureAtlas.js';
import { ImageCanvas } from '../ImageCanvas.js';
import { QueueArray } from '../QueueArray.js';
import { FontDetector } from './FontDetector.js';
import { SDFCreator } from './SDFCreator.js';
import TinySDF from '../../../external/tiny-sdf/index.js';
import { Rectangle } from '../Rectangle.js';
import { TextureAtlasNode } from './TextureAtlas.js';

function Deferred() {
    this.resolve = null;
    this.reject = null;
    this.promise = new Promise(function (resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
    }.bind(this));
    Object.freeze(this);
};

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

// Convert alpha-only to RGBA so we can use `putImageData` for building the composite bitmap
function makeRGBAImageData(ctx, alphaChannel, width, height) {
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < alphaChannel.length; i++) {
        imageData.data[4 * i + 0] = alphaChannel[i];
        imageData.data[4 * i + 1] = alphaChannel[i];
        imageData.data[4 * i + 2] = alphaChannel[i];
        imageData.data[4 * i + 3] = 255;
    }
    return imageData;
}

class FontAtlas {
    constructor() {
        this.atlasesArr = [];
        this.atlasIndexes = {};
        this.atlasIndexesDeferred = [];
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
        //return this.atlasIndexes[this.getFullIndex(face, style, weight)];
        let fullName = this.getFullIndex(face, style, weight);
        if (!this.atlasIndexesDeferred[fullName]) {
            this.atlasIndexesDeferred[fullName] = new Deferred();
        }
        return this.atlasIndexesDeferred[fullName].promise;
    }

    getFullIndex(face, style, weight) {
        face = face && face.trim().toLowerCase();
        if (!face) {
            face = this.defaultFace;
        }
        return face + " " + ((style && style.toLowerCase()) || "normal") + " " + ((weight && weight.toLowerCase()) || "normal");
    }

    loadMSDF(faceName, imageUrl, atlasUrl) {

        let index = this.atlasesArr.length;
        let fullName = this.getFullIndex(faceName);

        this.atlasIndexes[fullName] = index;

        let def = this.atlasIndexesDeferred[fullName];

        this.samplerArr[this.atlasesArr.length] = index;

        let atlas = new TextureAtlas();

        atlas.assignHandler(this._handler);
        this.atlasesArr[index] = atlas;

        let img = new Image();
        img.onload = () => {
            atlas.createTexture(img);
        };
        img.src = imageUrl;

        fetch(atlasUrl)
            .then(response => {
                if (!response.ok) {
                    throw Error(`Unable to load '${atlasUrl}'`);
                }
                return response.json(response);
            })
            .then(data => {
                let chars = data.chars;
                for (let i = 0; i < chars.length; i++) {
                    let ci = chars[i];
                    let ti = ci.char;
                    let w = data.common.scaleW,
                        h = data.common.scaleH;

                    let r = new Rectangle(ci.x, ci.y, ci.x + ci.width, ci.y + ci.height);

                    let tc = new Array(12);

                    tc[0] = r.left / w;
                    tc[1] = r.top / h;

                    tc[2] = r.left / w;
                    tc[3] = r.bottom / h;

                    tc[4] = r.right / w;
                    tc[5] = r.bottom / h;

                    tc[6] = r.right / w;
                    tc[7] = r.bottom / h;

                    tc[8] = r.right / w;
                    tc[9] = r.top / h;

                    tc[10] = r.left / w;
                    tc[11] = r.top / h;

                    atlas.nodes[ti] = new TextureAtlasNode(r, tc);
                    atlas.nodes[ti].metrics = ci;
                    atlas.nodes[ti].emptySize = 1;
                }

                def.resolve(index);
            })
            .catch(err => {
                def.reject();
                return { 'status': "error", 'msg': err.toString() };
            });
    }

    //createFont(face, style, weight) {
    //    var fontIndex = this.getFontIndex(face, style, weight);
    //    if (fontIndex == undefined) {
    //        var tis = this.tokenImageSize;
    //        var atlasSize = 2048;//math.nextHighestPowerOfTwo(Math.ceil(Math.sqrt(tokens.length)) / tis + (tokens.length - 1) * TextureAtlas.BORDER_SIZE);
    //        var fontName = this.getFullIndex(face, style, weight);
    //        fontIndex = this.atlasIndexes[fontName] = this.atlasesArr.length;
    //        var atlas = new TextureAtlas(atlasSize, atlasSize);
    //        atlas.assignHandler(this._handler);
    //        atlas.borderSize = 1;
    //        this.samplerArr[this.atlasesArr.length] = this.atlasesArr.length;
    //        this.atlasesArr.push(atlas);
    //        atlas.canvas.fillColor("black");

    //        var t = tokens;

    //        const fontSize = 88;
    //        const fontWeight = (weight || "normal");
    //        const buffer = fontSize / 8;
    //        const radius = fontSize / 3;
    //        const fontFamily = (face || this.defaultFace);
    //        const tinySdf = new TinySDF({ fontSize, buffer, radius, fontWeight, fontFamily });
    //        const size = fontSize + buffer * 2;

    //        for (var i = 0; i < t.length; i++) {
    //            var ti = t[i];

    //            let sdf = tinySdf.draw(ti);

    //            let canvas = document.createElement("canvas");
    //            canvas.width = sdf.width;
    //            canvas.height = sdf.height;

    //            let ctx = canvas.getContext('2d');

    //            ctx.putImageData(makeRGBAImageData(ctx, sdf.data, sdf.width, sdf.height), 0, 0);

    //            canvas.__nodeIndex = ti;
    //            var n = atlas.addImage(canvas, true);

    //            n.emptySize = 1;//sdf.glyphWidth / canvas.width;

    //            n.metrics = sdf;
    //        }

    //        atlas.createTexture();
    //    }

    //    return fontIndex;
    //}

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