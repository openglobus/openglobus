import * as math from "../math";
import {Vec3} from "./Vec3";
import {Mat4} from "./Mat4";
import {Mat3} from "./Mat3";

/**
 * A set of 4-dimensional coordinates used to represent rotation in 3-dimensional space.
 * @constructor
 * @param {Number} [x=0.0] The X component.
 * @param {Number} [y=0.0] The Y component.
 * @param {Number} [z=0.0] The Z component.
 * @param {Number} [w=0.0] The W component.
 */
export class Quat {
    /**
     * The X component.
     * @public
     * @type {Number}
     * @default 0.0
     */
    public x: number;

    /**
     * The Y component.
     * @public
     * @type {Number}
     * @default 0.0
     */
    public y: number;

    /**
     * The Z component.
     * @public
     * @type {Number}
     * @default 0.0
     */
    public z: number;

    /**
     * The W component.
     * @public
     * @type {Number}
     * @default 0.0
     */
    public w: number;

    constructor(x: number = 0.0, y: number = 0.0, z: number = 0.0, w: number = 0.0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    /**
     * Identity Quat.
     * @const
     * @type {Quat}
     */
    static get IDENTITY(): Quat {
        return new Quat(0.0, 0.0, 0.0, 1.0);
    }

    /**
     * Returns a Quat represents rotation around X axis.
     * @static
     * @param {number} a - The angle in radians to rotate around the axis.
     * @returns {Quat} -
     */
    static xRotation(a: number): Quat {
        a *= 0.5;
        return new Quat(Math.sin(a), 0.0, 0.0, Math.cos(a));
    }

    /**
     * Returns a Quat represents rotation around Y axis.
     * @static
     * @param {number} a - The angle in radians to rotate around the axis.
     * @returns {Quat} -
     */
    static yRotation(a: number): Quat {
        a *= 0.5;
        return new Quat(0.0, Math.sin(a), 0.0, Math.cos(a));
    }

    /**
     * Returns a Quat represents rotation around Z axis.
     * @static
     * @param {number} a - The angle in radians to rotate around the axis.
     * @returns {Quat} -
     */
    static zRotation(a: number): Quat {
        a *= 0.5;
        return new Quat(0.0, 0.0, Math.sin(a), Math.cos(a));
    }

    /**
     * Computes a Quat representing a rotation around an axis.
     * @static
     * @param {Vec3} axis - The axis of rotation.
     * @param {number} [angle=0.0] The angle in radians to rotate around the axis.
     * @returns {Quat} -
     */
    static axisAngleToQuat(axis: Vec3, angle: number = 0): Quat {
        let v = axis.getNormal();
        let half_angle = angle * 0.5;
        let sin_a = Math.sin(half_angle);
        return new Quat(v.x * sin_a, v.y * sin_a, v.z * sin_a, Math.cos(half_angle));
    }

    /**
     * Computes a rotation from the given heading and up vector.
     * @static
     * @param {Vec3} forward - Heading target coordinates.
     * @param {Vec3} up - Up vector.
     * @returns {Quat} -
     */
    static getLookRotation(forward: Vec3, up: Vec3): Quat {
        let f = forward.getNormal().negate();
        let s = up.cross(f).normalize();
        let u = f.cross(s);
        let z = 1.0 + s.x + u.y + f.z;

        if (z > 0.000001) {
            let fd = 1.0 / (2.0 * Math.sqrt(z));
            return new Quat((f.y - u.z) * fd, (s.z - f.x) * fd, (u.x - s.y) * fd, 0.25 / fd);
        }

        if (s.x > u.y && s.x > f.z) {
            let fd = 1.0 / (2.0 * Math.sqrt(1.0 + s.x - u.y - f.z));
            return new Quat(0.25 / fd, (u.x + s.y) * fd, (s.z + f.x) * fd, (f.y - u.z) * fd);
        }

        if (u.y > f.z) {
            let fd = 1.0 / (2.0 * Math.sqrt(1.0 + u.y - s.x - f.z));
            return new Quat((u.x + s.y) * fd, 0.25 / fd, (f.y + u.z) * fd, (s.z - f.x) * fd);
        }

        let fd = 1.0 / (2.0 * Math.sqrt(1.0 + f.z - s.x - u.y));
        return new Quat((s.z + f.x) * fd, (f.y + u.z) * fd, 0.25 / fd, (u.x - s.y) * fd);
    }

    /**
     * Computes a Quat from source point heading to the destination point.
     * @static
     * @param {Vec3} sourcePoint - Source coordinate.
     * @param {Vec3} destPoint - Destination coordinate.
     * @returns {Quat} -
     */
    static getLookAtSourceDest(sourcePoint: Vec3, destPoint: Vec3): Quat {
        let forwardVector = destPoint.subA(sourcePoint).normalize();
        let dot = Vec3.FORWARD.dot(forwardVector);
        if (Math.abs(dot - -1.0) < 0.000001) {
            return Quat.axisAngleToQuat(Vec3.UP, Math.PI);
        }
        if (Math.abs(dot - 1.0) < 0.000001) {
            return new Quat(0.0, 0.0, 0.0, 1.0);
        }
        let rotAngle = Math.acos(dot);
        let rotAxis = Vec3.FORWARD.cross(forwardVector).normalize();
        return Quat.axisAngleToQuat(rotAxis, rotAngle);
    }

    /**
     * Compute rotation between two vectors.
     * @static
     * @param {Vec3} u - First vector.
     * @param {Vec3} v - Second vector.
     * @returns {Quat} -
     */
    static getRotationBetweenVectors(u: Vec3, v: Vec3): Quat {
        let w = u.cross(v);
        let q = new Quat(w.x, w.y, w.z, 1.0 + u.dot(v));
        return q.normalize();
    }

    /**
     * Compute rotation between two vectors.
     * @static
     * @param {Vec3} u - First vector.
     * @param {Vec3} v - Second vector.
     * @param {Quat} res
     * @returns {Quat} -
     */
    static getRotationBetweenVectorsRes(u: Vec3, v: Vec3, res: Quat): Quat {
        let w = u.cross(v);
        res.set(w.x, w.y, w.z, 1.0 + u.dot(v));
        return res.normalize();
    }

    /**
     * Compute rotation between two vectors with around vector up
     * for exactly opposite vectors. If vectors exactly in the same
     * direction as returns identity Quat.
     * @static
     * @param {Vec3} source - First vector.
     * @param {Vec3} dest - Second vector.
     * @param {Vec3} up - Up vector.
     * @returns {Quat} -
     */
    static getRotationBetweenVectorsUp(source: Vec3, dest: Vec3, up: Vec3): Quat {
        let dot = source.dot(dest);
        if (Math.abs(dot + 1.0) < 0.000001) {
            // vector source and dest point exactly in the opposite direction,
            // so it is a 180 degrees turn around the up-axis
            return Quat.axisAngleToQuat(up, Math.PI);
        }
        if (Math.abs(dot - 1.0) < 0.000001) {
            // vector source and dest point exactly in the same direction,
            // so we return the identity Quat
            return new Quat(0, 0, 0, 1);
        }
        let rotAngle = Math.acos(dot);
        let rotAxis = source.cross(dest).normalize();
        return Quat.axisAngleToQuat(rotAxis, rotAngle);
    }

    static setFromEulerAngles(pitch: number, yaw: number, roll: number): Quat {
        let res = new Quat();
        return res.setFromEulerAngles(pitch, yaw, roll);
    }

    /**
     * Returns true if the components are zero.
     * @public
     * @returns {boolean} -
     */
    public isZero(): boolean {
        return this.x === 0.0 && this.y === 0.0 && this.z === 0.0 && this.w === 0.0;
    }

    /**
     * Clear Quat. Sets zeroes.
     * @public
     * @returns {Quat} -
     */
    public clear(): Quat {
        this.x = this.y = this.z = this.w = 0;
        return this;
    }

    /**
     * Sets Quat values.
     * @public
     * @param {Number} [x=0.0] The X component.
     * @param {Number} [y=0.0] The Y component.
     * @param {Number} [z=0.0] The Z component.
     * @param {Number} [w=0.0] The W component.
     * @returns {Quat} -
     */
    public set(x: number, y: number, z: number, w: number): Quat {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    /**
     * Copy Quat values.
     * @public
     * @param {Quat} q - Copy Quat.
     * @returns {Quat} -
     */
    public copy(q: Quat): Quat {
        this.x = q.x;
        this.y = q.y;
        this.z = q.z;
        this.w = q.w;
        return this;
    }

    /**
     * Set current Quat instance to identity Quat.
     * @public
     * @returns {Quat} -
     */
    public setIdentity(): Quat {
        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
        this.w = 1.0;
        return this;
    }

    /**
     * Duplicates a Quat instance.
     * @public
     * @returns {Quat} -
     */
    public clone(): Quat {
        return new Quat(this.x, this.y, this.z, this.w);
    }

    /**
     * Computes the componentwise sum of two Quats.
     * @public
     * @param {Quat} q - Quat to add.
     * @returns {Quat} -
     */
    public add(q: Quat): Quat {
        return new Quat(this.x + q.x, this.y + q.y, this.z + q.z, this.w + q.w);
    }

    /**
     * Computes the componentwise difference of two Quats.
     * @public
     * @param {Quat} q - Quat to subtract.
     * @returns {Quat} -
     */
    public sub(q: Quat): Quat {
        return new Quat(this.x - q.x, this.y - q.y, this.z - q.z, this.w - q.w);
    }

    /**
     * Multiplies the provided Quat componentwise by the provided scalar.
     * @public
     * @param {Number} scale - The scalar to multiply with.
     * @returns {Quat} -
     */
    public scaleTo(scale: number): Quat {
        return new Quat(this.x * scale, this.y * scale, this.z * scale, this.w * scale);
    }

    /**
     * Multiplies the provided Quat componentwise.
     * @public
     * @param {Number} scale - The scalar to multiply with.
     * @returns {Quat} -
     */
    public scale(scale: number): Quat {
        this.x *= scale;
        this.y *= scale;
        this.z *= scale;
        this.w *= scale;
        return this;
    }

    /**
     * Converts Quat values to array.
     * @public
     * @returns {Array.<number>} - (exactly 4 entries)
     */
    public toVec(): [number, number, number, number] {
        return [this.x, this.y, this.z, this.w];
    }

    /**
     * Sets current quaternion by spherical coordinates.
     * @public
     * @param {number} lat - Latitude.
     * @param {number} lon - Longitude.
     * @param {number} angle - Angle in radians.
     * @returns {Quat} -
     */
    public setFromSphericalCoords(lat: number, lon: number, angle: number): Quat {
        let sin_a = Math.sin(angle / 2);
        let cos_a = Math.cos(angle / 2);
        let sin_lat = Math.sin(lat);
        let cos_lat = Math.cos(lat);
        let sin_long = Math.sin(lon);
        let cos_long = Math.cos(lon);

        this.x = sin_a * cos_lat * sin_long;
        this.y = sin_a * sin_lat;
        this.z = sin_a * sin_lat * cos_long;
        this.w = cos_a;

        return this;
    }

    public get xyz() {
        return new Vec3(this.x, this.y, this.z);
    }

    /**
     * Sets rotation with the given heading and up vectors.
     * @static
     * @param {Vec3} forward - Heading target coordinates.
     * @param {Vec3} up - Up vector.
     * @returns {Quat} -
     */
    public setLookRotation(forward: Vec3, up: Vec3): Quat {
        let f = forward.getNormal().negate();
        let s = up.cross(f).normalize();
        let u = f.cross(s);
        let z = 1.0 + s.x + u.y + f.z;

        if (z > 0.000001) {
            let fd = 1.0 / (2.0 * Math.sqrt(z));
            this.x = (f.y - u.z) * fd;
            this.y = (s.z - f.x) * fd;
            this.z = (u.x - s.y) * fd;
            this.w = 0.25 / fd;
        } else if (s.x > u.y && s.x > f.z) {
            let fd = 1.0 / (2.0 * Math.sqrt(1.0 + s.x - u.y - f.z));
            this.x = 0.25 / fd;
            this.y = (u.x + s.y) * fd;
            this.z = (s.z + f.x) * fd;
            this.w = (f.y - u.z) * fd;
        } else if (u.y > f.z) {
            let fd = 1.0 / (2.0 * Math.sqrt(1.0 + u.y - s.x - f.z));
            this.x = (u.x + s.y) * fd;
            this.y = 0.25 / fd;
            this.z = (f.y + u.z) * fd;
            this.w = (s.z - f.x) * fd;
        } else {
            let fd = 1.0 / (2.0 * Math.sqrt(1.0 + f.z - s.x - u.y));
            this.x = (s.z + f.x) * fd;
            this.y = (f.y + u.z) * fd;
            this.z = 0.25 / fd;
            this.w = (u.x - s.y) * fd;
        }

        return this;
    }

    /**
     * Gets spherical coordinates.
     * @public
     * @returns {Object} Returns object with latitude, longitude and alpha.
     */
    public toSphericalCoords(): any {

        let cos_a = this.w;
        let sin_a = Math.sqrt(1.0 - cos_a * cos_a);

        // var angle = Math.acos(cos_a) * 2;
        if (Math.abs(sin_a) < 0.0005) {
            sin_a = 1;
        }

        let tx = this.x / sin_a;
        let ty = this.y / sin_a;
        let tz = this.z / sin_a;

        let lon, lat = -Math.asin(ty);

        if (tx * tx + tz * tz < 0.0005) {
            lon = 0;
        } else {
            lon = Math.atan2(tx, tz);
        }

        if (lon < 0) {
            lon += 360.0;
        }

        return {
            lat: lat,
            lon: lon,
            alpha: Math.acos(cos_a)
        };
    }

    /**
     * Sets current Quat representing a rotation around an axis.
     * @public
     * @param {Vec3} axis - The axis of rotation.
     * @param {number} angle The angle in radians to rotate around the axis.
     * @returns {Quat} -
     */
    public setFromAxisAngle(axis: Vec3, angle: number): Quat {
        let v = axis.getNormal();
        let half_angle = angle * 0.5;
        let sin_a = Math.sin(half_angle);
        this.set(v.x * sin_a, v.y * sin_a, v.z * sin_a, Math.cos(half_angle));
        return this;
    }

    /**
     * Returns axis and angle of the current Quat.
     * @public
     * @returns {Object} -
     */
    public getAxisAngle(): any {
        let x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;
        let vl = Math.sqrt(x * x + y * y + z * z);
        let axis, angle;
        if (vl > 0.0000001) {
            let ivl = 1.0 / vl;
            axis = new Vec3(x * ivl, y * ivl, z * ivl);
            if (w < 0) {
                angle = 2.0 * Math.atan2(-vl, -w); // -PI,0
            } else {
                angle = 2.0 * Math.atan2(vl, w); // 0,PI
            }
        } else {
            axis = new Vec3(0, 0, 0);
            angle = 0;
        }

        return {
            axis: axis,
            angle: angle
        };
    }

    /**
     * Sets current Quat by Euler's angles.
     * @public
     * @param {number} pitch - Pitch angle in degrees.
     * @param {number} yaw - Yaw angle in degrees.
     * @param {number} roll - Roll angle in degrees.
     * @returns {Quat} -
     */
    public setFromEulerAngles(pitch: number, yaw: number, roll: number): Quat {
        let ex = pitch * math.RADIANS_HALF,
            ey = yaw * math.RADIANS_HALF,
            ez = roll * math.RADIANS_HALF;

        let cr = Math.cos(ex),
            cp = Math.cos(ey),
            cy = Math.cos(ez);

        let sr = Math.sin(ex),
            sp = Math.sin(ey),
            sy = Math.sin(ez);

        let cpcy = cp * cy,
            spsy = sp * sy;

        this.w = cr * cpcy + sr * spsy;
        this.x = sr * cpcy - cr * spsy;
        this.y = cr * sp * cy + sr * cp * sy;
        this.z = cr * cp * sy - sr * sp * cy;

        return this.normalize();
    }

    /**
     * Returns Euler's angles of the current Quat.
     * @public
     * @returns {Object} -
     */
    public getEulerAngles(): any {
        let x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;

        let sqy = y * y;

        let roll = Math.atan2(2.0 * (w * x + y * z), 1.0 - 2.0 * (x * x + sqy));

        let a = w * y - z * x;

        if (a < -1.0) {
            a = -1.0;
        } else if (a > 1.0) {
            a = 1.0;
        }
        let pitch = Math.asin(2.0 * a);

        let yaw = Math.atan2(2.0 * (w * z + x * y), 1.0 - 2.0 * (sqy + z * z));

        return {
            roll,
            pitch,
            yaw
        };
    }

    /**
     * Computes a Quat from the provided 4x4 matrix instance.
     * @public
     * @param {Mat4} mx - The rotation matrix.
     * @returns {Quat} -
     */
    public setFromMatrix4(mx: Mat4): Quat {
        let tr,
            s,
            q = [];
        let i, j, k;
        let m = mx._m;

        let nxt = [1, 2, 0];

        tr = m[0] + m[5] + m[10];

        if (tr > 0.0) {
            s = Math.sqrt(tr + 1.0);
            this.w = s / 2.0;
            s = 0.5 / s;
            this.x = (m[6] - m[9]) * s;
            this.y = (m[8] - m[2]) * s;
            this.z = (m[1] - m[4]) * s;
        } else {
            i = 0;
            if (m[5] > m[0]) i = 1;
            if (m[10] > m[i * 5]) i = 2;
            j = nxt[i];
            k = nxt[j];

            s = Math.sqrt(m[i * 5] - (m[j * 5] + m[k * 5]) + 1.0);

            q[i] = s * 0.5;

            if (s !== 0.0) s = 0.5 / s;

            q[3] = (m[j * 4 + k] - m[k * 4 + j]) * s;
            q[j] = (m[i * 4 + j] + m[j * 4 + i]) * s;
            q[k] = (m[i * 4 + k] + m[k * 4 + i]) * s;

            this.x = q[0];
            this.y = q[1];
            this.z = q[2];
            this.w = q[3];
        }
        return this;
    }

    /**
     * Converts current Quat to the rotation 4x4 matrix.
     * @public
     * @params {Mat4} [out] - Output matrix
     * @returns {Mat4} -
     */
    public getMat4(out: Mat4 = new Mat4()): Mat4 {
        let xs = this.x + this.x;
        let ys = this.y + this.y;
        let zs = this.z + this.z;
        let wx = this.w * xs;
        let wy = this.w * ys;
        let wz = this.w * zs;
        let xx = this.x * xs;
        let xy = this.x * ys;
        let xz = this.x * zs;
        let yy = this.y * ys;
        let yz = this.y * zs;
        let zz = this.z * zs;

        return out.set([
            1 - (yy + zz), xy - wz, xz + wy, 0,
            xy + wz, 1 - (xx + zz), yz - wx, 0,
            xz - wy, yz + wx, 1 - (xx + yy), 0,
            0, 0, 0, 1
        ]);
    }

    /**
     * Converts current Quat to the rotation 3x3 matrix.
     * @public
     * @returns {Mat3} -
     * @todo NOT TESTED
     */
    public getMat3(): Mat3 {
        let m = new Mat3();
        let mx = m._m;
        let c = this.x,
            d = this.y,
            e = this.z,
            g = this.w,
            f = c + c,
            h = d + d,
            i = e + e,
            j = c * f,
            k = c * h;

        c = c * i;

        let l = d * h;

        d = d * i;
        e = e * i;
        f = g * f;
        h = g * h;
        g = g * i;

        mx[0] = 1 - (l + e);
        mx[1] = k - g;
        mx[2] = c + h;
        mx[3] = k + g;
        mx[4] = 1 - (j + e);
        mx[5] = d - f;
        mx[6] = c - h;
        mx[7] = d + f;
        mx[8] = 1 - (j + l);

        return m;
    }

    /**
     * Returns quaternion and vector production.
     * @public
     * @param {Vec3} v - 3d Vector.
     * @returns {Vec3} -
     */
    public mulVec3(v: Vec3): Vec3 {
        // t = 2 * cross(q.xyz, v)
        // v' = v + q.w * t + cross(q.xyz, t)

        let d = v.x,
            e = v.y,
            g = v.z;

        let b = this.x,
            f = this.y,
            h = this.z,
            a = this.w;

        let i = a * d + f * g - h * e,
            j = a * e + h * d - b * g,
            k = a * g + b * e - f * d;

        d = -b * d - f * e - h * g;

        return new Vec3(
            i * a + d * -b + j * -h - k * -f,
            j * a + d * -f + k * -b - i * -h,
            k * a + d * -h + i * -f - j * -b
        );
    }

    /**
     * Computes the product of two Quats.
     * @public
     * @param {Quat} q - Quat to multiply.
     * @returns {Quat} -
     */
    public mul(q: Quat): Quat {
        let d = this.x,
            e = this.y,
            g = this.z,
            a = this.w;

        let f = q.x,
            h = q.y,
            i = q.z,
            b = q.w;

        return new Quat(
            d * b + a * f + e * i - g * h,
            e * b + a * h + g * f - d * i,
            g * b + a * i + d * h - e * f,
            a * b - d * f - e * h - g * i
        );
    }

    /**
     * Computes the product of two Quats.
     * @public
     * @param {Quat} q - Quat to multiply.
     * @returns {Quat} -
     */
    public mulA(q: Quat): Quat {
        let d = this.x,
            e = this.y,
            g = this.z,
            a = this.w;

        let f = q.x,
            h = q.y,
            i = q.z,
            b = q.w;

        this.x = d * b + a * f + e * i - g * h;
        this.y = e * b + a * h + g * f - d * i;
        this.z = g * b + a * i + d * h - e * f;
        this.w = a * b - d * f - e * h - g * i;

        return this;
    }

    /**
     * Gets the conjugate of the Quat.
     * @public
     * @returns {Quat} -
     */
    public conjugate(): Quat {
        return new Quat(-this.x, -this.y, -this.z, this.w);
    }

    /**
     * Computes the inverse of the Quat.
     * @public
     * @returns {Quat} -
     */
    public inverse(): Quat {
        let n = 1.0 / this.magnitude2();
        return new Quat(-this.x * n, -this.y * n, -this.z * n, this.w * n);
    }

    /**
     * Computes a magnitude of the Quat.
     * @public
     * @returns {number} -
     */
    public magnitude(): number {
        let b = this.x,
            c = this.y,
            d = this.z,
            a = this.w;
        return Math.sqrt(b * b + c * c + d * d + a * a);
    }

    /**
     * Computes a squared magnitude of the Quat.
     * @public
     * @returns {number} -
     */
    public magnitude2(): number {
        let b = this.x,
            c = this.y,
            d = this.z,
            a = this.w;
        return b * b + c * c + d * d + a * a;
    }

    /**
     * Computes the dot (scalar) product of two Quats.
     * @public
     * @param {Quat} q - Second quaternion.
     * @returns {number} -
     */
    public dot(q: Quat): number {
        return this.x * q.x + this.y * q.y + this.z * q.z;
    }

    /**
     * Current Quat normalization.
     * @public
     * @returns {Quat} -
     */
    public normalize(): Quat {

        let c = this.x,
            d = this.y,
            e = this.z,
            g = this.w,
            f = Math.sqrt(c * c + d * d + e * e + g * g);

        if (f === 0.0) {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.w = 0;
            return this;
        }

        f = 1 / f;
        this.x = c * f;
        this.y = d * f;
        this.z = e * f;
        this.w = g * f;

        return this;
    }

    /**
     * Compares two Quats.
     * @public
     * @param {Quat} q - Second quaternion.
     * @returns {Boolean} -
     */
    public isEqual(q: Quat): boolean {
        let matching = this.dot(q);
        if (Math.abs(matching - 1.0) < 0.001) {
            return true;
        }
        return false;
    }

    /**
     * Performs a spherical linear interpolation between two Quats.
     * @public
     * @param {Quat} b - The end rotation Quat.
     * @param {number} t - interpolation amount between the two Quats.
     * @returns {Quat} -
     */
    public slerp(b: Quat, t: number): Quat {

        let ax = this.x,
            ay = this.y,
            az = this.z,
            aw = this.w,
            bx = b.x,
            by = b.y,
            bz = b.z,
            bw = b.w;

        let omega, cosom, sinom, scale0, scale1;

        cosom = ax * bx + ay * by + az * bz + aw * bw;

        if (cosom < 0.0) {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }

        if (1.0 - cosom > 0.000001) {
            omega = Math.acos(cosom);
            sinom = Math.sin(omega);
            scale0 = Math.sin((1.0 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        } else {
            scale0 = 1.0 - t;
            scale1 = t;
        }

        return new Quat(
            scale0 * ax + scale1 * bx,
            scale0 * ay + scale1 * by,
            scale0 * az + scale1 * bz,
            scale0 * aw + scale1 * bw
        );
    }

    /**
     * Returns a roll angle in radians.
     * @public
     * @param {Boolean} [reprojectAxis] -
     * @returns {Number} -
     */
    public getRoll(reprojectAxis: boolean = false): number {

        let x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;

        if (reprojectAxis) {
            let fTy = 2.0 * y;
            let fTz = 2.0 * z;
            let fTwz = fTz * w;
            let fTxy = fTy * x;
            let fTyy = fTy * y;
            let fTzz = fTz * z;
            return Math.atan2(fTxy + fTwz, 1.0 - (fTyy + fTzz));
        } else {
            return Math.atan2(2 * (x * y + w * z), w * w + x * x - y * y - z * z);
        }
    }

    /**
     * Returns a pitch angle in radians.
     * @public
     * @param {Boolean} [reprojectAxis] -
     * @returns {number} -
     */
    public getPitch(reprojectAxis: boolean = false): number {

        let x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;

        if (reprojectAxis) {
            let fTx = 2.0 * x;
            let fTz = 2.0 * z;
            let fTwx = fTx * w;
            let fTxx = fTx * x;
            let fTyz = fTz * y;
            let fTzz = fTz * z;
            return Math.atan2(fTyz + fTwx, 1.0 - (fTxx + fTzz));
        } else {
            return Math.atan2(2 * (y * z + w * x), w * w - x * x - y * y + z * z);
        }
    }

    /**
     * Returns a yaw angle in radians.
     * @public
     * @param {Boolean} [reprojectAxis] -
     * @returns {number} -
     */
    public getYaw(reprojectAxis: boolean = false): number {

        let x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;

        if (reprojectAxis) {
            let fTx = 2.0 * x;
            let fTy = 2.0 * y;
            let fTz = 2.0 * z;
            let fTwy = fTy * w;
            let fTxx = fTx * x;
            let fTxz = fTz * x;
            let fTyy = fTy * y;
            return Math.atan2(fTxz + fTwy, 1.0 - (fTxx + fTyy));
        } else {
            return Math.asin(-2 * (x * z - w * y));
        }
    }
}

/**
 * Creates Quat instance.
 * @function
 * @param {Number} [x=0.0] The X component.
 * @param {Number} [y=0.0] The Y component.
 * @param {Number} [z=0.0] The Z component.
 * @param {Number} [w=0.0] The W component.
 * @returns {Quat} -
 */
export function quat(x: number = 0, y: number = 0, z: number = 0, w: number = 0): Quat {
    return new Quat(x, y, z, w);
}
