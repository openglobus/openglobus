og.bv.Box = function () {
    this.vertices = [ new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3() ];
};

og.bv.Box.prototype.setVertices = function (xmin, xmax, ymin, ymax, zmin, zmax) {
    this.vertices[0].set(xmin, ymin, zmin);
    this.vertices[1].set(xmax, ymin, zmin);
    this.vertices[2].set(xmax, ymin, zmax);
    this.vertices[3].set(xmin, ymin, zmax);
    this.vertices[4].set(xmin, ymax, zmin);
    this.vertices[5].set(xmax, ymax, zmin);
    this.vertices[6].set(xmax, ymax, zmax);
    this.vertices[7].set(xmin, ymax, zmax);
};
