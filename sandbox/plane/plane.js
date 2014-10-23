goog.provide('my.Plane');

goog.require('og.node.RenderNode');
goog.require('og.inheritance');
goog.require('og.planetSegment.PlanetSegmentHelper');
goog.require('og.light.PointLight');
goog.require('og.webgl.Framebuffer');

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
Heatmap = function () {
    og.inheritance.base(this);

    this._verticesBuffer;

    this.position = [0, 0, 0.3, 0.7];
    this.resolution = [256, 256];
    this.points = [0.6, 0.6, 0.3, 0.7, 0.8, 0.3, 0.2, 0.3, 0.3, 0.1, 0.2, 0.4];

    this.backbuffer;
};

og.inheritance.extend(Heatmap, og.node.RenderNode);

Heatmap.prototype.initialization = function () {
    this.drawMode = this.renderer.handler.gl.TRIANGLES;

    var vertices = [
      -1.0, -1.0,
       1.0, -1.0,
      -1.0, 1.0,
      -1.0, 1.0,
       1.0, -1.0,
       1.0, 1.0];

    this._verticesBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 2, vertices.length / 2);

    //backbuffer initialization
    this.backbuffer = new og.webgl.Framebuffer(this.renderer.handler.gl);
    this.backbuffer.initialize();
};

Heatmap.prototype.frame = function () {

    this.backbuffer.activate();
    this.backbuffer.clear();

    this.renderer.handler.shaderPrograms.heatmap.activate();

    this.renderer.handler.shaderPrograms.heatmap.set({
        a_position: this._verticesBuffer,
        resolution: this.resolution,
        pointsLength: this.points.length / 4 + 1,
        points: this.position.concat(this.points)
    });

    this.renderer.handler.shaderPrograms.heatmap.drawArray(this.drawMode, this._verticesBuffer.numItems);

    this.backbuffer.deactivate();
};


////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
my.Plane = function (name) {
    og.inheritance.base(this, name);
    this.vertexPositionBuffer = null;
    this.indexBuffer = null;
    this.size = 100;

    this.light = null;

    this.texture = null;
};

og.inheritance.extend(my.Plane, og.node.RenderNode);

my.Plane.prototype.initialization = function () {
    this.createBuffers();
    this.drawMode = this.renderer.handler.gl.TRIANGLES;
    this.light = new og.light.PointLight();

    this.light.setAmbient(new og.math.Vector3(0.14, 0.1, 0.2));
    this.light.setDiffuse(new og.math.Vector3(0.9, 0.9, 0.8));
    this.light.setSpecular(new og.math.Vector3(0.01, 0.01, 0.009));
    this.light.setShininess(8);
    this.light.addTo(this);
    this.light._position = new og.math.Vector3(5, 5, 5);

    this.lightEnabled = true;

    this.renderer.events.on("oncharkeypressed", this, this.toogleWireframe, og.input.KEY_X);
    this.renderer.events.on("oncharkeypressed", this, this.toogleLightPosition, og.input.KEY_C);

    var img = new Image();
    img.crossOrigin = '';
    var that = this;
    img.onload = function () {
        that.texture = that.renderer.handler.createTextureFromImage(this);
    };
    img.src = "diffuse.png";


    //
    //Hiddent context experiment
    //
    var heatmap = new og.shaderProgram.ShaderProgram("heatmap", {
        uniforms: {
            resolution: { type: og.shaderProgram.types.VEC2 },
            type: { type: og.shaderProgram.types.FLOAT },
            points: { type: og.shaderProgram.types.VEC4 },
            pointsLength: { type: og.shaderProgram.types.INT }
        },
        attributes: {
            a_position: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("vs.txt"),
        fragmentShader: og.utils.readTextFile("fs.txt")
    });

    this._hiddenHandler = new og.webgl.Handler();
    this._hiddenHandler.addShaderProgram(heatmap);
    this._hiddenHandler.init();

    this._hiddenRenderer = new og.Renderer(this._hiddenHandler);
    this._hiddenRenderer.init();

    this._hiddenNode = new Heatmap();
    this._hiddenRenderer.addRenderNode(this._hiddenNode);
};

my.Plane.prototype.toogleWireframe = function (e) {
    if (this.drawMode === this.renderer.handler.gl.LINE_STRIP) {
        this.drawMode = this.renderer.handler.gl.TRIANGLES;
    } else {
        this.drawMode = this.renderer.handler.gl.LINE_STRIP;
    }
};

my.Plane.prototype.toogleLightPosition = function () {
    this.light._position = this.renderer.activeCamera.eye.clone();
};

my.Plane.prototype.createBuffers = function () {
    og.planetSegment.PlanetSegmentHelper.initIndexesTables(6);


    vertices = [];

    var step = 1;
    var size = 32;

    for (var i = 0; i <= size; i++) {
        for (var j = 0; j <= size; j++) {
            var x = j * step,
                y = (size) * step - i * step,
                z = Math.sin(1000 * x) * Math.cos(1000 * y) * 100;

            vertices.push(x * this.size * 2, y * this.size * 2, z);
        }
    }

    var gs = size + 1;
    normals = new Float64Array(gs * gs * 3);

    //og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(size, [size, size, size, size]);

    var vertexIndices = [];
    for (var i = 0; i < gs - 1; i++) {
        for (var j = 0; j < gs - 1; j++) {
            var vInd0 = (i * gs + j);
            var vInd1 = (i * gs + j + 1);
            var vInd2 = ((i + 1) * gs + j);
            var vInd3 = ((i + 1) * gs + (j + 1));

            vertexIndices.push(vInd0, vInd3, vInd1, vInd0, vInd2, vInd3);
        }
    }

    for (var i = 0; i < vertexIndices.length - 1; i++) {

        var i0 = vertexIndices[i],
            i1 = vertexIndices[i + 1],
            i2 = vertexIndices[i + 2];

        var v0 = new og.math.Vector3(vertices[i0 * 3 + 0], vertices[i0 * 3 + 1], vertices[i0 * 3 + 2]),
            v1 = new og.math.Vector3(vertices[i1 * 3 + 0], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]),
            v2 = new og.math.Vector3(vertices[i2 * 3 + 0], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]);

        var e10 = og.math.Vector3.sub(v1, v0),
            e20 = og.math.Vector3.sub(v2, v0);

        var n = e10.cross(e20).normalize();

        normals[i0 * 3 + 0] += n.x;
        normals[i0 * 3 + 1] += n.y;
        normals[i0 * 3 + 2] += n.z;

        normals[i1 * 3 + 0] += n.x;
        normals[i1 * 3 + 1] += n.y;
        normals[i1 * 3 + 2] += n.z;

        normals[i2 * 3 + 0] += n.x;
        normals[i2 * 3 + 1] += n.y;
        normals[i2 * 3 + 2] += n.z;
    }

    //function getVertex(i, j) {
    //    if (i < 0) i = 0;
    //    if (j < 0) j = 0;
    //    if (i > gs - 1) i = gs - 1;
    //    if (j > gs - 1) j = gs - 1;
    //    var vInd = (i * gs + j) * 3;
    //    return new og.math.Vector3(vertices[vInd], vertices[vInd + 1], vertices[vInd + 2]);
    //}

    //for (var i = 0; i < gs - 1; i++) {
    //    for (var j = 0; j < gs - 1; j++) {
    //        var C = getVertex(i, j);
    //        var B = getVertex(i - 1, j);
    //        var D = getVertex(i, j - 1);
    //        var E = getVertex(i, j + 1);
    //        var F = getVertex(i + 1, j);


    //        var vBC = og.math.Vector3.sub(C, B);
    //        var vBE = og.math.Vector3.sub(E, B);
    //        var nBCE = vBC.cross(vBE).normalize();

    //        var vDC = og.math.Vector3.sub(C, D);
    //        var vDF = og.math.Vector3.sub(F, D);
    //        var nDFC = vDF.cross(vDC).normalize();

    //        var vDB = og.math.Vector3.sub(B, D);
    //        var nDCB = vDC.cross(vDB).normalize();

    //        var vCF = og.math.Vector3.sub(F, C);
    //        var vCE = og.math.Vector3.sub(E, C);
    //        var nCFE = vCF.cross(vCE).normalize();

    //        var nC = new og.math.Vector3((nBCE.x + nDFC.x + nDCB.x + nCFE.x) / 4, (nBCE.y + nDFC.y + nDCB.y + nCFE.y) / 4,
    //            (nBCE.z + nDFC.z + nDCB.z + nCFE.z) / 4);

    //        // nC.normalize();

    //        var vInd = (i * gs + j) * 3;
    //        normals[vInd] = nC.x;
    //        normals[vInd + 1] = nC.y;
    //        normals[vInd + 2] = nC.z;
    //    }
    //}

    //for (var i = 0; i < gs - 1; i++) {
    //    for (var j = 0; j < gs - 1; j++) {

    //        var vInd0 = (i * gs + j) * 3;
    //        var vInd1 = (i * gs + j + 1) * 3;
    //        var vInd2 = ((i + 1) * gs + j) * 3;
    //        var vInd3 = ((i + 1) * gs + (j + 1)) * 3;

    //        var v0 = new og.math.Vector3(vertices[vInd0], vertices[vInd0 + 1], vertices[vInd0 + 2]),
    //            v1 = new og.math.Vector3(vertices[vInd1], vertices[vInd1 + 1], vertices[vInd1 + 2]),
    //            v2 = new og.math.Vector3(vertices[vInd2], vertices[vInd2 + 1], vertices[vInd2 + 2]),
    //            v3 = new og.math.Vector3(vertices[vInd3], vertices[vInd3 + 1], vertices[vInd3 + 2]);

    //        var e10 = og.math.Vector3.sub(v1, v0),
    //            e20 = og.math.Vector3.sub(v2, v0),
    //            e30 = og.math.Vector3.sub(v3, v0);

    //        var ne = e30.cross(e10).normalize();
    //        var sw = e20.cross(e30).normalize();

    //        var n0 = og.math.Vector3.add(ne, sw);
    //        var n3 = og.math.Vector3.add(ne, sw);
    //        var n1 = og.math.Vector3.add(ne, sw);
    //        var n2 = og.math.Vector3.add(ne, sw);

    //        n0.normalize();
    //        n1.normalize();
    //        n3.normalize();
    //        n2.normalize();

    //        normals[vInd0] += n0.x;
    //        normals[vInd0 + 1] += n0.y;
    //        normals[vInd0 + 2] += n0.z;

    //        normals[vInd1] += n1.x;
    //        normals[vInd1 + 1] += n1.y;
    //        normals[vInd1 + 2] += n1.z;

    //        normals[vInd2] += n2.x;
    //        normals[vInd2 + 1] += n2.y;
    //        normals[vInd2 + 2] += n2.z;

    //        normals[vInd3] += n3.x;
    //        normals[vInd3 + 1] += n3.y;
    //        normals[vInd3 + 2] += n3.z;
    //    }
    //}


    for (var i = 0; i < normals.length; i += 3) {
        var l = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]);
        normals[i] /= l;
        normals[i + 1] /= l;
        normals[i + 2] /= l;
    }

    //var textureCoords = og.planetSegment.PlanetSegmentHelper.textureCoordsTable[size];
    var textureCoords = [];
    for (var i = 0; i <= size; i++) {
        for (var j = 0; j <= size; j++) {
            var x = j * step / size,
                y = 1- ((size) * step - i * step) / size;

            textureCoords.push(x, y);
        }
    }

    this.positionBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, vertices.length / 3);
    this.normalBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(normals), 3, normals.length / 3);
    this.textureCoordBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(textureCoords), 2, textureCoords.length / 2);
    this.indexBuffer = this.renderer.handler.createElementArrayBuffer(new Uint16Array(vertexIndices), 1, vertexIndices.length);


    var lines = [];
    var colors = [];
    for (var i = 0; i < normals.length; i += 3) {

        lines.push(vertices[i], vertices[i + 1], vertices[i + 2],
            vertices[i] + normals[i] * 100, vertices[i + 1] + normals[i + 1] * 100, vertices[i + 2] + normals[i + 2] * 100);

        colors.push(1.0, 0.0, 0.0, 1.0,
            1.0, 0.0, 0.0, 1.0);
    }

    this.linesBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(lines), 3, 2 * vertices.length / 3);
    this.linesColorBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(colors), 4, 2 * vertices.length / 3);
};

my.Plane.prototype.frame = function () {

    var r = this.renderer;

    var sh, p, gl;

    //
    // Draw surface
    sh = r.handler.shaderPrograms.colorShader;
    p = sh._program;
    gl = r.handler.gl,
        sha = p.attributes,
        shu = p.uniforms;

    sh.activate();

    gl.uniform4fv(shu.uColor._pName, [1, 1, 1, 1]);

    //point light
    gl.uniform3fv(shu.pointLightsPositions._pName, this._pointLightsTransformedPositions);
    gl.uniform3fv(shu.pointLightsParamsv._pName, this._pointLightsParamsv);
    gl.uniform1fv(shu.pointLightsParamsf._pName, this._pointLightsParamsf);

    //matrices
    gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera.pMatrix._m);
    gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera.mvMatrix._m);
    gl.uniformMatrix3fv(shu.uNMatrix._pName, false, r.activeCamera.nMatrix._m);

    //diffuse texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    //normals
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(sha.aVertexNormal._pName, this.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //vertices positions
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(sha.aVertexPosition._pName, this.positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //texture coordinates
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
    gl.vertexAttribPointer(sha.aTextureCoord._pName, this.textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //draw indexes
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(this.drawMode, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);


    //
    //Draw normals
    r.handler.shaderPrograms.flat.activate();

    r.handler.shaderPrograms.flat.set({
        uPMVMatrix: r.activeCamera.pmvMatrix._m,
        aVertexPosition: this.linesBuffer,
        aVertexColor: this.linesColorBuffer
    });
    r.handler.shaderPrograms.flat.drawArray(r.handler.gl.LINES, this.linesBuffer.numItems);

};