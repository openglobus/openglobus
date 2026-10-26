import { Planet } from "../../src/scene/Planet";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import { Vec3 } from "../../src/math/Vec3";
import { RADIANS } from "../../src/math";

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

describe("PlanetCamera flyExtent orientation", () => {
    test.each([
        ["northern", 10, 12],
        ["southern", -12, -10],
        ["straddling the equator", -1, 1],
        ["far southern", -60, -50]
    ])("lands with north up over a %s extent", (_name, south, north) => {
        const camera = planetCamera(5000000);
        const extent = new Extent(new LonLat(35, south), new LonLat(36, north));

        camera.flyExtent(extent, 0, { duration: 1000, preventLock: true });
        camera._flight.startedAt = 0;
        camera.checkFly();

        expect(camera.isFlying()).toBe(false);
        expect(camera.getHeading()).toBeCloseTo(0, 6);

        // Same orientation as the instant fit of the same extent.
        const reference = planetCamera(5000000);
        reference.viewExtent(extent, 0);
        expect(camera.getUp().dot(reference.getUp())).toBeCloseTo(1, 6);
    });
});

describe("PlanetCamera flight orientation", () => {
    function tiltedCamera(lon, lat, height, lookLon, lookLat) {
        const camera = planetCamera(5000000);
        const ellipsoid = camera.planet.ellipsoid;
        const eye = ellipsoid.lonLatToCartesian(new LonLat(lon, lat, height));
        camera.set(eye, ellipsoid.lonLatToCartesian(new LonLat(lookLon, lookLat, 0)), ellipsoid.getSurfaceNormal3v(eye));
        camera.update();
        return camera;
    }

    // Frames of the flight with the view tilt from the surface normal and the roll, degrees
    function flightFrames(camera, count = 20) {
        const ellipsoid = camera.planet.ellipsoid,
            flight = camera._flight,
            frames = [];
        for (let i = 0; i <= count; i++) {
            const frame = flight.fly(i / count);
            const vertical = ellipsoid.getSurfaceNormal3v(frame.eye),
                forward = frame.n.negateTo();
            const level = Vec3.proj_b_to_plane(vertical, forward);
            frames.push({
                eye: frame.eye,
                v: frame.v,
                tilt: Math.acos(Math.min(1, -forward.dot(vertical))) / RADIANS,
                roll:
                    level.length() > 0.2
                        ? Math.atan2(forward.dot(level.normalize().cross(frame.v)), level.dot(frame.v)) / RADIANS
                        : 0
            });
        }
        return frames;
    }

    test("a far flight from a tilted view looks down on the arc top and keeps the planet in view", () => {
        const camera = tiltedCamera(2, 42, 3000, 2.02, 42.03);
        camera.flyExtent(new Extent(new LonLat(-113, 37), new LonLat(-112, 38)), 0, { duration: 1000, preventLock: true });

        const frames = flightFrames(camera);
        for (const frame of frames) {
            const earthRadius = Math.asin(Math.min(1, camera.planet.ellipsoid.getEquatorialSize() / frame.eye.length()));
            expect(frame.tilt).toBeLessThan(earthRadius / RADIANS);
        }
        expect(frames[10].tilt).toBeLessThan(0.5);
    });

    test.each([
        ["tilted near", 7.9, 46.4, 20000, 8, 46.45],
        ["from the other hemisphere", -100, 40, 20000, -100.1, 40.2]
    ])("a flight %s keeps the horizon level", (_name, lon, lat, height, lookLon, lookLat) => {
        const camera = tiltedCamera(lon, lat, height, lookLon, lookLat);
        const destPos = new LonLat(8.0385638, 46.3662788, 15779);

        camera.flyLonLat(destPos, {
            look: camera.planet.ellipsoid.lonLatToCartesian(new LonLat(8.1385638, 46.3562788, 0)),
            duration: 1000,
            preventLock: true
        });

        for (const frame of flightFrames(camera)) {
            expect(Math.abs(frame.roll)).toBeLessThan(1);
        }
    });

    test("from the view down the heading turns with the flight, not before it", () => {
        const camera = planetCamera(60000);
        const ellipsoid = camera.planet.ellipsoid;
        const destPos = new LonLat(10.2, 9.9, 15000);

        camera.flyLonLat(destPos, {
            look: ellipsoid.lonLatToCartesian(new LonLat(10.3, 9.9, 0)),
            duration: 1000,
            preventLock: true
        });

        // Heading of the screen up on the ground, the view down turns the picture by it
        const headings = flightFrames(camera, 10).map((frame) => {
            const vertical = ellipsoid.getSurfaceNormal3v(frame.eye);
            const north = Vec3.proj_b_to_plane(Vec3.NORTH, vertical).normalize();
            const up = Vec3.proj_b_to_plane(frame.v, vertical).normalize();
            return Math.atan2(vertical.dot(up.cross(north)), north.dot(up));
        });

        const turn = headings[headings.length - 1] - headings[0];
        expect(turn).toBeGreaterThan(1);
        for (let i = 1; i < headings.length; i++) {
            expect(headings[i]).toBeGreaterThanOrEqual(headings[i - 1] - 1e-9);
        }
        // Eased flight goes 2.8% of its way by the first tenth, the heading does not turn ahead of it
        expect(headings[1] - headings[0]).toBeLessThan(turn * 0.05);
    });
});

describe("PlanetCamera linear flight", () => {
    function flyLinear(camera, lonLat) {
        const target = camera.planet.ellipsoid.lonLatToCartesian(lonLat);
        camera.flyCartesian(target, { linearPath: true, duration: 1000, preventLock: true });
        return target;
    }

    test.each([
        ["with linearPath", true],
        ["without linearPath", undefined]
    ])("a near flight goes straight %s", (_name, linearPath) => {
        const camera = planetCamera(15000);
        const start = camera.eye.clone();
        const target = camera.planet.ellipsoid.lonLatToCartesian(new LonLat(10.5, 10.2, 15000));
        camera.flyCartesian(target, { linearPath: linearPath, duration: 1000, preventLock: true });

        const middle = camera._flight.fly(0.5).eye;
        const chord = target.sub(start).normalize();
        expect(middle.sub(start).normalize().dot(chord)).toBeCloseTo(1, 9);
    });

    test("a flight farther than 2000 km goes by the arc", () => {
        const camera = planetCamera(15000);
        const start = camera.eye.clone();
        const target = camera.planet.ellipsoid.lonLatToCartesian(new LonLat(30, 10, 15000));
        camera.flyCartesian(target, { duration: 1000, preventLock: true });

        const height = camera.planet.ellipsoid.cartesianToLonLat(camera._flight.fly(0.5).eye).height;
        expect(height).toBeGreaterThan(100000);
        expect(start.distance(target)).toBeGreaterThan(2000000);
    });

    test("a flight from the other hemisphere goes by the arc, not through the planet", () => {
        const camera = planetCamera(15000);
        flyLinear(camera, new LonLat(-120, -30, 15000));

        for (let progress = 0; progress <= 1; progress += 0.05) {
            const height = camera.planet.ellipsoid.cartesianToLonLat(camera._flight.fly(progress).eye).height;
            expect(height).toBeGreaterThan(14000);
        }
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
