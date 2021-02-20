'use strict';

import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { BilTerrain } from '../../src/og/terrain/BilTerrain.js';
import { MapboxTerrain } from '../../src/og/terrain/MapboxTerrain.js';
import { EmptyTerrain } from '../../src/og/terrain/EmptyTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { WMS } from '../../src/og/layer/WMS.js';
import { CanvasTiles } from '../../src/og/layer/CanvasTiles.js';
import { Vector } from '../../src/og/layer/Vector.js';
import { Entity } from '../../src/og/entity/Entity.js';
import { DebugInfo } from '../../src/og/control/DebugInfo.js';
import { KeyboardNavigation } from '../../src/og/control/KeyboardNavigation.js';
import { ToggleWireframe } from '../../src/og/control/ToggleWireframe.js';
import * as math from '../../src/og/math.js';
import { LayerSwitcher } from '../../src/og/control/LayerSwitcher.js';
import { Popup } from '../../src/og/Popup.js';
import { LonLat } from '../../src/og/LonLat.js';
import { Vec3 } from '../../src/og/math/Vec3.js';
import { ScaleControl } from '../../src/og/control/ScaleControl.js';
import { stringTemplate } from '../../src/og/utils/shared.js';
import { SegmentBoundVisualization } from '../../src/og/control/SegmentBoundVisualization.js';

function toQuadKey(x, y, z) {
    var index = '';
    for (var i = z; i > 0; i--) {
        var b = 0;
        var mask = 1 << (i - 1);
        if ((x & mask) !== 0) b++;
        if ((y & mask) !== 0) b += 2;
        index += b.toString();
    }
    return index;
};

let bing = new XYZ("sat", {
    shininess: 20,
    isBaseLayer: false,
    subdomains: ['t0', 't1', 't2', 't3'],
    url: "https://ecn.{s}.tiles.virtualearth.net/tiles/a{quad}.jpeg?n=z&g=7146",
    visibility: true,
    attribution: `Bing`,
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#001522" }, { color: "#E4E6F3" }],
    urlRewrite: function (s, u) {
        return stringTemplate(u, {
            's': this._getSubdomain(),
            'quad': toQuadKey(s.tileX, s.tileY, s.tileZoom)
        });
    }
});

// document.getElementById("ambient-r").addEventListener("input", function (e) {
//     osm.ambient.x = this.value;
//     document.querySelector(".value.ambient-r").innerHTML = this.value;
// });
// document.getElementById("ambient-g").addEventListener("input", function (e) {
//     osm.ambient.y = this.value;
//     document.querySelector(".value.ambient-g").innerHTML = this.value;
// });
// document.getElementById("ambient-b").addEventListener("input", function (e) {
//     osm.ambient.z = this.value;
//     document.querySelector(".value.ambient-b").innerHTML = this.value;
// });

// document.getElementById("diffuse-r").addEventListener("input", function (e) {
//     osm.diffuse.x = this.value;
//     document.querySelector(".value.diffuse-r").innerHTML = this.value;
// });
// document.getElementById("diffuse-g").addEventListener("input", function (e) {
//     osm.diffuse.y = this.value;
//     document.querySelector(".value.diffuse-g").innerHTML = this.value;
// });
// document.getElementById("diffuse-b").addEventListener("input", function (e) {
//     osm.diffuse.z = this.value;
//     document.querySelector(".value.diffuse-b").innerHTML = this.value;
// });

// document.getElementById("specular-r").addEventListener("input", function (e) {
//     osm.specular.x = this.value;
//     document.querySelector(".value.specular-r").innerHTML = this.value;
// });
// document.getElementById("specular-g").addEventListener("input", function (e) {
//     osm.specular.y = this.value;
//     document.querySelector(".value.specular-g").innerHTML = this.value;
// });
// document.getElementById("specular-b").addEventListener("input", function (e) {
//     osm.specular.z = this.value;
//     document.querySelector(".value.specular-b").innerHTML = this.value;
// });

// document.getElementById("shininess").addEventListener("input", function (e) {
//     osm.shininess = this.value;
//     document.querySelector(".value.shininess").innerHTML = this.value;
// });

let cnv = document.createElement("canvas");
let ctx = cnv.getContext("2d");
cnv.width = 256;
cnv.height = 256;

const tg = new CanvasTiles("Tile grid", {
    visibility: true,
    isBaseLayer: false,
    zIndex: 100,
    drawTile: function (material, applyCanvas) {
        //Clear canvas
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        //Draw border
        ctx.beginPath();
        ctx.rect(0, 0, cnv.width, cnv.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black';
        ctx.stroke();

        let size;

        //Draw text
        if (material.segment.tileZoom > 17) {
            size = "18";
        } else if (material.segment.tileZoom > 14) {
            size = "26";
        } else {
            size = "32";
        }
        ctx.fillStyle = 'black';
        ctx.font = 'normal ' + size + 'px Verdana';
        ctx.textAlign = 'center';
        ctx.fillText(material.segment.tileX + "," + material.segment.tileY + "," + material.segment.tileZoom, cnv.width / 2, cnv.height / 2);

        //Draw canvas tile
        applyCanvas(cnv);
    }
});

let osm = new XYZ("OSM", {
    'specular': [0.0003, 0.00012, 0.00001],
    'shininess': 20,
    'diffuse': [0.89, 0.9, 0.83],
    'isBaseLayer': true,
    'url': "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});

//let wien = new XYZ("512", {
//    'isBaseLayer': true,
//    'url': "//maps.wien.gv.at/basemap/bmaphidpi/normal/google3857/{z}/{y}/{x}.jpeg",
//    'visibility': false
//});


//let sat = new XYZ("MapQuest Satellite", {
//    shininess: 20,
//    specular: [0.00048, 0.00037, 0.00035],
//    diffuse: [0.88, 0.85, 0.8],
//    ambient: [0.15, 0.1, 0.23],
//    isBaseLayer: true,
//    url: "//api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWdldmxpY2hzY2FuZXgiLCJhIjoiY2pwcGdsaXlnMDQzdDQybXhsOWZlbXBvdSJ9.fR2YE-ehJA4iajaJBAPKvw",
//    visibility: false,
//    attribution: `@2014 MapQuest - Portions @2014 "Map data @
//        <a target="_blank" href="//www.openstreetmap.org/">OpenStreetMap</a> and contributors,
//        <a target="_blank" href="//opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"`
//});

let sat = new XYZ("Google Satellite", {
    shininess: 20,
    specular: [0.00048, 0.00037, 0.00035],
    diffuse: [0.88, 0.85, 0.8],
    ambient: [0.15, 0.1, 0.23],
    isBaseLayer: true,
    url: "https://khms1.googleapis.com/kh?v=894&hl=en-GB&x={x}&y={y}&z={z}",
    visibility: false,
    attribution: ``
});

let thames = new XYZ("Reconstructed Lakebed", {
    fading: true,
    isBaseLayer: false,
    visibility: true,
    url: "http://alacst.ddns.net:8181/Tiles/1xoverlay/{z}/{x}/{y}.png",
    // extent: [[-1.1210868226, 51.5993282113], [-1.11506810397, 51.6072360341]]
    extent: [[-1.12047, 51.60076], [-1.11807, 51.60285]]
});

let emptyTerrain = new EmptyTerrain(),
    globusTerrain = new GlobusTerrain(),
    mapboxTerrain = new MapboxTerrain(),
    bilTerrain = new BilTerrain({
        maxZoom: 19,
        url: "//127.0.0.1:8080/geoserver/",
        //url: "//95.211.82.211:8080/geoserver/og/",
        //layers: "og:n44_e009_1arc_v3",
        layers: "test:geotiff_coverage_2",
        //layers: "arizona:3",
        //imageSize: 129,
        gridSizeByZoom: [64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 32, 16, 32, 16, 32, 16, 32, 16, 32, 16, 8, 4],
        //extent: [[8.9, 44.0], [10.0, 45]]
    });

window.globe = new Globe({
    'name': "Earth",
    'target': "earth",
    'terrain': bilTerrain/*globusTerrain/*new MapboxTerrain(null, {
        url: "//alacst.ddns.net:8181/Tiles/testtile129/{z}/{x}/{y}.png",
        //url: "//alacst.ddns.net:8181/Tiles/129terrain/{z}/{x}/{y}.png",
        minZoom: 9,
        maxZoom: 23,
        gridSizeByZoom: [64, 32, 32, 16, 16, 16, 16, 32, 64, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 64, 32, 16],
        sourceImageSize: 129,
        equalizeVertices: false
    })*/,
    'layers': [osm, tg, sat],
    'viewExtent': [89.83484, 25.69255, 90.34796, 26.44652]
});

window.setEmptyTerrain = function () {
    window.globe.planet.setTerrain(emptyTerrain);
};

window.setOpenglobusTerrain = function () {
    window.globe.planet.setTerrain(globusTerrain);
};

window.setBilTerrain = function () {
    window.globe.planet.setTerrain(bilTerrain);
};

window.setMapboxTerrain = function () {
    window.globe.planet.setTerrain(mapboxTerrain);
};


//window.globe = new Globe({
//    'name': "Earth",
//    'target': "earth",
//    'terrain': new GlobusTerrain(),
//    'layers': [osm, sat, tg, states, modis],
//    'viewExtent': [7.86, 44.24, 11.29, 45.0]
//});

//window.globe = new Globe({
//    target: "earth",
//    name: "Bil Terrain Source",
//    terrain: new BilTerrain({
//        url: "//95.211.82.211:8080/geoserver/og/",
//        layers: "og:n44_e009_1arc_v3",
//        imageSize: 128,
//        gridSizeByZoom: [128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 64, 64, 32, 32, 32, 16, 8],
//        extent: [[8.9, 44.0], [10.0, 45]]
//    }),
//    viewExtent: [7.86, 44.24, 11.29, 45.0],
//    layers: [osm, sat, tg, states, modis]
//});

globe.planet.addControl(new DebugInfo({
    watch: [{
        'label': "metersInMinSize",
        'frame': () => globe.planet.renderer.controls.scaleControl._metersInMinSize
    }, {
        'label': "meters in pixel",
        'frame': () => globe.planet.renderer.controls.scaleControl._mPx
    }]
}));
globe.planet.addControl(new ToggleWireframe({
    isActive: false
}));

globe.planet.addControl(new SegmentBoundVisualization());
globe.planet.addControl(new KeyboardNavigation());
globe.planet.addControl(new LayerSwitcher());
//globe.planet.addControl(new ScaleControl());


let e1 = new Entity({
    'name': 'strip1',
    'strip': {
        'color': [0 / 255, 38 / 255, 255 / 255],
        'opacity': 0.27,
        'path': [
            [[586523.0151173624, 4392830.957760274, 4570544.574074627], [587043.0890180465, 4396726.110503412, 4574597.306676116]],
            [[693687.4135420445, 4446600.854589337, 4502800.243641092], [694306.9328021071, 4450572.030680254, 4506821.6103556845]],
            [[695057.6327224943, 4446368.161289945, 4502875.06522507], [695283.9105581088, 4447815.688108607, 4504340.988014539]],
            [[695379.6262299116, 4446451.841945512, 4502776.850023308], [695603.3364033864, 4447882.307370998, 4504225.435734251]]
        ],
    }
});

let e2 = new Entity({
    'name': 'strip2',
    'strip': {
        'color': [0 / 255, 38 / 255, 255 / 255],
        'opacity': 0.27,
        'path': [
            [[661936.3048841777, 4745603.382222995, 4189411.525681237], [1339051.734436527, 9600030.082993329, 8474892.113242555]],
            [[1126928.1072783293, 4760811.647727539, 4071007.90108061], [2277324.752646721, 9620768.297494425, 8226795.481871399]]
        ],
    }
});




let stripLayer = new Vector("test layer", {
    'entities': [e1, e2],
    'pickingEnabled': false,
    'visibility': true
});

globe.planet.addLayer(stripLayer);

new Vector("Markers", {
    clampToGround: false,
    polygonOffsetUnits: 0
})
    .addTo(globe.planet)
    .add(new Entity({
        lonlat: [5.73, 45.183, 273.5],
        label: {
            text: "Hi, Globus!",
            outline: 0.77,
            outlineColor: "rgba(255,255,255,.4)",
            size: 27,
            color: "black",
            face: "Lucida Console",
            offset: [10, -2]
        },
        billboard: {
            src: "./marker.png",
            width: 64,
            height: 64,
            offset: [0, 32]
        }
    }));


//globe.planet.viewExtentArr([-1.13284, 51.59951, -1.10951, 51.60386]);

let myPopup = new Popup({
    planet: globe.planet,
    content: `Simple HTML popup<br>See <a href="//openglobus.org/examples/billboardsOnTHeGround/billboardsOnTHeGround.html">popup example</a>`,
    offset: [0, 0],
    lonLat: [5.73, 45.183, 273.5],
    visibility: true
});

window.myPopup = myPopup;

globe.planet.viewLonLat(new LonLat(-112.99778159686288, 37.23755430287543, 8952.673764926381));
