import { PI_TWO } from "../math";
import { Mat3 } from "../math/Mat3";
import { Vec3 } from "../math/Vec3";

export function getRotationMatrix(rightAscension: number, declination: number, res?: Mat3): Mat3 {
    let xAxis = new Vec3(),
        zAxis = new Vec3();

    res = res || new Mat3();

    xAxis.x = Math.cos(rightAscension + PI_TWO);
    xAxis.y = Math.sin(rightAscension + PI_TWO);
    xAxis.z = 0.0;

    let cosDec = Math.cos(declination);

    zAxis.x = cosDec * Math.cos(rightAscension);
    zAxis.y = cosDec * Math.sin(rightAscension);
    zAxis.z = Math.sin(declination);

    let yAxis = zAxis.cross(xAxis);

    res._m[0] = xAxis.x;
    res._m[1] = yAxis.x;
    res._m[2] = zAxis.x;
    res._m[3] = xAxis.y;
    res._m[4] = yAxis.y;
    res._m[5] = zAxis.y;
    res._m[6] = xAxis.z;
    res._m[7] = yAxis.z;
    res._m[8] = zAxis.z;

    return res;
}
