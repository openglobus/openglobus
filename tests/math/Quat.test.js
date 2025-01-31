import { Mat4 } from '../../src/math/Mat4';
import { Quat, quat } from '../../src/math/Quat';
import { Vec3 } from '../../src/math/Vec3';
import { RADIANS, DEGREES, random } from '../../src/math';

describe('Quat class', () => {
    test('methods', () => {
        const item = new Quat(1, 1, 2, 3);
        quat(1, 2, 3, 4);
        expect(item).toBeTruthy();
        expect(item.isZero()).toBe(false);
        expect(item.clear()).toBeTruthy();
        expect(item.copy(new Quat())).toBeTruthy();
        expect(item.setIdentity()).toBeTruthy();
        expect(item.add(new Quat())).toBeTruthy();
        expect(item.sub(2)).toBeTruthy();
        expect(item.scale(2)).toBeTruthy();
        expect(item.scaleTo(2)).toBeTruthy();
        expect(item.toVec()).toBeTruthy();
        expect(item.setFromSphericalCoords(1, 1, 1)).toBeTruthy();
        expect(item.setLookRotation(new Vec3(), new Vec3())).toBeTruthy();
        expect(item.setFromAxisAngle(new Vec3(), 3)).toBeTruthy();
        expect(item.getAxisAngle()).toBeTruthy();
        expect(item.setFromEulerAngles(1, 1, 1)).toBeTruthy();
        expect(item.getEulerAngles()).toBeTruthy();
        expect(item.setFromMatrix4(new Mat4())).toBeTruthy();
        expect(item.getMat4(new Mat4())).toBeTruthy();
        expect(item.getMat3()).toBeTruthy();
        expect(item.mulVec3(new Vec3())).toBeTruthy();
        expect(item.mul(new Quat())).toBeTruthy();
        expect(item.mulA(new Quat())).toBeTruthy();
        expect(item.conjugate()).toBeTruthy();
        expect(item.inverse()).toBeTruthy();
        expect(item.magnitude()).toBeFalsy();
        expect(item.magnitude2()).toBeFalsy();
        expect(item.dot(new Quat())).toBeFalsy();
        expect(item.isEqual(new Quat())).toBe(false);
        expect(item.slerp(new Quat(), 3)).toBeTruthy();
        expect(item.getRoll(true)).toBeFalsy();
        expect(item.getPitch(true)).toBeFalsy();
        expect(item.getYaw(true)).toBeFalsy();
    });

    test('static methods', () => {
        expect(Quat.IDENTITY).toBeTruthy();
        const rota = Quat.xRotation(0.3);
        expect(rota.x > 0).toBe(true);
        expect(Quat.yRotation(1)).toBeTruthy();
        expect(Quat.zRotation(1)).toBeTruthy();
        const vect3 = new Vec3();
        expect(Quat.axisAngleToQuat(vect3)).toBeTruthy();
        expect(Quat.axisAngleToQuat(new Vec3(), new Vec3())).toBeTruthy();
        expect(Quat.getLookRotation(new Vec3(), new Vec3())).toBeTruthy();
        expect(Quat.getLookAtSourceDest(new Vec3(), new Vec3())).toBeTruthy();
        expect(Quat.getRotationBetweenVectors(new Vec3(), new Vec3())).toBeTruthy();
        expect(Quat.getRotationBetweenVectorsRes(new Vec3(), new Vec3(), new Quat())).toBeTruthy();
        expect(Quat.getRotationBetweenVectorsUp(new Vec3(), new Vec3(), new Vec3())).toBeTruthy();
    });

    test('Remove conjugation', () => {

        for (let i = 0; i < 10000; i++) {

            let pitch = random(-180, 180),
                yaw = random(-180, 180),
                roll = random(-180, 180);

            let pitchYawRoll = [pitch * RADIANS, yaw * RADIANS, roll * RADIANS];

            //const qRot = Quat.setFromEulerAngles(pitchYawRoll[0], pitchYawRoll[1], pitchYawRoll[2]);

            let qp = Quat.xRotation(pitch);
            let qy = Quat.yRotation(-yaw);
            let qr = Quat.zRotation(roll);

            let qRot = qy.mul(qp).mul(qr);

            qp = Quat.xRotation(-pitch);
            qy = Quat.yRotation(yaw);
            qr = Quat.zRotation(-roll);

            let qRotNew = qr.mul(qp).mul(qy).conjugate();

            //let outPitchYawRoll = qRot.getEulerAngles().map(v => v * DEGREES);

            expect([
                qRot.x.toFixed(7),
                qRot.y.toFixed(7),
                qRot.z.toFixed(7),
                qRot.w.toFixed(7)
            ])
                .toStrictEqual([
                    qRotNew.x.toFixed(7),
                    qRotNew.y.toFixed(7),
                    qRotNew.z.toFixed(7),
                    qRotNew.w.toFixed(7)
                ]);
        }
    });

    test('Euler angles', () => {


        let pitch = 77,
            yaw = 120,
            roll = -2;

        let pitchYawRoll = [pitch * RADIANS, yaw * RADIANS, roll * RADIANS];

        let qRot = new Quat();

        qRot.setPitchYawRoll(pitchYawRoll[0], pitchYawRoll[1], pitchYawRoll[2]);

        let outPitchYawRoll = [
            qRot.getPitch(),
            qRot.getYaw(),
            qRot.getRoll()
        ];

        expect([
            Math.sin(pitchYawRoll[0]).toFixed(7),
            Math.sin(pitchYawRoll[1]).toFixed(7),
            Math.sin(pitchYawRoll[2]).toFixed(7)
        ]).toStrictEqual([
            Math.sin(outPitchYawRoll[0]).toFixed(7),
            Math.sin(outPitchYawRoll[1]).toFixed(7),
            Math.sin(outPitchYawRoll[2]).toFixed(7)
        ]);
    });
});
