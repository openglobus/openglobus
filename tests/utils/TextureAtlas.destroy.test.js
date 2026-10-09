import { Handler } from "../../src/webgl/Handler";
import { TextureAtlas } from "../../src/utils/TextureAtlas";

createFakeGl() {
    const calls = [];
    let enumCounter = 0x1000;
    const target = { type: "webgl2", calls };

    return new Proxy(target, {
        get(t, prop) {
            if (prop in t) {
                return t[prop];
            }
            if (typeof prop === "string" && /^[A-Z][A-Z0-9_]*$/.test(prop)) {
                return (t[prop] = ++enumCounter);
            }
            return (t[prop] = (...args) => {
                calls.push(prop);
                if (prop === "getParameter") {
                    // MAX_VERTEX_ATTRIBS / MAX_TEXTURE_IMAGE_UNITS
                    return 8;
                }
                if (prop === "createTexture" || prop === "createBuffer") {
                    return { glObject: prop, args };
                }
                return undefined;
            });
        }
    });
}

class GatedImage {
    static instances = [];

    static reset() {
        GatedImage.instances = [];
    }

    static last() {
        return GatedImage.instances[GatedImage.instances.length - 1];
    }

    constructor() {
        this.width = 0;
        this.height = 0;
        this.onload = null;
        this.onerror = null;
        this.crossOrigin = "";
        this._src = "";
        GatedImage.instances.push(this);
    }

    set src(value) {
        this._src = value;
    }

    get src() {
        return this._src;
    }

    /** Releases the response: the browser fires load on the next task, we do it inline. */
    release(width = 8, height = 8) {
        this.width = width;
        this.height = height;
        this.atlasWidth = width;
        this.atlasHeight = height;
        this.onload && this.onload();
    }

    /** Releases the response as a failure. */
    fail() {
        this.onerror && this.onerror();
    }
}

function createLiveHandler() {
    // autoActivate is off, so the handler never looks for a real canvas context
    const handler = new Handler(undefined, { autoActivate: false });
    handler.gl = createFakeGl();
    return handler;
}

function createLiveAtlas() {
    const handler = createLiveHandler();
    const atlas = new TextureAtlas(64, 64);
    atlas.assignHandler(handler);
    return { handler, atlas };
}

describe("TextureAtlas lifecycle while an image is in flight", () => {
    let OriginalImage;

    beforeEach(() => {
        GatedImage.reset();
        OriginalImage = global.Image;
        global.Image = GatedImage;
    });

    afterEach(() => {
        global.Image = OriginalImage;
    });

    test("the image that arrives before the teardown is stored and textured", () => {
        const { handler, atlas } = createLiveAtlas();
        const success = vi.fn((img) => {
            atlas.addImage(img);
            atlas.createTexture();
        });

        atlas.loadImage("gated://before.png", success);
        const img = GatedImage.last();
        expect(img.src).toBe("gated://before.png");

        img.release();

        expect(success).toHaveBeenCalledTimes(1);
        expect(atlas.texture).toBeTruthy();

        handler.destroy();
    });

    test("the image that arrives after the handler is destroyed does not touch the lost context", () => {
        const { handler, atlas } = createLiveAtlas();
        const success = vi.fn((img) => {
            atlas.addImage(img);
            atlas.createTexture();
        });

        atlas.loadImage("gated://late.png", success);
        const img = GatedImage.last();
        expect(img.src).toBe("gated://late.png");

        handler.destroy();
        expect(handler.gl).toBeNull();

        // The response completes only now. Before the fix this threw
        // "Cannot read properties of null (reading 'deleteTexture')".
        expect(() => img.release()).not.toThrow();
    });

    test("destroying the atlas cancels the in flight image instead of delivering it", () => {
        const { handler, atlas } = createLiveAtlas();
        const success = vi.fn();

        atlas.loadImage("gated://cancelled.png", success);
        const img = GatedImage.last();

        atlas.destroy();
        handler.destroy();

        expect(() => img.release()).not.toThrow();
        expect(success).not.toHaveBeenCalled();
    });

    test("destroying the atlas twice is a no op", () => {
        const { handler, atlas } = createLiveAtlas();

        atlas.loadImage("gated://idempotent.png", vi.fn());

        atlas.destroy();
        expect(() => atlas.destroy()).not.toThrow();
        expect(atlas.texture).toBeNull();

        handler.destroy();
    });

    test("a queued image is not delivered to a destroyed atlas and does not stall the queue", () => {
        const { handler, atlas } = createLiveAtlas();
        const first = vi.fn();
        const second = vi.fn();

        atlas.loadImage("gated://first.png", first);
        atlas.loadImage("gated://second.png", second);

        // Only the first request is on the wire, the second one waits in the queue
        expect(GatedImage.instances).toHaveLength(1);

        atlas.destroy();
        handler.destroy();

        expect(() => GatedImage.last().release()).not.toThrow();

        expect(first).not.toHaveBeenCalled();
        expect(second).not.toHaveBeenCalled();
        // The cancelled queue must not start new requests either
        expect(GatedImage.instances).toHaveLength(1);
    });

    test("a failed image after the teardown does not throw", () => {
        const { handler, atlas } = createLiveAtlas();
        const success = vi.fn();

        atlas.loadImage("gated://broken.png", success);
        const img = GatedImage.last();

        atlas.destroy();
        handler.destroy();

        expect(() => img.fail()).not.toThrow();
        expect(success).not.toHaveBeenCalled();
    });

    test("a failed image keeps the queue moving on a live atlas", () => {
        const { handler, atlas } = createLiveAtlas();
        const broken = vi.fn();
        const good = vi.fn((img) => {
            atlas.addImage(img);
            atlas.createTexture();
        });

        atlas.loadImage("gated://broken.png", broken);
        atlas.loadImage("gated://good.png", good);
        expect(GatedImage.instances).toHaveLength(1);

        GatedImage.last().fail();

        // The failure dequeues the next request
        expect(GatedImage.instances).toHaveLength(2);
        expect(GatedImage.last().src).toBe("gated://good.png");

        GatedImage.last().release();

        expect(broken).not.toHaveBeenCalled();
        expect(good).toHaveBeenCalledTimes(1);

        handler.destroy();
    });

    test("destroying one atlas leaves an independent atlas loading and texturing", () => {
        const firstGlobe = createLiveAtlas();
        const secondGlobe = createLiveAtlas();

        const firstSuccess = vi.fn();
        const secondSuccess = vi.fn((img) => {
            secondGlobe.atlas.addImage(img);
            secondGlobe.atlas.createTexture();
        });

        firstGlobe.atlas.loadImage("gated://globe-one.png", firstSuccess);
        secondGlobe.atlas.loadImage("gated://globe-two.png", secondSuccess);

        const firstImg = GatedImage.instances[0];
        const secondImg = GatedImage.instances[1];

        firstGlobe.atlas.destroy();
        firstGlobe.handler.destroy();

        expect(() => firstImg.release()).not.toThrow();
        expect(firstSuccess).not.toHaveBeenCalled();

        // The surviving globe is untouched
        secondImg.release();
        expect(secondSuccess).toHaveBeenCalledTimes(1);
        expect(secondGlobe.handler.gl).not.toBeNull();
        expect(secondGlobe.atlas.texture).toBeTruthy();
        expect(secondGlobe.atlas.getImageTexCoordinates(secondImg)).toBeTruthy();

        secondGlobe.handler.destroy();
    });
});
