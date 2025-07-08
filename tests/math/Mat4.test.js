import { ray, Ray } from '../../src/math/Ray';
import { Vec3 } from '../../src/math/Vec3';
import { Plane } from '../../src/math/Plane';
import { Mat4 } from '../../src/math/Mat4';

describe('Mat4 class', () => {

    test('Translate to position', () => {
        const mat = Mat4.identity();
        mat.translateToPosition(new Vec3(1, 2, 3));
        const pos = mat.getPosition();
        expect(pos.x).toBe(1);
        expect(pos.y).toBe(2);
        expect(pos.z).toBe(3);
    });

});
