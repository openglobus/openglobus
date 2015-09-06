goog.provide('og.EntityCollection');


goog.require('og.BillboardHandler');

/*
 * og.EntityCollection
 *
 *
 */
og.EntityCollection = function () {
    this._renderNodeIndex = -1;
    this.renderNode = null;
    this.visibility = true;
    this._billboardHandler = new og.BillboardHandler(this);
};

og.EntityCollection.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
};

og.EntityCollection.prototype.addBillboards = function (bArr) {
    for (var i = 0; i < bArr.length; i++) {
        this.add(bArr[i]);
    }
    return this;
};

og.EntityCollection.prototype.add = function (billboard) {
    this._billboardHandler.add(billboard);
    billboard.setSrc(billboard.src);
    return this;
};

og.EntityCollection.prototype.removeBillboard = function (billboard) {
    if (billboard._billboardHandler && this._renderNodeIndex == billboard._billboardHandler._entityCollection._renderNodeIndex) {
        billboard.remove();
    }
};

og.EntityCollection.prototype.forEach = function (callback, autoRefresh) {
    this._billboardHandler.forEach(callback);
    if (autoRefresh) {
        this._billboardHandler.refresh();
    }
};

og.EntityCollection.prototype.addTo = function (renderNode) {
    if (!this.renderNode) {
        this._renderNodeIndex = renderNode.entityCollections.length;
        this.renderNode = renderNode;
        renderNode.entityCollections.push(this);
        this._billboardHandler.setRenderer(renderNode.renderer);
        this.updateBillboardsTextureAtlas();
    }
    return this;
};

og.EntityCollection.prototype.updateBillboardsTextureAtlas = function () {
    var b = this._billboardHandler._billboards;
    for (var i = 0; i < b.length; i++) {
        b[i].setSrc(b[i].src);
    }
};

og.EntityCollection.prototype.remove = function () {
    if (this.renderNode) {
        this.renderNode.billboardCollection.splice(this._renderNodeIndex, 1);
        this.renderNode = null;
        this._renderNodeIndex = -1;
        for (var i = this._renderNodeIndex; i < this.renderNode.entityCollections.length; i++) {
            this.renderNode.entityCollections._renderNodeIndex = i;
        }
    }
};

//og.EntityCollection.prototype.draw = function () {
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

og.EntityCollection.prototype.clear = function () {
    this._billboardHandler.clear();
};