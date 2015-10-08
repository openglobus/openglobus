goog.provide('og.Frustum');

og.Frustum = function () {
    this._f = new Array(6);
    for (var i = 0; i < 6; i++)
        this._f[i] = new Array(4);
};

og.Frustum.prototype.setFrustum = function (clip) {
    /* Right */
    this._f[0][0] = clip[3] - clip[0];
    this._f[0][1] = clip[7] - clip[4];
    this._f[0][2] = clip[11] - clip[8];
    this._f[0][3] = clip[15] - clip[12];
    this.planeNormalize(this._f[0]);

    /* Left */
    this._f[1][0] = clip[3] + clip[0];
    this._f[1][1] = clip[7] + clip[4];
    this._f[1][2] = clip[11] + clip[8];
    this._f[1][3] = clip[15] + clip[12];
    this.planeNormalize(this._f[1]);

    /* Bottom */
    this._f[2][0] = clip[3] + clip[1];
    this._f[2][1] = clip[7] + clip[5];
    this._f[2][2] = clip[11] + clip[9];
    this._f[2][3] = clip[15] + clip[13];
    this.planeNormalize(this._f[2]);

    /* Top */
    this._f[3][0] = clip[3] - clip[1];
    this._f[3][1] = clip[7] - clip[5];
    this._f[3][2] = clip[11] - clip[9];
    this._f[3][3] = clip[15] - clip[13];
    this.planeNormalize(this._f[3]);

    /* Backward */
    this._f[4][0] = clip[3] - clip[2];
    this._f[4][1] = clip[7] - clip[6];
    this._f[4][2] = clip[11] - clip[10];
    this._f[4][3] = clip[15] - clip[14];
    this.planeNormalize(this._f[4]);

    /* Forward */
    this._f[5][0] = clip[3] + clip[2];
    this._f[5][1] = clip[7] + clip[6];
    this._f[5][2] = clip[11] + clip[10];
    this._f[5][3] = clip[15] + clip[14];
    this.planeNormalize(this._f[5]);
};

og.Frustum.prototype.planeNormalize = function (plane) {
    var t = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
    plane[0] /= t;
    plane[1] /= t;
    plane[2] /= t;
    plane[3] /= t;
};

og.Frustum.prototype.containsPoint = function (point) {
    var d;
    for (var p = 0; p < 6; p++) {
        d = point.dotArr(this._f[p]) + this._f[p][3];
        if ( d <= 0 )
            return false;
    }
    return true;
};

og.Frustum.prototype.containsSphere = function (sphere) {
    var d;
    for( var p = 0; p < 6; p++ ) {
        d = sphere.center.dotArr(this._f[p]) + this._f[p][3];
        if( d <= -sphere.radius )
            return -1;
    }
    return d + sphere.radius;
};

og.Frustum.prototype.containsBox = function (box) {
    var result = true, cout, cin;

    for(var i=0; i < 6; i++) {
        cout=0; cin=0;
        for (var k = 0; k < 8 && (cin==0 || cout==0); k++) {
            var d = box.vertices[k].dotArr(this._f[i]) + this._f[i][3];
            if (d < 0)
                cout++;
            else
				cin++;
        }
        if (cin==0)
			return false;
        else if (cout>0)
            result = true;
    }
    return(result);
};
