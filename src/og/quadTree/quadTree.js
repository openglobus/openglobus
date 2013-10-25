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

og.quadTree.ADJ = [[true,  true,  false, false],
                   [false, true,  false, true],
                   [false, false, true,  true],
                   [true,  false, true,  false]];

og.quadTree.REF = [[og.quadTree.SW, og.quadTree.SE, og.quadTree.NW, og.quadTree.NE],
                   [og.quadTree.NE, og.quadTree.NW, og.quadTree.SE, og.quadTree.SW],
                   [og.quadTree.SW, og.quadTree.SE, og.quadTree.NW, og.quadTree.NE],
                   [og.quadTree.NE, og.quadTree.NW, og.quadTree.SE, og.quadTree.SW]];

og.quadTree.OPSIDE = [og.quadTree.S, og.quadTree.W, og.quadTree.N, og.quadTree.E];

og.quadTree.ratioLOD = 1.18;

og.quadTree.acceptableForRender = function (camera, sphere, lodEps) {
    return camera.projectedSize(sphere.center) > lodEps * sphere.radius;
};