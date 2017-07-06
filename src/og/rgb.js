goog.provide('og.Rgb');

og.Rgb = function(r, g, b) {
    this.r = r || 0;
    this.g = g || 0;
    this.b = b || 0;
};

og.rgb = function(r, g, b) {
    return new og.Rgb(r, g, b);
};

og.Rgb.prototype.toArr = function() {
    return [this.r, this.g, this.b];
};
