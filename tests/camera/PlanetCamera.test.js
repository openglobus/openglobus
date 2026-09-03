import { Planet } from "../../src/scene/Planet";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import { Vec3 } from "../../src/math/Vec3";

function planetCamera(height) {
    const planet = new Planet();
    const camera = planet.camera;

    camera.setViewportSize(800, 600);
    camera.setLonLat(new LonLat(10, 10, height));

    return camera;
}

function flyToFarPoint(camera) {
    const target = camera.planet.ellipsoid.lonLatToCartesian(new LonLat(30, 40, 20000));
    camera.flyCartesian(target, { look: Vec3.ZERO, duration: 1000, preventLock: true });
}

describe("PlanetCamera orthographic flight", () => {
    test("focuses every frame on the ground under the camera, not on the planet center", () => {
        const camera = planetCamera(5000000);
        camera.isOrthographic = true;

        flyToFarPoint(camera);

        for (const progress of [0, 0.5, 1]) {
            const frame = camera._flight.fly(progress);
            const height = camera.planet.ellipsoid.cartesianToLonLat(frame.eye).height;

            expect(frame.focusDistance / height).toBeCloseTo(1, 3);
        }

        camera.checkFly();

        // An eye distance would have included the planet radius; an altitude does not.
        expect(camera.focusDistance).toBeGreaterThan(0);
        expect(camera.focusDistance).toBeLessThan(camera.eye.length() * 0.5);
    });

    test("focuses on the target point when the flight looks at one", () => {
        const camera = planetCamera(5000000);
        camera.isOrthographic = true;

        const target = camera.planet.ellipsoid.lonLatToCartesian(new LonLat(30, 40, 0));
        camera.flyDistance(target, 30000, { duration: 1000, preventLock: true });
        camera.checkFly();

        expect(camera.focusDistance).toBeCloseTo(camera.eye.distance(target), 3);
    });

    test("leaves the focus distance alone in perspective mode", () => {
        const camera = planetCamera(5000000);
        camera.focusDistance = 12345;

        flyToFarPoint(camera);
        camera.checkFly();

        expect(camera.focusDistance).toBe(12345);
    });
});

describe("PlanetCamera orthographic instant views", () => {
    const extent = () => new Extent(new LonLat(10, 10), new LonLat(11, 11));

    test("viewExtent focuses on the ground under the camera", () => {
        const camera = planetCamera(5000000);
        camera.isOrthographic = true;

        camera.viewExtent(extent(), 0);

        expect(camera.focusDistance / camera._lonLat.height).toBeCloseTo(1, 6);
        expect(camera.focusDistance).toBeLessThan(camera.eye.length() * 0.5);
    });

    test("viewDistance focuses on the target point", () => {
        const camera = planetCamera(5000000);
        camera.isOrthographic = true;

        const target = camera.planet.ellipsoid.lonLatToCartesian(new LonLat(30, 40, 0));
        camera.viewDistance(target, 30000);

        expect(camera.focusDistance).toBeCloseTo(30000, 3);
    });

    test("leave the focus distance alone in perspective mode", () => {
        const camera = planetCamera(5000000);
        const target = camera.planet.ellipsoid.lonLatToCartesian(new LonLat(30, 40, 0));

        camera.focusDistance = 4242;
        camera.viewExtent(extent(), 0);
        camera.viewDistance(target, 30000);

        expect(camera.focusDistance).toBe(4242);
    });
});
