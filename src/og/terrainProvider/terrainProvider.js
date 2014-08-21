goog.provide('og.terrainProvider.TerrainProvider');

goog.require('og.layer');
goog.require('og.quadTree');
goog.require('og.Ajax');
goog.require('og.Events');
goog.require('og.proj.EPSG3857');

og.terrainProvider.defaultOptions = {
    url: "http://earth3.openglobus.org/{zoom}/{tiley}/{tilex}.ddm",
    responseType: "arraybuffer",
    minZoom: 3,
    maxZoom: 14,
    gridSizeByZoom: [64, 32, 32, 32, 16, 8, 8, 8, 16, 16, 16, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32],
    fileGridSize: 32,
    MAX_LOADING_TILES: 10
};

og.terrainProvider.TerrainProvider = function (name, options) {
    this.name = name || "";
    options = options || {};
    this.minZoom = options.minZoom || og.terrainProvider.defaultOptions.minZoom;
    this.maxZoom = options.maxZoom || og.terrainProvider.defaultOptions.maxZoom;
    this.url = options.url || og.terrainProvider.defaultOptions.url;
    this.gridSizeByZoom = options.gridSizeByZoom || og.terrainProvider.defaultOptions.gridSizeByZoom;
    this.fileGridSize = options.fileGridSize || og.terrainProvider.defaultOptions.fileGridSize;
    this.responseType = options.responseType || og.terrainProvider.defaultOptions.responseType;
    this.MAX_LOADING_TILES = options.MAX_LOADING_TILES || og.terrainProvider.defaultOptions.MAX_LOADING_TILES;

    this.events = new og.Events();
    this.events.registerNames(["onload", "onloadend"]);

    this._counter = 0;
    this._pendingsQueue = [];
};

og.terrainProvider.TerrainProvider.prototype.abort = function () {
    this._pendingsQueue.length = 0;
};

og.terrainProvider.TerrainProvider.prototype.setUrl = function (url) {
    this.url = url;
};

og.terrainProvider.TerrainProvider.prototype.setName = function (name) {
    this.name = name;
};

og.terrainProvider.TerrainProvider.prototype.handleSegmentTerrain = function (segment) {
    if (segment._projection.id == og.proj.EPSG3857.id) {
        if (this._counter >= this.MAX_LOADING_TILES) {
            this._pendingsQueue.push(segment);
        } else {
            this.loadSegmentTerrainData(segment);
        }
    } else {
        //TODO: poles elevation
    }
};

og.terrainProvider.TerrainProvider.prototype.getServerUrl = function (segment) {
    return og.layer.replaceTemplate(this.url, {
        "tilex": segment.tileX.toString(),
        "tiley": segment.tileY.toString(),
        "zoom": segment.zoomIndex.toString()
    });
};

og.terrainProvider.TerrainProvider.prototype.getElevations = function (data) {
    return new Float32Array(data);
};

og.terrainProvider.TerrainProvider.prototype.loadSegmentTerrainData = function (segment) {
    this._counter++;
    og.Ajax.request(this.getServerUrl(segment), {
        responseType: this.responseType,
        sender: this,
        success: function (data) {
            this._applyElevationsData(segment, data);
        },
        error: function () {
            this._applyElevationsData(segment, []);
        }
    });
};

og.terrainProvider.TerrainProvider.prototype._applyElevationsData = function (segment, data) {
    if (segment) {
        var elevations = this.getElevations(data);
        var e = this.events.onload;
        if (e.length) {
            this.events.dispatch(e, {
                "elevations": [],
                "segment": segment
            });
        }
        segment.applyTerrain.call(segment, elevations);
    }
    this.dequeueRequest();
};

og.terrainProvider.TerrainProvider.prototype.dequeueRequest = function () {
    this._counter--;
    if (this._pendingsQueue.length) {
        if (this._counter < this.MAX_LOADING_TILES) {
            var pseg;
            if (pseg = this.whilePendings())
                this.loadSegmentTerrainData.call(this, pseg);
        }
    } else {
        this.events.dispatch(this.events.onloadend);
    }
};

og.terrainProvider.TerrainProvider.prototype.whilePendings = function () {
    while (this._pendingsQueue.length) {
        var pseg = this._pendingsQueue.pop();
        if (pseg) {
            if (pseg.node.getState() != og.quadTree.NOTRENDERING) {
                return pseg;
            } else {
                pseg.terrainIsLoading = false;
            }
        }
    }
    return null;
};