goog.require('og.Globus');
goog.require('og.layer.XYZ');
goog.require('og.layer.WMS');
goog.require('og.terrainProvider.TerrainProvider');
goog.require('og.node.SkyBox');
goog.require('og.control.MouseNavigation');
goog.require('og.control.KeyboardNavigation');
goog.require('og.control.ToggleWireframe');
/*goog.require('og.control.LoadingSpinner');*/
goog.require('og.control.MousePosition');
goog.require('og.control.LayerSwitcher');
goog.require('og.control.ShowFps');

function start() {
    og.webgl.MAX_FRAME_DELAY = 15;  

    var layer = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", zIndex: 0, attribution: 'Data © <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' });
    var satlayer = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", visibility: true, zIndex: 1, attribution: '©2014 MapQuest - Portions ©2014 "Map data © <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"' });
    var arcgis = new og.layer.XYZ("ArcGIS World Imagery", { isBaseLayer: true, url: "http://127.0.0.1/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{tiley}/{tilex}", zIndex: 2 });
    var mqosm = new og.layer.XYZ("MapQuest", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/map/{zoom}/{tilex}/{tiley}.jpg", zIndex: 3 });
    var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: "http://maps.kosmosnimki.ru/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}", zIndex: 4 });
    var arcgisBounds = new og.layer.XYZ("ALPHA TEST: ArcGIS Boundaries", { isBaseLayer: false, url: "http://127.0.0.1/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{zoom}/{tiley}/{tilex}", transparentColor: [0, 0, 0], opacity: 0.9, zIndex: 100 });
    var states = new og.layer.WMS("USA States", { isBaseLayer: false, url: "http://openglobus.org/geoserver/", layers: "topp:states", opacity: 0.5, zIndex: 50, attribution: "<b>USA states</b>" });
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

    var skybox = new og.node.SkyBox({
        "positiveX": "http://openglobus.org/resources/images/skyboxes/tycho/px.jpg",
        "negativeX": "http://openglobus.org/resources/images/skyboxes/tycho/nx.jpg",
        "positiveY": "http://openglobus.org/resources/images/skyboxes/tycho/py.jpg",
        "negativeY": "http://openglobus.org/resources/images/skyboxes/tycho/ny.jpg",
        "positiveZ": "http://openglobus.org/resources/images/skyboxes/tycho/pz.jpg",
        "negativeZ": "http://openglobus.org/resources/images/skyboxes/tycho/nz.jpg"
    });

    var controls = [
        new og.control.MouseNavigation({ autoActivate: true }),
        new og.control.KeyboardNavigation({ autoActivate: true }),
        new og.control.ToggleWireframe({ autoActivate: true }),
        /*new og.control.LoadingSpinner({ autoActivate: true }),*/
        new og.control.MousePosition({ autoActivate: true }),
        new og.control.LayerSwitcher({ autoActivate: true }),
    	new og.control.ShowFps({ autoActivate: true })
    ];

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "controls": controls,
        //"skybox": skybox,
        "terrain": terrain,
        "layers": [satlayer, layer, states, countries, ne, pop],
        "autoActivated": true
    });

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
};