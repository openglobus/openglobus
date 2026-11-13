import { DepthCamera } from "../../src/renderer/depthCamera/DepthCamera";
import { PlanetCamera } from "../../src/camera/PlanetCamera";
import { wgs84 } from "../../src/ellipsoid/wgs84";

test("a planet camera without a start pose gets finite angles", () => {
    // At the planet center there is no local frame, the angles there would be NaN, and the frustum entity
    // synchronization, which compares them with the previous ones, would request a frame every frame
    const planet = { ellipsoid: wgs84, getFrameRotation: (c) => wgs84.getNorthFrameRotation(c) };

    const depthCamera = Object.create(DepthCamera.prototype);
    depthCamera.camera = new PlanetCamera(planet, { frustums: [[1, 1000]] });
    depthCamera._cameraPose = {};
    depthCamera._focusDistance = 1000;

    depthCamera._initPose();

    const cam = depthCamera.camera;
    expect(Number.isFinite(cam.getPitch())).toBe(true);
    expect(Number.isFinite(cam.getYaw())).toBe(true);
    expect(Number.isFinite(cam.getRoll())).toBe(true);
    expect(cam.getHeight()).toBeCloseTo(1000);
});
