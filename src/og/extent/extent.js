goog.provide('og.extent');
goog.provide('og.extent.Extent');

og.extent.LEFT = 0;
og.extent.BOTTOM = 1;
og.extent.RIGHT = 2;
og.extent.TOP = 3;

og.extent.Extent = function(l, b, r, t) {
    this.left = l;
    this.bottom = b;
    this.right = r;
    this.top = t;
 };

