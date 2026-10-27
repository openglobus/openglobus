import { QuadTreeStrategy } from "../../src/quadTree/QuadTreeStrategy";
import { NE, NW, SE, SW } from "../../src/quadTree/quadTree";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";

// Node tree in degrees made down to the depth, children split the extent in halves as Node.createChildNodes does
function createNode(extent, zoom, depth) {
    const node = {
        segment: {
            tileZoom: zoom,
            _extent: extent,
            getExtentLonLat: () => extent,
            projectNative: (lonLat) => lonLat
        },
        nodes: []
    };

    if (depth > 0) {
        const sw = extent.southWest,
            ne = extent.northEast,
            c = new LonLat((sw.lon + ne.lon) / 2, (sw.lat + ne.lat) / 2);
        node.nodes[NW] = createNode(
            new Extent(new LonLat(sw.lon, c.lat), new LonLat(c.lon, ne.lat)),
            zoom + 1,
            depth - 1
        );
        node.nodes[NE] = createNode(new Extent(c, ne), zoom + 1, depth - 1);
        node.nodes[SW] = createNode(new Extent(sw, c), zoom + 1, depth - 1);
        node.nodes[SE] = createNode(
            new Extent(new LonLat(c.lon, sw.lat), new LonLat(ne.lon, c.lat)),
            zoom + 1,
            depth - 1
        );
    }

    return node;
}

const getNodeByLonLat = (roots, lonLat, zoom) =>
    QuadTreeStrategy.prototype.getNodeByLonLat.call({ _quadTreeList: roots }, lonLat, zoom);

test("getNodeByLonLat returns the most detailed node made under the point", () => {
    const west = createNode(new Extent(new LonLat(-180, -90), new LonLat(0, 90)), 0, 3),
        east = createNode(new Extent(new LonLat(0, -90), new LonLat(180, 90)), 0, 3);

    for (const lonLat of [new LonLat(30, 10), new LonLat(-100, -60), new LonLat(179, 89), new LonLat(-1, -1)]) {
        const node = getNodeByLonLat([west, east], lonLat);
        expect(node.segment.tileZoom).toBe(3);
        expect(node.segment._extent.isInside(lonLat)).toBe(true);
    }
});

test("getNodeByLonLat stops at the zoom, and where the nodes are not made", () => {
    const root = createNode(new Extent(new LonLat(-180, -90), new LonLat(180, 90)), 0, 3);
    const lonLat = new LonLat(30, 10);

    const node = getNodeByLonLat([root], lonLat, 1);
    expect(node.segment.tileZoom).toBe(1);
    expect(node).toBe(root.nodes[NE]);

    root.nodes[NE].nodes = [];
    expect(getNodeByLonLat([root], lonLat)).toBe(root.nodes[NE]);

    expect(getNodeByLonLat([root], new LonLat(200, 10))).toBe(null);
});
