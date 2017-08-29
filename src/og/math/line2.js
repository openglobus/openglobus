goog.provide('og.math.Line2');

goog.require('og.math.Vector2');

og.math.Line2 = function(a, b, c)  {
    this.a = a || 0;
    this.b = b || 0;
    this.c = c || 0;
};
                
og.math.Line2.get = function(p0, p1) {
    return new og.math.Line2(p1.y - p0.y, p0.x - p1.x, p1.x * p0.y - p0.x * p1.y);
};
                
og.math.Line2.getParallel = function(l, p) {
    return new og.math.Line(l.a, l.b, -l.a * p.x - l.b * p.y);
};
                
og.math.Line2.getIntersection = function (L0, L1) {
    var x = (L1.b * L0.c - L0.b * L1.c) / (L0.b * L1.a - L1.b * L0.a);
    return new og.math.Vector2(x, -(L0.c + L0.a * x) / L0.b);
};

og.math.Line2.prototype.intersects = function (l) {
    return og.math.Line2.getIntersection(this, l);
};