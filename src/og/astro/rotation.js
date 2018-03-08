/**
 * @module og/astro/rotation
 */

'use strict';

export function getRotationMatrix(rightAscension, declination) {
    xAxis.x = Math.cos(rightAscension + og.math.PI_TWO);
    xAxis.y = Math.sin(rightAscension + og.math.PI_TWO);
    xAxis.z = 0.0;

    var cosDec = Math.cos(declination);

    zAxis.x = cosDec * Math.cos(rightAscension);
    zAxis.y = cosDec * Math.sin(rightAscension);
    zAxis.z = Math.sin(declination);

    var yAxis = zAxis.cross(xAxis);

    res._m[0] = xAxis.x;
    res._m[1] = yAxis.x;
    res._m[2] = zAxis.x;
    res._m[3] = xAxis.y;
    res._m[4] = yAxis.y;
    res._m[5] = zAxis.y;
    res._m[6] = xAxis.z;
    res._m[7] = yAxis.z;
    res._m[8] = zAxis.z;

    return result;
};