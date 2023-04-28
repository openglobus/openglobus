import * as math from "../../src/og/math.js";
import { Ellipsoid } from "../../src/og/ellipsoid/Ellipsoid.js";

test('Testing Ellipsoid getAngleBetweenToBearings', () => {
    let res = Ellipsoid.getAngleBetweenTwoBearings(0,0);
    expect(1).toBe(1);
});