import { Camera } from "../../src/camera/Camera";
import { Vec3 } from "../../src/math/Vec3";

function checkCameraState(camera) {
    camera.checkViewChanges();
}

function settleInitialCameraState(camera) {
    checkCameraState(camera);
    checkCameraState(camera);
}

describe("Camera viewchange", () => {
    test("does not dispatch while the camera view remains unchanged", () => {
        const camera = new Camera();
        const onViewChange = vi.fn();
        camera.events.on("viewchange", onViewChange);

        settleInitialCameraState(camera);
        onViewChange.mockClear();

        camera.update();
        camera.update();
        checkCameraState(camera);

        expect(onViewChange).not.toHaveBeenCalled();
    });

    test("dispatches when the camera position or orientation changes", () => {
        const camera = new Camera();
        const onViewChange = vi.fn();
        camera.events.on("viewchange", onViewChange);

        settleInitialCameraState(camera);
        onViewChange.mockClear();

        camera.eye.x += 1;
        camera.update();
        checkCameraState(camera);
        checkCameraState(camera);

        camera.look(Vec3.ZERO);
        camera.update();
        checkCameraState(camera);
        checkCameraState(camera);

        expect(onViewChange).toHaveBeenCalledTimes(2);
    });

    test("dispatches when projection parameters change", () => {
        const camera = new Camera({ width: 100, height: 100 });
        const onViewChange = vi.fn();
        camera.events.on("viewchange", onViewChange);

        settleInitialCameraState(camera);
        onViewChange.mockClear();

        camera.setViewAngle(60);
        checkCameraState(camera);

        camera.setViewportSize(200, 100);
        checkCameraState(camera);

        camera.setViewportSize(400, 200);
        checkCameraState(camera);

        camera.isOrthographic = true;
        checkCameraState(camera);

        camera.focusDistance = 20;
        checkCameraState(camera);

        expect(onViewChange).toHaveBeenCalledTimes(5);
    });
});
