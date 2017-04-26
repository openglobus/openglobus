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

    //var geoImage2 = new og.layer.GeoImage("GeoImage2", { src: "ql.jpg", height: 0, zIndex: 400, corners: [[0, 0], [0, 20], [20, 20], [20, 0]], visibility: true, isBaseLayer: false, opacity: 0.7 });
    // var states = new og.layer.WMS("USA Population", {
    //     extent: [[-128, 24], [-66, 49]],
    //     visibility: true,
    //     isBaseLayer: false,
    //     url: "http://openglobus.org/geoserver/",
    //     layers: "topp:states",
    //     opacity: 1.0,
    //     attribution: 'Hi!',
    //     transparentColor: [1.0, 1.0, 1.0]
    // });

    //var entities = [];

    // entities.push(new og.Entity({
    //     'geometry': {
    //         'type': "MultiPolygon",
    //         'coordinates': [ [[[-110,25], [-110, 40], [-100, 40], [-100,25]]], [[[20,20],[30,10],[8,2]]] ],
    //         'style': {}
    //     }
    // }));

    // forest = new og.layer.Vector("Forest", {
    //     'visibility': true,
    //     'isBaseLayer': false,
    //     'diffuse': [0, 0, 0],
    //     'ambient': [1, 1, 1]
    // });

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
        "terrain": new og.terrainProvider.TerrainProvider("OpenGlobus"),
        "layers": [osm]
    });

    globus.planet.addControl(og.control.layerSwitcher());

    // $.getJSON("countries.json", function (data) {
    //     var f = data.features;
    //     for (var i = 0; i < f.length; i++) {
    //         var fi = f[i];
    //         //for (var j = 0; j < fi.length; j++) {
    //         forest.add(new og.Entity({
    //             'geometry': {
    //                 'type': fi.geometry.type,
    //                 'coordinates': fi.geometry.coordinates,
    //                 'style': {
    //                     'fillColor': "rgba(255,255,255,0.6)"
    //                 }
    //             }
    //         }, fi.properties));
    //         //}
    //     }
    //     test_addForest();
    //     globus.planet.layers[1].events.on("mouseleave", function (e) {
    //         e.pickingObject.geometry.setFillColor(1, 1, 1, 0.6);
    //         e.pickingObject.geometry.setLineColor(0.2, 0.6, 0.8, 1.0);
    //     });
    //     globus.planet.layers[1].events.on("mouseenter", function (e) {
    //         e.pickingObject.geometry.bringToFront();
    //         e.pickingObject.geometry.setFillColor(1, 0, 0, 0.4);
    //         e.pickingObject.geometry.setLineColor(1, 0, 0, 1.0);
    //     });
    //     globus.planet.layers[1].events.on("mouselbuttonclick", function (e) {
    //         globus.planet.flyExtent(e.pickingObject.geometry.getExtent());
    //     });
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


function main3() {
    var osm = new og.layer.XYZ("OpenStreetMap", {
        isBaseLayer: false,
        url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        visibility: true,
        extent: [[-10, 40], [20, 58]],
        attribution: 'Data @ OpenStreetMap contributors, ODbL'
    });

    var sat = new og.layer.XYZ("MapQuest Satellite", {
        isBaseLayer: false,
        extent: [[-12, 38], [8, 53]],
        url: "http://tileproxy.cloud.mapquest.com/tiles/1.0.0/sat/{z}/{x}/{y}.png",
        visibility: true,
        attribution: '�2014 MapQuest - Portions �2014 "Map data � <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"'
    });

    var img = new og.layer.GeoImage("UK.jpg", {
        src: "UK.jpg",
        corners: [[-7.674585966211434, 59.25936136683274], [4.052821115801188, 58.19691969395908], [0.9659972036307729, 49.203405066507365], [-8.57191505617858, 50.31013492636263]],
        visibility: true,
        isBaseLayer: false,
        opacity: 1.0
    });

    var uk = new og.layer.Vector("UK", {
        'visibility': true,
        'isBaseLayer': false,
        'zIndex': 101
    });

    uk.add(new og.Entity({
        'geometry': {
            'type': "MultiPolygon",
            'coordinates': [[[[-58.55, -51.1], [-57.75, -51.55], [-58.05, -51.9], [-59.4, -52.2], [-59.85, -51.85], [-60.7, -52.3], [-61.2, -51.85], [-60, -51.25], [-59.15, -51.5], [-58.55, -51.1]]], [[[-5.661948614921897, 54.55460317648385], [-6.197884894220977, 53.86756500916334], [-6.953730231137996, 54.073702297575636], [-7.572167934591079, 54.05995636658599], [-7.366030646178785, 54.595840969452695], [-7.572167934591079, 55.1316222194549], [-6.733847011736145, 55.1728600124238], [-5.661948614921897, 54.55460317648385]]], [[[-3.005004848635281, 58.63500010846633], [-4.073828497728016, 57.55302480735526], [-3.055001796877662, 57.69001902936094], [-1.959280564776918, 57.68479970969952], [-2.219988165689301, 56.87001740175353], [-3.119003058271119, 55.973793036515474], [-2.085009324543023, 55.90999848085127], [-2.005675679673857, 55.80490285035023], [-1.11499101399221, 54.624986477265395], [-0.4304849918542, 54.46437612570216], [0.184981316742039, 53.32501414653103], [0.469976840831777, 52.92999949809197], [1.681530795914739, 52.739520168664], [1.559987827164377, 52.09999848083601], [1.050561557630914, 51.806760565795685], [1.449865349950301, 51.28942780212196], [0.550333693045502, 50.765738837275876], [-0.78751746255864, 50.77498891865622], [-2.489997524414378, 50.50001862243124], [-2.956273972984036, 50.696879991247016], [-3.617448085942328, 50.22835561787272], [-4.542507900399244, 50.341837063185665], [-5.245023159191135, 49.95999990498109], [-5.776566941745301, 50.15967763935683], [-4.309989793301838, 51.21000112568916], [-3.414850633142123, 51.42600861266925], [-3.422719467108323, 51.42684816740609], [-4.984367234710874, 51.593466091510976], [-5.267295701508886, 51.991400458374585], [-4.222346564134853, 52.301355699261364], [-4.770013393564113, 52.840004991255626], [-4.579999152026915, 53.49500377055517], [-3.093830673788659, 53.404547400669685], [-3.092079637047107, 53.40444082296355], [-2.945008510744344, 53.984999701546684], [-3.614700825433033, 54.600936773292574], [-3.630005458989331, 54.615012925833014], [-4.844169073903004, 54.790971177786844], [-5.082526617849226, 55.06160065369937], [-4.719112107756644, 55.50847260194348], [-5.047980922862109, 55.78398550070753], [-5.58639767091114, 55.31114614523682], [-5.644998745130181, 56.275014960344805], [-6.149980841486354, 56.78500967063354], [-5.786824713555291, 57.81884837506465], [-5.009998745127575, 58.63001333275005], [-4.211494513353557, 58.55084503847917], [-3.005004848635281, 58.63500010846633]]]],
            'style': {
                'lineWidth': 12
            }
        }
    }));

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "terrain": new og.terrainProvider.TerrainProvider("OpenGlobus"),
        "layers": [osm, sat, img, uk]
    });

    globus.planet.viewExtent(osm.getExtent());
};


function main4(){
            var osm = new og.layer.XYZ("OpenStreetMap", {
            specular: [0.0003, 0.00012, 0.00001],
            shininess: 20,
            diffuse: [0.89, 0.9, 0.83],
            isBaseLayer: true,
            url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            visibility: true,
            attribution: 'Data @ OpenStreetMap contributors, ODbL'
        });

        var tracks = [
            og.entity({
                'polyline': {
                    'path': [og.math.vector3(0, 0, 0), og.math.vector3(0, 100000000, 0)],
                    'thickness': 15,
                    'color': [1, 1, 0, 1]
                }
            })];

        var arcsAndOrbits = new og.layer.Vector("ArcsAndOrbits", {
            'entities': tracks
        });


        globus = new og.Globus({
            "target": "globus",
            "name": "Earth",
            "layers": [osm, arcsAndOrbits],
            "controls":[
                og.control.mouseNavigation(),
                og.control.keyboardNavigation(),
                //og.control.toggleWireframe(),
                og.control.earthCoordinates({ center: false }),
                og.control.layerSwitcher(),
                og.control.zoomControl(),
                og.control.touchNavigation(),
                new og.control.Sun(),
                og.control.showFps()
            ]
        });
}

/*
<div style="
    position: absolute;
    left: 0;
    height: 100%;
    width: 3px;
    background-color: rgba(18, 133, 214, 0.32);
    z-index: 1;
    transition: width 0.20s;
"><div style="
    width: 5px;
    height: 40px;
    background-color: white;
    position: relative;
    top: 50%;
    transform: translateY(-50%);
    -webkit-transform: translateY(-50%);
    margin-right: -5px;
    z-index: 0;
    right: 0px;
    float: right;
"></div><div style="
    width: 270px;
    height: 100%;
    position: absolute;
    top: 0;
    right: 0;
">Hello world</div></div>
*/