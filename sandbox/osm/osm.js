import {
    Globe,
    control,
    Vector,
    LonLat,
    Entity,
    OpenStreetMap,
    RgbTerrain,
    GlobusRgbTerrain,
    Object3d,
    mercator,
    Bing,
    GeoVideo,
    XYZ,
    utils
} from "../../lib/@openglobus/og.esm.js";

var countries = new Vector("Countries", {
    'visibility': true,
    'isBaseLayer': false,
    'diffuse': [0, 0, 0],
    'ambient': [1, 1, 1]
});

fetch("./countries.json")
    .then(r => {
        return r.json();
    }).then(data => {

    var f = data.features;
    for (let i = 0; i < f.length; i++) {
        var fi = f[i];
        countries.add(new Entity({
            'geometry': {
                'type': fi.geometry.type,
                'coordinates': fi.geometry.coordinates,
                'style': {
                    'fillColor': "rgba(255,255,255,0.6)"
                }
            }
        }));
    }
});

let l0 = new XYZ("Stamen Watercolor", {
    url: "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg",
    attribution: '',
    isBaseLayer: false,
    maxNativeZoom: 19,
    opacity: 0.5,
    //defaultTextures: [{color: "#AAD3DF"}, {color: "#F2EFE9"}],
    isSRGB: false,
});

let l2 = new XYZ("Stadia", {
    url: "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png",
    attribution: '',
    isBaseLayer: false,
    maxNativeZoom: 19,
    opacity: 0.5,

    //defaultTextures: [{color: "#AAD3DF"}, {color: "#F2EFE9"}],
    isSRGB: false,
});

let foursources = new GeoVideo("SOS_TaggedCO2_10-6-2023a_co2_foursources_quality_ScienceOnASphere_2048p30.mp4", {
    src: "./SOS_TaggedCO2_10-6-2023a_co2_foursources_quality_ScienceOnASphere_2048p30.mp4",
    corners: [[-180, 90], [180, 90], [180, -90], [-180, -90]],
    visibility: true,
    isBaseLayer: false,
    opacity: 0.5,
    attribution: 'Four Sources',
    fullExtent: true
});


let imergac = new GeoVideo("USA precipitation 08.05.2016", {
    minZoom: 0,
    maxZoom: 10,
    src: "imergac_20160508_NASA.mp4",
    corners: [[-134.7904382939764, 55.07955352950936], [-54.984314759410594, 54.98843914299802], [-55.041854075913825, 19.820153025849297], [-134.89882012831265, 19.631495126944017]],
    visibility: true,
    isBaseLayer: false,
    attribution: 'USA precipitation 08.05.2016, nasasearch.nasa.gov',
    opacity: 0.7
});

let layers = [new OpenStreetMap(), new Bing("Micr.Bing", {
    isBaseLayer: false
}), countries, l0, l2, foursources, imergac];


function setHeight(h) {
    for (let i = 0; i < layers.length; i++) {
        layers[i].setHeight(i * h * 10000);
    }
}

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: layers,
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    sun: {
        stopped: false
    },
    transitionOpacityEnabled: false
});

globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.LayerSwitcher());

window.setHeight = setHeight;

document.body.querySelector("#slider").addEventListener("input", function (event) {
    setHeight(parseFloat(event.target.value));
})