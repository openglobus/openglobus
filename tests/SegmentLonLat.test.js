import { Extent } from "../src/Extent";
import { LonLat } from "../src/LonLat";
import { Planet } from "../src/scene/Planet";
import { SegmentLonLat } from "../src/segment/SegmentLonLat";
import { QuadTreeStrategy } from "../src/quadTree/QuadTreeStrategy";
import { Node } from "../src/quadTree/Node";

const mockPlanet = () => {
    const planet = new Planet();
    planet.renderer = {
        handler: {
            gl: {
                createBuffer: vi.fn(),
                createTexture: vi.fn(),
                bindBuffer: vi.fn(),
                bufferData: vi.fn(),
                deleteBuffer: vi.fn(),
                deleteTexture: vi.fn()
            }
        }
    };
    planet.terrain = { 
        gridSizeByZoom: {
            0: 256,
            1: 512,
            2: 1024
        } 
    };
    planet.solidTextureOne = null;
    planet.solidTextureTwo = null;
    planet._createdNodesCount = 0;
    return planet;
};

const mockQuadTreeStrategy = (planet) => {
    const strategy = new QuadTreeStrategy({ planet });
    return strategy;
};

const mockNode = (quadTreeStrategy) => {
    const node = new Node(
        SegmentLonLat,
        quadTreeStrategy,
        0, // partId
        null, // parent
        0, // tileZoom
        new Extent(new LonLat(-180, -90), new LonLat(180, 90))
    );
    return node;
};

test("Testing SegmentLonLat", () => {
    const planet = mockPlanet();
    const quadTreeStrategy = mockQuadTreeStrategy(planet);
    const node = mockNode(quadTreeStrategy);
    const extent = new Extent(new LonLat(-180, -90), new LonLat(180, 90));
    
    const segmentLonLat = new SegmentLonLat(node, quadTreeStrategy, 0, extent);
    expect(segmentLonLat).toBeTruthy();
});
