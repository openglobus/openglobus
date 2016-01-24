goog.provide('og.layer.Vector')

goog.require('og.EntityCollection');
goog.require('og.Entity');

og.layer.Feature = function () {

};

og.layer.Vector = function (name, options) {

    og.inheritance.base(this, name, options);

    this.entities = [];
    this.entityCollection = new og.entityCollection();
};

og.inheritance.extend(og.layer.Vector, og.layer.Layer);