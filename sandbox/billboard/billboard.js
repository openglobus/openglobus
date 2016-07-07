goog.provide('my.Billboard');

goog.require('og.scene.RenderNode');
goog.require('og.inheritance');
goog.require('og.EntityCollection');
goog.require('og.Billboard');
goog.require('og.Label');
goog.require('og.Entity');
goog.require('og.GeoImage');

goog.require('og.math.Vector2');
goog.require('og.math.Vector3');

my.Billboard = function (name) {
    og.inheritance.base(this, name);
    this.texture = null;
};

og.inheritance.extend(my.Billboard, og.scene.RenderNode);


my.Billboard.prototype.initialization = function () {

    this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;

    //this.renderer.events.on("charkeypress", this, this.toogleWireframe, og.input.KEY_X);

    ec = new og.EntityCollection();

    eee = new og.Entity({
        cartesian: new og.math.Vector3(500, 0, 0),
        billboard: {
            src: "marker.png",
            width: 80,
            height: 80,
            offset: [0, 40]
        },
        label: {
            text: "Billboard",
            size: 15,
            color: new og.math.Vector4(0, 0, 0, 1),
            outlineColor: new og.math.Vector4(1, 1, 1, 1),
            outline: 0,
            face: "verdana"
        }
    });
    eee.addTo(ec);

    eee1 = new og.Entity({
        cartesian: new og.math.Vector3(0, 500, 0),
        billboard: {
            src: "marker.png",
            width: 80,
            height: 80,
            offset: [0, 40]
        },
        label: {
            face: "monospace",
            //weight: "bold",
            text: "Billboard 1"
        }
    });

    eee1.addTo(ec);

    eee2 = new og.Entity({
        cartesian: new og.math.Vector3(0, 0, 500),
        billboard: {
            src: "marker.png",
            width: 80,
            height: 80,
            offset: [0, 40]
        },
        label: {
            face: "monospace",
            text: "Billboard 2",
            //weight: "bold"
        }
    }).addTo(ec);

    //eee2.addTo(ec);

    ec.addTo(this);

    ec.events.on("touchstart", null, function (e) {
        print2d("t1", "start-" + e.pickingObject.label.getText(), 100, 100);
    });

    ec.events.on("touchend", null, function (e) {
        print2d("t1", "end-" + e.pickingObject.label.getText(), 100, 100);
    });

    //ec.events.on("touchenter", null, function (e) {
    //    print2d("t1", "enter-" + e.pickingObject.label.getText(), 100, 100);
    //});

    //ec.events.on("touchleave", null, function (e) {
    //    print2d("t1", "leave-" + e.pickingObject.label.getText(), 100, 100);
    //});

    //for (var i = 0; i < 50; i++) {
    //    for (var j = 0; j < 50; j++) {
    //        var blb = new og.Billboard();
    //        blb.setSize(15, 15);
    //        blb.setSrc("ship.png");

    //        var lbl = new og.Label();
    //        lbl.setText((i * 50 + j).toString());
    //        lbl.setOutline(0.0);
    //        lbl.setColor4v(new og.math.Vector4(0, 0, 0, 1));
    //        lbl.setSize(20);

    //        var eee = new og.Entity();
    //        eee.setPosition3v(new og.math.Vector3(j * 200, 0, i * 200));
    //        eee.setBillboard(blb);
    //        eee.setLabel(lbl);
    //        eee.addTo(ec);

    //    }
    //}

    //var that = this;
    //var img = new Image();
    //img.onload = function () {
    //    bc._sphericalBillboardsHandler.texture = that.renderer.handler.createTexture(this);
    //};
    //img.src = "ship.png"

    document.getElementById('size1').oninput = function () {
        eee.label.setSize(this.value);
        eee.billboard.setScale(this.value / 25);
    };
    document.getElementById('buffer1').oninput = function () {
        eee.label.setOutline(this.value);
    };
    document.getElementById('rotation1').oninput = function () {
        eee.label.setRotation(this.value * Math.PI / 180.0);
        eee.billboard.setRotation(this.value * Math.PI / 180.0);
    };
    document.getElementById('text1').oninput = function () {
        eee.label.setText(this.value);
    };

    document.getElementById('size2').oninput = function () {
        eee1.label.setSize(this.value);
        eee1.billboard.setScale(this.value / 25);
    };
    document.getElementById('buffer2').oninput = function () {
        eee1.label.setOutline(this.value);
    };
    document.getElementById('rotation2').oninput = function () {
        eee1.label.setRotation(this.value * Math.PI / 180.0);
        eee1.billboard.setRotation(this.value * Math.PI / 180.0);
    };
    document.getElementById('text2').oninput = function () {
        eee1.label.setText(this.value);
    };

    document.getElementById('size3').oninput = function () {
        eee2.label.setSize(this.value);
        eee2.billboard.setScale(this.value / 25);
    };
    document.getElementById('buffer3').oninput = function () {
        eee2.label.setOutline(this.value);
    };
    document.getElementById('rotation3').oninput = function () {
        eee2.label.setRotation(this.value * Math.PI / 180.0);
        eee2.billboard.setRotation(this.value * Math.PI / 180.0);
    };
    document.getElementById('text3').oninput = function () {
        eee2.label.setText(this.value);
    };
    //lbl2.setAlign("center");


};

my.Billboard.prototype.toogleWireframe = function (e) {
    if (this.drawMode === this.renderer.handler.gl.LINE_STRIP) {
        this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;
    } else {
        this.drawMode = this.renderer.handler.gl.LINE_STRIP;
    }
};

var i = 0;

my.Billboard.prototype.frame = function () {
    //for (var k = 0; k < ec.entities.length; k++) {
    //    ec.entities[k].label.setText("Billboard = " + k +", counter: " + i);
    //}

    //lbl.setText(i.toString());
    //lbl1.setText("Number: " + i.toString());
    //lbl2.setText(i.toString());


    i++;

    if (i >= 360)
        i = 0;

};