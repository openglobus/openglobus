goog.provide('og.layer.Vector')

goog.require('og.EntityCollection');
goog.require('og.Entity');

og.layer.Feature = function () {

};

og.layer.Vector = function (name, options) {

    og.inheritance.base(this, name, options);

    this.entityCollection = new og.EntityCollection();
};

og.inheritance.extend(og.layer.Vector, og.layer.Layer);

og.layer.Vector.prototype.addTo = function (planet) {

    this.entityCollection.addTo(planet, true);

    planet.layers.push(this);
    this._planet = planet;
    this.events.on("visibilitychange", planet, planet._onLayerVisibilityChanged);
    if (this._isBaseLayer && this._visibility) {
        planet.setBaseLayer(this);
    }
    planet.events.dispatch(planet.events.layeradd, this);
    this.events.dispatch(this.events.add, planet);
    planet.updateVisibleLayers();
};

og.layer.Vector.prototype.collectVisibleCollections = function (outArr) {
    outArr.push(this.entityCollection);
};