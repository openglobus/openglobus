import {Vec2} from './Vec2';

export class Line2 {

    public a: number;
    public b: number;
    public c: number;

    constructor(a = 0, b = 0, c = 0) {
        this.a = a;
        this.b = b;
        this.c = c;
    }

    static get(p0: Vec2, p1: Vec2): Line2 {
        return new Line2(p1.y - p0.y, p0.x - p1.x, p1.x * p0.y - p0.x * p1.y);
    }

    static getParallel(l: Line2, p: Vec2): Line2 {
        return new Line2(l.a, l.b, -l.a * p.x - l.b * p.y);
    }

    static getIntersection(L0: Line2, L1: Line2): Vec2 {
        let x = (L1.b * L0.c - L0.b * L1.c) / (L0.b * L1.a - L1.b * L0.a);
        return new Vec2(x, -(L0.c + L0.a * x) / L0.b);
    }

    public intersects(l: Line2): Vec2 {
        return Line2.getIntersection(this, l);
    }
}
