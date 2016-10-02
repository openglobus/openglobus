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

    var osm = new og.layer.XYZ("OpenStreetMap", { extent: og.extent(og.lonLat(0, 0), og.lonLat(45, 45)), isBaseLayer: true, url: "http://b.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", visibility: true, attribution: 'Data © <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' });
    var sat = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: "http://tileproxy.cloud.mapquest.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.png", visibility: false, attribution: '©2014 MapQuest - Portions ©2014 "Map data © <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"' });
    var sat2 = new og.layer.XYZ("-MapQuest Satellite", { extent: og.extent(og.lonLat(-180, -90), og.lonLat(180, 0)), isBaseLayer: false, url: "http://tileproxy.cloud.mapquest.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.png", visibility: false, attribution: '' });
    var sat3 = new og.layer.XYZ("+MapQuest Satellite", { extent: og.extent(og.lonLat(-180, 0), og.lonLat(180, 90)), isBaseLayer: false, url: "http://tileproxy.cloud.mapquest.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.png", visibility: false, attribution: '' });
    var hyb = new og.layer.XYZ("MapQuest Hybrid", { isBaseLayer: false, url: "http://otile1-s.mqcdn.com/tiles/1.0.0/hyb/{zoom}/{tilex}/{tiley}.png", visibility: false, zIndex: 20, opacity: 1, attribution: '' });
    //var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: "http://c.tile.osm.kosmosnimki.ru/kosmo/{zoom}/{tilex}/{tiley}.png" });
    var states = new og.layer.WMS("USA States", { height: 200000, zIndex: 100, extent: og.extent(og.lonLat(-120, 20), og.lonLat(-60, 45)), visibility: false, isBaseLayer: false, url: "http://openglobus.org/geoserver/", layers: "topp:states", opacity: 0.5, zIndex: 50, attribution: 'USA states - geoserver WMS example', transparentColor: [1.0, 1.0, 1.0] });
    var geoImage = new og.layer.GeoImage("GeoImage", { src: "bm.jpg", wgs84: true, height: 0, zIndex: 200, corners: [[-180, 90], [180, 90], [180, -90], [-180, -90]], visibility: false, isBaseLayer: false, opacity: 0.8 });
    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus");
    var osm2 = new og.layer.XYZ("OpenStreetMap", { height: 0, extent: og.extent(og.lonLat(-100, 25), og.lonLat(-70, 40)), isBaseLayer: false, url: "http://b.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", visibility: true, attribution: '', zIndex: 0 });
    var geoImage2 = new og.layer.GeoImage("GeoImage2", { src: "ql.jpg", height: 0, zIndex: 400, wgs84: false, corners: [[0, 55], [10, 55], [10, 45], [0, 45]], visibility: false, isBaseLayer: false, opacity: 0.7 });
    geoImage3 = new og.layer.GeoTexture2d("GeoImageAnimate", { wgs84: true, frameWidth: 1920, frameHeight: 600, height: 0, zIndex: 400, wgs84: false, corners: [[0, 55], [10, 55], [10, 45], [0, 45]], visibility: false, isBaseLayer: false, opacity: 0.8 });
    geoImage4 = new og.layer.GeoVideo("Video", { minZoom: 8, src: "Tavarua.mp4", height: 0, zIndex: 400, wgs84: false, corners: [[177.19034745638677, -17.854222103595355], [177.20877442720754, -17.852755031132784], [177.20944035656285, -17.861547286977103], [177.19146734222485, -17.863358020800423]], visibility: false, isBaseLayer: false, opacity: 1.0 });

    var skybox = new og.scene.SkyBox({
        "nx": "http://127.0.0.1/og/resources/images/skyboxes/gal/_nx.jpg",
        "px": "http://127.0.0.1/og/resources/images/skyboxes/gal/_px.jpg",
        "py": "http://127.0.0.1/og/resources/images/skyboxes/gal/_py.jpg",
        "ny": "http://127.0.0.1/og/resources/images/skyboxes/gal/_ny.jpg",
        "pz": "http://127.0.0.1/og/resources/images/skyboxes/gal/_pz.jpg",
        "nz": "http://127.0.0.1/og/resources/images/skyboxes/gal/_nz.jpg"
    });

    sun = new og.control.Sun({ autoActivate: true });
    var controls = [
        new og.control.MouseNavigation({ autoActivate: true }),
        new og.control.KeyboardNavigation({ autoActivate: true }),
        new og.control.ToggleWireframe({ autoActivate: true }),
        new og.control.EarthCoordinates({ autoActivate: true, center: false }),
        new og.control.LayerSwitcher({ autoActivate: true }),
        new og.control.ZoomControl({ autoActivate: true }),
        new og.control.TouchNavigation({ autoActivate: true }),
        sun,
        new og.control.ShowFps({ autoActivate: true }),
        new og.control.GeoImageDragControl({ autoActivate: true })
    ];

    globus = new og.Globus({
        //"atmosphere": true,
        "target": "globus",
        "name": "Earth",
        "controls": controls,
        //"skybox": skybox,
        "terrain": terrain,
        "layers": [sat, sat2, sat3, osm, hyb, states, osm2, geoImage, geoImage2, geoImage3, geoImage4],
        "autoActivate": true
    });

    globus.planet.renderer.handler.clock.multiplier = 0;

    //globus.planet.lightEnabled = false;

    sun.sunlight.setDiffuse(new og.math.Vector3(1.0, 1.0, 1.0));
    sun.sunlight.setAmbient(new og.math.Vector3(0.1, .1, 0.21))
    sun.sunlight.setSpecular(new og.math.Vector3(0.00025, 0.00015, 0.0001))
    sun.sunlight.setShininess(100);

    globus.planet.flyLonLat(new og.LonLat(77.02815, 55.78131, 13132244.4));
    globus.fadeIn(700);

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
