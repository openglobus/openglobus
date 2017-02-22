goog.provide('og.utils.VectorTileCreator');

goog.require('og.webgl.Framebuffer');
goog.require('og.PlanetSegmentHelper');
goog.require('og.shaderProgram.lineString');
goog.require('og.math');

og.utils.VectorTileCreator = function(handler, maxFrames, width, height) {

    this._width = width || 256;
    this._height = height || 256;
    this._handler = handler;
    this._framebuffer = null;
    this.MAX_FRAMES = maxFrames || 5;
    this._currentFrame = 0;
    this._queue = [];
    this._initialize();
};

og.utils.VectorTileCreator.prototype._initialize = function() {

    //Line
    this._handler.addShaderProgram(og.shaderProgram.lineString());

    //Polygon
    this._handler.addShaderProgram(new og.shaderProgram.ShaderProgram("vectorTileRasterization", {
        uniforms: {
            'extentParams': {
                type: og.shaderProgram.types.VEC4
            }
        },
        attributes: {
            'coordinates': {
                type: og.shaderProgram.types.VEC2
            },
            'colors': {
                type: og.shaderProgram.types.VEC4
            }
        },
        vertexShader: 'attribute vec2 coordinates; \
                      attribute vec4 colors; \
                      uniform vec4 extentParams; \
                      varying vec4 color;\
                      void main() { \
                          color = colors;\
                          gl_Position = vec4((-1.0 + (coordinates - extentParams.xy) * extentParams.zw) * vec2(1.0, -1.0), 0.0, 1.0); \
                      }',
        fragmentShader: 'precision highp float;\
                        varying vec4 color;\
                        void main () {  \
                            gl_FragColor = color; \
                        }'
    }));

    this._framebuffer = new og.webgl.Framebuffer(this._handler, {
        width: this._width,
        height: this._height,
        useDepth: false
    });

};

og.utils.VectorTileCreator.prototype.frame = function() {
    if (this._queue.length) {
        var h = this._handler,
            gl = h.gl;
        h.shaderPrograms.vectorTileRasterization.activate();
        var sh = h.shaderPrograms.vectorTileRasterization._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var f = this._framebuffer;
        f.activate();
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);

        var i = this.MAX_FRAMES;
        var prevLayerId = -1;
        while (i-- && this._queue.length) {
            var material = this._queue.shift();
            if (material.isLoading && material.segment.node.getState() === og.quadTree.RENDERING) {
                var geomHandler = material.layer._geometryHandler;
                var segmentIndexes = geomHandler.collect(material.segment);
                if (segmentIndexes) {
                    material.indexBuffer = h.createElementArrayBuffer(segmentIndexes, 1, segmentIndexes.length);

                    var texture;
                    if (material._updateTexture) {
                        texture = material._updateTexture;
                    } else {
                        texture = h.createEmptyTexture_l(this._width, this._height);
                    }
                    f.bindOutputTexture(texture);
                    gl.clearColor(1.0, 1.0, 1.0, 0.0);
                    gl.clear(gl.COLOR_BUFFER_BIT);

                    if (prevLayerId !== material.layer._id) {
                        prevLayerId = material.layer._id;
                        gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyVerticesBuffer);
                        gl.vertexAttribPointer(sha.coordinates._pName, geomHandler._polyVerticesBuffer.itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyColorsBuffer);
                        gl.vertexAttribPointer(sha.colors._pName, geomHandler._polyColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);
                    }

                    var extent = material.segment.getExtentLonLat();
                    gl.uniform4fv(shu.extentParams._pName, [extent.southWest.lon, extent.southWest.lat, 2.0 / extent.getWidth(), 2.0 / extent.getHeight()]);

                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, material.indexBuffer);
                    gl.drawElements(gl.TRIANGLES, material.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

                    material.applyTexture(texture);
                }
            } else {
                material.isLoading = false;
            }
        }

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        f.deactivate();
    }
};

og.utils.VectorTileCreator.prototype.add = function(material) {
    this._queue.push(material);
};

og.utils.VectorTileCreator.prototype.remove = function(material) {
    //...
};
