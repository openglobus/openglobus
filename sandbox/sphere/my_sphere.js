goog.provide('my.Sphere');

goog.require('og.node.RenderNode');
goog.require('og.shapes.Sphere');
goog.require('og.math');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.light.PointLight');

my.Sphere = function () {
    og.inheritance.base(this);

    this._sphere;

};

og.inheritance.extend(my.Sphere, og.node.RenderNode);

my.Sphere.prototype.initialization = function () {
    l1 = new og.light.PointLight();
    l1._diffuse.set(1, 0, 0);
    l1._position.z = 5000;
    l1.addTo(this);

    //l2 = new og.light.PointLight();
    //l2._position.z = -5000;
    //l2._diffuse.set(0, 0, 1);
    //l2.addTo(this);

    //var l3 = new og.light.PointLight();
    //l3._position.y = 5000
    //l3._diffuse.set(0, 1, 0);
    //l3.addTo(this);

    //var l4 = new og.light.PointLight();
    //l4._position.y = -5000
    //l4.addTo(this);



    this._sphere = new og.shapes.Sphere(this, 1200, 40, 40);
    this._sphere.color = [1, 1, 1, 1];
    this._sphere.lightEnabled = true;

    //this._sphere2 = new og.shapes.Sphere(this, 1250, 40, 40);
    // this._sphere2.color = [1, 1, 1, 1];
    // this._sphere2.setPosition(new og.math.Vector3(3500, 0, 0));
    // this._sphere2.refresh();
};

my.Sphere.prototype.frame = function () {
    //this.renderer.handler.activateBlending();
    //this.renderer.handler.deactivateFaceCulling();
    //this.renderer.handler.deactivateDepthTest();
    this._sphere.draw();
   // this._sphere2.draw();
    //this.renderer.handler.activateDepthTest();
    //this.renderer.handler.activateFaceCulling();
    //this.renderer.handler.deactivateBlending();
};