import { CameraLock } from "../../src/control/CameraLock";
import { Entity } from "../../src/entity/Entity";
import { Vec3 } from "../../src/math/Vec3";

test("locking an entity at the camera eye starts at a usable view distance", () => {
    const eye = new Vec3(10, 20, 30);
    let appliedDistance = 0;
    const camera = {
        eye,
        isOrthographic: false,
        viewDistance(target, distance) {
            appliedDistance = distance;
            this.eye.copy(target.add(new Vec3(0, 0, distance)));
        }
    };
    const renderer = {
        activeCamera: camera,
        controls: {},
        events: {
            on() {},
            off() {}
        },
        isInitialized: () => true
    };
    const cameraLock = new CameraLock();
    const entity = new Entity({ cartesian: eye.clone() });

    cameraLock.addTo(renderer);
    entity._updateAbsolutePosition();
    cameraLock.lockView(entity);

    expect(appliedDistance).toBe(120);
    expect(camera.eye.distance(entity.getAbsoluteCartesian())).toBe(120);
    expect(cameraLock.lockEntity).toBe(entity);
});
