import { Planet } from "../../src/scene/Planet";
import { LonLat } from "../../src/LonLat";

function expectFiniteUnitVec3(vec) {
    expect(Number.isFinite(vec.x)).toBe(true);
    expect(Number.isFinite(vec.y)).toBe(true);
    expect(Number.isFinite(vec.z)).toBe(true);
    expect(vec.length()).toBeCloseTo(1, 6);
}

test("setLonLat keeps a valid camera basis when no look point is provided", () => {
    const planet = new Planet();
    const camera = planet.camera;

    camera.setLonLat(new LonLat(37.6173, 55.7558, 1000000));

    expectFiniteUnitVec3(camera._r);
    expectFiniteUnitVec3(camera._u);
    expectFiniteUnitVec3(camera._b);

    expect(Math.abs(camera._r.dot(camera._u))).toBeLessThan(1e-6);
    expect(Math.abs(camera._r.dot(camera._b))).toBeLessThan(1e-6);
    expect(Math.abs(camera._u.dot(camera._b))).toBeLessThan(1e-6);
    expect(camera.getForward().dot(camera.eye.negateTo().normalize())).toBeCloseTo(1, 6);
});

test("setLonLat accepts explicit zero height", () => {
    const planet = new Planet();
    const camera = planet.camera;

    camera.setLonLat(new LonLat(37.6173, 55.7558, 1000000));
    camera.setLonLat(new LonLat(37.6173, 55.7558, 0));

    expect(camera.getLonLat().height).toBeCloseTo(0, 6);
});

test("setLonLat keeps the camera horizon aligned with the local surface", () => {
    const planet = new Planet();
    const camera = planet.camera;

    camera.setLonLat(
        new LonLat(-105.55573039522102, 39.62684661706047, 6939.131370203212),
        new LonLat(-105.6101394, 39.6176827, 3905)
    );

    const surfaceNormal = planet.ellipsoid.getSurfaceNormal3v(camera.eye);

    expect(Math.abs(camera._r.dot(surfaceNormal))).toBeLessThan(1e-6);
});
