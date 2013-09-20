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

og.quadTree.ADJ = [[true, true, false, false],
                [false, true, false, true],
                [false, false, true, true],
                [true, false, true, false]];

og.quadTree.REFLECT = [[og.quadTree.SW, og.quadTree.SE, og.quadTree.NW, og.quadTree.NE],
                    [og.quadTree.NE, og.quadTree.NW, og.quadTree.SE, og.quadTree.SW],
                    [og.quadTree.SW, og.quadTree.SE, og.quadTree.NW, og.quadTree.NE],
                    [og.quadTree.NE, og.quadTree.NW, og.quadTree.SE, og.quadTree.SW]];

og.quadTree.COMMONSIDE = [[-1, og.quadTree.N, og.quadTree.W, -1],
                       [og.quadTree.N, -1, -1, og.quadTree.E],
                       [og.quadTree.W, -1, -1, og.quadTree.S],
                       [-1, og.quadTree.E, og.quadTree.S, -1]];

og.quadTree.OPQUAD = [og.quadTree.SE, og.quadTree.SW, og.quadTree.NE, og.quadTree.NW];