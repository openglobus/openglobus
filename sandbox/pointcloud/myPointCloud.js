goog.provide('my.PointCloud');

goog.require('og.scene.RenderNode');
goog.require('og.inheritance');

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.LineString');
goog.require('og.Label');
goog.require('og.ajax');


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
            pointSize: 3
        }
    });

    this.ec.add(ex);


    this.ec.addTo(this);

    var that = this;
    og.ajax.request('maize_oct.txt', {
        async: true,
        success: function (data) {
            var res = data.match(/[0-9 , \.]+/g);
            var points = [];
            for (var i = 0; i < res.length; i++) {
                var ri = res[i];
                var a = ri.split(' ');
                for (var n = 0; n < a.length; n++) {
                    a[n] = parseFloat(a[n]);
                }
                points.push(a);
            }
            ex.pointCloud.setPoints(points);
        }
    });


    //this.ec.events.on("mouseenter", function (e) {
    //    e.pickingObject.lineString.setColor(1, 1, 0);
    //});

    //this.ec.events.on("mouseleave", function (e) {
    //    e.pickingObject.lineString.setColor(1, 1, 1);
    //})

};


my.PointCloud.prototype.frame = function () {
};