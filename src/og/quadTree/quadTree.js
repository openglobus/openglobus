goog.provide('og.quadTree');

/**
 * @namespace og.quadTree
 */

og.quadTree.NW = 0;
og.quadTree.NE = 1;
og.quadTree.SW = 2;
og.quadTree.SE = 3;

og.quadTree.N = 0;
og.quadTree.E = 1;
og.quadTree.S = 2;
og.quadTree.W = 3;

og.quadTree.NOTRENDERING = 0;
og.quadTree.RENDERING = 1;
og.quadTree.WALKTHROUGH = 2;

/**
 * World opposite side table.
 */
og.quadTree.OPSIDE = [og.quadTree.S, og.quadTree.W, og.quadTree.N, og.quadTree.E];

og.quadTree.NEIGHBOUR = [[-1, -1, og.quadTree.NW, og.quadTree.NE],
                         [og.quadTree.NE, -1, og.quadTree.SE, -1],
                         [og.quadTree.SW, og.quadTree.SE, -1, -1],
                         [-1, og.quadTree.NW, -1, og.quadTree.SW]];

/**
 * Neighbor's oposite part. For example oposite side
 * on the east neighbor side is: [S][SE] = NE
 */
og.quadTree.OPPART = [[og.quadTree.SW, og.quadTree.SE, og.quadTree.NW, og.quadTree.NE],
                      [og.quadTree.NE, og.quadTree.NW, og.quadTree.SE, og.quadTree.SW],
                      [og.quadTree.SW, og.quadTree.SE, og.quadTree.NW, og.quadTree.NE],
                      [og.quadTree.NE, og.quadTree.NW, og.quadTree.SE, og.quadTree.SW]];

/**
 * Neighbos's opside array order. For example NW node
 * by E side array index is 0, SE node by S side is 1.
 */
og.quadTree.NOPSORD = [[0, 1, 0, 1],
                       [0, 0, 1, 1],
                       [0, 1, 0, 1],
                       [0, 0, 1, 1]];
