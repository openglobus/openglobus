export const VISIBLE_DISTANCE = 3570.0;
export const MAX_RENDERED_NODES = 1000;

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

/**
 * First index is {N,E,S,W} and second is {NW,NE,SW,SE}
 */
export const NEIGHBOUR = [
    [-1, -1, NW, NE],
    [NE, -1, SE, -1],
    [SW, SE, -1, -1],
    [-1, NW, -1, SW]
];

/**
 * Neighbor's oposite part. For example oposite side
 * on the east neighbor side is: [S][SE] = NE
 */
export const OPPART = [
    [SW, SE, NW, NE],
    [NE, NW, SE, SW],
    [SW, SE, NW, NE],
    [NE, NW, SE, SW]
];

/**
 * Corners of a side, first index is {N,E,S,W}, second one is the position along the side: from west to east or from
 * north to south. Parts have the same indexes as corners.
 */
export const SIDE_CORNER = [
    [NW, NE],
    [NE, SE],
    [SW, SE],
    [NW, SW]
];

/**
 * Neighbos's opside array order. For example NW node
 * by E side array index is 0, SE node by S side is 1.
 */
export const NOPSORD = [
    [0, 1, 0, 1],
    [0, 0, 1, 1],
    [0, 1, 0, 1],
    [0, 0, 1, 1]
];

/**
 * The second side of a corner. First index is the side {N,E,S,W}, second is the corner {NW,NE,SW,SE}, -1 when the
 * corner doesn't lie on the side.
 */
export const CORNERSIDE = [
    [W, E, -1, -1],
    [-1, N, -1, S],
    [-1, -1, W, E],
    [N, -1, S, -1]
];

/**
 * True when the position along the sides of two neighbors runs in opposite directions, both indexes are {N,E,S,W}.
 * Tiles are not mirrored, so they go round their common side in opposite directions, and the positions run along
 * the way on the S and W sides and against it on the N and E ones.
 */
export const SIDEFLIP = [
    [true, true, false, false],
    [true, true, false, false],
    [false, false, true, true],
    [false, false, true, true]
];

/**
 * The part of a root behind the part on its side. First index is the side, second is the side of the neighbor root,
 * third is the part.
 */
export const ROOTPART = [N, E, S, W].map((side) =>
    [N, E, S, W].map((neighborSide) =>
        [NW, NE, SW, SE].map((part) => {
            const position = NOPSORD[side][part];
            return SIDE_CORNER[neighborSide][SIDEFLIP[side][neighborSide] ? 1 - position : position];
        })
    )
);

/**
 * First index is {NW,NE,SW,SE}, another one is {N,E,S,W}
 */
export const COMSIDE = [
    [true, false, false, true],
    [true, true, false, false],
    [false, false, true, true],
    [false, true, true, false]
];

/**
 * Gets segment part left to right or up to down offset against neighbor side.
 * Where 0 - no offset 1 - half segment size offset.
 */
export const PARTOFFSET = [
    /*     N  E  S  W */
    /*NW*/ [0, 1, 0, 0],
    /*NE*/ [1, 0, 0, 0],
    /*SW*/ [0, 1, 0, 1],
    /*SE*/ [1, 1, 1, 1]
];
