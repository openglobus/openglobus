goog.provide('og.start');

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
goog.require('og.node.Axes');

goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.start = function () {

    var planetShader = new og.shaderProgram.ShaderProgram("planet", {
        uniforms: {
            uMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uPMatrix: { type: og.shaderProgram.types.MAT4 },

            uSamplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            texBiasArr: { type: og.shaderProgram.types.VEC3 },
            alfaArr: { type: og.shaderProgram.types.FLOATXX },
            tcolorArr: { type: og.shaderProgram.types.VEC3 },
            numTex: { type: og.shaderProgram.types.INT }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("../src/og/shaders/planet_vs.txt"),
        fragmentShader: og.utils.readTextFile("../src/og/shaders/planet_fs.txt")
    });

    var skyboxShader = new og.shaderProgram.ShaderProgram("skybox", {
        uniforms: {
            uMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uPMatrix: { type: og.shaderProgram.types.MAT4 },
            uSampler: { type: og.shaderProgram.types.SAMPLER2D }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("../src/og/shaders/skybox_vs.txt"),
        fragmentShader: og.utils.readTextFile("../src/og/shaders/skybox_fs.txt")
    });

    var flatShader = new og.shaderProgram.ShaderProgram("flat", {
        uniforms: {
            uMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uPMatrix: { type: og.shaderProgram.types.MAT4 },
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aVertexColor: { type: og.shaderProgram.types.VEC4, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("../src/og/shaders/flat_vs.txt"),
        fragmentShader: og.utils.readTextFile("../src/og/shaders/flat_fs.txt")
    });

    context = new og.webgl.Handler("canvas");
    context.addShaderPrograms([planetShader, skyboxShader, flatShader]);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var planet = new og.node.Planet("Earth", og.ellipsoid.wgs84);

    var layer = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: og.layer.MapServersProxy.OSMb.url });
    var satlayer = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: og.layer.MapServers.MapQuestSat.url, visibility: true });
    var mqosm = new og.layer.XYZ("MapQuest", { isBaseLayer: true, url: og.layer.MapServers.MapQuest.url });
    var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: og.layer.MapServers.Cosmosnimki.url });
    var states = new og.layer.WMS("USA States", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "topp:states", opacity: 1.0 });
    var canyon = new og.layer.WMS("USA Canyon", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:gchyp", opacity: 1.0 });
    var ocean = new og.layer.WMS("Ocean", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_110m_ocean", opacity: 1.0, transparentColor:[0.67, 0.67, 0.67] });
    var countries = new og.layer.WMS("Countries", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_admin_0_countries", opacity: 1.0 });
    var regions = new og.layer.WMS("Geography regions", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_geography_regions_polys", opacity: 1.0 });
    var bl0 = new og.layer.WMS("Bathimetry-L-0", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_bathymetry_L_0", opacity: 1.0 });
    var gpoints = new og.layer.WMS("Geography points", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_geography_regions_points", opacity: 1.0 });
    var pop = new og.layer.WMS("Populated places", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_populated_places", opacity: 1.0 });
    var bf5 = new og.layer.WMS("Bathimetry-F-5000", { isBaseLayer: false, url: "http://127.0.0.1/geoserver/", layers: "og:ne_10m_bathymetry_F_5000", opacity: 1.0 });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus", {
        url: og.terrainProvider.TerrainServers.OpenGlobus.url,
        maxZoom: og.terrainProvider.TerrainServers.OpenGlobus.maxZoom,
        minZoom: og.terrainProvider.TerrainServers.OpenGlobus.minZoom
    });

    planet.addLayers([layer, satlayer, mqosm, kosmosnim, states, canyon, ocean, countries, regions, bl0, bf5, gpoints, pop]);
    planet.setBaseLayer(satlayer);
    planet.setTerrainProvider(terrain);

    var skybox = new og.node.SkyBox();
    var axes = new og.node.Axes(10000);

    renderer.addRenderNode(planet);
    renderer.addRenderNode(skybox);
    renderer.addRenderNode(axes);

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

goog.exportSymbol('og.start', og.start);
