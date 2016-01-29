goog.require('og.Globus');
goog.require('og.layer.XYZ');
goog.require('og.layer.WMS');
goog.require('og.layer.CanvasTiles');
goog.require('og.terrainProvider.TerrainProvider');
goog.require('og.node.SkyBox');
goog.require('og.control.MouseNavigation');
goog.require('og.control.KeyboardNavigation');
goog.require('og.control.ToggleWireframe');
/*goog.require('og.control.LoadingSpinner');*/
goog.require('og.control.MousePosition');
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

function loadCountries() {
    $.getJSON('http://www.openglobus.org/geoserver/wfs?typeNames=proj1:TM_WORLD_BORDERS-0.3&VERSION=2.0.0&REQUEST=GetFeature&propertyName=NAME,LON,LAT&&service=WFS&outputFormat=json',
        function (obj) {
            var f = obj.features;
            for (var i = 0; i < f.length; i++) {
                var fi = f[i];
                var e = new og.Entity({
                    lonlat: new og.LonLat(parseFloat(fi.properties.LON), parseFloat(fi.properties.LAT), 1000),
                    label: {
                        text: fi.properties.NAME.length < 20 ? fi.properties.NAME : "",
                        align: "center",
                        size: 60,
                        color: new og.math.Vector4(1, 1, 1, 1),
                        outlineColor: new og.math.Vector4(0, 0, 0, 1),
                        outline: 0.45,
                        weight: "bold",
                        face: "verdana"
                    }
                });
                e.addTo(countriesCollection);
            }
        });
};

function loadCapitals() {
    $.getJSON('http://www.openglobus.org/geoserver/wfs?typeNames=og:ne_10m_populated_places&VERSION=2.0.0&REQUEST=GetFeature&propertyName=NAMEASCII,LONGITUDE,LATITUDE,WORLDCITY,ISO_A2&&service=WFS&outputFormat=json',
    function (obj) {
        var f = obj.features;
        var j = 0;
        for (var i = 0; i < f.length; i++) {
            var fi = f[i];
            //if (fi.properties.ISO_A2 == "US" && j < 200) {
            j++;
            var e = new og.Entity({
                lonlat: new og.LonLat(parseFloat(fi.properties.LONGITUDE), parseFloat(fi.properties.LATITUDE), 1000),
                label: {
                    text: fi.properties.NAMEASCII.length < 20 ? fi.properties.NAMEASCII : "",
                    //align: "center",
                    size: 37,
                    color: new og.math.Vector4(0, 0, 0, 1),
                    //outlineColor: new og.math.Vector4(0, 0, 0, 1),
                    outline: 0.0,
                    weight: "bold",
                    face: "verdana"
                }
            });
            e.addTo(capitalsCollection);
            //}
        }
    });
};

function start() {
    //og.shaderProgram.SHADERS_URL = "./shaders/";

    var osm = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", visibility: true, attribution: 'Data © <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' });
    var sat = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", visibility: false, attribution: '©2014 MapQuest - Portions ©2014 "Map data © <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"' });
    var hyb = new og.layer.XYZ("MapQuest Hybrid", { isBaseLayer: false, url: "http://otile1-s.mqcdn.com/tiles/1.0.0/hyb/{zoom}/{tilex}/{tiley}.png", visibility: false, zIndex: 20, opacity: 1, attribution: '' });
    var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: "http://maps.kosmosnimki.ru/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}" });
    var states = new og.layer.WMS("USA States", { isBaseLayer: false, url: "http://openglobus.org/geoserver/", layers: "topp:states", opacity: 0.5, zIndex: 50, attribution: 'USA states - geoserver WMS example', transparentColor: [1.0, 1.0, 1.0] });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus");

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
        new og.control.MousePosition({ autoActivate: true }),
        new og.control.LayerSwitcher({ autoActivate: true }),
    	new og.control.ZoomControl({ autoActivate: true }),
    	new og.control.TouchNavigation({ autoActivate: true })
    ];

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "controls": controls,
        //"skybox": skybox,
        "terrain": terrain,
        "layers": [sat, osm, hyb, states],
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

    countriesCollection = new og.EntityCollection();
    //countriesCollection.setScaleByDistance(100000, 5700000, 4000000);
    countriesCollection.events.on("draw", countriesCollection, function () {
        var maxDist = 3.57 * Math.sqrt(this.renderNode.camera._lonLat.height) * 1000;
        this.setScaleByDistance(200000, maxDist + 200000, maxDist);
    });
    countriesCollection.addTo(globus.planet);

    loadCountries();


    capitalsCollection = new og.EntityCollection();
    ////capitalsCollection.setScaleByDistance(100000, 5700000, 4000000);
    capitalsCollection.events.on("draw", capitalsCollection, function () {
        var maxDist = 3.57 * Math.sqrt(this.renderNode.camera._lonLat.height) * 1000;
        this.setScaleByDistance(200000, maxDist + 200000, maxDist);

    });
    capitalsCollection.addTo(globus.planet);

    //globus.planet.events.on("draw", null, function () {
    //    if (globus.planet.camera.getAltitude() < 1000000) {
    //        capitalsCollection.setVisibility(true);
    //    } else {
    //        capitalsCollection.setVisibility(false);
    //    }
    //});

    //loadCapitals();

    ql = new og.GeoImage({
        src: "ql.jpg",
        corners: [og.lonLat(152.02, -31.29), og.lonLat(151.59, -30.93), og.lonLat(151.86, -30.68), og.lonLat(152.29, -31.04)],
        opacity: 1.0
    });
    ql.addTo(globus.planet);


    ql3 = new og.GeoImage({
        src: "ql3.jpg",
        corners: [og.lonLat(34.51, 26.07), og.lonLat(34.11, 25.69), og.lonLat(33.84, 25.93), og.lonLat(34.23, 26.31)],
        opacity: 0.8
    });
    ql3.addTo(globus.planet);

    //ql4 = new og.GeoImage({
    //    src: "bm.jpg",
    //    corners: [og.lonLat(-180, 90), og.lonLat(180, 90), og.lonLat(180, -90), og.lonLat(-180, -90)],
    //    opacity: 1.0
    //});
    //ql4.addTo(globus.planet);
};

function test() {
    eee = new og.Entity({
        lonlat: new og.LonLat(0, 0, 1000),
        billboard: {
            src: "ship.png",
            width: 70,
            height: 70,
            offset: [255, 10]
        },
        label: {
            text: "Saint-Petersburg",
            align: "center",
            size: 70,
            color: new og.math.Vector4(1, 1, 1, 1),
            outlineColor: new og.math.Vector4(0, 0, 0, 1),
            outline: 0.47,
            face: "verdana"
        }
    });
    ec = new og.EntityCollection();
    eee.addTo(ec);
    ec.addTo(globus.planet);

    eee1 = new og.Entity({
        lonlat: new og.LonLat(0, 10, 1000),
        label: {
            text: "Hello world!",
            align: "center",
            size: 70,
            color: new og.math.Vector4(1, 1, 1, 1),
            outlineColor: new og.math.Vector4(0, 0, 0, 1),
            outline: 0.47,
            face: "verdana"
        }
    });

    ec.add(eee1);

    eee2 = new og.Entity({
        lonlat: new og.LonLat(45, 45, 692500),
        label: {
            text: "X",
            align: "center",
            size: 70,
            color: new og.math.Vector4(1, 1, 1, 1),
            outlineColor: new og.math.Vector4(0, 0, 0, 1),
            outline: 0.47,
            face: "verdana"
        }
    });

    ec.add(eee2);

    eee3 = new og.Entity({
        lonlat: new og.LonLat(0, 90, 500),
        label: {
            text: "North pole",
            align: "center",
            size: 70,
            color: new og.math.Vector4(1, 1, 1, 1),
            outlineColor: new og.math.Vector4(0, 0, 0, 1),
            outline: 0.47,
            face: "verdana"
        }
    });

    ec.add(eee3);

    eee4 = new og.Entity({
        lonlat: new og.LonLat(0, -90, 500),
        label: {
            text: "South pole",
            align: "center",
            size: 70,
            color: new og.math.Vector4(1, 1, 1, 1),
            outlineColor: new og.math.Vector4(0, 0, 0, 1),
            outline: 0.47,
            face: "verdana"
        }
    });

    ec.add(eee4);
};