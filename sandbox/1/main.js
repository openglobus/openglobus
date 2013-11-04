goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.node.Planet');
goog.require('og.layer');
goog.require('og.layer.XYZ');
goog.require('og.layer.WMS');
goog.require('og.terrainProvider.TerrainProvider');
goog.require('og.control.MouseNavigation');
goog.require('og.control.KeyboardNavigation');
goog.require('og.control.LayerSwitcher');
goog.require('og.control.ToggleWireframe');
goog.require('og.control.LoadingSpinner');
goog.require('og.control.MousePosition');
goog.require('og.control.ShowFps');
goog.require('og.ellipsoid.wgs84');
goog.require('og.node.SkyBox');
goog.require('og.shaderProgram.overlays');
goog.require('og.shaderProgram.single');
goog.require('og.shaderProgram.skybox');


function start() {

    //var flatShader = new og.shaderProgram.ShaderProgram("flat", {
    //    uniforms: {
    //        uPMVMatrix: { type: og.shaderProgram.types.MAT4 }
    //    },
    //    attributes: {
    //        aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
    //        aVertexColor: { type: og.shaderProgram.types.VEC4, enableArray: true }
    //    },
    //    vertexShader: og.utils.readTextFile("../src/og/shaders/flat_vs.txt"),
    //    fragmentShader: og.utils.readTextFile("../src/og/shaders/flat_fs.txt")
    //});


    context = new og.webgl.Handler("canvas");
    context.addShaderProgram(og.shaderProgram.overlays);
    context.addShaderProgram(og.shaderProgram.single);
    context.addShaderProgram(og.shaderProgram.skybox);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var planet = new og.node.Planet("Earth", og.ellipsoid.wgs84);

    var layer = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png" });
    var satlayer = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", visibility: true });
    var arcgis = new og.layer.XYZ("ArcGIS World Imagery", { isBaseLayer: true, url: "http://127.0.0.1/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{tiley}/{tilex}" });
    var mqosm = new og.layer.XYZ("MapQuest", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/map/{zoom}/{tilex}/{tiley}.jpg" });
    var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: "http://maps.kosmosnimki.ru/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}" });
    var arcgisBounds = new og.layer.XYZ("ALPHA TEST: ArcGIS Boundaries", { isBaseLayer: false, url: "http://127.0.0.1/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{zoom}/{tiley}/{tilex}", transparentColor: [0, 0, 0], opacity: 0.9 });
    var states = new og.layer.WMS("USA States", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "topp:states", opacity: 0.5 });
    var canyon = new og.layer.WMS("USA Canyon", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:gchyp", opacity: 0.5 });
    var ocean = new og.layer.WMS("Ocean", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_110m_ocean", opacity: 0.5, transparentColor:[1, 1, 1] });
    var countries = new og.layer.WMS("Countries", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_admin_0_countries", opacity: 0.5 });
    var regions = new og.layer.WMS("Geography regions", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_geography_regions_polys", opacity: 0.5 });
    var bl0 = new og.layer.WMS("Bathimetry-L-0", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_bathymetry_L_0", opacity: 0.5 });
    var gpoints = new og.layer.WMS("Geography points", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_geography_regions_points", opacity: 0.5 });
    var pop = new og.layer.WMS("Populated places", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_populated_places", opacity: 0.5 });
    var bf5 = new og.layer.WMS("Bathimetry-F-5000", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_bathymetry_F_5000", opacity: 0.5 });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus", {
        url: og.terrainProvider.TerrainServers.OpenGlobus.url,
        maxZoom: og.terrainProvider.TerrainServers.OpenGlobus.maxZoom,
        minZoom: og.terrainProvider.TerrainServers.OpenGlobus.minZoom
    });

    planet.addLayers([layer, satlayer, mqosm, arcgis, kosmosnim, arcgisBounds, states, canyon, ocean, countries, regions, bl0, bf5, gpoints, pop]);
    planet.setBaseLayer(satlayer);
    planet.setTerrainProvider(terrain);

    var skybox = new og.node.SkyBox();
    //var axes = new og.node.Axes(10000);

    renderer.addRenderNode(planet);
    //renderer.addRenderNode(skybox);
    //renderer.addRenderNode(axes);

    renderer.addControls([
        new og.control.MouseNavigation({ autoActivate: true }),
        new og.control.KeyboardNavigation({ autoActivate: true }),
        new og.control.ToggleWireframe({ autoActivate: true }),
        new og.control.LoadingSpinner({ autoActivate: true }),
        new og.control.MousePosition({ autoActivate: true }),
	    new og.control.LayerSwitcher({ autoActivate: true }),
    	new og.control.ShowFps({ autoActivate: true })
    ]);

    renderer.Start();
};