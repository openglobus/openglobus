goog.provide('og.BillboardsCollection');


goog.require('og.SphericalBillboardsHandler');
goog.require('og.AlignedAxisBillboardsHandler');

/*
 * og.BillboardsCollection
 *
 *
 */
og.BillboardsCollection = function () {
    this._renderNodeIndex = -1;
    this.renderNode = null;
    this.visibility = true;
    this._sphericalBillboardsHandler = new og.SphericalBillboardsHandler(this);
    this._alignedAxisBillboardsHandler = new og.AlignedAxisBillboardsHandler(this);
};

og.BillboardsCollection.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
};

og.BillboardsCollection.prototype.addBillboards = function (bArr) {
    for (var i = 0; i < bArr.length; i++) {
        this.add(bArr[i]);
    }
    return this;
};

og.BillboardsCollection.prototype.add = function (billboard) {
    if (billboard.alignedAxis.isZero()) {
        this._sphericalBillboardsHandler.add(billboard);
    } else {
        this._alignedAxisBillboardsHandler.add(billboard);
    }
    billboard.setUrl(billboard._url);
    return this;
};

og.BillboardsCollection.prototype.removeBillboard = function (billboard) {
    if (billboard._billboardsHandler && this._renderNodeIndex == billboard._billboardsHandler._billboardsCollection._renderNodeIndex) {
        billboard.remove();
    }
};

og.BillboardsCollection.prototype.forEach = function (callback, autoRefresh) {
    this._sphericalBillboardsHandler.forEach(callback);
    this._alignedAxisBillboardsHandler.forEach(callback);
    if (autoRefresh) {
        this._sphericalBillboardsHandler.refresh();
        this._alignedAxisBillboardsHandler.refresh();
    }
};

og.BillboardsCollection.prototype.addTo = function (renderNode) {
    if (!this.renderNode) {
        this._renderNodeIndex = renderNode.billboardsCollections.length;
        this.renderNode = renderNode;
        renderNode.billboardsCollections.push(this);
        this._sphericalBillboardsHandler.setRenderer(renderNode.renderer);
        this._alignedAxisBillboardsHandler.setRenderer(renderNode.renderer);
        this.updateBillboardsTextureAtlas();
    }
    return this;
};

og.BillboardsCollection.prototype.updateBillboardsTextureAtlas = function () {
    var b = this._sphericalBillboardsHandler._billboards;
    for (var i = 0; i < b.length; i++) {
        b[i].setUrl(b[i]._url);
    }

    b = this._alignedAxisBillboardsHandler._billboards;
    for (var i = 0; i < b.length; i++) {
        b[i].setUrl(b[i]._url);
    }
};

og.BillboardsCollection.prototype.remove = function () {
    if (this.renderNode) {
        this.renderNode.billboardCollection.splice(this._renderNodeIndex, 1);
        this.renderNode = null;
        this._renderNodeIndex = -1;
        for (var i = this._renderNodeIndex; i < this.renderNode.billboardsCollections.length; i++) {
            this.renderNode.billboardsCollections._renderNodeIndex = i;
        }
    }
};

//og.BillboardsCollection.prototype.draw = function () {
//    var s = this._sphericalBillboardsHandler,
//        a = this._alignedAxisBillboardsHandler;

//    if (this.visibility && (s._billboards.length || a._billboards.length)) {
//        var rn = this.renderNode
//        var gl = rn.renderer.handler.gl;
//        gl.disable(gl.CULL_FACE);

//        gl.activeTexture(gl.TEXTURE0);
//        gl.bindTexture(gl.TEXTURE_2D, rn.billboardsTextureAtlas.texture);

//        s.draw();
//        a.draw();

//        gl.enable(gl.CULL_FACE);
//    }
//};

og.BillboardsCollection.prototype.clear = function () {
    this._sphericalBillboardsHandler.clear();
    this._alignedAxisBillboardsHandler.clear();
};