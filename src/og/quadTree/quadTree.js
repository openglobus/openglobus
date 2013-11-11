goog.provide('og.quadTree');

og.quadTree.NW = 0;
og.quadTree.NE = 1;
og.quadTree.SW = 2;
og.quadTree.SE = 3;

og.quadTree.N = 0;
og.quadTree.E = 1;
og.quadTree.S = 2;
og.quadTree.W = 3;

og.quadTree.WALKTHROUGH = 0;
og.quadTree.RENDERING = 1;
og.quadTree.NOTRENDERING = 2;

og.quadTree.RATIO_LOD = 1.12;

og.quadTree.OPSIDE = [og.quadTree.S, og.quadTree.W, og.quadTree.N, og.quadTree.E];

og.quadTree.acceptableForRender = function (camera, sphere) {
    return camera.projectedSize(sphere.center) > og.quadTree.RATIO_LOD * sphere.radius;
};