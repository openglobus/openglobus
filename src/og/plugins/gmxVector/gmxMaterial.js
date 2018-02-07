goog.provide('og.gmx.Material');

goog.require('og.inheritance');

og.gmx.Material = function (segment, layer) {
    og.inheritance.base(this, segment, layer);

    this.fromTile = null;
};

og.inheritance.extend(og.gmx.Material, og.layer.Material);