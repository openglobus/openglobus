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

function start() {
    og.webgl.MAX_FRAME_DELAY = 15;

    var empty = new og.layer.CanvasTiles("Empty", { isBaseLayer: true, visibility: true });
    empty.drawTile = function (material, applyCanvas) {
        var imgCnv = new og.ImageCanvas();
        imgCnv.fillColor("#c6c6c6");
        applyCanvas(imgCnv._canvas);
    };

    var layer = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", zIndex: 0, visibility: false, attribution: 'Data © <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' });
    var satlayer = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", visibility: false, zIndex: 1, attribution: '©2014 MapQuest - Portions ©2014 "Map data © <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"' });

    var hyb = new og.layer.XYZ("MapQuest Hybrid", { isBaseLayer: false, url: "http://otile1-s.mqcdn.com/tiles/1.0.0/hyb/{zoom}/{tilex}/{tiley}.png", visibility: false, zIndex: 20, opacity: 1, attribution: '' });

    var arcgis = new og.layer.XYZ("ArcGIS World Imagery", { isBaseLayer: true, url: "http://127.0.0.1/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{tiley}/{tilex}", zIndex: 2 });
    var mqosm = new og.layer.XYZ("MapQuest", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/map/{zoom}/{tilex}/{tiley}.jpg", zIndex: 3 });
    var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: "http://maps.kosmosnimki.ru/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}", zIndex: 4 });
    var arcgisBounds = new og.layer.XYZ("ALPHA TEST: ArcGIS Boundaries", { isBaseLayer: false, url: "http://127.0.0.1/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{zoom}/{tiley}/{tilex}", transparentColor: [0, 0, 0], opacity: 0.9, zIndex: 100 });
    var states = new og.layer.WMS("USA States", { isBaseLayer: false, url: "http://openglobus.org/geoserver/", layers: "topp:states", opacity: 0.5, zIndex: 50, transparentColor: [1.0, 1.0, 1.0], attribution: "<b>USA states</b>" });
    var canyon = new og.layer.WMS("USA Canyon", { isBaseLayer: false, url: "http://localhost/geoserver/", layers: "og:gchyp", opacity: 0.5, zIndex: 12 });
    var ocean = new og.layer.WMS("Ocean", { isBaseLayer: false, url: "http://localhost/geoserver/", layers: "og:ne_110m_ocean", opacity: 0.5, transparentColor: [1, 1, 1], zIndex: 45 });
    var countries = new og.layer.WMS("Countries", { isBaseLayer: false, url: "http://localhost/geoserver/", layers: "og:ne_10m_admin_0_countries", opacity: 0.5 });
    var regions = new og.layer.WMS("Geography regions", { isBaseLayer: false, url: "http://localhost/geoserver/", layers: "og:ne_10m_geography_regions_polys", opacity: 0.5 });
    var bl0 = new og.layer.WMS("Bathimetry-L-0", { isBaseLayer: false, url: "http://localhost/geoserver/", layers: "og:ne_10m_bathymetry_L_0", opacity: 0.5, zIndex: 47 });
    var gpoints = new og.layer.WMS("Geography points", { isBaseLayer: false, url: "http://localhost/geoserver/", layers: "og:ne_10m_geography_regions_points", opacity: 0.5 });
    var pop = new og.layer.WMS("Populated places", { isBaseLayer: false, url: "http://localhost/geoserver/", layers: "og:ne_10m_populated_places", opacity: 0.5 });
    var bf5 = new og.layer.WMS("Bathimetry-F-5000", { isBaseLayer: false, url: "http://localhost/geoserver/", layers: "og:ne_10m_bathymetry_F_5000", opacity: 0.5, zIndex: 3 });

    var ne = new og.layer.WMS("Natural Earth", { isBaseLayer: true, url: "http://openglobus.org/geoserver/", layers: "NaturalEarth:NE2_HR_LC_SR_W_DR", opacity: 1, zIndex: 3 });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus");

    //var skybox = new og.node.SkyBox({
    //    "nx": "http://127.0.0.1/og/resources/images/skyboxes/gal/_nx.jpg",
    //    "px": "http://127.0.0.1/og/resources/images/skyboxes/gal/_px.jpg",
    //    "py": "http://127.0.0.1/og/resources/images/skyboxes/gal/_py.jpg",
    //    "ny": "http://127.0.0.1/og/resources/images/skyboxes/gal/_ny.jpg",
    //    "pz": "http://127.0.0.1/og/resources/images/skyboxes/gal/_pz.jpg",
    //    "nz": "http://127.0.0.1/og/resources/images/skyboxes/gal/_nz.jpg"
    //});

    var controls = [
        new og.control.MouseNavigation({ autoActivate: true }),
        new og.control.KeyboardNavigation({ autoActivate: true }),
        new og.control.ToggleWireframe({ autoActivate: true }),
        /*new og.control.LoadingSpinner({ autoActivate: true }),*/
        new og.control.MousePosition({ autoActivate: true }),
        new og.control.LayerSwitcher({ autoActivate: true }),
    	new og.control.ShowFps({ autoActivate: true }),
    	new og.control.ZoomControl({ autoActivate: true }),
        new og.control.TouchNavigation({ autoActivate: true })
    ];

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "controls": controls,
         //"skybox": skybox,
        //"terrain": terrain,
        "layers": [satlayer, layer, empty, states, countries, ne, pop, hyb],
        "autoActivated": true
    });

    //var ql = new og.GeoImage({
    //    src: "ql.jpg",
    //    corners: [og.lonLat(152.02, -31.29), og.lonLat(151.59, -30.93), og.lonLat(151.86, -30.68), og.lonLat(152.29, -31.04)],
    //    opacity: 0.8
    //});
    //ql.addTo(globus.planet);

    ql2 = new og.GeoImage({
        src: "ql2.jpg",
        corners: [og.lonLat(20.91, 47.21), og.lonLat(20.22, 47.00), og.lonLat(20.00, 47.32), og.lonLat(20.70, 47.53)],
        opacity: 0.8
    });
    ql2.addTo(globus.planet);

    ql3 = new og.GeoImage({
        src: "ql3.jpg",
        corners: [og.lonLat(34.51, 26.07), og.lonLat(34.11, 25.69), og.lonLat(33.84, 25.93), og.lonLat(34.23, 26.31)],
        opacity: 0.8
    });
    ql3.addTo(globus.planet);

    ql4 = new og.GeoImage({
        src: "bm.jpg",
        corners: [og.lonLat(-180, 90), og.lonLat(180, 90), og.lonLat(180, -90), og.lonLat(-180, -90)],
        opacity: 0.5
    });
    ql4.addTo(globus.planet);

    ql5 = new og.GeoImage({
        src: "ql5.jpg",
        corners: [og.lonLat(-16.25, 22.22), og.lonLat(-16.62, 21.84), og.lonLat(-16.9, 22.07), og.lonLat(-16.53, 22.45)],
        opacity: 0.8
    });
    ql5.addTo(globus.planet);

    ql6 = new og.GeoImage({
        src: "ql6.jpg",
        corners: [og.lonLat(8.95, 42.32), og.lonLat(8.36, 42.04), og.lonLat(8.10, 42.33), og.lonLat(8.69, 42.61)],
        opacity: 0.8
    });
    ql6.addTo(globus.planet);

    /*    globus2 = new og.Globus({
            "target": "globus2",
            "name": "Earth",
            "controls": [new og.control.MouseNavigation({ autoActivate: true }),
                     new og.control.MousePosition({ autoActivate: true }),
                     new og.control.LayerSwitcher({ autoActivate: true })],
            "terrain": new og.terrainProvider.TerrainProvider("OpenGlobus", {
                url: og.terrainProvider.TerrainServers.OpenGlobus.url,
                maxZoom: og.terrainProvider.TerrainServers.OpenGlobus.maxZoom,
                minZoom: og.terrainProvider.TerrainServers.OpenGlobus.minZoom
            }),
            "layers": [new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", zIndex: 0, visibility: true })],
            "autoActivated": true
        });*/
    globus.planet.camera.flyLonLat(new og.LonLat(77.02815, 55.78131, 13132244.4), null, null, function(){alert("ok");});

};