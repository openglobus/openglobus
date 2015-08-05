goog.provide('my.Billboard');

goog.require('og.node.RenderNode');
goog.require('og.inheritance');
goog.require('og.BillboardsCollection');
goog.require('og.Billboard');

goog.require('og.math.Vector2');
goog.require('og.math.Vector3');

my.Billboard = function (name) {
    og.inheritance.base(this, name);
    this.texture = null;
};

og.inheritance.extend(my.Billboard, og.node.RenderNode);


my.Billboard.prototype.initialization = function () {

    this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;

    this.renderer.events.on("oncharkeypressed", this, this.toogleWireframe, og.input.KEY_X);

    bc = new og.BillboardsCollection();
    bc.addTo(this);

    for (var i = 0; i < 200; i++) {
        for (var j = 0; j < 200; j++) {
            var blb = new og.Billboard();
            blb.setPosition(new og.math.Vector3(j * 200, 0, i * 200));
            blb.setSize(new og.math.Vector2(20, 20));
            blb.addTo(bc);
        }
    }

    var that = this;
    var img = new Image();
    img.onload = function () {
        bc._sphericalBillboardsHandler.texture = that.renderer.handler.createTexture(this);
    };
    img.src = "ship.png"
};

my.Billboard.prototype.toogleWireframe = function (e) {
    if (this.drawMode === this.renderer.handler.gl.LINE_STRIP) {
        this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;
    } else {
        this.drawMode = this.renderer.handler.gl.LINE_STRIP;
    }
};

my.Billboard.prototype.frame = function () {

};

/*
void CreateBillboardMatrix(Matrix44f &bbmat, const Vector3f &right, const Vector3f &up, const Vector3f &look, const Vertex3f &pos)
{
    bbmat.matrix[0] = right.x;
    bbmat.matrix[1] = right.y;
    bbmat.matrix[2] = right.z;
    bbmat.matrix[3] = 0;
    bbmat.matrix[4] = up.x;
    bbmat.matrix[5] = up.y;
    bbmat.matrix[6] = up.z;
    bbmat.matrix[7] = 0;
    bbmat.matrix[8] = look.x;
    bbmat.matrix[9] = look.y;
    bbmat.matrix[10] = look.z;
    bbmat.matrix[11] = 0;
    // Add the translation in as well.
    bbmat.matrix[12] = pos.x;
    bbmat.matrix[13] = pos.y;
    bbmat.matrix[14] = pos.z;
    bbmat.matrix[15] = 1;
}

void BillboardAxis(const Vertex3f &pos, const Vector3f &axis, const Vertex3f &camPos)
{	// create the look vector: pos -> camPos
    Vector3f	look	= camPos - pos;
    look.Normalize();

    // billboard about the direction vector
    Vector3f	up		= axis;
    Vector3f	right	= up.Cross(look);

    // watch out when the look vector is almost equal to the up vector the right
    // vector gets close to zeroed, normalize it
    right.Normalize();

    // the billboard won't actually face the direction of the look vector we
    // created earlier, that was just used as a tempory vector to create the
    // right vector so we could calculate the correct look vector from that.
    look = right.Cross(up);

    Matrix44f	bbmat;
    CreateBillboardMatrix(bbmat, right, up, look, pos);

    // apply the billboard
    glMultMatrixf(bbmat.matrix);
};

*/