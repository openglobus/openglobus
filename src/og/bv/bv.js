goog.provide('og.bv');

goog.require('og.Extent');
goog.require('og.math');
goog.require('og.mercator');


og.bv.getBoundsFromExtent = function (ellipsoid, extent) {
    var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
    var v = [];
    v.push(og.mercator.inverseMercator(extent.southWest.lon, extent.southWest.lat),
        og.mercator.inverseMercator(extent.southWest.lon, extent.northEast.lat),
        og.mercator.inverseMercator(extent.northEast.lon, extent.northEast.lat),
        og.mercator.inverseMercator(extent.northEast.lon, extent.southWest.lat));

    for (var i = 0; i < v.length; i++) {
        var coord = ellipsoid.LonLat2ECEF(v[i], 0);
        var x = coord.y, y = coord.z, z = coord.x;
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
    }

    return [xmin, xmax, ymin, ymax, zmin, zmax];
};