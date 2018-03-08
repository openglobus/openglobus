/**
 * @module og/quadTree/quadTree
 */

'use strict';

export const NW = 0;
export const NE = 1;
export const SW = 2;
export const SE = 3;

export const N = 0;
export const E = 1;
export const S = 2;
export const W = 3;

export const NOTRENDERING = 0;
export const RENDERING = 1;
export const WALKTHROUGH = 2;

/**
 * World opposite side table.
 */
export const OPSIDE = [S, W, N, E];

export const NEIGHBOUR =
    [[-1, -1, NW, NE],
    [NE, -1, SE, -1],
    [SW, SE, -1, -1],
    [-1, NW, -1, SW]];

/**
 * Neighbor's oposite part. For example oposite side
 * on the east neighbor side is: [S][SE] = NE
 */
export const OPPART = [[SW, SE, NW, NE],
[NE, NW, SE, SW],
[SW, SE, NW, NE],
[NE, NW, SE, SW]];

/**
 * Neighbos's opside array order. For example NW node
 * by E side array index is 0, SE node by S side is 1.
 */
export const NOPSORD = [[0, 1, 0, 1],
[0, 0, 1, 1],
[0, 1, 0, 1],
[0, 0, 1, 1]];
