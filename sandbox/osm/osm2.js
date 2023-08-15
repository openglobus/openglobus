import {
    math,
    Globe,
    Entity,
    GlobusTerrain,
    XYZ,
    LonLat,
    Vector,
    Vec2,
    Vec3,
    Quat
} from "../../dist/@openglobus/og.esm.js";

let pointLayer = new Vector("points", {
    'clampToGround': true,
    'entities': [{
        'name': 'Blue Marker',
        'lonlat': [8.19, 46.73],
        'billboard': {
            'src': 'marker.png',
            'size': [29, 48],
            'offset': [0, 24]
        }
    }],
    'async': false
});

let label = new Entity({
    'name': 'label',
    'lonlat': [8.25, 46.74],
    'label': {
        'align': "center",
        'text': 'Hello world',
        'size': [18],
        'outlineColor': "rgba(0,0,0,.5)",
        'outline': 0.11
    }
});

let pickingObject = null;
let startClick = new Vec2(),
    startPos;

pointLayer.events.on("mouseenter", function (e) {
    e.renderer.handler.canvas.style.cursor = "pointer";
});

pointLayer.events.on("mouseleave", function (e) {
    e.renderer.handler.canvas.style.cursor = "default";
});

pointLayer.events.on("ldown", function (e) {
    e.renderer.controls.mouseNavigation.deactivate();
    startClick.set(e.x, e.y);
    pickingObject = e.pickingObject;
    startPos = e.pickingObject.layer.planet.getPixelFromCartesian(pickingObject.getCartesian());
});

pointLayer.events.on("lup", function (e) {
    e.renderer.controls.mouseNavigation.activate();
    pickingObject = null;
});

let osm = new XYZ("OSM", {
    'isBaseLayer': true,
    'url': "//b.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});

let globe = new Globe({
    "target": "earth",
    "name": "Earth",
    "terrain": new GlobusTerrain(),
    "layers": [osm, pointLayer]
});

globe.planet.renderer.events.on("mousemove", function (e) {
    if (pickingObject) {
        var d = new Vec2(e.x, e.y).sub(startClick);
        var endPos = startPos.add(d);
        var coords = this.getCartesianFromPixelTerrain(endPos);
        if (coords) {
            pickingObject.setCartesian3v(coords);
        }
    }
}, globe.planet);

pointLayer.add(label);

globe.planet.viewExtentArr([8.08, 46.72, 8.31, 46.75]);

globe.renderer.events.on("lclick", function (e) {

    var ll = globe.planet.getLonLatFromPixelTerrain(e, true);

    pointLayer.add(new Entity({
        'name': 'New Marker',
        'lonlat': ll,
        'billboard': {
            'src': 'marker.png',
            'size': [29, 48],
            'offset': [0, 24]
        }
    }));

});

pointLayer.events.on("rclick", function (e) {
    e.pickingObject.remove();
});

window.test = function(){
    let number = new Entity({
        'name': 'number',
        'label': {
            'align': "center",
            'offset': [0, -20],
            'text': '123',
            'size': [14],
            'outlineColor': "rgba(0,0,0,.5)",
            'outline': 0.14
        }
    });

    let blb = new Entity({
        'name': 'New Marker',
        //'lonlat': ll,
        'billboard': {
            'src': 'marker.png',
            'size': [29, 48],
            'offset': [0, 24]
        }
    })

    label.appendChild(number);

    label.appendChild(blb);
}
