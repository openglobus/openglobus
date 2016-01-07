goog.provide('my.Billboard');

goog.require('og.node.RenderNode');
goog.require('og.inheritance');
goog.require('og.EntityCollection');
goog.require('og.Billboard');
goog.require('og.Label');
goog.require('og.Entity');

goog.require('og.math.Vector2');
goog.require('og.math.Vector3');

my.Billboard = function (name) {
    og.inheritance.base(this, name);
    this.texture = null;
};

og.inheritance.extend(my.Billboard, og.node.RenderNode);


my.Billboard.prototype.initialization = function () {

    this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;

    //this.renderer.events.on("charkeypress", this, this.toogleWireframe, og.input.KEY_X);

    ec = new og.EntityCollection();

    eee = new og.Entity({
        position: new og.math.Vector3(500, 0, 0),
        billboard: {
            src: "ship.png",
            width: 80,
            height: 80
        },
        label: {
            text: "Billboard",
            size: 15,
            color: new og.math.Vector4(0, 0, 0, 1),
            outlineColor: new og.math.Vector4(1, 1, 1, 1),
            face: "verdana"
        }
    });
    eee.addTo(ec);

    eee1 = new og.Entity({
        position: new og.math.Vector3(0, 500, 0),
        billboard: {
            src: "ship.png",
            width: 80,
            height: 80
        },
        label: {
            face: "arial black",
            text: "Billboard 1"
        }
    });

    eee1.addTo(ec);

    eee2 = new og.Entity({
        position: new og.math.Vector3(0, 0, 500),
        billboard: {
            src: "wall.jpg",
            width: 80,
            height: 80
        },
        label: {
            face: "monospace",
            text: "Billboard 2",
            weight: "bold"
        }
    }).addTo(ec);

    //eee2.addTo(ec);

    ec.addTo(this);

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
        lbl.setSize(this.value);
    };
    document.getElementById('buffer1').oninput = function () {
        lbl.setOutline(this.value);
    };
    document.getElementById('rotation1').oninput = function () {
        lbl.setRotation(this.value * Math.PI / 180.0);
    };
    document.getElementById('text1').oninput = function () {
        lbl.setText(this.value);
    };

    document.getElementById('size2').oninput = function () {
        lbl1.setSize(this.value);
    };
    document.getElementById('buffer2').oninput = function () {
        lbl1.setOutline(this.value);
    };
    document.getElementById('rotation2').oninput = function () {
        lbl1.setRotation(this.value * Math.PI / 180.0);
    };
    document.getElementById('text2').oninput = function () {
        lbl1.setText(this.value);
    };

    document.getElementById('size3').oninput = function () {
        lbl2.setSize(this.value);
    };
    document.getElementById('buffer3').oninput = function () {
        lbl2.setOutline(this.value);
    };
    document.getElementById('rotation3').oninput = function () {
        lbl2.setRotation(this.value * Math.PI / 180.0);
    };
    document.getElementById('text3').oninput = function () {
        lbl2.setText(this.value);
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