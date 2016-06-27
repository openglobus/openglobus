goog.provide('og.proj.EPSG4326');

goog.require('og.proj.Projection');
goog.require('og.Units');

/**
 * EPSG:4326 projection object.
 * @type {og.proj.Projection}
 */
og.proj.EPSG4326 = new og.proj.Projection({ code: "epsg:4326", units: og.Units.DEGREES });