og.Frustum = function () {

    this.frustum = new Array(6);
    for (var i = 0; i < 6; i++)
        this.frustum[i] = new Array(4);
    //this.clip = mat4.create();
};

og.Frustum.prototype.setFrustum = function (clip) {
    //var clip = this.clip;
    //mat4.multiply(proj, modl, this.clip);

    /* Íàõîäèì A, B, C, D äëÿ ÏÐÀÂÎÉ ïëîñêîñòè */
    this.frustum[0][0] = clip[3] - clip[0];
    this.frustum[0][1] = clip[7] - clip[4];
    this.frustum[0][2] = clip[11] - clip[8];
    this.frustum[0][3] = clip[15] - clip[12];
    this.planeNormalize(this.frustum[0]);

    /* Íàõîäèì A, B, C, D äëÿ ËÅÂÎÉ ïëîñêîñòè */
    this.frustum[1][0] = clip[3] + clip[0];
    this.frustum[1][1] = clip[7] + clip[4];
    this.frustum[1][2] = clip[11] + clip[8];
    this.frustum[1][3] = clip[15] + clip[12];
    this.planeNormalize(this.frustum[1]);

    /* Íàõîäèì A, B, C, D äëÿ ÍÈÆÍÅÉ ïëîñêîñòè */
    this.frustum[2][0] = clip[3] + clip[1];
    this.frustum[2][1] = clip[7] + clip[5];
    this.frustum[2][2] = clip[11] + clip[9];
    this.frustum[2][3] = clip[15] + clip[13];
    this.planeNormalize(this.frustum[2]);

    /* ÂÅÐÕÍßß ïëîñêîñòü */
    this.frustum[3][0] = clip[3] - clip[1];
    this.frustum[3][1] = clip[7] - clip[5];
    this.frustum[3][2] = clip[11] - clip[9];
    this.frustum[3][3] = clip[15] - clip[13];
    this.planeNormalize(this.frustum[3]);

    /* ÇÀÄÍßß ïëîñêîñòü */
    this.frustum[4][0] = clip[3] - clip[2];
    this.frustum[4][1] = clip[7] - clip[6];
    this.frustum[4][2] = clip[11] - clip[10];
    this.frustum[4][3] = clip[15] - clip[14];
    this.planeNormalize(this.frustum[4]);

    /* ÏÅÐÅÄÍßß ïëîñêîñòü */
    this.frustum[5][0] = clip[3] + clip[2];
    this.frustum[5][1] = clip[7] + clip[6];
    this.frustum[5][2] = clip[11] + clip[10];
    this.frustum[5][3] = clip[15] + clip[14];
    this.planeNormalize(this.frustum[5]);
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
        d = vec3.dot(this.frustum[p], point.toVec()) + this.frustum[p][3];
        if ( d <= 0 )
            return false;
    }
    return true;
};

og.Frustum.prototype.containsSphere = function (sphere) {
    var d;
    for( var p = 0; p < 6; p++ ) {
        d = vec3.dot(this.frustum[p], sphere.center.toVec())+ this.frustum[p][3];
        if( d <= -sphere.radius )
            return -1;
    }
    return d + sphere.radius;
};

og.Frustum.prototype.containsBox = function (box) {
    var result = true, cout,cin;

    for(var i=0; i < 6; i++) {
        // reset counters for corners in and out
        cout=0; cin=0;
        // for each corner of the box do ...
        // get out of the cycle as soon as a box as corners
        // both inside and out of the frustum
        for (var k = 0; k < 8 && (cin==0 || cout==0); k++) {
            // is the corner outside or inside
            var d = vec3.dot(this.frustum[i], box.getCorner(k).toVec()) + this.frustum[i][3];
            if (d < 0)
                cout++;
            else
				cin++;
        }
        //if all corners are out
        if (cin==0)
			return false;
            // if some corners are out and others are in
        else if (cout>0)
            result = true;
    }
    return(result);
};
