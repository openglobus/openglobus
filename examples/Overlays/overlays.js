goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.node.Planet');
goog.require('og.layer.XYZ');
goog.require('og.layer.WMS');
goog.require('og.terrainProvider.TerrainProvider');
goog.require('og.control.MouseNavigation');
goog.require('og.control.KeyboardNavigation');
goog.require('og.control.LayerSwitcher');
goog.require('og.control.LoadingSpinner');
goog.require('og.ellipsoid.wgs84');
goog.require('og.shaderProgram.single');
goog.require('og.shaderProgram.overlays');

function start() {
    var context = new og.webgl.Handler("canvas");
    context.addShaderProgram(og.shaderProgram.single);
    context.addShaderProgram(og.shaderProgram.overlays);
    context.init();

    var renderer = new og.Renderer(context);
    renderer.init();

    var osm = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", visibility: true });
    var states = new og.layer.WMS("USA States", { isBaseLayer: false, url: "../../../geoserver/", layers: "topp:states", opacity: 0.5 });
    var canyon = new og.layer.WMS("USA Canyon", { isBaseLayer: false, url: "../../../geoserver/", layers: "og:gchyp", opacity: 0.5 });
    var countries = new og.layer.WMS("Countries", { isBaseLayer: false, url: "../../../geoserver/", layers: "og:ne_10m_admin_0_countries", opacity: 0.5, visibility: true });
    var pop = new og.layer.WMS("Populated places", { isBaseLayer: false, url: "../../../geoserver/", layers: "og:ne_10m_populated_places", opacity: 0.5, visibility: true });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus", {
        url: og.terrainProvider.TerrainServers.OpenGlobus.url,
        maxZoom: og.terrainProvider.TerrainServers.OpenGlobus.maxZoom,
        minZoom: og.terrainProvider.TerrainServers.OpenGlobus.minZoom
    });

    var planet = new og.node.Planet("Earth", og.ellipsoid.wgs84);
    planet.addLayers([osm, states, canyon, countries, pop]);
    planet.setTerrainProvider(terrain);

    renderer.addRenderNode(planet);

    renderer.addControls([
        new og.control.MouseNavigation({ autoActivate: true }),
        new og.control.KeyboardNavigation({ autoActivate: true }),
        new og.control.LoadingSpinner({ autoActivate: true }),
        new og.control.LayerSwitcher({ autoActivate: true })
    ]);

    renderer.Start();
};
