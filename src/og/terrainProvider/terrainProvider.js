goog.provide('og.terrainProvider');
goog.provide('og.terrainProvider.TerrainProvider');

goog.require('og.layer');
goog.require('og.quadTree');
goog.require('og.Ajax');

og.terrainProvider.TerrainProvider = function (name, options) {
    this.name = name ? name : "noname";

    if (options) {
        this.minZoom = options.minZoom ? options.minZoom : -1;
        this.maxZoom = options.maxZoom ? options.maxZoom : -1;
        this.url = options.url ? options.url : "";
        this.enabled = options.visibility ? options.visibility : true;
        this.gridSizeByZoom = options.gridSizeByZoom ? options.gridSizeByZoom : og.terrainProvider.TerrainProvider.defaultGridSizeByZoom;
        this.fileGridSize = options.fileGridSize ? options.fileGridSize : og.terrainProvider.TerrainProvider.defaultFileGridSize;
    }

    og.terrainProvider.TerrainProvider.layersCounter++;
    this.id = og.terrainProvider.TerrainProvider.layersCounter;

    this.counter = 0;
    this.pendingsQueue = [];
    this.MAX_LOADING_TILES = 10;
};

og.terrainProvider.TerrainServers = {
    //"OpenGlobus": { url: "http://127.0.0.1/earth3/{zoom}/{tiley}/{tilex}.ddm", dataType: og.terrainProvider.BINARY, minZoom: 2, maxZoom: 14 }
    "OpenGlobus": { url: "http://earth3.openglobus.org/{zoom}/{tiley}/{tilex}.ddm", dataType: og.terrainProvider.BINARY, minZoom: 2, maxZoom: 14 }
};

og.terrainProvider.TerrainProvider.defaultGridSizeByZoom = [32, 32, 32, 32, 8, 8, 8, 8, 16, 16, 16, 32, 32, 32, 32, 16, 8, 4, 2, 2];
og.terrainProvider.TerrainProvider.defaultFileGridSize = 33;
og.terrainProvider.TerrainProvider.layersCounter = 0;

og.terrainProvider.TerrainProvider.prototype.abort = function () {
    this.pendingsQueue.length = 0;
};

og.terrainProvider.TerrainProvider.prototype.setUrl = function (url) {
    this.url = url;
};

og.terrainProvider.TerrainProvider.prototype.setName = function (name) {
    this.name = name;
};

og.terrainProvider.TerrainProvider.prototype.handleSegmentTerrain = function (segment) {
    if (this.counter >= this.MAX_LOADING_TILES) {
        this.pendingsQueue.push(segment);
    } else {
        this.loadSegmentTerrainData(segment);
    }
};

og.terrainProvider.TerrainProvider.prototype.loadSegmentTerrainData = function (segment) {
    this.counter++;
    var img = new Image();
    og.Ajax.request(
        og.layer.replaceTemplate(this.url, { "tilex": segment.tileX.toString(), "tiley": segment.tileY.toString(), "zoom": segment.zoomIndex.toString() }),
        {
            responseType: "arraybuffer",
            sender: this,
            success: function (elevations) {
                segment.applyTerrain.call(segment, new Float32Array(elevations));
                this.dequeueRequest();
            },
            error: function () {
                if (segment) {
                    segment.terrainNotExists.call(segment);
                }
                this.dequeueRequest();
            }
        });
};

og.terrainProvider.TerrainProvider.prototype.dequeueRequest = function () {
    this.counter--;
    if (this.pendingsQueue.length) {
        if (this.counter < this.MAX_LOADING_TILES) {
            var pseg;
            if (pseg = this.whilePendings())
                this.loadSegmentTerrainData.call(this, pseg);
        }
    }
};

og.terrainProvider.TerrainProvider.prototype.whilePendings = function () {
    while (this.pendingsQueue.length) {
        var pseg = this.pendingsQueue.pop();
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