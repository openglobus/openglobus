goog.provide('og.proj.EPSG3857');

goog.require('og.proj.Projection');
goog.require('og.Units');

/**
 * EPSG:3857 projection object.
 * @type {og.proj.Projection}
 */
og.proj.EPSG3857 = new og.proj.Projection({ code: "epsg:3857", units: og.Units.METERS });