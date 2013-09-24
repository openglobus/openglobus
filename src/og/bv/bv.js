goog.provide('og.bv');

goog.require('og.extent');
goog.require('og.geo');
goog.require('og.math');


og.bv.getBoundsFromExtent = function(ellipsoid, extent) {
    var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
    var v = [];
    v.push(
        og.geo.inverseMercator(extent[og.extent.LEFT], extent[og.extent.BOTTOM]),
        og.geo.inverseMercator(extent[og.extent.LEFT], extent[og.extent.TOP]),
        og.geo.inverseMercator(extent[og.extent.RIGHT], extent[og.extent.TOP]),
        og.geo.inverseMercator(extent[og.extent.RIGHT], extent[og.extent.BOTTOM]));

    v.push([v[0][og.geo.LON] + (v[2][og.geo.LON] - v[0][og.geo.LON]) / 2, v[0][og.geo.LAT] + (v[2][og.geo.LAT] - v[0][og.geo.LAT]) / 2]);

    for (var i = 0; i < 5; i++) {
        var coord = ellipsoid.LatLon2ECEF(v[i][og.geo.LAT], v[i][og.geo.LON], 0);
        var x = coord[og.math.Y], y = coord[og.math.Z], z = coord[og.math.X];
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
    }

    return [xmin, xmax, ymin, ymax, zmin, zmax];
};