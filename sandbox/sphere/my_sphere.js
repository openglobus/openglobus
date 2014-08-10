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
    this._sphere.color = [0.3, 0.5, 0.8, 0.4];

    this._sphere2 = new og.shapes.Sphere(this.renderer, 250, 20, 20);
    this._sphere2.color = [0.8, 0.3, 0.2, 0.3];
    this._sphere2.setPosition(new og.math.Vector3(500, 0, 0));
    this._sphere2.refresh();
};

my.Sphere.prototype.frame = function () {
    this.renderer.handler.activateBlending();
    this.renderer.handler.deactivateFaceCulling();
    this.renderer.handler.deactivateDepthTest();
    this._sphere.draw();
    this._sphere2.draw();
    this.renderer.handler.activateDepthTest();
    this.renderer.handler.activateFaceCulling();
    this.renderer.handler.deactivateBlending();
};