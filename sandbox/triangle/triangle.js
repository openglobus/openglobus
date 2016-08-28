goog.provide('my.Triangle');

goog.require('og.scene.RenderNode');
goog.require('og.webgl.Framebuffer');
goog.require('og.LonLat');
goog.require('og.Extent');
goog.require('og.math');
goog.require('og.PlanetSegmentHelper');

my.Triangle = function () {
    og.inheritance.base(this);
};

og.inheritance.extend(my.Triangle, og.scene.RenderNode);

my.Triangle.prototype.initialization = function () {


    this.renderer.handler.addShaderProgram(new og.shaderProgram.ShaderProgram("geoImage", {
        uniforms: {
            u_sourceImage: { type: og.shaderProgram.types.SAMPLER2D },
            u_extentParams: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            a_corner: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: 'attribute vec2 a_corner; \
                      attribute vec2 a_texCoord; \
                      varying vec2 v_texCoords; \
                      uniform vec4 u_extentParams; \
                      void main() { \
                          v_texCoords = a_texCoord; \
                          gl_Position = vec4(-1.0 + (a_corner - u_extentParams.xy) * u_extentParams.zw, 0, 1); \
                      }',
        fragmentShader: 'precision highp float; \
                        uniform sampler2D u_sourceImage; \
                        varying vec2 v_texCoords; \
                        void main () {  \
                            gl_FragColor = texture2D(u_sourceImage, v_texCoords); \
                        }'
    }));


    this.renderer.handler.addShaderProgram(new og.shaderProgram.ShaderProgram("geoImageMercProj", {
        uniforms: {
            u_sampler: { type: og.shaderProgram.types.SAMPLER2D },
            u_extent: { type: og.shaderProgram.types.VEC4 },
            u_mercExtent: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            a_vertex: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: 'attribute vec2 a_vertex; \
                            attribute vec2 a_texCoord; \
                            varying vec2 v_texCoords; \
                            void main() { \
                                v_texCoords = a_texCoord; \
                                gl_Position = vec4(a_vertex, 0, 1); \
                            }',
        fragmentShader: 'precision highp float; \n\
                        uniform sampler2D u_sampler; \n\
                        uniform vec4 u_extent; \n\
                        uniform vec4 u_mercExtent; \n\
                        varying vec2 v_texCoords; \n\
                        const float POLE=20037508.34; \n\
                        const float PI=3.141592653589793; \n\
                        const float RAD2DEG = 180.0 / PI;\n\
                        const float PI_BY_2 = PI / 2.0;\n\
                        \n\
                        vec2 inverse(vec2 lonLat){\n\
                            return vec2(180.0 * lonLat.x / POLE, RAD2DEG * (2.0 * atan(exp(PI * lonLat.y / POLE)) - PI_BY_2));\n\
                        }\n\
                        \n\
                        void main () {\n\
                            vec2 d = (inverse(u_mercExtent.xy + u_mercExtent.zw * vec2(v_texCoords.x, 1.0 - v_texCoords.y)) - u_extent.xy) * u_extent.zw;\n\
                            gl_FragColor = texture2D(u_sampler, d);\n\
            }'
    }));

    this.renderer.handler.addShaderProgram(new og.shaderProgram.ShaderProgram("triangle", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            texture: { type: og.shaderProgram.types.SAMPLER2D }
        },
        attributes: {
            position: { type: og.shaderProgram.types.VEC3, enableArray: true },
            textureCoordinates: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            'attribute vec3 position;\
            attribute vec2 textureCoordinates;\
            \
            uniform mat4 projectionViewMatrix;\
            \
            varying vec2 tc;\
            void main(void) {\
                gl_Position = projectionViewMatrix * vec4(position, 1.0);\
                tc = textureCoordinates;\
            }',
        fragmentShader:
            'precision lowp float;\
            uniform sampler2D texture;\
            \
            varying vec2 tc;\
            \
            void main(void) {\
                gl_FragColor = texture2D( texture, tc );\
            }'
    }));



    //Initialization indexes table
    og.PlanetSegmentHelper.initIndexesTables(6);

    this._indexesBuffers = [];

    //Iniytialize indexes buffers cache
    for (var i = 0; i <= 6; i++) {
        var c = Math.pow(2, i);
        !this._indexesBuffers[c] && (this._indexesBuffers[c] = []);
        for (var j = 0; j <= 6; j++) {
            var w = Math.pow(2, j);
            !this._indexesBuffers[c][w] && (this._indexesBuffers[c][w] = []);
            for (var k = 0; k <= 6; k++) {
                var n = Math.pow(2, k);
                !this._indexesBuffers[c][w][n] && (this._indexesBuffers[c][w][n] = []);
                for (var m = 0; m <= 6; m++) {
                    var e = Math.pow(2, m);
                    !this._indexesBuffers[c][w][n][e] && (this._indexesBuffers[c][w][n][e] = []);
                    for (var q = 0; q <= 6; q++) {
                        var s = Math.pow(2, q);
                        !this._indexesBuffers[c][w][n][e][s] && (this._indexesBuffers[c][w][n][e][s] = []);
                        var indexes = og.PlanetSegmentHelper.createSegmentIndexes(c, [w, n, e, s]);
                        this._indexesBuffers[c][w][n][e][s] = this.renderer.handler.createElementArrayBuffer(indexes, 1, indexes.length);
                    }
                }
            }
        }
    }






    this._positionData1 = [0, 0, 0,
                          0, 1000, 0,
                          1000, 1000, 0,
                          1000, 0, 0];

    this._positionData2 = [0 + 2000, 0, 0,
                      0 + 2000, 1000, 0,
                      1000 + 2000, 1000, 0,
                      1000 + 2000, 0, 0];

    this._indexData = [0, 3, 1, 1, 3, 2];

    this._textureCoordData = [
        0, 0,
        0, 1,
        1, 1,
        1, 0];

    var h = this.renderer.handler;
    this._positionBuffer1 = h.createArrayBuffer(new Float32Array(this._positionData1), 3, this._positionData1.length / 3);
    this._positionBuffer2 = h.createArrayBuffer(new Float32Array(this._positionData2), 3, this._positionData2.length / 3);

    this._indexBuffer = h.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
    this._textureCoordBuffer = h.createArrayBuffer(new Float32Array(this._textureCoordData), 2, this._textureCoordData.length / 2);

    this.fb = new og.webgl.Framebuffer(this.renderer.handler, 2048, 2048, { useDepth: false });

    this._gridSize = 32;
    this._texCoordsBuffer = h.createArrayBuffer(og.PlanetSegmentHelper.textureCoordsTable[this._gridSize], 2, (this._gridSize + 1) * (this._gridSize + 1));;
    this._indexBufferImage = this._indexesBuffers[this._gridSize][this._gridSize][this._gridSize][this._gridSize][this._gridSize];

    this._vertexBuffer = h.createArrayBuffer(new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), 2, 4);

    this.setCorners([og.lonLat(0, 0), og.lonLat(0, 5), og.lonLat(5, 5), og.lonLat(3, 3)]);

    var that = this;
    this.renderer.handler.createDefaultTexture({ color: "#FF0000" }, function (t) {
        that._wgs84SourceTexture = t;
    });
    this.renderer.handler.createDefaultTexture({ url: "chess.jpg" }, function (t) {
        that.texture = t;
        that.ready2 = false;
    });

    this.t1 = this.renderer.handler.createEmptyTexture_n(256, 256);
    this.t2 = this.renderer.handler.createEmptyTexture_n(1024, 1024);
};

my.Triangle.prototype.frame = function () {

    if (!this.ready1) {
        this.fb.setSize(256, 256);
        this.fb.activate();
        this.fb.bindTexture(this.t1);
        this.createMercatorSamplerPASS(this._wgs84SourceTexture);
        this.ready1 = true;
        this.fb.deactivate();
    }

    this.renderer.handler.shaderPrograms.triangle.activate();

    var sh = this.renderer.handler.shaderPrograms.triangle,
        p = sh._program,
        sha = p.attributes,
        shu = p.uniforms,
        gl = this.renderer.handler.gl;

    sh.activate();

    gl.uniformMatrix4fv(shu.projectionViewMatrix._pName, false, this.renderer.activeCamera._projectionViewMatrix._m);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer1);
    gl.vertexAttribPointer(sha.position._pName, this._positionBuffer1.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.t1);
    gl.uniform1i(shu.texture._pName, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._textureCoordBuffer);
    gl.vertexAttribPointer(sha.textureCoordinates._pName, this._textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.drawElements(gl.TRIANGLES, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);


    ///////////////////////////////////////

    if (!this.ready2) {
        this.fb.setSize(1024, 1024);
        this.fb.activate();
        this.fb.bindTexture(this.t2);
        this.createMercatorSamplerPASS(this.texture);
        this.ready2 = true;
        this.fb.deactivate();
    }

    this.renderer.handler.shaderPrograms.triangle.activate();

    var sh = this.renderer.handler.shaderPrograms.triangle,
        p = sh._program,
        sha = p.attributes,
        shu = p.uniforms,
        gl = this.renderer.handler.gl;

    sh.activate();

    gl.uniformMatrix4fv(shu.projectionViewMatrix._pName, false, this.renderer.activeCamera._projectionViewMatrix._m);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer2);
    gl.vertexAttribPointer(sha.position._pName, this._positionBuffer2.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.t2);
    gl.uniform1i(shu.texture._pName, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._textureCoordBuffer);
    gl.vertexAttribPointer(sha.textureCoordinates._pName, this._textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.drawElements(gl.TRIANGLES, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
};

//og.GeoImage.prototype.calculateCurvature = function () {
//    var ex = this._wgs84MercExtent,
//        el = this.planet.ellipsoid;
//    var c = el.lonLatToCartesian(ex.northEast).normalize();
//    var p = el.lonLatToCartesian(ex.southWest).normalize();
//    return Math.acos(c.dot(p)) / Math.PI;
//};

my.Triangle.prototype.setCorners = function (corners) {

    var h = this.renderer.handler;

    this._wgs84Extent = new og.Extent();
    this._wgs84Corners = corners;
    this._wgs84Extent.setByCoordinates(this._wgs84Corners);
    this._wgs84MercExtent = this._wgs84Extent.clone();
    if (this._wgs84MercExtent.southWest.lat < og.mercator.MIN_LAT) {
        this._wgs84MercExtent.southWest.lat = og.mercator.MIN_LAT;
    }
    if (this._wgs84MercExtent.northEast.lat > og.mercator.MAX_LAT) {
        this._wgs84MercExtent.northEast.lat = og.mercator.MAX_LAT;
    }

    var c = this._wgs84Corners;
    var v03 = og.lonLat((c[3].lon - c[0].lon) / this._gridSize, (c[3].lat - c[0].lat) / this._gridSize);
    var v12 = og.lonLat((c[2].lon - c[1].lon)/this._gridSize, (c[2].lat - c[1].lat)/this._gridSize);
    var v01 = og.lonLat((c[1].lon - c[0].lon) / this._gridSize, (c[1].lat - c[0].lat) / this._gridSize);
    var v32 = og.lonLat((c[2].lon - c[3].lon)/this._gridSize, (c[2].lat - c[3].lat)/this._gridSize);

    var grid = [];
    for (var i = 0; i <= this._gridSize; i++) {
        var P03i = og.lonLat(c[0].lon + i * v03.lon, c[0].lat + i * v03.lat),
            P12i = og.lonLat(c[1].lon + i * v12.lon, c[1].lat + i * v12.lat);
        for (var j = 0; j <= this._gridSize; j++) {
            var P01j = og.lonLat(c[0].lon + j * v01.lon, c[0].lat + j * v01.lat),
                P32j = og.lonLat(c[3].lon + j * v32.lon, c[3].lat + j * v32.lat);
            var xx = og.utils.getLinesIntersectionLonLat(P03i, P12i, P01j, P32j);
            grid.push(xx.lon,xx.lat);
        }
    }

    this._wgs84CornersBuffer = h.createArrayBuffer(new Float32Array(grid), 2, grid.length / 2);

    this._mercExtent = this._wgs84MercExtent.forwardMercator();
    this._mercExtentCorners = [this._mercExtent.getNorthWest(), this._mercExtent.getNorthEast(), this._mercExtent.getSouthEast(), this._mercExtent.getSouthWest()];

    this._mercExtentCornersBuffer = h.createArrayBuffer(new Float32Array([this._mercExtentCorners[3].lon, this._mercExtentCorners[3].lat, this._mercExtentCorners[2].lon, this._mercExtentCorners[2].lat,
        this._mercExtentCorners[0].lon, this._mercExtentCorners[0].lat, this._mercExtentCorners[1].lon, this._mercExtentCorners[1].lat]), 2, 4);

    this._mercCornersBuffer = h.createArrayBuffer(new Float32Array(
        [og.mercator.forward_lon(this._wgs84Corners[3].lon), og.mercator.forward_lat(this._wgs84Corners[3].lat),
            og.mercator.forward_lon(this._wgs84Corners[2].lon), og.mercator.forward_lat(this._wgs84Corners[2].lat),
        og.mercator.forward_lon(this._wgs84Corners[0].lon), og.mercator.forward_lat(this._wgs84Corners[0].lat),
        og.mercator.forward_lon(this._wgs84Corners[1].lon), og.mercator.forward_lat(this._wgs84Corners[1].lat)]), 2, 4);

};

my.Triangle.prototype.createMercatorSamplerPASS = function (texture) {

    var h = this.renderer.handler;

    h.shaderPrograms.geoImage.activate();
    var sh = h.shaderPrograms.geoImage._program;
    var sha = sh.attributes,
        shu = sh.uniforms;
    var gl = h.gl;

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._wgs84CornersBuffer);
    gl.vertexAttribPointer(sha.a_corner._pName, this._wgs84CornersBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(shu.u_extentParams._pName, [this._wgs84MercExtent.southWest.lon, this._wgs84MercExtent.southWest.lat,
        2.0 / this._wgs84MercExtent.getWidth(), 2.0 / this._wgs84MercExtent.getHeight()]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(shu.u_sourceImage._pName, 0);

    sh.drawIndexBuffer(gl.TRIANGLE_STRIP, this._indexBufferImage);

    //h.shaderPrograms.geoImageMercProj.activate();
    //sh = h.shaderPrograms.geoImageMercProj._program;
    //sha = sh.attributes;
    //shu = sh.uniforms;
    //gl.clearColor(0.0, 0.0, 0.0, 0.0);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
    //gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
    //gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    //gl.vertexAttribPointer(sha.a_vertex._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    //gl.activeTexture(gl.TEXTURE0);
    //gl.bindTexture(gl.TEXTURE_2D, this._framebufferPASS_ONE.texture);
    //gl.uniform1i(shu.u_sampler._pName, 0);

    //gl.uniform4fv(shu.u_extent._pName,
    //    [this._wgs84MercExtent.southWest.lon, this._wgs84MercExtent.southWest.lat,
    //    1.0 / this._wgs84MercExtent.getWidth(), 1.0 / this._wgs84MercExtent.getHeight()]);

    //gl.uniform4fv(shu.u_mercExtent._pName,
    //    [this._mercExtent.southWest.lon, this._mercExtent.southWest.lat,
    //    this._mercExtent.getWidth(), this._mercExtent.getHeight()]);

    //gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};