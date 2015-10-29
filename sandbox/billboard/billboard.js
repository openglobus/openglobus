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

    //this.renderer.events.on("oncharkeypressed", this, this.toogleWireframe, og.input.KEY_X);

    ec = new og.EntityCollection();

    blb = new og.Billboard();
    blb.setSrc("marker.png");
    blb.setSize(80, 80);
    lbl = new og.Label();
    lbl.setText("Billboard");
    lbl.setSize(15);
    lbl.setColor4v(new og.math.Vector4(0, 0, 0, 1));
    lbl.setOutlineColor4v(new og.math.Vector4(1, 1, 1, 1));
    lbl.setFace("Verdana");
    //lbl.setFace("arial");
    //lbl.setFace("Monospace");
    //lbl.setStyle("italic");
    eee = new og.Entity();
    eee.setPosition3v(new og.math.Vector3(500, 0, 0));
    eee.setBillboard(blb);
    eee.setLabel(lbl);
    eee.addTo(ec);

    blb1 = new og.Billboard();
    blb1.setSrc("ship.png");
    blb1.setSize(80, 80);
    lbl1 = new og.Label();
    lbl1.setText("Billboard 1");
    lbl1.setFace("arial black");
    eee1 = new og.Entity();
    eee1.setPosition3v(new og.math.Vector3(0, 500, 0));
    eee1.setBillboard(blb1);
    eee1.setLabel(lbl1);
    eee1.addTo(ec);

    blb2 = new og.Billboard();
    blb2.setSrc("wall.jpg");
    blb2.setPosition3v(new og.math.Vector3(0, 0, 500));
    blb2.setSize(80, 80);
    lbl2 = new og.Label();
    lbl2.setFace("monospace");
    //lbl2.setWeight("bold");
    lbl2.setText("Billboard 2");
    eee2 = new og.Entity();
    eee2.setPosition3v(new og.math.Vector3(0, 0, 500));
    eee2.setBillboard(blb2);
    eee2.setLabel(lbl2);
    eee2.addTo(ec);
    
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
   lbl2.setAlign("center");
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