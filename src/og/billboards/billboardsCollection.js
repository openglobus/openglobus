goog.provide('og.BillboardsCollection');


goog.require('og.BillboardHandler');

/*
 * og.BillboardsCollection
 *
 *
 */
og.BillboardsCollection = function () {
    this._renderNodeIndex = -1;
    this.renderNode = null;
    this.visibility = true;
    this._billboardHandler = new og.BillboardHandler(this);
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
    this._billboardHandler.add(billboard);
    billboard.setSrc(billboard.src);
    return this;
};

og.BillboardsCollection.prototype.removeBillboard = function (billboard) {
    if (billboard._billboardHandler && this._renderNodeIndex == billboard._billboardHandler._billboardsCollection._renderNodeIndex) {
        billboard.remove();
    }
};

og.BillboardsCollection.prototype.forEach = function (callback, autoRefresh) {
    this._billboardHandler.forEach(callback);
    if (autoRefresh) {
        this._billboardHandler.refresh();
    }
};

og.BillboardsCollection.prototype.addTo = function (renderNode) {
    if (!this.renderNode) {
        this._renderNodeIndex = renderNode.billboardsCollections.length;
        this.renderNode = renderNode;
        renderNode.billboardsCollections.push(this);
        this._billboardHandler.setRenderer(renderNode.renderer);
        this.updateBillboardsTextureAtlas();
    }
    return this;
};

og.BillboardsCollection.prototype.updateBillboardsTextureAtlas = function () {
    var b = this._billboardHandler._billboards;
    for (var i = 0; i < b.length; i++) {
        b[i].setSrc(b[i].src);
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
//    var s = this._billboardHandler,
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
    this._billboardHandler.clear();
};