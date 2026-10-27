import { CameraLock } from "../../src/control/CameraLock";
import { Entity } from "../../src/entity/Entity";
import { Vec3 } from "../../src/math/Vec3";

function createRenderer(eye) {
    const centers = [];
    const camera = {
        eye,
        isOrthographic: false,
        appliedDistance: 0,
        viewDistance(target, distance) {
            this.appliedDistance = distance;
            this.eye.copy(target.add(new Vec3(0, 0, distance)));
        }
    };

    return {
        activeCamera: camera,
        controls: {},
        centers,
        events: {
            on() {},
            off() {}
        },
        setRelativeCenter(c) {
            centers.push(c.clone());
        },
        isInitialized: () => true
    };
}

test("locking an entity at the camera eye starts at a usable view distance", () => {
    const eye = new Vec3(10, 20, 30);
    const renderer = createRenderer(eye);
    const cameraLock = new CameraLock();
    const entity = new Entity({ cartesian: eye.clone() });

    cameraLock.addTo(renderer);
    entity._updateAbsolutePosition();
    cameraLock.lockView(entity);

    expect(renderer.activeCamera.appliedDistance).toBe(120);
    expect(renderer.activeCamera.eye.distance(entity.getAbsoluteCartesian())).toBe(120);
    expect(cameraLock.lockEntity).toBe(entity);
});

test("centers the relative-to-center rendering on the locked entity", () => {
    const renderer = createRenderer(new Vec3(0, 0, 7_000_000));
    const cameraLock = new CameraLock();
    const entity = new Entity({ cartesian: new Vec3(6_378_137, 10, 20) });

    cameraLock.addTo(renderer);
    entity._updateAbsolutePosition();
    cameraLock.lockView(entity);

    expect(renderer.centers).toHaveLength(1);
    expect(renderer.centers[0].distance(entity.getAbsoluteCartesian())).toBe(0);
});
