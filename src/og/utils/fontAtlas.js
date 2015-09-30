goog.provide('og.utils.FontAtlas');

goog.require('og.utils.TextureAtlas');
goog.require('og.ImageCanvas');
goog.require('og.math');

og.utils.FontAtlas = function () {
    this.atlasesArr = [];
    this.atlasIndexes = {};
    this.tokenImageSize = 64;
    this.samplerArr = [];
    this._handler = null;
};

og.utils.FontAtlas.tokens = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
'à', 'á', 'â', 'ã', 'ä', 'å', '¸', 'æ', 'ç', 'è', 'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ð', 'ñ', 'ò', 'ó', 'ô', 'õ', 'ö', '÷', 'ø', 'ù', 'ü', 'ý', 'ú', 'þ', 'ÿ',
'À', 'Á', 'Â', 'Ã', 'Ä', 'Å', '¨', 'Æ', 'Ç', 'È', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï', 'Ð', 'Ñ', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', '×', 'Ø', 'Ù', 'Ü', 'Ý', 'Ú', 'Þ', 'ß',
'1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
'`', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', '\\', '|', ';', ':', '"', ',', '.', '/', '<', '>', '?', ' ', '    '];

og.utils.FontAtlas.prototype.assignHandler = function (handler) {
    this._handler = handler;
};

og.utils.FontAtlas.prototype.getFontIndex = function (face, style, weight) {
    return this.atlasIndexes[og.utils.FontAtlas.getFullIndex(face && face.trim(), style && style.trim(), weight && weight.trim())];
};

og.utils.FontAtlas.getFullIndex = function (face, style, weight) {
    return ((face ? face.toLowerCase() : "arial") + " " + ((style && style.toLowerCase()) || "normal") + " " + ((weight && weight.toLowerCase()) || "normal"));
};

og.utils.FontAtlas.prototype.createFont = function (face, style, weight) {
    var fontIndex = this.getFontIndex(face, style, weight);
    if (fontIndex == undefined) {
        var tis = this.tokenImageSize;
        var atlasSize = og.math.nextHighestPowerOfTwo(Math.ceil(Math.sqrt(og.utils.FontAtlas.tokens.length)) / tis + (og.utils.FontAtlas.tokens.length - 1) * og.utils.TextureAtlas.BORDER_SIZE);
        var fontName = og.utils.FontAtlas.getFullIndex(face, style, weight);
        fontIndex = this.atlasIndexes[fontName] = this.atlasesArr.length;
        var atlas = new og.utils.TextureAtlas(atlasSize, atlasSize);
        atlas.assignHandler(this._handler);
        this.samplerArr.push(this.atlasesArr.length);
        this.atlasesArr.push(atlas);

        var canvas = new og.ImageCanvas(tis, tis);
        var pT = Math.round(tis * 0.75);
        var tF = (style || "normal") + " " + (weight || "normal") + " " + pT + "px " + face;
        var t = og.utils.FontAtlas.tokens;

        for (var i = 0; i < t.length; i++) {
            var ti = t[i];
            canvas.fillEmpty();
            canvas.drawText(ti, 0, pT, tF, "white");

            var img = canvas.getImage();
            img.__nodeIndex = ti;
            var n = atlas.addImage(img, true, true);
            var tokenWidth = canvas.getTextWidth(ti);
            n.emptySize = tokenWidth / tis;
        }

        atlas.makeTexture();
    }

    return fontIndex;
};

