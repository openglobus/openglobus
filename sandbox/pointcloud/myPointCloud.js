goog.provide('my.PointCloud');

goog.require('og.scene.RenderNode');
goog.require('og.inheritance');

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.LineString');
goog.require('og.Label');


my.PointCloud = function (name) {
    og.inheritance.base(this, name);
};

og.inheritance.extend(my.PointCloud, og.scene.RenderNode);

my.PointCloud.prototype.initialization = function () {

    this.ec = new og.EntityCollection();

    var ex = new og.Entity({
        pointCloud: {
            points: [
                [0, 0, 0, 255, 255, 255, 255, { 'name': 'First point' }],
                [100, 100, 0, 255, 0, 0, 255, { 'name': 'Second point' }],
                [100, 100, 100, 0, 255, 0, 255]
            ],
            size: 15
        }
    });

    this.ec.add(ex);


    this.ec.addTo(this);
    //this.ec.events.on("mouseenter", null, function (e) {
    //    e.pickingObject.lineString.setColor(1, 1, 0);
    //});

    //this.ec.events.on("mouseleave", null, function (e) {
    //    e.pickingObject.lineString.setColor(1, 1, 1);
    //})

};


my.PointCloud.prototype.frame = function () {
};