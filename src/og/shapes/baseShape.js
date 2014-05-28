goog.provide('og.shapes.BaseShape');

goog.require('og.math.Vector3');
goog.require('og.math.Quaternion');
goog.require('og.math.Matrix4');

og.shapes.BaseShape = function (renderer) {

    this.renderer = renderer;

    this.position = new og.math.Vector3();
    this.orientation = new og.math.Quaternion(0.0, 0.0, 0.0, 1.0);
    this.scale = new og.math.Vector3(1.0, 1.0, 1.0);
    this.color = [1.0, 1.0, 1.0, 1.0];

    this._positionBuffer = null;
    this._normalBuffer = null;
    this._indexBuffer = null;

    this._positionData = [];
    this._normalData = [];
    this._indexData = [];

    this._mxScale = new og.math.Matrix4().setIdentity();
    this._mxTranslation = new og.math.Matrix4().setIdentity();
    this._mxTRS = new og.math.Matrix4().setIdentity();

    this.drawMode = renderer.handler.gl.TRIANGLES;
};

og.shapes.BaseShape.prototype.clear = function () {

    this.position.set(0.0, 0.0, 0.0);
    this.orientation.set(0.0, 0.0, 0.0, 1.0);
    this.scale.set(1.0, 1.0, 1.0);

    this._positionData.length = 0;
    this._normalData.length = 0;
    this._indexData.length = 0;

    this._mxScale.setIdentity();
    this._mxTranslation.setIdentity();
    this._mxTRS.setIdentity();

    this.deleteBuffers();
};

og.shapes.BaseShape.prototype.deleteBuffers = function () {
    this.renderer.handler.gl.deleteBuffer(this._positionBuffer);
    this.renderer.handler.gl.deleteBuffer(this._normalBuffer);
    this.renderer.handler.gl.deleteBuffer(this._indexBuffer);
    this._positionBuffer = null;
    this._normalBuffer = null;
    this._indexBuffer = null;
};

og.shapes.BaseShape.prototype.setPosition = function (position) {
    this.position.copy(position);
    this._mxTranslation.translateToPosition(position);
};

og.shapes.BaseShape.prototype.translate = function (vec) {
    this.position.add(vec);
    this._mxTranslation.translate(vec);
};

og.shapes.BaseShape.prototype.setScale = function (scale) {
    this.scale.copy(scale);
    this._mxScale.scale(scale);
};

og.shapes.BaseShape.prototype.createBuffers = function () {
    this._positionBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(this._positionData), 3, this._positionData.length / 3);
    this._normalBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(this._normalData), 3, this._normalData.length / 3);
    this._indexBuffer = this.renderer.handler.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
}

og.shapes.BaseShape.prototype.setPositionData = function (positionData) {
    this._positionData = [].concat(positionData);
};

og.shapes.BaseShape.prototype.setNormalData = function (normalData) {
    this._normalData = [].concat(normalData);
};

og.shapes.BaseShape.prototype.setIndexData = function (indexData) {
    this._indexData = [].concat(indexData);
};

og.shapes.BaseShape.prototype.refresh = function () {
    this._mxTRS = this._mxTranslation.mul(this.orientation.getMatrix4().mul(this._mxScale));
};

og.shapes.BaseShape.prototype.draw = function () {

    var sh = this.renderer.handler.shaderPrograms.shape;
    var p = sh._program;
    var gl = this.renderer.handler.gl,
        sha = p.attributes,
        shu = p.uniforms;

    sh.activate();

    gl.uniformMatrix4fv(shu.uPMVMatrix._pName, false, this.renderer.activeCamera.pmvMatrix._m)
    gl.uniformMatrix4fv(shu.uTRSMatrix._pName, false, this._mxTRS._m);
    gl.uniform4fv(shu.uColor._pName, this.color);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._normalBuffer);
    gl.vertexAttribPointer(sha.aVertexNormal._pName, this._normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.vertexAttribPointer(sha.aVertexPosition._pName, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
    //gl.vertexAttribPointer(sha.aTextureCoord._pName, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.drawElements(this.drawMode, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
};