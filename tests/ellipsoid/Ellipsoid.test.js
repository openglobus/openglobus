import { LonLat } from "../../src/og/LonLat";
import { Vec3 } from "../../src/og/math/Vec3";
import { Ellipsoid } from "../../src/og/ellipsoid/Ellipsoid";
import { wgs84 } from "../../src/og/ellipsoid/wgs84";

test('Testing Ellipsoid Vincenty direct to inverse formulas', () => {

    let good = [[0, 0, 0, 1], [0, 0, 0, 10000], [10, 20, 33, 5000], [-10, 70, 33, 15000], [180, 0, 0, 1]];

    for (let i = 0; i < good.length; i++) {
        let p0 = new LonLat(good[i][0], good[i][1]);
        let azimuth = good[i][2];
        let dist = good[i][3];

        let direct = wgs84.direct(p0, azimuth, dist);
        let p1 = direct.destination;
        let inverse = wgs84.inverse(p0, p1);

        expect(inverse.distance).toBeCloseTo(dist);
        expect(inverse.initialAzimuth).toBeCloseTo(azimuth);
    }

    let bad = [[0, 0, 90, 15000000000], [180, 0, 0, 100000000]];

    for (let i = 0; i < bad.length; i++) {
        let p0 = new LonLat(bad[i][0], bad[i][1]);
        let azimuth = bad[i][2];
        let dist = bad[i][3];

        let direct = wgs84.direct(p0, azimuth, dist);
        let p1 = direct.destination;
        let inverse = wgs84.inverse(p0, p1);

        expect(inverse.distance).not.toBeCloseTo(dist);
        expect(inverse.initialAzimuth).toBeCloseTo(azimuth);
    }

    let p0 = new LonLat(0, 0);
    let azimuth = 0;
    let dist = 0;

    let direct = wgs84.direct(p0, azimuth, dist);
    let p1 = direct.destination;
    let inverse = wgs84.inverse(p0, p1);

    expect(inverse.distance).toEqual(0);
    expect(inverse.initialAzimuth).toEqual(NaN);
});

test('Testing Ellipsoid Vincenty inverse to diect formulas', () => {

    let good0 = [[0, 0], [45, 45], [-170, -45]];
    let good1 = [[10, 10], [-100, 12], [0, 0]];

    for (let i = 0; i < good0.length; i++) {
        let p0 = new LonLat(good0[i][0], good0[i][1]),
            p1 = new LonLat(good1[i][0], good1[i][1]);

        let inverse = wgs84.inverse(p0, p1);

        let direct = wgs84.direct(p0, inverse.initialAzimuth, inverse.distance);

        expect(direct.destination.lon).toBeCloseTo(p1.lon);
        expect(direct.destination.lat).toBeCloseTo(p1.lat);
    }
});

test('Testing Ellipsoid getIntermediatePointOnGreatCircle', () => {

    let p0 = new LonLat(0, 0),
        p1 = new LonLat(1, 1);

    let p = wgs84.getIntermediatePointOnGreatCircle(p0, p1, 0);

    expect(p.lon).toBeCloseTo(p0.lon);
    expect(p.lat).toBeCloseTo(p0.lat);

    p0 = new LonLat(0, 0);
    p1 = new LonLat(1, 1);

    p = wgs84.getIntermediatePointOnGreatCircle(p0, p1, 1);

    expect(p.lon).toBeCloseTo(p1.lon);
    expect(p.lat).toBeCloseTo(p1.lat);

    p0 = new LonLat(0, 0);
    p1 = new LonLat(1, 1);

    p = wgs84.getIntermediatePointOnGreatCircle(p0, p1, 0.5);

    expect(p.lon).toBeCloseTo(0.5);
    expect(p.lat).toBeCloseTo(0.5);
});

test('Testing lon, lat to EPSG4978', () => {

    //6378137.0, 6356752.3142451793

    const test_0_0 = new Vec3(wgs84.getEquatorialSize(), .0, .0);
    let res = wgs84.geodeticToCartesian(0, 0);
    expect(res).toEqual(test_0_0);
    let lonlat = wgs84.cartesianToLonLat(test_0_0);
    expect(lonlat).toEqual(new LonLat(0, 0));


    const test_180_0 = new Vec3(-wgs84.getEquatorialSize(), .0, .0);
    res = wgs84.geodeticToCartesian(180, 0);
    res.y = Math.round(res.y);
    expect(res).toEqual(test_180_0);
    lonlat = wgs84.cartesianToLonLat(test_180_0);
    expect(lonlat).toEqual(new LonLat(180, 0));

    const test_n180_0 = new Vec3(-wgs84.getEquatorialSize(), .0, .0);
    res = wgs84.geodeticToCartesian(-180, 0);
    res.y = Math.round(res.y) || 0;
    expect(res).toEqual(test_n180_0);
    lonlat = wgs84.cartesianToLonLat(test_n180_0);
    expect(lonlat).toEqual(new LonLat(180, 0));

    const test_90_0 = new Vec3(.0, wgs84.getEquatorialSize(), .0);
    res = wgs84.geodeticToCartesian(90, 0);
    res.x = Math.round(res.x) || 0;
    expect(res).toEqual(test_90_0);
    lonlat = wgs84.cartesianToLonLat(test_90_0);
    expect(lonlat).toEqual(new LonLat(90, 0));

    const test_n90_0 = new Vec3(.0, -wgs84.getEquatorialSize(), .0);
    res = wgs84.geodeticToCartesian(-90, 0)
    res.x = Math.round(res.x) || 0;
    expect(res).toEqual(test_n90_0);

    const test_0_90 = new Vec3(.0, .0, wgs84.getPolarSize());
    res = wgs84.geodeticToCartesian(0, 90);
    res.x = Math.round(res.x) || 0;
    expect(res).toEqual(test_0_90);

    const test_0_n90 = new Vec3(.0, .0, -wgs84.getPolarSize());
    res = wgs84.geodeticToCartesian(0, -90);
    res.x = Math.round(res.x) || 0;
    expect(res).toEqual(test_0_n90);

    const test_10_90 = new Vec3(.0, .0, wgs84.getPolarSize());
    res = wgs84.geodeticToCartesian(0, 90);
    res.x = Math.round(res.x) || 0;
    expect(res).toEqual(test_10_90);
});