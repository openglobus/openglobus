goog.provide('my.Plane');

goog.require('og.node.RenderNode');
goog.require('og.inheritance');
goog.require('og.planetSegment.PlanetSegmentHelper');
goog.require('og.light.PointLight');
goog.require('og.webgl.Framebuffer');

goog.require('og.SyncQueue');
goog.require('NormalMapHelper');


my.Plane = function (name) {
    og.inheritance.base(this, name);
    this.vertexPositionBuffer = null;
    this.indexBuffer = null;
    this.size = 100;

    this.light = null;

    this.texture = null;
};

og.inheritance.extend(my.Plane, og.node.RenderNode);

my.Plane.prototype.normalsPack = function () {
    normalsPacked = [];
    for (var i = 0; i < normals.length; i++) {
        normalsPacked[i] = normals[i] * 0.5 + 0.5;
    }
};

my.Plane.prototype.normalsUnpack = function () {
    normalsUnpacked = [];
    for (var i = 0; i < normals.length; i++) {
        normalsUnpacked[i] = (normalsPacked[i] - 0.5) * 2.0
    }
};

my.Plane.prototype.initialization = function () {
    this.createBuffers();
    this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;
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


    //
    //Hiddent context experiment
    //
    var normalMap = new og.shaderProgram.ShaderProgram("normalMap", {
        attributes: {
            a_position: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_normal: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("nm_vs.txt"),
        fragmentShader: og.utils.readTextFile("nm_fs.txt")
    });

    var blur = new og.shaderProgram.ShaderProgram("blur", {
        attributes: {
            a_position: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        uniforms: {
            u_texture: { type: og.shaderProgram.types.SAMPLER2D },
            resolution: { type: og.shaderProgram.types.FLOAT },
            radius: { type: og.shaderProgram.types.FLOAT },
            dir: { type: og.shaderProgram.types.VEC2 }
        },
        vertexShader: og.utils.readTextFile("blur_vs.txt"),
        fragmentShader: og.utils.readTextFile("blur_fs.txt")
    });

    this._hiddenHandler = new og.webgl.Handler(null, {
        width: 128, height: 128,
        context: { alpha: false, depth: false }
    });
    this._hiddenHandler.addShaderProgram(blur);
    this._hiddenHandler.addShaderProgram(normalMap);
    this._hiddenHandler.init();

    this.normalMapHelper = new NormalMapHelper(this._hiddenHandler);
    this.normalMapHelper.initialize();

    var that = this;
    this.normalMapHelper.createNormalMap(normals, function (canvas) {
        that.normalsTexture = that.renderer.handler.createTexture(canvas);
    })
};

my.Plane.prototype.toogleWireframe = function (e) {
    if (this.drawMode === this.renderer.handler.gl.LINE_STRIP) {
        this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;
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
                z = Math.sin(1 * x / 2) * Math.cos(1 * y / 2) * 8600;

            vertices.push(x * this.size * 20, y * this.size * 20, z);
        }
    }

    var gs = size + 1;
    normals = new Float64Array(gs * gs * 3);

    var vertexIndices = og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(size, [size, size, size, size]);


    for (var i = 0; i < gs - 1; i++) {
        for (var j = 0; j < gs - 1; j++) {

            var vInd0 = (i * gs + j) * 3;
            var vInd1 = (i * gs + j + 1) * 3;
            var vInd2 = ((i + 1) * gs + j) * 3;
            var vInd3 = ((i + 1) * gs + (j + 1)) * 3;

            var v0 = new og.math.Vector3(vertices[vInd0], vertices[vInd0 + 1], vertices[vInd0 + 2]),
                v1 = new og.math.Vector3(vertices[vInd1], vertices[vInd1 + 1], vertices[vInd1 + 2]),
                v2 = new og.math.Vector3(vertices[vInd2], vertices[vInd2 + 1], vertices[vInd2 + 2]),
                v3 = new og.math.Vector3(vertices[vInd3], vertices[vInd3 + 1], vertices[vInd3 + 2]);

            var e10 = og.math.Vector3.sub(v1, v0),
                e20 = og.math.Vector3.sub(v2, v0),
                e30 = og.math.Vector3.sub(v3, v0);

            var sw = e20.cross(e30);//.normalize();
            var ne = e30.cross(e10);//.normalize();

            var n0 = og.math.Vector3.add(ne, sw);
            var n3 = og.math.Vector3.add(ne, sw);
            var n1 = og.math.Vector3.add(ne, sw);
            var n2 = og.math.Vector3.add(ne, sw);

            //n0.normalize();
            //n1.normalize();
            //n3.normalize();
            //n2.normalize();

            normals[vInd0] += n0.x;
            normals[vInd0 + 1] += n0.y;
            normals[vInd0 + 2] += n0.z;

            normals[vInd1] += n1.x;
            normals[vInd1 + 1] += n1.y;
            normals[vInd1 + 2] += n1.z;

            normals[vInd2] += n2.x;
            normals[vInd2 + 1] += n2.y;
            normals[vInd2 + 2] += n2.z;

            normals[vInd3] += n3.x;
            normals[vInd3 + 1] += n3.y;
            normals[vInd3 + 2] += n3.z;
        }
    }


    for (var i = 0; i < normals.length; i += 3) {
        var l = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]);
        normals[i] /= l;
        normals[i + 1] /= l;
        normals[i + 2] /= l;
    }

    var textureCoords = og.planetSegment.PlanetSegmentHelper.textureCoordsTable[size];

    this.positionBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, vertices.length / 3);
    //this.normalBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(normals), 3, normals.length / 3);
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

    //gl.uniform4fv(shu.uColor._pName, [1, 1, 1, 1]);

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
    gl.bindTexture(gl.TEXTURE_2D, this.normalsTexture);
    gl.uniform1i(shu.uSampler._pName, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.normalsTexture);
    gl.uniform1i(shu.uNormalsMap._pName, 1);


    //normals
    //gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    //gl.vertexAttribPointer(sha.aVertexNormal._pName, this.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

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
    //r.handler.shaderPrograms.flat.activate();

    //r.handler.shaderPrograms.flat.set({
    //    uPMVMatrix: r.activeCamera.pmvMatrix._m,
    //    aVertexPosition: this.linesBuffer,
    //    aVertexColor: this.linesColorBuffer
    //});
    //r.handler.shaderPrograms.flat.drawArray(r.handler.gl.LINES, this.linesBuffer.numItems);

};