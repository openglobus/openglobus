goog.provide('og.gmx.CheckVersion');

goog.require('og.ajax');

og.gmx.CheckVersion = function (planet) {

    this._layerVersions = {};

    this.hostUrl = "//maps.kosmosnimki.ru/";

    this._layers = [];

    this._r = null;

    this._addLayer = function (layer) {
        this._layers.push(layer);
    };

    this._removeLayer = function (layer) {
        var i = this._layers.length;
        while (i--) {
            if (layer.isEqual(this._layers[i])) {
                this._layers.splice(i, 1);
                return;
            }
        }
    };

    planet.events.on("layeradd", function (l) {
        if (l instanceof og.gmx.VectorLayer) {
            if (l._visibility) {
                this._addLayer(l);
            }
        }
    }, this);

    planet.events.on("layerremove", function (l) {
        if (l instanceof og.gmx.VectorLayer) {
            this._removeLayer(l);
        }
    }, this);

    planet.events.on("layervisibilitychange", function (l) {
        if (l instanceof og.gmx.VectorLayer) {
            if (l._visibility) {
                this._addLayer(l);
            } else {
                this._removeLayer(l);
            }
            this._request();
        }
    }, this);

    planet.camera.events.on("moveend", function () {
        this._request();
    }, this);

    this._checkVersionSuccess = function (data, layersOrder) {
        var res = data.Result;
        for (var i = 0; i < layersOrder.length; i++) {
            layersOrder[i]._checkVersionSuccess(res[i]);
        }
    };

    this._request = function () {
        if (this._layers.length) {

            this._r && this._r.abort();

            var e = planet._viewExtentMerc,
                zoom = planet.maxCurrZoom;

            var bbox = [e.southWest.lon, e.southWest.lat, e.northEast.lon, e.northEast.lat];

            var layers = [],
                _layersOrder = [];
            for (var i = 0; i < this._layers.length; i++) {
                var li = this._layers[i];
                if (li._extentMerc.overlaps(e) && li._gmxProperties) {
                    _layersOrder.push(li);
                    var p = { "Name": li._layerId, "Version": this._layerVersions[li._layerId] || -1 };
                    if (li._gmxProperties.Temporal) {
                        p.dateBegin = parseInt(li._beginDate.getTime() / 1000);
                        p.dateEnd = parseInt(li._endDate.getTime() / 1000);
                    }
                    layers.push(p);
                }
            }

            if (layers.length) {
                var that = this;
                this._r = og.ajax.request(this.hostUrl + "Layer/CheckVersion.ashx", {
                    'type': "POST",
                    'responseType': "json",
                    'data': {
                        'WrapStyle': "None",
                        'bbox': bbox,
                        'srs': "3857",
                        'layers': layers,
                        'zoom': zoom,
                        'ftc': "osm"
                    },
                    'success': function (data) {
                        that._r = null;
                        that._checkVersionSuccess(data, _layersOrder);
                    },
                    'error': function (err) {
                        that._r = null;
                        console.log(err);
                    }
                });
            }
        }
    };

    this.getLayers = function () {
        return this._layers;
    };

    this.update = function () {
        this._request();
    };
};