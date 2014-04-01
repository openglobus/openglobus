function start() {
    var osm = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", visibility: true });
    var states = new og.layer.WMS("USA States", { isBaseLayer: false, url: "http://www.openglobus.org/geoserver/", layers: "topp:states", opacity: 0.5 });
    var canyon = new og.layer.WMS("USA Canyon", { isBaseLayer: false, url: "http://www.openglobus.org/geoserver/", layers: "og:gchyp", opacity: 0.5 });
    var countries = new og.layer.WMS("Countries", { isBaseLayer: false, url: "http://www.openglobus.org/geoserver/", layers: "og:ne_10m_admin_0_countries", opacity: 0.5, visibility: true });
    var pop = new og.layer.WMS("Populated places", { isBaseLayer: false, url: "http://www.openglobus.org/geoserver/", layers: "og:ne_10m_populated_places", opacity: 0.5, visibility: true });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus", {
        url: og.terrainProvider.TerrainServers.OpenGlobus.url,
        maxZoom: og.terrainProvider.TerrainServers.OpenGlobus.maxZoom,
        minZoom: og.terrainProvider.TerrainServers.OpenGlobus.minZoom
    });

    var controls = [
        new og.control.MouseNavigation({ autoActivate: true }),
        new og.control.LayerSwitcher({ autoActivate: true }),
    ];

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "controls": controls,
        "terrain": terrain,
        "layers": [osm, states, canyon, countries, pop],
        "autoActivated": true
    });
};
