goog.provide('og.utils.FontAtlas');

goog.require('og.utils.TextureAtlas');
goog.require('og.ImageCanvas');
goog.require('og.math');
goog.require('og.QueueArray');
goog.require('og.FontDetector');
goog.require('og.utils.SDFCreator');

og.utils.FontAtlas = function () {
    this.atlasesArr = [];
    this.atlasIndexes = {};
    this.tokenImageSize = 64;
    this.samplerArr = [0];
    this._handler = null;
    this.defaultFace = "arial";

    this._counter = 0;
    this._pendingsQueue = new og.QueueArray();
    this.fontDetector = new og.FontDetector();

    this._sdfCreator = new og.utils.SDFCreator(256, 256);
};

og.utils.FontAtlas.tokens = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
'а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ь', 'э', 'ъ', 'ю', 'я',
'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ь', 'Э', 'Ъ', 'Ю', 'Я',
'1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
'`', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', '\\', '|', ';', ':', '"', ',', '.', '/', '<', '>', '?', ' ', '    '];

og.utils.FontAtlas.prototype.assignHandler = function (handler) {
    this._handler = handler;
};

og.utils.FontAtlas.prototype.getFontIndex = function (face, style, weight) {
    return this.atlasIndexes[this.getFullIndex(face, style, weight)];
};

og.utils.FontAtlas.prototype.getFullIndex = function (face, style, weight) {
    face = face && face.trim().toLowerCase();
    if (!face || face && !this.fontDetector.detect(face)) {
        face = this.defaultFace;
    }
    return face + " " + ((style && style.toLowerCase()) || "normal") + " " + ((weight && weight.toLowerCase()) || "normal");
};

og.utils.FontAtlas.prototype.createFont = function (face, style, weight) {
    var fontIndex = this.getFontIndex(face, style, weight);
    if (fontIndex == undefined) {
        var tis = this.tokenImageSize;
        var atlasSize = 1024;//og.math.nextHighestPowerOfTwo(Math.ceil(Math.sqrt(og.utils.FontAtlas.tokens.length)) / tis + (og.utils.FontAtlas.tokens.length - 1) * og.utils.TextureAtlas.BORDER_SIZE);
        var fontName = this.getFullIndex(face, style, weight);
        fontIndex = this.atlasIndexes[fontName] = this.atlasesArr.length;
        var atlas = new og.utils.TextureAtlas(atlasSize, atlasSize);
        atlas.assignHandler(this._handler);
        atlas.borderSize = 6;
        this.samplerArr[this.atlasesArr.length] = this.atlasesArr.length;
        this.atlasesArr.push(atlas);
        atlas.canvas.fillColor("black");

        var t = og.utils.FontAtlas.tokens;

        var sdfSize = 512;
        var sdfCanvas = new og.ImageCanvas(sdfSize, sdfSize);
        var sc = this._sdfCreator;
        var pT = Math.round(sdfSize * 0.66);
        var tF = (style || "normal") + " " + (weight || "normal") + " " + pT + "px " + (face || this.defaultFace);

        for (var i = 0; i < t.length; i++) {
            var ti = t[i];

            sdfCanvas.fillColor("black");
            sdfCanvas.drawText(ti, 49, pT, tF, "white");
            var res = sc.createSDF(sdfCanvas._canvas, tis, tis);
            res.__nodeIndex = ti;
            var n = atlas.addImage(res, true, true);

            var tokenWidth = sdfCanvas.getTextWidth(ti);
            n.emptySize = tokenWidth / sdfSize;
        }

        atlas.createTexture();
    }

    return fontIndex;
};

og.utils.FontAtlas.prototype.createFontAsync = function (face, style, weight, callback) {
    var obj = { "face": face, "style": style, "weight": weight, "callback": callback };
    if (this._counter >= 1) {
        this._pendingsQueue.push(obj);
    } else {
        this._exec(obj);
    }
};

og.utils.FontAtlas.prototype._exec = function (obj) {
    this._counter++;
    var that = this;
    setTimeout(function () {
        var fontIndex = that.createFont(obj.face, obj.style, obj.weight);
        obj.callback(fontIndex);
        that._dequeueRequest();
    }, 0);
};

og.utils.FontAtlas.prototype._dequeueRequest = function () {
    this._counter--;
    if (this._pendingsQueue.length && this._counter < 1) {
        var obj;
        if (obj = this._whilePendings())
            this._exec(obj);
    }
};

og.utils.FontAtlas.prototype._whilePendings = function () {
    while (this._pendingsQueue.length) {
        var f = this._pendingsQueue.pop();
        var fontIndex = this.getFontIndex(f.face, f.style, f.weight);
        if (fontIndex != undefined) {
            f.callback(fontIndex);
            continue;
        }
        return f;
    }
};