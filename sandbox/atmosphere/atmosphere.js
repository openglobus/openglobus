goog.provide('Atmosphere');

goog.require('og.node.RenderNode');
goog.require('og.shape.Sphere');
goog.require('og.math');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.light.PointLight');
goog.require('og.shaderProgram.sphere');
goog.require('og.shaderProgram.atmosphereSpace');

Atmosphere = function () {
    og.inheritance.base(this);

    this.atmosphere = {
        Kr: 0.001,
        Km: 0.0015,
        ESun: 15.0,
        g: -0.6,
        innerRadius: 100.0,
        outerRadius: 105.0,
        wavelength: [0.650, 0.570, 0.475],
        scaleDepth: 0.25
    };

    this._latBands = 100;
    this._lonBands = 100;

    this._innerIndexData = [];
    this._outerIndexData = [];
    this._textureCoordData = [];
    this._normalData = [];
    this._outerPositionData = [];
    this._innerPositionData = [];

    this.texture = null;

    this._createData();
};

og.inheritance.extend(Atmosphere, og.node.RenderNode);




var IcoSphereCreator = function () {

    var index = 0;
    var geometry = [];
    var indices = [];
    var scale = 1;

    middlePointIndexCache = {};

    // add vertex to mesh, fix position to be on unit sphere, return index
    function addVertex(p) {
        var length = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
        geometry.push(scale * p[0] / length, scale * p[1] / length, scale * p[2] / length);
        return index++;
    }

    // return index of point in the middle of p1 and p2
    function getMiddlePoint(p1, p2) {
        // first check if we have it already
        var firstIsSmaller = p1 < p2;
        var smallerIndex = firstIsSmaller ? p1 : p2;
        var greaterIndex = firstIsSmaller ? p2 : p1;

        var key = smallerIndex + "_" + greaterIndex;//(smallerIndex << 32) + greaterIndex;

        var ret = middlePointIndexCache[key];
        if (ret) {
            return ret;
        }

        var point1 = [geometry[p1 * 3], geometry[p1 * 3 + 1], geometry[p1 * 3 + 2]];
        var point2 = [geometry[p2 * 3], geometry[p2 * 3 + 1], geometry[p2 * 3 + 2]];
        var middle = [(point1[0] + point2[0]) / 2.0, (point1[1] + point2[1]) / 2.0, (point1[2] + point2[2]) / 2.0];

        // add vertex makes sure point is on unit sphere
        var i = addVertex(middle);
        middlePointIndexCache[key] = i;
        return i;
    }

    this.create = function (recursionLevel, s) {
        geometry = [];
        indices = [];
        index = 0;
        scale = s;
        middlePointIndexCache = {};

        // create 12 vertices of a icosahedron
        var t = (1.0 + Math.sqrt(5.0)) / 2.0;

        addVertex([-1, t, 0]);
        addVertex([1, t, 0]);
        addVertex([-1, -t, 0]);
        addVertex([1, -t, 0]);

        addVertex([0, -1, t]);
        addVertex([0, 1, t]);
        addVertex([0, -1, -t]);
        addVertex([0, 1, -t]);

        addVertex([t, 0, -1]);
        addVertex([t, 0, 1]);
        addVertex([-t, 0, -1]);
        addVertex([-t, 0, 1]);


        // create 20 triangles of the icosahedron
        var faces = [];

        // 5 faces around point 0
        faces.push([0, 11, 5]);
        faces.push([0, 5, 1]);
        faces.push([0, 1, 7]);
        faces.push([0, 7, 10]);
        faces.push([0, 10, 11]);

        // 5 adjacent faces 
        faces.push([1, 5, 9]);
        faces.push([5, 11, 4]);
        faces.push([11, 10, 2]);
        faces.push([10, 7, 6]);
        faces.push([7, 1, 8]);

        // 5 faces around point 3
        faces.push([3, 9, 4]);
        faces.push([3, 4, 2]);
        faces.push([3, 2, 6]);
        faces.push([3, 6, 8]);
        faces.push([3, 8, 9]);

        // 5 adjacent faces 
        faces.push([4, 9, 5]);
        faces.push([2, 4, 11]);
        faces.push([6, 2, 10]);
        faces.push([8, 6, 7]);
        faces.push([9, 8, 1]);


        // refine triangles
        for (var i = 0; i < recursionLevel; i++) {
            var faces2 = [];
            for (var j = 0; j < faces.length; j++) {
                var tri = faces[j];
                // replace triangle by 4 triangles
                var a = getMiddlePoint(tri[0], tri[1]);
                var b = getMiddlePoint(tri[1], tri[2]);
                var c = getMiddlePoint(tri[2], tri[0]);

                faces2.push([tri[0], a, c]);
                faces2.push([tri[1], b, a]);
                faces2.push([tri[2], c, b]);
                faces2.push([a, b, c]);
            }
            faces = faces2;
        }

        // done, now add triangles to mesh
        for (var i = 0; i < faces.length; i++) {
            var tri = faces[i];
            indices.push(tri[0]);
            indices.push(tri[1]);
            indices.push(tri[2]);
        }

        return {
            geometry: geometry,
            indices: indices
        };
    }
};




Atmosphere.prototype._createData = function () {

    //Earth
    for (var latNumber = 0; latNumber <= this._latBands; latNumber++) {
        var theta = latNumber * Math.PI / this._latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= this._lonBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / this._lonBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var x = cosPhi * sinTheta;
            var y = cosTheta * 0.996647189328169;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / this._lonBands);
            var v = latNumber / this._latBands;
            this._normalData.push(x);
            this._normalData.push(y);
            this._normalData.push(z);
            this._textureCoordData.push(u);
            this._textureCoordData.push(v);
            this._innerPositionData.push(this.atmosphere.innerRadius * x);
            this._innerPositionData.push(this.atmosphere.innerRadius * y);
            this._innerPositionData.push(this.atmosphere.innerRadius * z);
        }
    }

    for (var latNumber = 0; latNumber < this._latBands; latNumber++) {
        for (var longNumber = 0; longNumber < this._lonBands; longNumber++) {
            var first = (latNumber * (this._lonBands + 1)) + longNumber;
            var second = first + this._lonBands + 1;

            this._innerIndexData.push(first);
            this._innerIndexData.push(first + 1);
            this._innerIndexData.push(second);

            this._innerIndexData.push(second);
            this._innerIndexData.push(first + 1);
            this._innerIndexData.push(second + 1);
        }
    }


    //Atmosphere
    for (var latNumber = 0; latNumber <= this._latBands; latNumber++) {
        var theta = latNumber * Math.PI / this._latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= this._lonBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / this._lonBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var x = cosPhi * sinTheta;
            var y = cosTheta * 0.996647189328169;
            var z = sinPhi * sinTheta;
            this._outerPositionData.push(this.atmosphere.outerRadius * x);
            this._outerPositionData.push(this.atmosphere.outerRadius * y);
            this._outerPositionData.push(this.atmosphere.outerRadius * z);
        }
    }

    for (var latNumber = 0; latNumber < this._latBands; latNumber++) {
        for (var longNumber = 0; longNumber < this._lonBands; longNumber++) {
            var first = (latNumber * (this._lonBands + 1)) + longNumber;
            var second = first + this._lonBands + 1;

            this._outerIndexData.push(first);
            this._outerIndexData.push(first + 1);
            this._outerIndexData.push(second);

            this._outerIndexData.push(second);
            this._outerIndexData.push(first + 1);
            this._outerIndexData.push(second + 1);
        }
    }

    var ic = new IcoSphereCreator();
    var a = ic.create(5, 105);
    this._outerPositionData = a.geometry;
    this._outerIndexData = a.indices;
};

Atmosphere.prototype._createBuffers = function () {
    var r = this.renderer;
    this._innerPositionBuffer = r.handler.createArrayBuffer(new Float32Array(this._innerPositionData), 3, this._innerPositionData.length / 3);
    this._outerPositionBuffer = r.handler.createArrayBuffer(new Float32Array(this._outerPositionData), 3, this._outerPositionData.length / 3);
    this._normalBuffer = r.handler.createArrayBuffer(new Float32Array(this._normalData), 3, this._normalData.length / 3);
    this._innerIndexBuffer = r.handler.createElementArrayBuffer(new Uint16Array(this._innerIndexData), 1, this._innerIndexData.length);
    this._outerIndexBuffer = r.handler.createElementArrayBuffer(new Uint16Array(this._outerIndexData), 1, this._outerIndexData.length);
    this._textureCoordBuffer = r.handler.createArrayBuffer(new Float32Array(this._textureCoordData), 2, this._textureCoordData.length / 2);
}

Atmosphere.prototype.initialization = function () {
    this.renderer.handler.addShaderProgram(og.shaderProgram.sphere());
    this.renderer.handler.addShaderProgram(og.shaderProgram.atmosphereSpace());

    l1 = new og.light.PointLight();
    l1._diffuse.set(1.0, 1.0, 1.0);
    l1._ambient.set(0.5, 0.5, 0.5);
    l1._position.z = 5000;
    l1.addTo(this);

    this.color = [1, 1, 1, 1];
    this.lightEnabled = true;

    var that = this;
    var img = new Image();
    img.onload = function () {
        that.texture = that.renderer.handler.createTexture_mm(this);
    };
    img.src = "bm.png";

    this._createBuffers();
};
Atmosphere.prototype.frame = function () {
    this.drawSky();
    this.drawGround();
};

Atmosphere.prototype.drawSky = function () {
    var rn = this;
    var r = rn.renderer;

    var eye = r.activeCamera.eye;

    var sh, p,
        gl = r.handler.gl;

    sh = r.handler.shaderPrograms.atmosphereSpace;
    p = sh._program;
    sha = p.attributes,
    shu = p.uniforms;

    sh.activate();

    gl.cullFace(gl.FRONT);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniformMatrix4fv(shu.projectionMatrix._pName, false, r.activeCamera._pMatrix._m);
    gl.uniformMatrix4fv(shu.modelViewMatrix._pName, false, r.activeCamera._mvMatrix._m);

    var eye = r.activeCamera.eye;
    gl.uniform3fv(shu.cameraPosition._pName, eye.toVec());
    gl.uniform3fv(shu.v3LightPosition._pName, l1._position.normal().toVec());
    gl.uniform3fv(shu.v3LightPos._pName, l1._position.normal().toVec());
    gl.uniform3fv(shu.v3InvWavelength._pName, og.math.vector3(1 / Math.pow(this.atmosphere.wavelength[0], 4), 1 / Math.pow(this.atmosphere.wavelength[1], 4), 1 / Math.pow(this.atmosphere.wavelength[2], 4)).toVec());
    gl.uniform1f(shu.g._pName, this.atmosphere.g);
    gl.uniform1f(shu.g2._pName, this.atmosphere.g * this.atmosphere.g);
    gl.uniform1f(shu.fCameraHeight2._pName, eye.length2());
    gl.uniform1f(shu.fInnerRadius._pName, this.atmosphere.innerRadius);
    gl.uniform1f(shu.fOuterRadius._pName, this.atmosphere.outerRadius);
    gl.uniform1f(shu.fOuterRadius2._pName, this.atmosphere.outerRadius * this.atmosphere.outerRadius);
    gl.uniform1f(shu.fKrESun._pName, this.atmosphere.Kr * this.atmosphere.ESun);
    gl.uniform1f(shu.fKmESun._pName, this.atmosphere.Km * this.atmosphere.ESun);
    gl.uniform1f(shu.fKr4PI._pName, this.atmosphere.Kr * 4.0 * Math.PI);
    gl.uniform1f(shu.fKm4PI._pName, this.atmosphere.Km * 4.0 * Math.PI);
    gl.uniform1f(shu.fScale._pName, 1 / (this.atmosphere.outerRadius - this.atmosphere.innerRadius));
    gl.uniform1f(shu.fScaleDepth._pName, this.atmosphere.scaleDepth);
    gl.uniform1f(shu.fScaleOverScaleDepth._pName, 1 / (this.atmosphere.outerRadius - this.atmosphere.innerRadius) / this.atmosphere.scaleDepth);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._outerPositionBuffer);
    gl.vertexAttribPointer(sha.position._pName, this._outerPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._outerIndexBuffer);
    gl.drawElements(r.handler.gl.TRIANGLES, this._outerIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.cullFace(gl.BACK);
    gl.disable(gl.BLEND);
};


Atmosphere.prototype.drawGround = function () {
    var rn = this;
    var r = rn.renderer;

    var sh, p,
        gl = r.handler.gl;

    sh = r.handler.shaderPrograms.sphere;
    p = sh._program;
    sha = p.attributes,
    shu = p.uniforms;

    sh.activate();

    this.transformLights();


    gl.uniformMatrix4fv(shu.projectionMatrix._pName, false, r.activeCamera._pMatrix._m);
    gl.uniformMatrix4fv(shu.modelViewMatrix._pName, false, r.activeCamera._mvMatrix._m);
    gl.uniformMatrix3fv(shu.uNMatrix._pName, false, r.activeCamera._nMatrix._m);

    var eye = r.activeCamera.eye;
    gl.uniform3fv(shu.cameraPosition._pName, eye.toVec());
    gl.uniform3fv(shu.v3LightPosition._pName, l1._position.normal().toVec());
    gl.uniform3fv(shu.v3InvWavelength._pName, og.math.vector3(1 / Math.pow(this.atmosphere.wavelength[0], 4), 1 / Math.pow(this.atmosphere.wavelength[1], 4), 1 / Math.pow(this.atmosphere.wavelength[2], 4)).toVec());
    gl.uniform1f(shu.fCameraHeight2._pName, eye.length2());
    gl.uniform1f(shu.fInnerRadius._pName, this.atmosphere.innerRadius);
    gl.uniform1f(shu.fOuterRadius._pName, this.atmosphere.outerRadius);
    gl.uniform1f(shu.fOuterRadius2._pName, this.atmosphere.outerRadius * this.atmosphere.outerRadius);
    gl.uniform1f(shu.fKrESun._pName, this.atmosphere.Kr * this.atmosphere.ESun);
    gl.uniform1f(shu.fKmESun._pName, this.atmosphere.Km * this.atmosphere.ESun);
    gl.uniform1f(shu.fKr4PI._pName, this.atmosphere.Kr * 4.0 * Math.PI);
    gl.uniform1f(shu.fKm4PI._pName, this.atmosphere.Km * 4.0 * Math.PI);
    gl.uniform1f(shu.fScale._pName, 1 / (this.atmosphere.outerRadius - this.atmosphere.innerRadius));
    gl.uniform1f(shu.fScaleDepth._pName, this.atmosphere.scaleDepth);
    gl.uniform1f(shu.fScaleOverScaleDepth._pName, 1 / (this.atmosphere.outerRadius - this.atmosphere.innerRadius) / this.atmosphere.scaleDepth);

    gl.uniform3fv(shu.pointLightsPositions._pName, rn._pointLightsTransformedPositions);
    gl.uniform3fv(shu.pointLightsParamsv._pName, rn._pointLightsParamsv);
    gl.uniform1fv(shu.pointLightsParamsf._pName, rn._pointLightsParamsf);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._normalBuffer);
    gl.vertexAttribPointer(sha.normal._pName, this._normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._innerPositionBuffer);
    gl.vertexAttribPointer(sha.position._pName, this._innerPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(shu.uSampler._pName, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._textureCoordBuffer);
    gl.vertexAttribPointer(sha.uv._pName, this._textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._innerIndexBuffer);
    gl.drawElements(r.handler.gl.TRIANGLES, this._innerIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
};