goog.require('og.Globus');
goog.require('og.layer.XYZ');
goog.require('og.layer.WMS');
goog.require('og.layer.Vector');
goog.require('og.layer.CanvasTiles');
goog.require('og.terrainProvider.TerrainProvider');
goog.require('og.node.SkyBox');
goog.require('og.control.MouseNavigation');
goog.require('og.control.KeyboardNavigation');
goog.require('og.control.ToggleWireframe');
/*goog.require('og.control.LoadingSpinner');*/
goog.require('og.control.Sun');
goog.require('og.control.EarthCoordinates');
goog.require('og.control.LayerSwitcher');
goog.require('og.control.ShowFps');
goog.require('og.control.ZoomControl');
goog.require('og.control.TouchNavigation');
goog.require('og.ImageCanvas');
goog.require('og.GeoImage');
goog.require('og.LonLat');
goog.require('og.EntityCollection');
goog.require('og.Entity');

var countriesCollection;
var capitalsCollection;
var v0;
var ent = {};
var vec = {};

var voi = 0;
function addEntity(lon, lat) {
    var e = new og.Entity({
        lonlat: new og.LonLat(lon, lat, 0),
        label: {
            text: "Hello_" + voi,
            align: "center",
            size: 60,
            color: new og.math.Vector4(1, 1, 1, 1),
            outlineColor: new og.math.Vector4(0, 0, 0, 1),
            outline: 0.45,
            weight: "bold",
            face: "verdana"
        }
    });
    v0.addEntity(e);
    voi++;
}

function eX(lon, lat, src) {
    var e = new og.Entity({
        lonlat: new og.LonLat(lon, lat, 0),
        billboard: {
            src: src || "marker.png",
            width: 64,
            height: 64,
            offset: [0, 32]
        }
        //label: {
        //    text: "Hello_" + voi,
        //    align: "center",
        //    size: 60,
        //    color: new og.math.Vector4(1, 1, 1, 1),
        //    outlineColor: new og.math.Vector4(0, 0, 0, 1),
        //    outline: 0.45,
        //    weight: "bold",
        //    face: "verdana"
        //}
    });
    voi++;
    return e;
};

function createEntities() {
    return [eX(0, 0), eX(10, 10, "ship.png"), eX(81.29341, 30.44327), eX(25, -25, "satellite.png"), eX(45, 45, "ship.png"), eX(1, 1), eX(30, -5)];
};

//function loadCountries() {
//    $.getJSON('http://www.openglobus.org/geoserver/wfs?typeNames=proj1:TM_WORLD_BORDERS-0.3&VERSION=2.0.0&REQUEST=GetFeature&propertyName=NAME,LON,LAT&&service=WFS&outputFormat=json',
//        function (obj) {
//            var f = obj.features;
//            var entities = [];
//            for (var i = 0; i < f.length; i++) {
//                var fi = f[i];
//                var e = new og.Entity({
//                    lonlat: new og.LonLat(parseFloat(fi.properties.LON), parseFloat(fi.properties.LAT), 1000),
//                    label: {
//                        text: fi.properties.NAME.length < 20 ? fi.properties.NAME : "",
//                        align: "center",
//                        size: 60,
//                        color: new og.math.Vector4(1, 1, 1, 1),
//                        outlineColor: new og.math.Vector4(0, 0, 0, 1),
//                        outline: 0.45,
//                        weight: "bold",
//                        face: "verdana"
//                    }
//                });
//                entities.push(e);               
//            }
//            v0.setEntities(entities);
//        });
//};

//function loadCapitals() {
//    $.getJSON('http://www.openglobus.org/geoserver/wfs?typeNames=og:ne_10m_populated_places&VERSION=2.0.0&REQUEST=GetFeature&propertyName=NAMEASCII,LONGITUDE,LATITUDE,WORLDCITY,ISO_A2&&service=WFS&outputFormat=json',
//    function (obj) {
//        var f = obj.features;
//        for (var i = 0; i < f.length; i++) {
//            var fi = f[i];
//            var name = fi.properties.ISO_A2;
//            if (!ent[name]) {
//                ent[name] = [];
//            }
//            var e = new og.Entity({
//                lonlat: new og.LonLat(parseFloat(fi.properties.LONGITUDE), parseFloat(fi.properties.LATITUDE), 1000),
//                label: {
//                    text: fi.properties.NAMEASCII.length < 20 ? fi.properties.NAMEASCII : "",
//                    align: "center",
//                    size: 25,
//                    color: new og.math.Vector4(0, 0, 0, 1),
//                    //outlineColor: new og.math.Vector4(0, 0, 0, 1),
//                    outline: 0.0,
//                    weight: "normal",
//                    face: "verdana"
//                }
//            });
//            ent[name].push(e);
//        }

//        for (var i in ent) {
//            vec[i] = new og.layer.Vector(i, { visibility: true, isBaseLayer: false, minZoom: 0, entities: ent[i] });
//            vec[i].events.on("draw", vec[i], function () {
//                var maxDist = 3.57 * Math.sqrt(globus.planet.camera._lonLat.height) * 1000;
//                this.setScaleByDistance(200000, maxDist + 200000, maxDist);
//            });
//            vec[i].addTo(globus.planet);

//        }

//    });
//};


function loadCapitals() {
    $.getJSON('http://www.openglobus.org/geoserver/wfs?typeNames=og:ne_10m_populated_places&VERSION=2.0.0&REQUEST=GetFeature&propertyName=NAMEASCII,LONGITUDE,LATITUDE,WORLDCITY,ISO_A2&&service=WFS&outputFormat=json',
    function (obj) {
        var f = obj.features;
        var entities = [];
        for (var i = 0; i < f.length; i++) {
            var fi = f[i];
            var e = new og.Entity({
                lonlat: new og.LonLat(parseFloat(fi.properties.LONGITUDE), parseFloat(fi.properties.LATITUDE), 0),
                label: {
                    text: fi.properties.NAMEASCII.length < 20 ? fi.properties.NAMEASCII : "",
                    align: "center",
                    size: 25,
                    color: new og.math.Vector4(0, 0, 0, 1),
                    //outlineColor: new og.math.Vector4(0, 0, 0, 1),
                    outline: 0.0,
                    weight: "normal",
                    face: "verdana"
                }
            });
            entities.push(e);
        }
        v0.setEntities(entities);
    });
};

function start() {

    //loadCountries();
    //loadCapitals();

    //og.shaderProgram.SHADERS_URL = "./shaders/";

    var osm = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", visibility: true, attribution: 'Data © <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' });
    var sat = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", visibility: false, attribution: '©2014 MapQuest - Portions ©2014 "Map data © <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"' });
    var hyb = new og.layer.XYZ("MapQuest Hybrid", { isBaseLayer: false, url: "http://otile1-s.mqcdn.com/tiles/1.0.0/hyb/{zoom}/{tilex}/{tiley}.png", visibility: false, zIndex: 20, opacity: 1, attribution: '' });
    var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: "http://maps.kosmosnimki.ru/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}" });
    var states = new og.layer.WMS("USA States", { isBaseLayer: false, url: "http://openglobus.org/geoserver/", layers: "topp:states", opacity: 0.5, zIndex: 50, attribution: 'USA states - geoserver WMS example', transparentColor: [1.0, 1.0, 1.0], visibility: false });
    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus");
    v0 = new og.layer.Vector("Countries vector", { isBaseLayer: false, minZoom: 0, groundAlign: false });
    placesCollection = new og.layer.Vector("My favorite places", { isBaseLayer: false, minZoom: 1, groundAlign: true });

    v0.events.on("draw", v0, function () {
        var maxDist = 3.57 * Math.sqrt(globus.planet.camera._lonLat.height) * 1000;
        this.setScaleByDistance(200000, maxDist + 200000, maxDist);
    });



    var skybox = new og.node.SkyBox({
        "nx": "http://127.0.0.1/og/resources/images/skyboxes/gal/_nx.jpg",
        "px": "http://127.0.0.1/og/resources/images/skyboxes/gal/_px.jpg",
        "py": "http://127.0.0.1/og/resources/images/skyboxes/gal/_py.jpg",
        "ny": "http://127.0.0.1/og/resources/images/skyboxes/gal/_ny.jpg",
        "pz": "http://127.0.0.1/og/resources/images/skyboxes/gal/_pz.jpg",
        "nz": "http://127.0.0.1/og/resources/images/skyboxes/gal/_nz.jpg"
    });

    var controls = [
        new og.control.MouseNavigation({ autoActivate: true }),
        new og.control.KeyboardNavigation({ autoActivate: true }),
        new og.control.ToggleWireframe({ autoActivate: true }),
        new og.control.EarthCoordinates({ autoActivate: true, center: true }),
        new og.control.LayerSwitcher({ autoActivate: true }),
        new og.control.ZoomControl({ autoActivate: true }),
        new og.control.TouchNavigation({ autoActivate: true }),
        new og.control.Sun({ autoActivate: true })
    ];

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "controls": controls,
        //"skybox": skybox,
        "terrain": terrain,
        "layers": [sat, osm, hyb, states, v0],
        "autoActivated": true
    });

    //globus.planet.sunlight.setSpecular(new og.math.Vector3(0.05, 0.05, 0.05));
    //globus.planet.sunlight.setShininess(50);
    //globus.planet.sunlight.setDiffuse(new og.math.Vector3(0.9, 0.9, 0.8));
    //globus.planet.sunlight.setAmbient(new og.math.Vector3(0.15, 0.15, 0.15))
    //globus.renderer.handler.backgroundColor = { r: 0.26, g: 0.26, b: 0.26 };
    /*
        var ql = new og.GeoImage({
            src: "ql.jpg",
            corners: [og.lonLat(152.02, -31.29), og.lonLat(151.59, -30.93), og.lonLat(151.86, -30.68), og.lonLat(152.29, -31.04)],
            opacity: 0.8
        });
        ql.addTo(globus.planet);
    
        ql4 = new og.GeoImage({
            src: "bm.jpg",
            corners: [og.lonLat(-180, 90), og.lonLat(180, 90), og.lonLat(180, -90), og.lonLat(-180, -90)],
            opacity: 1.0
        });
        ql4.addTo(globus.planet);
    */
    globus.planet.flyLonLat(new og.LonLat(77.02815, 55.78131, 13132244.4));
    globus.fadeIn(700);


    var places = [
    { name: "Everest", lat: 27.96248, lon: 86.93361, height: 8510, alt: 16002, img: null, blb: "./resources/images/peak.png" },
    { name: "Father mountain", lat: 44.35373, lon: 146.25119, height: 1750, alt: 10594, img: null, blb: "./resources/images/peak.png" },
    { name: "Kudach", lat: 51.80633, lon: 157.53396, height: 1000, alt: 10594, img: null, blb: "./resources/images/peak.png" },
    { name: "Курильское озеро", lat: 51.45526, lon: 157.10338, height: 150, alt: 27286, img: null },
    { name: "Island", lat: 64.96372, lon: -17.87612, height: 720, alt: 515284, img: null },
    { name: "Cilaos", lat: -21.14163, lon: 55.45201, height: 3000, alt: 14033, img: null, blb: "./resources/images/island.png" },
    { name: "Ecuador", lat: -0.40913, lon: -90.95670, height: 1000, alt: 112508, img: null, blb: "./resources/images/island.png" },
    { name: "Istambul and Bosporus", lat: 41.11113, height: 500, lon: 29.06953, alt: 49235, img: null },
    { name: "Crimea", lat: 45.24066, lon: 33.96877, height: 2000, alt: 219529, img: null, blb: "./resources/images/island.png" },
    { name: "Mount Elbrus", lat: 43.351167, lon: 42.43864, height: 5660, alt: 12751.8, img: null, blb: "./resources/images/peak.png" },
    { name: "Mount Rainier", lat: 46.85320, lon: -121.75754, height: 4390, alt: 22738, img: null, blb: "./resources/images/peak.png" },
    { name: "Mount Adams", lat: 46.20357, lon: -121.49044, height: 3780, alt: 17828.7, img: null, blb: "./resources/images/peak.png" },
    { name: "Mount Saint Helen", lat: 46.19022, lon: -122.18546, height: 2540, alt: 9475.2, img: null, blb: "./resources/images/peak.png" },
    { name: "Home world", lat: 55.78131, lon: 77.02815, height: 8000, alt: 13132244.4, img: null }
    ];

    //placesCollection.events.on("draw", placesCollection, function () {
    //    var maxDist = 3.57 * Math.sqrt(globus.planet.camera._lonLat.height) * 1000;
    //    this.setScaleByDistance(200000, maxDist + 200000, maxDist);
    //});


    placesCollection.events.on("touchend", null, function (e) {
        globus.planet.flyLonLat(new og.LonLat(e.pickingObject._lonlat.lon, e.pickingObject._lonlat.lat, e.pickingObject.showAlt));
    });

    for (var i = 0; i < places.length; i++) {
        (function (li, place) {
            var e = new og.Entity({
                lonlat: new og.LonLat(place.lon, place.lat, 0),
                label: {
                    text: place.name,
                    size: 40,
                    color: new og.math.Vector4(1, 1, 1, 1),
                    outlineColor: new og.math.Vector4(0, 0, 0, 1),
                    outline: 0.45,
                    weight: "bold",
                    face: "verdana",
                    offset: [10, -2]
                },
                billboard: {
                    src: "marker.png",
                    width: 64,
                    height: 64,
                    offset: [0, 32]
                }
            });
            e.showAlt = place.alt;
            e.addTo(placesCollection);

        })(null, places[i]);
    }

    placesCollection.addTo(globus.planet);

    //countriesCollection = new og.EntityCollection();
    //countriesCollection.setScaleByDistance(100000, 5700000, 4000000);
    //countriesCollection.events.on("draw", countriesCollection, function () {
    //    var maxDist = 3.57 * Math.sqrt(this.renderNode.camera._lonLat.height) * 1000;
    //    this.setScaleByDistance(200000, maxDist + 200000, maxDist);
    //});
    //countriesCollection.addTo(globus.planet);

    //capitalsCollection = new og.EntityCollection();
    ////capitalsCollection.setScaleByDistance(100000, 5700000, 4000000);
    //capitalsCollection.events.on("draw", capitalsCollection, function () {
    //    var maxDist = 3.57 * Math.sqrt(this.renderNode.camera._lonLat.height) * 1000;
    //    this.setScaleByDistance(200000, maxDist + 200000, maxDist);
    //});
    //capitalsCollection.addTo(globus.planet);

    //globus.planet.events.on("draw", null, function () {
    //    if (globus.planet.camera.getAltitude() < 1000000) {
    //        capitalsCollection.setVisibility(true);
    //    } else {
    //        capitalsCollection.setVisibility(false);
    //    }
    //});

    //loadCapitals();

    //ql = new og.GeoImage({
    //    src: "ql.jpg",
    //    corners: [og.lonLat(152.02, -31.29), og.lonLat(151.59, -30.93), og.lonLat(151.86, -30.68), og.lonLat(152.29, -31.04)],
    //    opacity: 1.0
    //});
    //ql.addTo(globus.planet);


    //ql3 = new og.GeoImage({
    //    src: "ql3.jpg",
    //    corners: [og.lonLat(34.51, 26.07), og.lonLat(34.11, 25.69), og.lonLat(33.84, 25.93), og.lonLat(34.23, 26.31)],
    //    opacity: 0.8
    //});
    //ql3.addTo(globus.planet);

    //ql4 = new og.GeoImage({
    //    src: "bm.jpg",
    //    corners: [og.lonLat(-180, 90), og.lonLat(180, 90), og.lonLat(180, -90), og.lonLat(-180, -90)],
    //    opacity: 1.0
    //});
    //ql4.addTo(globus.planet);
};

//function test() {
//    eee = new og.Entity({
//        lonlat: new og.LonLat(0, 0, 1000),
//        billboard: {
//            src: "ship.png",
//            width: 70,
//            height: 70,
//            offset: [255, 10]
//        },
//        label: {
//            text: "Saint-Petersburg",
//            align: "center",
//            size: 70,
//            color: new og.math.Vector4(1, 1, 1, 1),
//            outlineColor: new og.math.Vector4(0, 0, 0, 1),
//            outline: 0.47,
//            face: "verdana"
//        }
//    });
//    ec = new og.EntityCollection();
//    eee.addTo(ec);
//    ec.addTo(globus.planet);

//    eee1 = new og.Entity({
//        lonlat: new og.LonLat(0, 10, 1000),
//        label: {
//            text: "Hello world!",
//            align: "center",
//            size: 70,
//            color: new og.math.Vector4(1, 1, 1, 1),
//            outlineColor: new og.math.Vector4(0, 0, 0, 1),
//            outline: 0.47,
//            face: "verdana"
//        }
//    });

//    ec.add(eee1);

//    eee2 = new og.Entity({
//        lonlat: new og.LonLat(45, 45, 692500),
//        label: {
//            text: "X",
//            align: "center",
//            size: 70,
//            color: new og.math.Vector4(1, 1, 1, 1),
//            outlineColor: new og.math.Vector4(0, 0, 0, 1),
//            outline: 0.47,
//            face: "verdana"
//        }
//    });

//    ec.add(eee2);

//    eee3 = new og.Entity({
//        lonlat: new og.LonLat(0, 90, 500),
//        label: {
//            text: "North pole",
//            align: "center",
//            size: 70,
//            color: new og.math.Vector4(1, 1, 1, 1),
//            outlineColor: new og.math.Vector4(0, 0, 0, 1),
//            outline: 0.47,
//            face: "verdana"
//        }
//    });

//    ec.add(eee3);

//    eee4 = new og.Entity({
//        lonlat: new og.LonLat(0, -90, 500),
//        label: {
//            text: "South pole",
//            align: "center",
//            size: 70,
//            color: new og.math.Vector4(1, 1, 1, 1),
//            outlineColor: new og.math.Vector4(0, 0, 0, 1),
//            outline: 0.47,
//            face: "verdana"
//        }
//    });

//    ec.add(eee4);
//};