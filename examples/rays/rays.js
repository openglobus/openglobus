import { Globe } from "../../src/og/Globe.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { LonLat } from "../../src/og/LonLat.js";
import { Vector } from "../../src/og/layer/Vector.js";
import { Entity } from "../../src/og/entity/Entity.js";
import { wgs84 } from "../../src/og/ellipsoid/wgs84.js";

var osm = new XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: "Data @ OpenStreetMap contributors, ODbL"
});

//ellipsoid with earth dimensions
let ellipsoid = wgs84;

//coordinates of Bochum in lonlat
let lonlatBochum = new LonLat(7, 51.5, 0);
//coordinate above Bochum to allow a upwards direction of ray
let lonlatBochumAir = new LonLat(7, 51.5, 2000000);
//coordinates of Bochum in Cartesian
let cartBochum = ellipsoid.lonLatToCartesian(lonlatBochum);
let cartBochumAir = ellipsoid.lonLatToCartesian(lonlatBochumAir);
//entity containing the Bochum ray
let entityBochum = new Entity({
    ray: {
        startPosition: cartBochum,
        endPosition: cartBochumAir,
        startColor: "blue",
        endColor: "green",
        thickness: 5
    }
});

//coordinates of Moscow in lonlat
let lonlatMoscow = new LonLat(37.6, 55.75, 0);
//coordinate above Moscow to allow a upwards direction of ray
let lonlatMoscowAir = new LonLat(37.6, 55.75, 1000000);
//coordinates of Moscow in Cartesian
let cartMoscow = ellipsoid.lonLatToCartesian(lonlatMoscow);
let cartMoscowAir = ellipsoid.lonLatToCartesian(lonlatMoscowAir);
//entity containing the Moscow ray
let entityMoscow = new Entity({
    ray: {
        startPosition: cartMoscow,
        endPosition: cartMoscowAir,
        startColor: "red",
        endColor: "green",
        thickness: 10
    }
});

//polygonOffsetUnits is needed to hide rays behind globe
let rayLayer = new Vector("rays", { polygonOffsetUnits: 0 });

//add entities containing the rays to the layer
rayLayer.add(entityBochum);
rayLayer.add(entityMoscow);

var globus = new Globe({
    target: "globus",
    name: "Earth",
    terrain: new GlobusTerrain(),
    layers: [osm, rayLayer],
    sun: {
        active: true
    }
});

window.globus = globus;
window.entityMoscow = entityMoscow;
window.entityBochum = entityBochum;
