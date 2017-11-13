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

        var f = this._framebuffer.activate();

        var width2 = this._width * 2,
            height2 = this._height * 2;

        var deltaTime = 0,
            startTime = window.performance.now();

        while (this._planet.layerLock.isFree() && this._queue.length && deltaTime < 0.25) {

            var q = this._queue.shift();
            var tileData = q.tileData,
                material = q.material;

            if (material.isLoading && material.segment.node.getState() === og.quadTree.RENDERING) {

                if (material.segment.tileZoom <= 2) {
                    width = width2;
                    height = height2;
                } else {
                    width = this._width;
                    height = this._height;
                }

                var layer = material.layer;

                var extent = material.segment.getExtentMerc();
                var extentParams = [extent.southWest.lon, extent.southWest.lat, 2.0 / extent.getWidth(), 2.0 / extent.getHeight()];

                var texture = material._updateTexture && material._updateTexture || h.createEmptyTexture_l(width, height);

                var pickingMask;
                if (material._updatePickingMask) {
                    pickingMask = material._updatePickingMask;
                } else {
                    pickingMask = h.createEmptyTexture_n(width, height);
                }

                f.setSize(width, height);

                f.bindOutputTexture(texture);
                gl.clearColor(1.0, 1.0, 1.0, 0.0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                f.bindOutputTexture(pickingMask);
                gl.clearColor(0.0, 0.0, 0.0, 0.0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                //draw vectors
                var items = tileData.items,
                    itemCache = layer._itemCache;

                items.sort(function (a, b) {
                    return layer.getItemStyle(a).zIndex - layer.getItemStyle(b).zIndex || a.id - b.id;
                });

                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (layer.getItemVisibility(itemCache[item.id])) {

                        //create buffers if needed
                        item.update(h);

                        hPoly.activate();
                        var sh = hPoly._program;
                        var sha = sh.attributes,
                            shu = sh.uniforms;

                        //polygon
                        f.bindOutputTexture(texture);

                        gl.uniform4fv(shu.extentParams._pName, extentParams);

                        gl.bindBuffer(gl.ARRAY_BUFFER, item._polyVerticesBufferMerc);
                        gl.vertexAttribPointer(sha.coordinates._pName, item._polyVerticesBufferMerc.itemSize, gl.FLOAT, false, 0, 0);

                        gl.bindBuffer(gl.ARRAY_BUFFER, item._polyColorsBuffer);
                        gl.vertexAttribPointer(sha.colors._pName, item._polyColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, item._polyIndexesBuffer);

                        gl.drawElements(gl.TRIANGLES, item._polyIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                        //polygon picking
                        f.bindOutputTexture(pickingMask);

                        gl.bindBuffer(gl.ARRAY_BUFFER, item._polyPickingColorsBuffer);
                        gl.vertexAttribPointer(sha.colors._pName, item._polyPickingColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                        gl.drawElements(gl.TRIANGLES, item._polyIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                        hLine.activate();
                        sh = hLine._program;
                        sha = sh.attributes;
                        shu = sh.uniforms;

                        f.bindOutputTexture(texture);

                        gl.uniform2fv(shu.viewport._pName, [width, height]);

                        gl.uniform4fv(shu.extentParams._pName, extentParams);

                        //vertex
                        var mb = item._lineVerticesBufferMerc;
                        gl.bindBuffer(gl.ARRAY_BUFFER, mb);
                        gl.vertexAttribPointer(sha.prev._pName, mb.itemSize, gl.FLOAT, false, 8, 0);
                        gl.vertexAttribPointer(sha.current._pName, mb.itemSize, gl.FLOAT, false, 8, 32);
                        gl.vertexAttribPointer(sha.next._pName, mb.itemSize, gl.FLOAT, false, 8, 64);

                        //order
                        gl.bindBuffer(gl.ARRAY_BUFFER, item._lineOrdersBuffer);
                        gl.vertexAttribPointer(sha.order._pName, item._lineOrdersBuffer.itemSize, gl.FLOAT, false, 4, 0);

                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, item._lineIndexesBuffer);

                        //PASS - stroke
                        gl.bindBuffer(gl.ARRAY_BUFFER, item._lineStrokesBuffer);
                        gl.vertexAttribPointer(sha.thickness._pName, item._lineStrokesBuffer.itemSize, gl.FLOAT, false, 0, 0);

                        gl.bindBuffer(gl.ARRAY_BUFFER, item._lineStrokeColorsBuffer);
                        gl.vertexAttribPointer(sha.color._pName, item._lineStrokeColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                        //Antialias pass
                        gl.uniform1f(shu.thicknessOutline._pName, 2);
                        gl.uniform1f(shu.alpha._pName, 0.54);
                        gl.drawElements(gl.TRIANGLE_STRIP, item._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                        //
                        //Aliased pass
                        gl.uniform1f(shu.thicknessOutline._pName, 1);
                        gl.uniform1f(shu.alpha._pName, 1.0);
                        gl.drawElements(gl.TRIANGLE_STRIP, item._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                        //PASS - inside line
                        gl.bindBuffer(gl.ARRAY_BUFFER, item._lineThicknessBuffer);
                        gl.vertexAttribPointer(sha.thickness._pName, item._lineThicknessBuffer.itemSize, gl.FLOAT, false, 0, 0);

                        gl.bindBuffer(gl.ARRAY_BUFFER, item._lineColorsBuffer);
                        gl.vertexAttribPointer(sha.color._pName, item._lineColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                        //Antialias pass
                        gl.uniform1f(shu.thicknessOutline._pName, 2);
                        gl.uniform1f(shu.alpha._pName, 0.54);
                        gl.drawElements(gl.TRIANGLE_STRIP, item._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                        //
                        //Aliased pass
                        gl.uniform1f(shu.thicknessOutline._pName, 1);
                        gl.uniform1f(shu.alpha._pName, 1.0);
                        gl.drawElements(gl.TRIANGLE_STRIP, item._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);


                        f.bindOutputTexture(pickingMask);

                        gl.uniform1f(shu.thicknessOutline._pName, 8);

                        gl.bindBuffer(gl.ARRAY_BUFFER, item._linePickingColorsBuffer);
                        gl.vertexAttribPointer(sha.color._pName, item._linePickingColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);
                        gl.drawElements(gl.TRIANGLE_STRIP, item._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                    }
                }

                material.applyTexture(texture, pickingMask);

            } else {
                material.isLoading = false;
            }
        }

        deltaTime = window.performance.now() - startTime;
    }

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    f.deactivate();
};