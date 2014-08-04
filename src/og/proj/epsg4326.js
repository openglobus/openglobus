goog.provide('og.proj.EPSG4326');

goog.require('og.proj.Projection');
goog.require('og.Units');

og.proj.EPSG4326 = new og.proj.Projection({ code: "epsg:4326", units: og.Units.DEGREES });