import {
    Globe,
    OpenStreetMap,
    GeoTIFFLayer,
    GlobusRgbTerrain
} from "../../lib/og.es.js";

if (typeof proj4 !== "undefined") {
    window.proj4 = proj4;
}

const globe = new Globe({
    target: "globus",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap()],
    atmosphereEnabled: false,
    lightEnabled: false,
    fontsSrc: "../../res/fonts",
    resourcesSrc: "../../res"
});

// Single-band Sentinel-2 COGs stacked into a 4-band layer:
// Band 1: B04 (Red, max 4462)
// Band 2: B03 (Green, max 2820)
// Band 3: B02 (Blue, max 2170)
// Band 4: B08 (NIR, max 6214)
const sources = [
    {
        url: "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/B04.tif",
        max: 4462
    },
    {
        url: "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/B03.tif",
        max: 2820
    },
    {
        url: "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/B02.tif",
        max: 2170
    },
    {
        url: "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/B08.tif",
        max: 6214
    }
];

// False Color Composite (Color Infrared / CIR):
// Red screen channel   <-- Band 4 (B08 NIR)   max: 6214
// Green screen channel <-- Band 1 (B04 Red)   max: 4462
// Blue screen channel  <-- Band 2 (B03 Green) max: 2820
const layer = new GeoTIFFLayer("Sentinel-2 False Color", {
    sources,
    renderOptions: {
        multi: {
            r: { band: 4, min: 0, max: 6214 },
            g: { band: 1, min: 0, max: 4462 },
            b: { band: 2, min: 0, max: 2820 }
        }
    }
});

globe.planet.addLayer(layer);

layer.whenReady().then(() => {
    const extent = layer.getExtent();
    if (extent) {
        globe.planet.flyExtent(extent);
    }
});
