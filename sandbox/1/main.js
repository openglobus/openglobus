goog.require('og.Globus');
goog.require('og.layer.XYZ');
goog.require('og.layer.WMS');
goog.require('og.layer.Vector');
goog.require('og.layer.CanvasTiles');
goog.require('og.terrainProvider.TerrainProvider');
goog.require('og.scene.SkyBox');
goog.require('og.control.MouseNavigation');
goog.require('og.control.KeyboardNavigation');
goog.require('og.control.ToggleWireframe');
goog.require('og.control.Sun');
goog.require('og.control.EarthCoordinates');
goog.require('og.control.LayerSwitcher');
goog.require('og.control.ShowFps');
goog.require('og.control.ZoomControl');
goog.require('og.control.TouchNavigation');
goog.require('og.ImageCanvas');
goog.require('og.LonLat');
goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.layer.GeoImage');
goog.require('og.layer.GeoTexture2d');
goog.require('og.layer.GeoVideo');
goog.require('og.control.GeoImageDragControl');

function start() {

    //og.shaderProgram.SHADERS_URL = "./shaders/";

    var osm = new og.layer.XYZ("OpenStreetMap", { specular: [0.0003, 0.00012, 0.00001], shininess: 20, diffuse: [0.89, 0.9, 0.83], extent: [[0, 0], [45, 45]], isBaseLayer: true, url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png", visibility: true, attribution: 'Data � <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' });
    var sat = new og.layer.XYZ("MapQuest Satellite", { shininess: 20, specular: og.math.vector3(0.00048, 0.00037, 0.00035), diffuse: og.math.vector3(0.88, 0.85, 0.8), ambient: og.math.vector3(0.15, 0.1, 0.23), isBaseLayer: true, url: "http://tileproxy.cloud.mapquest.com/tiles/1.0.0/sat/{z}/{x}/{y}.png", visibility: false, attribution: '�2014 MapQuest - Portions �2014 "Map data � <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"' });
    var sat2 = new og.layer.XYZ("-MapQuest Satellite", { extent: og.extent(og.lonLat(-180, -90), og.lonLat(180, 0)), isBaseLayer: false, url: "http://tileproxy.cloud.mapquest.com/tiles/1.0.0/sat/{z}/{x}/{y}.png", visibility: false, attribution: '' });
    var sat3 = new og.layer.XYZ("+MapQuest Satellite", { extent: og.extent(og.lonLat(-180, 0), og.lonLat(180, 90)), isBaseLayer: false, url: "http://tileproxy.cloud.mapquest.com/tiles/1.0.0/sat/{z}/{x}/{y}.png", visibility: false, attribution: '' });
    var hyb = new og.layer.XYZ("MapQuest Hybrid", { isBaseLayer: false, url: "http://otile1-s.mqcdn.com/tiles/1.0.0/hyb/{z}/{x}/{y}.png", visibility: false, zIndex: 20, opacity: 1, attribution: '' });
    //var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: "http://c.tile.osm.kosmosnimki.ru/kosmo/{z}/{x}/{y}.png" });
    var states = new og.layer.WMS("USA States", { height: 200000, zIndex: 100, extent: [[-120, 20], [-60, 45]], visibility: false, isBaseLayer: false, url: "http://openglobus.org/geoserver/", layers: "topp:states", opacity: 0.5, zIndex: 50, attribution: 'USA states - geoserver WMS example', transparentColor: [1.0, 1.0, 1.0] });
    var tm = new og.layer.WMS("TrueMarble", { height: 0, zIndex: 100, visibility: false, isBaseLayer: true, url: "http://openglobus.org/geoserver/", layers: "og:TrueMarble.2km.21600x10800", opacity: 1.0, attribution: 'TrueMarble' });
    var geoImage = new og.layer.GeoImage("GeoImage", { src: "bm.jpg", height: 0, zIndex: 200, corners: [[-180, 90], [180, 90], [180, -90], [-180, -90]], visibility: false, isBaseLayer: false, opacity: 0.8 });
    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus");
    var osm2 = new og.layer.XYZ("OpenStreetMap", { height: 0, extent: og.extent(og.lonLat(-100, 25), og.lonLat(-70, 40)), isBaseLayer: false, url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png", visibility: true, attribution: '', zIndex: 0 });
    var geoImage2 = new og.layer.GeoImage("GeoImage2", { src: "ql.jpg", height: 0, zIndex: 400, corners: [[0, 70], [40, 85], [50, 45], [0, 45]], visibility: false, isBaseLayer: false, opacity: 0.7 });
    geoImage3 = new og.layer.GeoTexture2d("GeoImageAnimate", { frameWidth: 1920, frameHeight: 600, height: 0, zIndex: 400, corners: [[0, 55], [10, 55], [10, 45], [0, 45]], visibility: false, isBaseLayer: false, opacity: 0.8 });
    geoImage4 = new og.layer.GeoVideo("Video", { minZoom: 8, src: "tavaruahd.mp4", height: 0, zIndex: 400, corners: [[177.19034745638677, -17.854222103595355], [177.20877442720754, -17.852755031132784], [177.20944035656285, -17.861547286977103], [177.19146734222485, -17.863358020800423]], visibility: false, isBaseLayer: false, opacity: 1.0 });
    geoImage5 = new og.layer.GeoVideo("Clouds", { minZoom: 0, src: "clouds_1080p30.mp4", height: 0, zIndex: 400, corners: [[-180, 90], [180, 90], [180, -90], [-180, -90]], visibility: false, isBaseLayer: false, opacity: 1.0 });
    geoImage7 = new og.layer.GeoVideo("BIO", { minZoom: 0, src: "NASA animation Yearly biosphere cycle.mp4", height: 0, zIndex: 400, corners: [[-180, 90], [180, 90], [180, -90], [-180, -90]], visibility: false, isBaseLayer: false, opacity: 1.0, transparentColor: [-1, -1, -1] });
    geoImage8 = new og.layer.GeoVideo("imegracc", { minZoom: 0, src: "imergacc_20160508_1080p_p30.mp4", height: 0, zIndex: 400, corners: [[-134.7904382939764, 55.07955352950936], [-54.984314759410594, 54.98843914299802], [-55.041854075913825, 19.820153025849297], [-134.89882012831265, 19.631495126944017]], visibility: false, isBaseLayer: false, opacity: 0.7 });
    geoImage9 = new og.layer.GeoVideo("RainFall", { minZoom: 0, src: "trmm_philippines_rainfall_2013_720p.mp4", height: 0, zIndex: 400, corners: [[115.10176120805798, 19.712318468515733], [141.36944705892483, 20.581119469455228], [141.59120931029042, 4.711025749829452], [115.1165387994147, 5.051107016408538]], visibility: false, isBaseLayer: false, opacity: 0.7 });
    geoImage10 = new og.layer.GeoVideo("BURJ", { minZoom: 0, src: "Burjhd.mp4", height: 0, zIndex: 400, corners: [[55.26833840276765, 25.20257351509331], [55.28618985784765, 25.200010439429402], [55.28457616543171, 25.19111065253884], [55.26680675675719, 25.193790792986682]], visibility: false, isBaseLayer: false, opacity: 1.0 });
    geoImage11 = new og.layer.GeoVideo("Las Vegas", { minZoom: 0, src: "lv.mp4", height: 0, zIndex: 400, corners: [[-115.18254616355969, 36.110055739189924], [-115.16604079376724, 36.10771264333345], [-115.16801916927308, 36.10038576099672], [-115.18457379699841, 36.102812078782755]], visibility: false, isBaseLayer: false, opacity: 1.0 });

    geoImage6 = new og.layer.GeoImage("GRID", { src: "grid.jpg", height: 0, zIndex: 400, corners: [[0, 80], [40, 80], [40, 0], [0, 0]], visibility: false, isBaseLayer: false, opacity: 1 });

    var skybox = new og.scene.SkyBox({
        "nx": "http://127.0.0.1/og/resources/images/skyboxes/gal/_nx.jpg",
        "px": "http://127.0.0.1/og/resources/images/skyboxes/gal/_px.jpg",
        "py": "http://127.0.0.1/og/resources/images/skyboxes/gal/_py.jpg",
        "ny": "http://127.0.0.1/og/resources/images/skyboxes/gal/_ny.jpg",
        "pz": "http://127.0.0.1/og/resources/images/skyboxes/gal/_pz.jpg",
        "nz": "http://127.0.0.1/og/resources/images/skyboxes/gal/_nz.jpg"
    });

    sun = new og.control.Sun();
    var controls = [
        og.control.mouseNavigation(),
        //og.control.keyboardNavigation(),
        //og.control.toggleWireframe(),
        og.control.earthCoordinates({ center: false }),
        og.control.layerSwitcher(),
        og.control.zoomControl(),
        og.control.touchNavigation(),
        sun,
        og.control.showFps(),
        og.control.geoImageDragControl()
    ];

    globus = new og.Globus({
        //"atmosphere": true,
        "target": "globus",
        "name": "Earth",
        "controls": controls,
        //"skybox": skybox,
        "terrain": terrain,
        "layers": [sat, sat2, sat3, osm, hyb, states, osm2, geoImage, geoImage2, geoImage3, geoImage4, tm, geoImage5, geoImage6, geoImage7, geoImage8, geoImage9, geoImage10, geoImage11],
        "autoActivate": true
    });

    globus.planet.renderer.handler.clock.multiplier = 0;

    //globus.planet.lightEnabled = false;

    sun.sunlight.setDiffuse(new og.math.Vector3(1.0, 1.0, 1.0));
    sun.sunlight.setAmbient(new og.math.Vector3(0.1, .1, 0.21))
    sun.sunlight.setSpecular(new og.math.Vector3(0.00025, 0.00015, 0.0001))
    sun.sunlight.setShininess(100);

    globus.planet.viewExtentArr([158.0713, 52.4024, 158.2910, 52.5095]);
    //globus.planet.flyLonLat(new og.LonLat(77.02815, 55.78131, 13132244.4));
    globus.fadeIn(700);

    var placesCollection = new og.layer.Vector("Markers", { groundAlign: true });
    globus.planet.addLayer(placesCollection);

    eee = og.entity({
        lonlat: [158.186, 52.452],
        //label: {
        //    text: place.name,
        //    size: 40,
        //    color: new og.math.Vector4(1, 1, 1, 1),
        //    outlineColor: new og.math.Vector4(0, 0, 0, 1),
        //    outline: 0.45,
        //    weight: "bold",
        //    face: "verdana",
        //    offset: [10,-2]
        //},
        billboard: {
            src: "./marker.png",
            width: 39,
            height: 64,
            offset: [0, 32]
        }
    }).addTo(placesCollection);
};


var forest;

function main2() {

    var geoImage2 = new og.layer.GeoImage("GeoImage2", { src: "ql.jpg", height: 0, zIndex: 400, corners: [[0, 0], [0, 20], [20, 20], [20, 0]], visibility: true, isBaseLayer: false, opacity: 0.7 });
    var states = new og.layer.WMS("USA Population", {
        extent: [[-128, 24], [-66, 49]],
        visibility: true,
        isBaseLayer: false,
        url: "http://openglobus.org/geoserver/",
        layers: "topp:states",
        opacity: 1.0,
        attribution: 'Hi!',
        transparentColor: [1.0, 1.0, 1.0]
    });

    var entities = [];

    // entities.push(new og.Entity({
    //     'geometry': {
    //         'type': "MultiPolygon",
    //         'coordinates': [ [[[-110,25], [-110, 40], [-100, 40], [-100,25]]], [[[20,20],[30,10],[8,2]]] ],
    //         'style': {}
    //     }
    // }));

    forest = new og.layer.Vector("Forest", {
        'visibility': true,
        'isBaseLayer': false,
        'diffuse': [0, 0, 0],
        'ambient': [1, 1, 1]
    });

    var osm = new og.layer.XYZ("OpenStreetMap", {
        specular: [0.0003, 0.00012, 0.00001],
        shininess: 20,
        diffuse: [0.89, 0.9, 0.83],
        isBaseLayer: true,
        url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        visibility: true,
        attribution: 'Data @ OpenStreetMap contributors, ODbL'
    });

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        //"skybox": og.scene.defaultSkyBox(),
        "terrain": new og.terrainProvider.TerrainProvider("OpenGlobus"),
        "layers": [osm]
    });

    globus.planet.addControl(og.control.layerSwitcher());

    $.getJSON("countries.json", function (data) {
        var f = data.features;
        for (var i = 0; i < f.length; i++) {
            var fi = f[i];
            //for (var j = 0; j < fi.length; j++) {
            forest.add(new og.Entity({
                'geometry': {
                    'type': fi.geometry.type,
                    'coordinates': fi.geometry.coordinates,
                    'style': {
                        'fillColor': "rgba(255,255,255,0.6)"
                    }
                }
            }));
            //}
        }
        test_addForest();
        globus.planet.layers[1].events.on("mouseleave", function (e) {
            e.pickingObject.geometry.setFillColor(1, 1, 1, 0.6);
            e.pickingObject.geometry.setLineColor(0.2, 0.6, 0.8, 1.0);
        });
        globus.planet.layers[1].events.on("mouseenter", function (e) {
            e.pickingObject.geometry.bringToFront();
            e.pickingObject.geometry.setFillColor(1, 0, 0, 0.4);
            e.pickingObject.geometry.setLineColor(1, 0, 0, 1.0);
        });
        globus.planet.layers[1].events.on("mouselbuttonclick", function (e) {
            globus.planet.flyExtent(e.pickingObject.geometry.getExtent());
        });
    });


    // forest.add(new og.Entity({
    //     'geometry': {
    //         'type': "Polygon",
    //         'coordinates': [[[0, 0], [0, 2], [2, 2], [2, 0]]]
    //     }
    // }));

    // forest.add(new og.Entity({
    //     'geometry': {
    //         'type': "Polygon",
    //         'coordinates': [[[2, -1], [2, 3], [3, 3], [3, -1]]]
    //     }
    // }));

    // forest.add(new og.Entity({
    //     'geometry': {
    //         'type': "Polygon",
    //         'coordinates': [[[1, 1], [1.5, 4], [4, 4], [4, 1]]]
    //     }
    // }));

    // test_addForest();

    // globus.planet.layers[1].events.on("mouseleave", function (e) {
    //     e.pickingObject.geometry.setFillColor(1, 1, 1, 0.6);
    //     e.pickingObject.geometry.setLineColor(0.2, 0.6, 0.8, 1.0);
    // });
    // globus.planet.layers[1].events.on("mouseenter", function (e) {
    //     e.pickingObject.geometry.bringToFront();
    //     e.pickingObject.geometry.setFillColor(1, 0, 0, 0.4);
    //     e.pickingObject.geometry.setLineColor(1, 0, 0, 1.0);
    // });
    // globus.planet.layers[1].events.on("mouselbuttonclick", function (e) {
    //     globus.planet.flyExtent(e.pickingObject.geometry.getExtent());
    // });

};


function test_addEntity() {
    forest.add(new og.Entity({
        'geometry': {
            'type': "Polygon",
            'coordinates': [[[-10, 6], [-1, 12], [-3, -3]]],
            'style': {
                'fillColor': "#ffff00"
            }
        }
    }));
};

function test_addForest() {
    forest.addTo(globus.planet);
};