import { Entity } from "../../src/entity/Entity";
import { EntityCollection } from "../../src/entity/EntityCollection";
import { Handler } from "../../src/webgl/Handler";
import { Quat } from "../../src/math/Quat";
import { TextureAtlas } from "../../src/utils/TextureAtlas";

/** Same gated stand-in for the network as in tests/utils/TextureAtlas.destroy.test.js */
class GatedImage {
    static instances = [];

    static reset() {
        GatedImage.instances = [];
    }

    static bySrc(src) {
        return GatedImage.instances.find((i) => i.src === src);
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

    release(width = 8, height = 8) {
        this.width = width;
        this.height = height;
        this.atlasWidth = width;
        this.atlasHeight = height;
        this.onload && this.onload();
    }
}

function createFakeGl() {
    let enumCounter = 0x1000;
    const target = { type: "webgl2" };
    return new Proxy(target, {
        get(t, prop) {
            if (prop in t) {
                return t[prop];
            }
            if (typeof prop === "string" && /^[A-Z][A-Z0-9_]*$/.test(prop)) {
                return (t[prop] = ++enumCounter);
            }
            return (t[prop] = (...args) => {
                if (prop === "getParameter") return 8;
                if (prop === "createTexture" || prop === "createBuffer") return { glObject: prop, args };
                return undefined;
            });
        }
    });
}

/**
 * The smallest thing Billboard.setSrc needs: a scene that exposes a renderer owning
 * a billboards texture atlas.
 */
function createStubScene() {
    const handler = new Handler(undefined, { autoActivate: false });
    handler.gl = createFakeGl();

    const atlas = new TextureAtlas(64, 64);
    atlas.assignHandler(handler);

    return {
        handler,
        atlas,
        scene: {
            renderer: {
                billboardsTextureAtlas: atlas,
                assignPickingColor: () => {},
                clearPickingColor: () => {},
                requestRedraw: () => {}
            },
            updateBillboardsTexCoords: vi.fn(),
            getFrameRotation: () => Quat.IDENTITY
        }
    };
}

describe("Billboard image that arrives late", () => {
    let OriginalImage;

    beforeEach(() => {
        GatedImage.reset();
        OriginalImage = global.Image;
        global.Image = GatedImage;
    });

    afterEach(() => {
        global.Image = OriginalImage;
    });

    test("is applied while the billboard is still attached", () => {
        const { scene } = createStubScene();
        const collection = new EntityCollection();
        collection.scene = scene;

        const entity = new Entity({ billboard: { src: "gated://live.png" } });
        collection.add(entity);

        GatedImage.bySrc("gated://live.png").release();

        expect(entity.billboard.getImage()).toBeTruthy();
        expect(scene.updateBillboardsTexCoords).toHaveBeenCalledTimes(1);
    });

    test("is discarded when the billboard has been removed meanwhile", () => {
        const { scene } = createStubScene();
        const collection = new EntityCollection();
        collection.scene = scene;

        const entity = new Entity({ billboard: { src: "gated://removed.png" } });
        collection.add(entity);
        const img = GatedImage.bySrc("gated://removed.png");
        expect(img).toBeTruthy();

        collection.removeEntity(entity);

        expect(() => img.release()).not.toThrow();
        expect(entity.billboard.getImage()).toBeNull();
        expect(scene.updateBillboardsTexCoords).not.toHaveBeenCalled();
    });

    test("does not overwrite a newer source requested while it was loading", () => {
        const { scene } = createStubScene();
        const collection = new EntityCollection();
        collection.scene = scene;

        const entity = new Entity({ billboard: { src: "gated://old.png" } });
        collection.add(entity);

        entity.billboard.setSrc("gated://new.png");

        const oldImg = GatedImage.bySrc("gated://old.png");
        expect(oldImg).toBeTruthy();

        // The stale response lands first
        oldImg.release(8, 8);
        expect(entity.billboard.getImage()).toBeNull();

        // Dropping the stale response must not stall the queue: the new request starts
        const newImg = GatedImage.bySrc("gated://new.png");
        expect(newImg).toBeTruthy();

        newImg.release(16, 16);
        expect(entity.billboard.getImage()).toBe(newImg);
        expect(entity.billboard.getSrc()).toBe("gated://new.png");
    });
});
