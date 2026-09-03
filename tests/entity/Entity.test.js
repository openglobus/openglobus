import { Billboard } from '../../src/entity/billboard/Billboard';
import { Entity } from '../../src/entity/Entity';
import { EntityCollection } from '../../src/entity/EntityCollection';
import { PointCloud } from '../../src/entity/pointCloud/PointCloud';
import { Polyline } from '../../src/entity/polyline/Polyline';
import { Ray } from '../../src/entity/ray/Ray';
import { Strip } from '../../src/entity/strip/Strip';
import { LonLat } from '../../src/LonLat';
import { Vec3 } from '../../src/math/Vec3';
import { Quat } from '../../src/math/Quat';

test('Testing Entity', () => {
    let entity1 = new Entity({
        'label': {},
        'polyline': {},
        'billboard': {},
        'ray': {},
        'strip': {},
        'visibility': true
    });

    let entity2 = new Entity();
    entity1.appendChild(entity2);

    expect(entity1).toBeTruthy();
    expect(entity1.getExtent()).toBeTruthy();
    expect(entity1.isEqual(entity1)).toBe(true);
    expect(entity1.isEqual(entity2)).toBe(false);


    entity1.setAltitude(100);
    expect(entity1.getAltitude()).toBe(100);

    entity1.setVisibility(false);
    expect(entity1.getVisibility()).toBe(false);

    expect(entity1.instanceName).toBe("Entity");
    expect(entity1.getCollectionIndex()).toBe(-1);


    let entityCollection = new EntityCollection();

    entity1.addTo(entityCollection, false);
    expect(entityCollection.getEntities().length).toBe(1);
    entity1.remove();
    expect(entityCollection.getEntities().length).toBe(0);

    let polyline = new Polyline();
    expect(entity1.setPolyline(polyline)).toBe(polyline);


    let vec3 = new Vec3(1, 1, 1);
    entity1.setCartesian3v(vec3);
    expect(entity1.getCartesian()).toStrictEqual(vec3);
    entity1.setCartesian(0, 0, 0);
    expect(entity1.getCartesian()).toStrictEqual(new Vec3(0, 0, 0));

    let lonlat = new LonLat(1, 1);
    entity1.setLonLat(lonlat);
    expect(entity1.getLonLat()).toStrictEqual(lonlat);

    let billboard = new Billboard();
    expect(entity1.setBillboard(billboard)).toStrictEqual(billboard);

    let ray = new Ray();
    expect(entity1.setRay(ray)).toStrictEqual(ray);


    let pointCloud = new PointCloud({
        'points': [
            [0, 0, 0, 255, 255, 255, 255, { 'name': 'White point' }],
            [100, 100, 0, 255, 0, 0, 255, { 'name': 'Red point' }]
        ]
    });
    expect(entity1.setPointCloud(pointCloud)).toStrictEqual(pointCloud);

    let strip = new Strip();
    expect(entity1.setStrip(strip)).toStrictEqual(strip);

});

test('Nested entities: billboard and label follow the parent transform', () => {
    let parent = new Entity({
        cartesian: [1000, 0, 0],
        geoObject: {}
    });

    let child = new Entity({
        cartesian: [0, 10, 0],
        relativePosition: true,
        billboard: {},
        label: {}
    });

    parent.appendChild(child);
    parent.setCartesian(1000, 0, 0);

    // The child keeps its own offset instead of collapsing onto the root position.
    expect(child.billboard.getPosition().x).toBeCloseTo(1000);
    expect(child.billboard.getPosition().y).toBeCloseTo(10);
    expect(child.billboard.getPosition().z).toBeCloseTo(0);
    expect(child.label.getPosition().y).toBeCloseTo(10);

    // Rotating the parent carries the child around it: pitch of PI/2 maps +Y onto +Z.
    parent.setPitch(Math.PI / 2);

    expect(child.billboard.getPosition().x).toBeCloseTo(1000);
    expect(child.billboard.getPosition().y).toBeCloseTo(0);
    expect(child.billboard.getPosition().z).toBeCloseTo(10);
    expect(child.label.getPosition().z).toBeCloseTo(10);

    // Moving the parent moves the child with it, offset preserved.
    parent.setCartesian(2000, 0, 0);
    expect(child.billboard.getPosition().x).toBeCloseTo(2000);
    expect(child.billboard.getPosition().z).toBeCloseTo(10);
});

test('Nested entities: setPitchYawRoll matches three separate setters', () => {
    const build = () => {
        let p = new Entity({ cartesian: [1000, 0, 0] });
        let c = new Entity({ cartesian: [0, 10, 5], relativePosition: true, billboard: {} });
        p.appendChild(c);
        return [p, c];
    };

    let [p1, c1] = build();
    p1.setPitch(0.3);
    p1.setYaw(0.7);
    p1.setRoll(-0.2);

    let [p2, c2] = build();
    p2.setPitchYawRoll(0.3, 0.7, -0.2);

    expect(c2.billboard.getPosition().x).toBeCloseTo(c1.billboard.getPosition().x);
    expect(c2.billboard.getPosition().y).toBeCloseTo(c1.billboard.getPosition().y);
    expect(c2.billboard.getPosition().z).toBeCloseTo(c1.billboard.getPosition().z);
});

test('Nested entities: forceGlobalPosition still propagates through the tree', () => {
    let root = new Entity({ cartesian: [1, 2, 3] });
    let child = new Entity({ cartesian: [0, 0, 0], forceGlobalPosition: true });
    let grandChild = new Entity({ cartesian: [0, 0, 0], forceGlobalPosition: true });

    root.appendChild(child);
    child.appendChild(grandChild);

    root.setCartesian(10, 20, 30);

    expect(child.getCartesian().x).toBe(10);
    expect(grandChild.getCartesian().z).toBe(30);
});

test('Nested entities: forceGlobalScale still propagates through the tree', () => {
    let root = new Entity({ cartesian: [1, 2, 3] });
    let child = new Entity({ forceGlobalScale: true });
    let grandChild = new Entity({ forceGlobalScale: true });

    root.appendChild(child);
    child.appendChild(grandChild);

    root.setScale(4);

    expect(child.getScale().x).toBe(4);
    expect(grandChild.getScale().y).toBe(4);
});

test('nested entity keeps a finite absolute position under the default scaleByDistance', () => {
    let parent = new Entity({ cartesian: new Vec3(1000, 0, 0), geoObject: {} });
    let child = new Entity({ cartesian: new Vec3(0, 10, 0), relativePosition: true, geoObject: {} });
    parent.appendChild(child);

    let collection = new EntityCollection({ entities: [parent] });
    expect(collection.scaleByDistance).toEqual([2147483647, 2147483647, 2147483647, 1]);

    parent.setCartesian(1000, 0, 0);

    const abs = child.getAbsoluteCartesian();
    expect(Number.isFinite(abs.x)).toBe(true);
    expect(Number.isFinite(abs.y)).toBe(true);
    expect(Number.isFinite(abs.z)).toBe(true);
    expect([abs.x, abs.y, abs.z]).toEqual([1000, 10, 0]);

    // and the round trip through setAbsoluteCartesian3v stays put
    child.setAbsoluteCartesian3v(new Vec3(1000, 25, 0));
    const back = child.getAbsoluteCartesian();
    expect(back.y).toBeCloseTo(25);
});

test('scaleByDistance normalizes a non positive near, so shaders never divide by zero', () => {
    // a layer of labels fading in from zero distance: `near` and `far` are both 0
    let labels = new EntityCollection({ scaleByDistance: [0, 0, 6000000] });
    expect(labels.scaleByDistance[0]).toBeGreaterThan(0);
    expect(labels.scaleByDistance[0]).toBe(labels.scaleByDistance[1]);
    expect(labels.scaleByDistance[2]).toBe(6000000);
    expect(labels.scaleByDistance[3]).toBe(1);

    // `near = 0` with a usable `far` collapses onto `far`, which makes the ramp exactly far/far
    let noRamp = new EntityCollection({ scaleByDistance: [0, 5000, 8000, 0.5] });
    expect(noRamp.scaleByDistance).toEqual([5000, 5000, 8000, 0.5]);

    // setScaleByDistance goes through the same normalization, keeping the array identity
    let ec = new EntityCollection({});
    let ref = ec.scaleByDistance;
    ec.setScaleByDistance(0, 0, 1000);
    expect(ec.scaleByDistance).toBe(ref);
    expect(ec.scaleByDistance[0]).toBeGreaterThan(0);
    expect(ec.scaleByDistance[0]).toBe(ec.scaleByDistance[1]);
});

test('setScaleByDistance without vanish does not fade: size is kept past far', () => {
    let ec = new EntityCollection({});
    ec.setScaleByDistance(50, 50000);

    // vanish falls back to far, and `vanish <= far` is what switches fading off
    expect(ec.scaleByDistance).toEqual([50, 50000, 50000, 1]);
    expect(ec.scaleByDistance[2]).not.toBeGreaterThan(ec.scaleByDistance[1]);

    // an explicit vanish still enables it
    ec.setScaleByDistance(50, 50000, 80000, 0.5);
    expect(ec.scaleByDistance).toEqual([50, 50000, 80000, 0.5]);
});

describe('Entity direct quaternion rotation', () => {
    // A frame far from identity, like the north frame somewhere on the globe.
    const frame = new Quat().setPitchYawRoll(0.3, 1.1, -0.4);

    function withFrame(entity) {
        entity._entityCollection = { scene: { getFrameRotation: () => frame } };
        return entity;
    }

    function absoluteRotation(entity) {
        entity._updateAbsolutePosition();
        return entity._absoluteQRot;
    }

    function angleBetween(a, b) {
        const dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
        return (2 * Math.acos(Math.min(1, Math.abs(dot))) * 180) / Math.PI;
    }

    test('matches the pitch/yaw/roll path away from the singularity', () => {
        const rotation = new Quat().setPitchYawRoll(0.4, -0.9, 0.25);

        const euler = withFrame(new Entity({ name: 'euler' }));
        euler.setPitch(rotation.getPitch());
        euler.setYaw(rotation.getYaw());
        euler.setRoll(rotation.getRoll());

        const direct = withFrame(new Entity({ name: 'direct' }));
        direct.setDirectQuaternionRotation(rotation);

        expect(angleBetween(absoluteRotation(euler), absoluteRotation(direct))).toBeLessThan(0.001);
    });

    test('does not accumulate the frame over repeated updates', () => {
        const rotation = new Quat().setPitchYawRoll(0.4, -0.9, 0.25);
        const entity = withFrame(new Entity({ name: 'repeated' }));

        entity.setDirectQuaternionRotation(rotation);

        const first = absoluteRotation(entity).clone();
        for (let i = 0; i < 5; i++) {
            entity._updateAbsolutePosition();
        }

        expect(angleBetween(first, absoluteRotation(entity))).toBeLessThan(0.001);
    });

    test('nested entity takes the direct rotation as its local one', () => {
        const parentRotation = new Quat().setPitchYawRoll(0.2, 0.5, -0.1);
        const childRotation = new Quat().setPitchYawRoll(-Math.PI / 2, 1.2, 0.9);

        const root = new Entity({ name: 'root', cartesian: [1000, 2000, 3000] });
        const child = new Entity({ name: 'child', cartesian: [0, 10, 5], relativePosition: true });

        root.appendChild(child);
        withFrame(root);
        root.setDirectQuaternionRotation(parentRotation);
        child.setDirectQuaternionRotation(childRotation);

        // The frame belongs to the root, the child rotation composes on top of it.
        const expected = absoluteRotation(root).mul(childRotation);

        expect(angleBetween(absoluteRotation(child), expected)).toBeLessThan(0.001);

        // A root that became a child must not keep the frame baked into its local rotation.
        const first = absoluteRotation(child).clone();
        for (let i = 0; i < 5; i++) {
            child._updateAbsolutePosition();
        }
        expect(angleBetween(first, absoluteRotation(child))).toBeLessThan(0.001);
    });

    test('keeps the rotation exact where euler angles are degenerate', () => {
        // Pitch -90 is the decomposition singularity: yaw and roll trade places there.
        const nadir = new Quat().setPitchYawRoll(-Math.PI / 2, 1.2, 0.9);
        const expected = frame.conjugate().mul(nadir);

        const euler = withFrame(new Entity({ name: 'euler-nadir' }));
        euler.setPitch(nadir.getPitch());
        euler.setYaw(nadir.getYaw());
        euler.setRoll(nadir.getRoll());

        const direct = withFrame(new Entity({ name: 'direct-nadir' }));
        direct.setDirectQuaternionRotation(nadir);

        expect(angleBetween(absoluteRotation(direct), expected)).toBeLessThan(0.001);
        expect(angleBetween(absoluteRotation(euler), expected)).toBeGreaterThan(1);
    });
});
