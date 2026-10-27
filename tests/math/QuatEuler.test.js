import { Quat } from '../../src/math/Quat';
import { Vec3 } from '../../src/math/Vec3';
import { RADIANS, DEGREES } from '../../src/math';

const AXES = [new Vec3(1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, 0, 1)];

/**
 * Distance between two rotations as the worst displacement of a rotated basis
 * vector. Insensitive to the q/-q double cover and to how the euler angles are
 * folded, so it measures exactly what a decomposition must preserve.
 */
function orientationError(a, b) {
    let max = 0;
    for (const v of AXES) {
        const av = a.mulVec3(v);
        const bv = b.mulVec3(v);
        const d = Math.sqrt((av.x - bv.x) ** 2 + (av.y - bv.y) ** 2 + (av.z - bv.z) ** 2);
        if (d > max) max = d;
    }
    return max;
}

function pyr(pitchDeg, yawDeg, rollDeg) {
    return new Quat().setPitchYawRoll(pitchDeg * RADIANS, yawDeg * RADIANS, rollDeg * RADIANS);
}

function roundTrip(q) {
    return new Quat().setPitchYawRoll(q.getPitch(), q.getYaw(), q.getRoll());
}

describe('Quat euler decomposition', () => {
    test('round trip keeps the orientation at any pitch, including the poles', () => {
        const pitches = [-90, -89.9999999, -89.99999, -89.9, -89, -60, -35, 0, 35, 60, 89, 89.9, 90];
        const rolls = [0, 17, -33, 90, 179];
        for (const p of pitches) {
            for (let y = -180; y <= 180; y += 15) {
                for (const r of rolls) {
                    const q = pyr(p, y, r);
                    expect(orientationError(q, roundTrip(q))).toBeLessThan(1e-7);
                }
            }
        }
    });

    test('angles are recovered as entered away from the poles', () => {
        for (const p of [-89, -60, -35, 0, 35, 60, 89]) {
            for (let y = -170; y <= 170; y += 17) {
                for (const r of [-120, -33, 0, 17, 120]) {
                    const q = pyr(p, y, r);
                    expect(q.getPitch() * DEGREES).toBeCloseTo(p, 9);
                    expect(q.getYaw() * DEGREES).toBeCloseTo(y, 9);
                    expect(q.getRoll() * DEGREES).toBeCloseTo(r, 9);
                }
            }
        }
    });

    test('pole convention: pitch is vertical, roll is 0, yaw carries the whole turn', () => {
        for (const sign of [-1, 1]) {
            for (let y = -170; y <= 170; y += 15) {
                const q = pyr(sign * 90, y, 0);
                expect(q.getPitch() * DEGREES).toBeCloseTo(sign * 90, 9);
                expect(q.getRoll()).toBe(0);
                expect(q.getYaw() * DEGREES).toBeCloseTo(y, 6);
            }
        }
    });

    test('a roll entered at the pole folds into yaw deterministically', () => {
        // At the pole yaw and roll turn around the same axis: the orientation only
        // keeps their combination, and the convention returns it as yaw with roll 0.
        for (const [y, r] of [[30, -15], [0, 45], [-120, 60], [10, 170]]) {
            const q = pyr(-90, y, r);
            expect(q.getRoll()).toBe(0);
            expect(orientationError(q, roundTrip(q))).toBeLessThan(1e-7);
        }
    });

    test('camera getRotation chain stays stable at nadir', () => {
        // Camera.getPitch/getYaw/getRoll run through
        // Quat.getLookRotation(forward, up).conjugate() - the same three getters.
        for (let y = -170; y <= 170; y += 20) {
            const q = pyr(-90, y, 0);
            const up = q.mulVec3(new Vec3(0, 1, 0));
            const back = q.mulVec3(new Vec3(0, 0, 1));
            const forward = new Vec3(-back.x, -back.y, -back.z);

            const qc = Quat.getLookRotation(forward, up).conjugate();

            expect(orientationError(q, qc)).toBeLessThan(1e-7);
            expect(qc.getPitch() * DEGREES).toBeCloseTo(-90, 6);
            expect(qc.getRoll()).toBe(0);
            expect(qc.getYaw() * DEGREES).toBeCloseTo(y, 6);
        }
    });

    test('random sweep away from the poles stays exact', () => {
        let seed = 123456789;
        const rnd = () => {
            // deterministic LCG, keeps the test reproducible
            seed = (seed * 1103515245 + 12345) % 2147483648;
            return seed / 2147483648;
        };
        for (let i = 0; i < 20000; i++) {
            const p = rnd() * 178 - 89;
            const y = rnd() * 358 - 179;
            const r = rnd() * 358 - 179;
            const q = pyr(p, y, r);
            expect(orientationError(q, roundTrip(q))).toBeLessThan(1e-10);
        }
    });
});
