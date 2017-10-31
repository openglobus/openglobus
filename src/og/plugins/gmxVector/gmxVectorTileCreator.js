goog.provide('og.gmx.VectorTileCreator');

goog.require('og.utils.VectorTileCreator');
goog.require('og.inheritance');

og.gmx.VectorTileCreator = function (planet, maxFrames, width, height) {
    og.inheritance.base(this, planet, maxFrames, width, height);

    planet.events.on("draw", this.frame, this);
};

og.inheritance.extend(og.gmx.VectorTileCreator, og.utils.VectorTileCreator);

og.gmx.VectorTileCreator.prototype.add = function (data) {
    this._queue.push(data);
};

og.gmx.VectorTileCreator.prototype.remove = function (material) {
    //...
};


og.gmx.VectorTileCreator.prototype.frame = function () {

    if (this._planet.layerLock.isFree() && this._queue.length) {
        var h = this._handler,
            gl = h.gl;

        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        var hLine = h.shaderPrograms.vectorTileLineRasterization,
            hPoly = h.shaderPrograms.vectorTilePolygonRasterization;

        var width, height;
        var pickingMask, texture;

        var prevLayerId = -1;

        var extentParams = new Array(4);

        var f = this._framebuffer.activate();

        var width2 = this._width * 2,
            height2 = this._height * 2;

        var deltaTime = 0,
            startTime = window.performance.now();

        while (this._planet.layerLock.isFree() && this._queue.length && deltaTime < 0.25) {

            var q = this._queue.shift();
            var tileData = q.tileData,
                material = q.material;
            var layer = material.layer;

            if (material.isLoading && material.segment.node.getState() === og.quadTree.RENDERING) {

                if (!tileData.isReady || tileData.renderingVersion !== layer._renderingVersion) {
                    //Prepare for rendering:
                    //Filter items and collect geometries buffers
                    var items = tileData.items;

                    for (var i = 0; i < items.length; i++) {
                        var gmxId = items[i][0];
                        var itemVisibility = layer.getItemVisibility(layer._itemCache[gmxId]);
                        //
                        //...
                        //
                    }

                    tileData.renderingVersion = layer._renderingVersion;                    
                    tileData.isReady = true;
                }

                if (material.segment.tileZoom <= 2) {
                    width = width2;
                    height = height2;
                } else {
                    width = this._width;
                    height = this._height;
                }

                texture = material._updateTexture && material._updateTexture || h.createEmptyTexture_l(width, height);

                f.setSize(width, height);

                f.bindOutputTexture(texture);

                gl.clearColor(1.0, 1.0, 1.0, 0.0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                var extent = material.segment.getExtentMerc();
                extentParams[0] = extent.southWest.lon;
                extentParams[1] = extent.southWest.lat;
                extentParams[2] = 2.0 / extent.getWidth();
                extentParams[3] = 2.0 / extent.getHeight();

                hPoly.activate();
                var sh = hPoly._program;
                var sha = sh.attributes,
                    shu = sh.uniforms;


                //=========================================
                //Strokes and linestrings rendering
                //=========================================
                f.bindOutputTexture(texture);

                hLine.activate();
                sh = hLine._program;
                sha = sh.attributes;
                shu = sh.uniforms;

                material.applyTexture(texture, pickingMask);

            } else {
                material.isLoading = false;
            }

            deltaTime = window.performance.now() - startTime;
            prevLayerId = material.layer._id;
        }

        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        f.deactivate();
    }

};