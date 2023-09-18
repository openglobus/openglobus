import {
    math,
    Globe,
    Entity,
    GlobusTerrain,
    XYZ,
    webgl,
    LonLat,
    GeoImage,
    GeoVideo,
    GeoTexture2d,
    Vector,
    Vec2,
    Vec3,
    Quat,
    control
} from "../../dist/@openglobus/og.esm.js";

let osm = new XYZ("OSM", {
    'isBaseLayer': true,
    'url': "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});

let townMarkers = new Vector("town markers", {
    'nodeCapacity': 100000,
    'maxZoom': 9,
    'scaleByDistance': [0, 1500000, 25000000],
    'fading': true
});

let townLabels = new Vector("town labels", {
    'nodeCapacity': 50,
    'scaleByDistance': [0, 350000, 25000000],
    'minZoom': 10,
    'fading': true
});

townLabels.events.on("mouseenter", function (e) {
    e.renderer.handler.canvas.style.cursor = "pointer";
});

townLabels.events.on("mouseleave", function (e) {
    e.renderer.handler.canvas.style.cursor = "default";
});

townMarkers.events.on("mouseenter", function (e) {
    e.renderer.handler.canvas.style.cursor = "pointer";
});

townMarkers.events.on("mouseleave", function (e) {
    e.renderer.handler.canvas.style.cursor = "default";
});

window.globe = new Globe({
    'name': "Earth",
    'target': "earth",
    'terrain': new GlobusTerrain(),
    'layers': [osm, townLabels, townMarkers],
    "sun": {
        "active": false
    }
});

//Set low quality
globe.planet.RATIO_LOD = 0.75;

//View at Germany
globe.planet.viewExtentArr([-0.895, 47.51, 21.84, 51.65]);

//globe.planet.events.on("draw", function () {
//    towns.setScaleByDistance(globe.planet.camera.getHeight(), globe.planet.camera.getHeight() * 2);
//});

//Load points
fetch("DE.json.txt", {
    credentials: 'include',
    method: 'GET'
})
    .then(function (resp) {
        return resp.json();
    })
    .then(function (resp) {
        let labels = [],
            markers = [];
        for (let i = 0; i < resp.length; i++) {
            let ri = resp[i];
            markers.push(new Entity({
                'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
                'billboard': {
                    'src': "./marker.png",
                    'width': 12,
                    'height': 12,
                    'offset': [0, 6]
                },
                'properties': {
                    'name': ri.name
                }
            }));

            labels.push(new Entity({
                'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
                'label': {
                    'text': ri.name,
                    'size': 16,
                    'outline': 0.17,
                    'outlineColor': "black",
                    'color': "white",
                    'align': "center"
                },
                'properties': {
                    'name': ri.name
                }
            }));
        }
        townLabels.setEntities(labels);
        townMarkers.setEntities(markers);
    });