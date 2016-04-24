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

function start() {

    var sat = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", visibility: true, attribution: '©2014 MapQuest - Portions ©2014 "Map data © <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"' });
    //var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus");

    var skybox = new og.node.SkyBox({
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
        //new og.control.KeyboardNavigation({ autoActivate: true }),
        new og.control.ToggleWireframe({ autoActivate: true }),
        //new og.control.EarthCoordinates({ autoActivate: true, center: false }),
        //new og.control.LayerSwitcher({ autoActivate: true }),
        //new og.control.ZoomControl({ autoActivate: true }),
        new og.control.TouchNavigation({ autoActivate: true }),
        sun
    ];

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "controls": controls,
        "skybox": skybox,
        //"terrain": terrain,
        "layers": [sat],
        "autoActivated": true
    });

    f = sun;
    f.sunlight.setAmbient(new og.math.Vector3(0.2, 0.2, 0.5))
    f.sunlight.setSpecular(new og.math.Vector3(1.0, 0.8, 0.9))
    f.sunlight.setShininess(4);

    globus.planet.flyLonLat(new og.LonLat(77.02815, 55.78131, 13132244.4));
    globus.fadeIn(700);

    collection = new og.EntityCollection();

    collection.add(new og.Entity({
        sphere: {
            radius: 6378137.00+30000,
            color: [1.0, 1.0, 1.0, 0.7],
            src: "clouds5.jpg",
            latBands: 64,
            lonBands: 64
        }
    })).addTo(globus.planet);

    var rot = 0;
    step = 0.005;
    globus.planet.renderer.events.on("draw", null, function () {
        collection._entities[0].shape.orientation = new og.math.Quaternion.yRotation(rot * og.math.RADIANS);
        collection._entities[0].shape.refresh();
        rot+=step;
    });
};
