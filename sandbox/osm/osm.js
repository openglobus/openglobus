'use strict';

import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { CanvasTiles } from '../../src/og/layer/CanvasTiles.js';
import { Vector } from '../../src/og/layer/Vector.js';
import { Entity } from '../../src/og/entity/Entity.js';
import { DebugInfo } from '../../src/og/control/DebugInfo.js';
import { ToggleWireframe } from '../../src/og/control/ToggleWireframe.js';
import * as math from '../../src/og/math.js';


class MapBoxTerrain extends GlobusTerrain {
    constructor(name, options) {
        super();
        this.minZoom = 2;
        this.maxZoom = 15;
        this.url = "//api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=pk.eyJ1IjoibWdldmxpY2giLCJhIjoiY2o0ZmVudncwMGZvbjJ3bGE0OGpsejBlZyJ9.RSRJLS0J_U9_lw1Ti1CmsQ";
        this.fileGridSize = 64;
        this._dataType = "imageBitmap";
    }

    getElevations(data) {

        if (data) {
            let canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 256;

            let ctx = canvas.getContext("2d");
            ctx.drawImage(data, 0, 0);

            let idata = ctx.getImageData(0, 0, data.width, data.height).data;

            let fgsOne = this.fileGridSize + 1;

            let size = fgsOne * fgsOne;

            let res = new Float32Array(size);

            for (let k = 0; k < size; k++) {

                let j = k % fgsOne,
                    i = ~~(k / fgsOne);

                let src_i = Math.round(math.lerp(i / fgsOne, 255, 0)),
                    src_j = Math.round(math.lerp(j / fgsOne, 255, 0));

                let src = (src_i * 256 + src_j) * 4;

                let r = idata[src],
                    g = idata[src + 1],
                    b = idata[src + 2];

                let height = -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);

                res[k] = height;
            }

            return res;

        } else {
            return new Float32Array();
        }
    }
}

let osm = new XYZ("OSM", {
    'specular': [0.0003, 0.00012, 0.00001],
    'shininess': 20,
    'diffuse': [0.89, 0.9, 0.83],
    'isBaseLayer': true,
    'url': "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});


window.globe = new Globe({
    'name': "Earth",
    'target': "earth",
    'terrain': new GlobusTerrain(),
    'layers': [osm]
});

globe.planet.addControl(new DebugInfo());
globe.planet.addControl(new ToggleWireframe());


//let townLabels = new Vector("town labels", {
//    'nodeCapacity': 5000000,
//    'visibility': true
//});
//function randomCoordinateJitter(degree, margin) {
//    return degree + margin * (Math.random() - 0.5) / 0.5;
//}

//var nCats = 15,
//    labels = [];
//for (var i = 0; i <= nCats; i++) {
//    labels.push(new Entity({
//        'lonlat': [randomCoordinateJitter(-77.009003, .5), randomCoordinateJitter(38.889931, .5)],
//        'label': {
//            'text': 'CUTE #' + i,
//            'size': 26,
//            'outline': 0,
//            'face': "Lucida Console",
//            'weight': "bold",
//            'color': "black",
//        },
//        'billboard': {
//            'size': [36, 24],
//            'src': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhFpaxDXCS5O9hx90F3ufJI2VnC_wW0lPnrr6BIb18P4V5JXxBCg'
//        }
//    }));
//}

//townLabels.setEntities(labels);







//var _inc = 0;

//var List = function (next, data) {
//    this.data = _inc++;
//    this.next = next || null;
//};

//var head = new List(new List(new List(new List())));

//function nthToLast(head, k) {
//    if (head == null) {
//        return 0;
//    }
//    var i = nthToLast(head.next, k) + 1;
//    if (i == k) {
//        console.log(head.data);
//    }
//    return i;
//}

//nthToLast(head, 2);