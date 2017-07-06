goog.provide('og.Rgba');

og.Rgba = function(r, g, b, a) {
    this.r = r || 0;
    this.g = g || 0;
    this.b = b || 0;
    this.a = a == undefined ? 1 : a;
};

og.rgba = function(r, g, b, a) {
    return new og.Rgba(r, g, b, a);
};

og.Rgba.prototype.toArr = function() {
    return [this.r, this.g, this.b, this.a];
};
