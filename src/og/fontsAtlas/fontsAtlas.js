goog.provide('og.FontsAtlas');

goog.require('og.utils.TextureAtlas');
goog.require('og.ImageCanvas');
goog.require('og.math');
goog.require('og.FontsAtlas.tokens');

og.FontsAtlas = function () {
    this.atlasesArr = [];
    this.atlasIndexes = {};
    this.tokenImageSize = 64;
};

og.FontsAtlas.prototype.getFontIndex = function (face, style, weight) {
    return this.atlasIndexes[og.FontsAtlas.getFullIndex(face, style, weight)];
};

og.FontsAtlas.getFullIndex = function (face, style, weight) {
    return (face + " " + (style || normal) + " " + (weight || normal));
};

og.FontsAtlas.prototype.getTokenNode = function (token, face, style, weight) {
    var fn = og.FontsAtlas.getFullIndex(face, style, weight);
    var ai = this.atlasIndexes[fn];
    var n = this.atlasesArr[ai].nodes[token];
    return n;
};

og.FontsAtlas.prototype.createFont = function (face, style, weight) {
    if (!this.getFontIndex(face, style, weight)) {
        var tis = this.tokenImageSize;
        var atlasSize = og.math.nextHighestPowerOfTwo(Math.ceil(Math.sqrt(og.FontsAtlas.tokens.length)) / tis);
        var fn = og.FontsAtlas.getFullIndex(face, style, weight);
        this.atlasIndexes[fn] = this.atlasesArr.length;
        var atlas = new og.TextureAtlas(atlasSize, atlasSize);
        this.atlasesArr.push(atlas);

        var canvas = new og.ImageCanvas(tis, tis);
        var cY = Math.round(tis * 0.5);
        var pT = Math.round(cY * 1.5);
        var tF = (style || "normal") + " " + (weight || "normal") + " " + pT + "px " + face;
        var t = og.FontsAtlas.tokens;

        for (var i = 0; i < t.length; i++) {
            var ti = t[i];
            canvas.drawText(ti, 3, pT, tF);
            var img = canvas.getImage();
            img.__nodeIndex = ti;
            var n = atlas.addImage(img);

            var tokenSize = 64;//todo

            n.tokenSize = tis - tokenSize - 3;
        }
    }
};

