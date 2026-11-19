import { ray, Ray } from '../../src/math/Ray';
import { Vec3 } from '../../src/math/Vec3';
import { Plane } from '../../src/math/Plane';
import { Sphere } from '../../src/bv/Sphere';

describe('Ray class', () => {
    test('methods', () => {
        const item = new Ray();
        expect(Ray.OUTSIDE).toBe(0);
        expect(Ray.INSIDE).toBe(1);
        expect(Ray.INPLANE).toBe(2);
        expect(Ray.AWAY).toBe(3);
        expect(item.set(new Vec3(), new Vec3())).toBeTruthy();
        expect(item.getPoint(1000)).toBeTruthy();
        expect(item.hitTriangleRes(new Vec3(), new Vec3(), new Vec3(), new Vec3(), 1000)).toBeTruthy();
        expect(item.hitPlaneRes(new Plane(), new Vec3())).toBe(0);
        // expect(item.hitPlane(new Sphere(1, new Vec3()))).toBeTruthy();
        expect(item).toBeTruthy();
    });

    test('intersection', () => {
        let ray = new Ray();
        let res = new Vec3();

        let v0 = new Vec3(0, 0, 0),
            v1 = new Vec3(1, 0, 0),
            v2 = new Vec3(0, 0, 1);

        let orig = new Vec3(0.2, -1, 0.2),
            dir = new Vec3(0, -1, 0);

        ray.set(orig, dir);

        let r = ray.hitTriangleRes(v0, v1, v2, res);

        expect(r).toBe(Ray.AWAY);
    });

    describe('hitSphereDistance', () => {
        const sphere = new Sphere(2, new Vec3(10, 0, 0));

        test('is the distance to where the ray enters the sphere', () => {
            expect(new Ray(new Vec3(0, 0, 0), new Vec3(1, 0, 0)).hitSphereDistance(sphere)).toBeCloseTo(8, 12);
            // off-centre: enters at x = 10 - sqrt(4 - 1)
            expect(new Ray(new Vec3(0, 1, 0), new Vec3(1, 0, 0)).hitSphereDistance(sphere)).toBeCloseTo(
                10 - Math.sqrt(3),
                12
            );
        });

        test('is in lengths of the direction vector', () => {
            expect(new Ray(new Vec3(0, 0, 0), new Vec3(4, 0, 0)).hitSphereDistance(sphere)).toBeCloseTo(2, 12);
            expect(new Ray(new Vec3(0, 0, 0), new Vec3(0.5, 0, 0)).hitSphereDistance(sphere)).toBeCloseTo(16, 12);
        });

        test('is 0 when the origin is inside the sphere, also when the ray points away', () => {
            expect(new Ray(new Vec3(10.5, 0, 0), new Vec3(1, 0, 0)).hitSphereDistance(sphere)).toBe(0);
            expect(new Ray(new Vec3(10.5, 0, 0), new Vec3(-1, 0, 0)).hitSphereDistance(sphere)).toBe(0);
        });

        test('is Infinity for a miss and for a sphere behind the origin', () => {
            expect(new Ray(new Vec3(0, 3, 0), new Vec3(1, 0, 0)).hitSphereDistance(sphere)).toBe(Infinity);
            expect(new Ray(new Vec3(0, 0, 0), new Vec3(-1, 0, 0)).hitSphereDistance(sphere)).toBe(Infinity);
            expect(new Ray(new Vec3(0, 0, 0), new Vec3(0, 0, 0)).hitSphereDistance(sphere)).toBe(Infinity);
        });

        test('touches the sphere', () => {
            expect(new Ray(new Vec3(0, 2, 0), new Vec3(1, 0, 0)).hitSphereDistance(sphere)).toBeCloseTo(10, 12);
        });
    });

    describe('hitTriangleDistance', () => {
        const v0 = new Vec3(0, 0, 0),
            v1 = new Vec3(1, 0, 0),
            v2 = new Vec3(0, 1, 0);

        test('is the distance to the triangle, hit from either side', () => {
            expect(new Ray(new Vec3(0.2, 0.2, 5), new Vec3(0, 0, -1)).hitTriangleDistance(v0, v1, v2)).toBeCloseTo(5, 12);
            expect(new Ray(new Vec3(0.2, 0.2, -3), new Vec3(0, 0, 1)).hitTriangleDistance(v0, v1, v2)).toBeCloseTo(3, 12);
        });

        test('is in lengths of the direction vector', () => {
            expect(new Ray(new Vec3(0.2, 0.2, 5), new Vec3(0, 0, -2)).hitTriangleDistance(v0, v1, v2)).toBeCloseTo(
                2.5,
                12
            );
            // oblique
            const o = new Vec3(-1, 0.25, 2),
                d = new Vec3(0.25, 0, -0.5);
            const t = new Ray(o, d).hitTriangleDistance(v0, v1, v2);
            expect(t).toBeCloseTo(4, 12);
            expect(o.add(d.scaleTo(t)).z).toBeCloseTo(0, 12);
        });

        test('is Infinity for a miss and for a triangle behind the origin', () => {
            expect(new Ray(new Vec3(0.8, 0.8, 5), new Vec3(0, 0, -1)).hitTriangleDistance(v0, v1, v2)).toBe(Infinity);
            expect(new Ray(new Vec3(0.2, 0.2, 5), new Vec3(0, 0, 1)).hitTriangleDistance(v0, v1, v2)).toBe(Infinity);
        });

        test('is Infinity for a ray parallel to the triangle plane, also when it lies in it', () => {
            expect(new Ray(new Vec3(-1, 0.2, 1), new Vec3(1, 0, 0)).hitTriangleDistance(v0, v1, v2)).toBe(Infinity);
            expect(new Ray(new Vec3(-1, 0.2, 0), new Vec3(1, 0, 0)).hitTriangleDistance(v0, v1, v2)).toBe(Infinity);
        });

        test('is Infinity for a triangle without area', () => {
            const ray = new Ray(new Vec3(0.2, 0, 5), new Vec3(0, 0, -1));
            // two corners on top of each other
            expect(ray.hitTriangleDistance(v0, v1, v1.clone())).toBe(Infinity);
            // three corners on a line
            expect(ray.hitTriangleDistance(v0, new Vec3(0.5, 0, 0), v1)).toBe(Infinity);
        });

        test('hits an edge within the margin', () => {
            // just outside of the hypotenuse x + y = 1, by 1e-9 in barycentric terms
            const ray = new Ray(new Vec3(0.5 + 5e-10, 0.5 + 5e-10, 5), new Vec3(0, 0, -1));
            expect(ray.hitTriangleDistance(v0, v1, v2)).toBe(Infinity);
            expect(ray.hitTriangleDistance(v0, v1, v2, 1e-7)).toBeCloseTo(5, 12);
            // well outside of the margin
            const far = new Ray(new Vec3(0.5 + 1e-3, 0.5, 5), new Vec3(0, 0, -1));
            expect(far.hitTriangleDistance(v0, v1, v2, 1e-7)).toBe(Infinity);
            // on the edge exactly
            expect(new Ray(new Vec3(0.5, 0, 5), new Vec3(0, 0, -1)).hitTriangleDistance(v0, v1, v2)).toBeCloseTo(5, 12);
        });

        test('agrees with hitTriangleRes', () => {
            let seed = 7;
            const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const res = new Vec3();
            let hits = 0;
            for (let i = 0; i < 2000; i++) {
                const a = new Vec3(rand(), rand(), rand()),
                    b = new Vec3(rand(), rand(), rand()),
                    c = new Vec3(rand(), rand(), rand()),
                    o = new Vec3(rand() * 4 - 2, rand() * 4 - 2, rand() * 4 - 2),
                    // aimed at the triangle's neighbourhood, so that about half of the rays hit
                    target = new Vec3(rand() * 1.2 - 0.1, rand() * 1.2 - 0.1, rand() * 1.2 - 0.1),
                    d = target.sub(o).normalize(),
                    ray = new Ray(o, d),
                    t = ray.hitTriangleDistance(a, b, c);
                if (ray.hitTriangleRes(a, b, c, res) === Ray.INSIDE) {
                    hits++;
                    expect(t).toBeCloseTo(res.distance(o), 9);
                } else if (t !== Infinity) {
                    // only a hit on an edge, by rounding, may differ: it goes away with a slightly smaller triangle
                    expect(ray.hitTriangleDistance(a, b, c, -1e-9)).toBe(Infinity);
                }
            }
            expect(hits).toBeGreaterThan(100);
        });
    });
});
