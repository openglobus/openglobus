/**
 * @module og/math/Line2
 */

'use strict';

import { Vec2 } from './Vec2.js';

const Line2 = function (a, b, c) {
    this.a = a || 0;
    this.b = b || 0;
    this.c = c || 0;
};

Line2.get = function (p0, p1) {
    return new Line2(p1.y - p0.y, p0.x - p1.x, p1.x * p0.y - p0.x * p1.y);
};

Line2.getParallel = function (l, p) {
    return new Line2(l.a, l.b, -l.a * p.x - l.b * p.y);
};

Line2.getIntersection = function (L0, L1) {
    var x = (L1.b * L0.c - L0.b * L1.c) / (L0.b * L1.a - L1.b * L0.a);
    return new Vec2(x, -(L0.c + L0.a * x) / L0.b);
};

Line2.prototype.intersects = function (l) {
    return Line2.getIntersection(this, l);
};

export { Line2 };