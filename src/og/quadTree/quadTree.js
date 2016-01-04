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

og.quadTree.OPSIDE = [og.quadTree.S, og.quadTree.W, og.quadTree.N, og.quadTree.E];

/**
 * Neighbor's oposite side. For example oposite side
 * on the east neighbor side is: [E][NW] = SW
 */
og.quadTree.NOPS = [[og.quadTree.NE, og.quadTree.NW, og.quadTree.SE, og.quadTree.SW],
                    [og.quadTree.SW, og.quadTree.SE, og.quadTree.NW, og.quadTree.NE],
                    [og.quadTree.NE, og.quadTree.NW, og.quadTree.SE, og.quadTree.SW],
                    [og.quadTree.SW, og.quadTree.SE, og.quadTree.NW, og.quadTree.NE]];

/**
 * Neighbos's opside array order. For example NW node
 * by E side array index is 0, SE node by S side is 1.
 */
og.quadTree.NOPSORD = [[0, 1, 0, 1],
                       [0, 0, 1, 1],
                       [0, 1, 0, 1],
                       [0, 0, 1, 1]];