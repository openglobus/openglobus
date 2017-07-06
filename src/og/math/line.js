goog.provide('og.math.Line');

goog.require('og.math.Vector2');

og.math.Line = function(A, B, C)  {
    this.A = A || 0;
    this.B = B || 0;
    this.C = C || 0;
};
                
og.math.getLine = function(p0, p1) {
    return new og.math.Line(p1.y - p0.y, p0.x - p1.x, p1.x * p0.y - p0.x * p1.y);
};
                
og.math.getParallel = function(l, p) {
    return new og.math.Line(l.A, l.B, -l.A * p.x - l.B * p.y);
};
                
og.math.getIntersection = function (L0, L1) {
    var x = (L1.B * L0.C - L0.B * L1.C) / (L0.B * L1.A - L1.B * L0.A);
    return new og.math.Vector2(x, -(L0.C + L0.A * x) / L0.B);
};

og.math.Line.prototype.intersect = function (L) {
    return og.math.getIntersection(this, L);
};