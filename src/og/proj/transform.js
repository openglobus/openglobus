goog.provide('og.proj.transform');

goog.require('og.proj.EPSG4326');
goog.require('og.proj.EPSG3857');
goog.require('og.mercator');
goog.require('og.LonLat');
goog.require('og.proj');

og.proj.transform[og.proj.EPSG4326.id][og.proj.EPSG4326.id] = function (lonLat) {
    return lonLat;
};

og.proj.transform[og.proj.EPSG3857.id][og.proj.EPSG3857.id] = function (lonLat) {
    return lonLat;
};

og.proj.transform[og.proj.EPSG3857.id][og.proj.EPSG3857.id] = function (lonLat) {
    return new og.LonLat(og.mercator.forward_lon(lonLat.lon), og.mercator.forward_lat(lonLat.lat));
};

og.proj.transform[og.proj.EPSG3857.id][og.proj.EPSG3857.id] = function (lonLat) {
    return new og.LonLat(og.mercator.inverse_lon(lonLat.lon), og.mercator.inverse_lat(lonLat.lat));
};