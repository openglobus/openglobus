goog.provide('my.Polyline');

goog.require('og.scene.RenderNode');
goog.require('og.inheritance');

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.Polyline');
goog.require('og.Label');


my.Polyline = function (name) {
    og.inheritance.base(this, name);
};

og.inheritance.extend(my.Polyline, og.scene.RenderNode);

my.Polyline.prototype.initialization = function () {

    // var a, b, bc, c, d, i, j, l, lnx, lny, lnz, lx, ly, lz, nx, ny, nz, result, x, y, z, _i;
    // result = [];
    // lx = 0;
    // ly = 0;
    // lz = 0;
    // lnx = 1;
    // lny = 0;
    // lnz = 0;
    // d = 0;
    // bc = [1, 0, 0];
    // for (j = _i = 0; _i < 20000; j = ++_i) {
    //     i = j * 0.1;
    //     a = i + 3;
    //     b = i + 7;
    //     c = i + 11;
    //     x = (Math.sin(a / 5) + Math.sin(a / 23) + Math.sin(a / 53)) * 1000;
    //     y = (Math.sin(b / 7) + Math.sin(b / 29) + Math.sin(b / 67)) * 1000;
    //     z = (Math.sin(b / 11) + Math.sin(b / 31) + Math.sin(b / 73)) * 1000;
    //     nx = x - lx;
    //     ny = y - ly;
    //     nz = z - lz;
    //     l = Math.sqrt(Math.pow(nx, 2) + Math.pow(ny, 2) + Math.pow(nz, 2));
    //     nx /= l;
    //     ny /= l;
    //     nz /= l;
    //     d += l;
    //     result.push([x, y, z]);
    //     lnx = nx;
    //     lny = ny;
    //     lnz = nz;
    //     lx = x;
    //     ly = y;
    //     lz = z;
    // }


    this.ec = new og.EntityCollection();
    var s = 15000;
    var ex = new og.Entity({
        polyline: {
            path3v: [[[0, 100, 0], [s / 3, 0, 0], [s * 2 / 3, 100, 0], [0, 300, 0]]],
            thickness: 15,
            color: [1, 0, 0, 1]
        }
    });

    var ey = new og.Entity({
        polyline: {
            path3v: [[[0, 0, 0], [0, s, 0]]],
            thickness: 15,
            color: [0, 0, 1, 1]
        }
    });

    var ez = new og.Entity({
        polyline: {
            path3v: [[[0, 0, 0], [0, 0, s]]],
            thickness: 15,
            color: [0, 1, 0, 1]
        }
    });

    this.ec.add(ex);
    this.ec.add(ey);
    this.ec.add(ez);

    this.ec.addTo(this);
    //this.ec.events.on("mouseenter", function (e) {
    //    e.pickingObject.polyline.setColor(1, 1, 0);
    //});

    //this.ec.events.on("mouseleave", function (e) {
    //    e.pickingObject.polyline.setColor(1, 1, 1);
    //})

};


my.Polyline.prototype.frame = function () {
};