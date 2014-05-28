goog.provide('my.Sphere');

goog.require('og.node.RenderNode');
goog.require('og.shapes.Sphere');
goog.require('og.math');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');

my.Sphere = function () {
    og.inheritance.base(this);

    this._sphere;

};

og.inheritance.extend(my.Sphere, og.node.RenderNode);

my.Sphere.prototype.initialization = function () {
    this._sphere = new og.shapes.Sphere(this.renderer, 200, 10, 10);
};

my.Sphere.prototype.frame = function () {
    this._sphere.draw();
};