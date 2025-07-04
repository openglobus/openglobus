/* eslint-disable no-undef */
import {
    Globe,
    control,
    Vector,
    LonLat,
    Entity,
    OpenStreetMap,
    EmptyTerrain,
    RgbTerrain,
    GlobusRgbTerrain,
    Object3d,
    mercator,
    Bing,
    GeoVideo,
    XYZ,
    utils,
    PlanetCamera,
    Framebuffer,
    input,
    Program,
    Vec4,
    Vec2,
    GeoImage,
    Renderer,
    Vec3,
    Mat4,
    RenderNode,
    EntityCollection,
    scene,
    Gltf
} from "../../lib/og.es.js";

let renderer = new Renderer("frame", {
    msaa: 8,
    controls: [new control.SimpleNavigation({ speed: 0.01 }), new control.GeoObjectEditor()],
    autoActivate: true
});

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    init() {
        const baseObj = Object3d.createCube(0.4, 2, 0.4).translate(new Vec3(0, 1, 0)).setMaterial({
            ambient: "#882a2a",
            diffuse: "#fb3434",
            shininess: 1
        });

        const frustumObj = Object3d.createFrustum(3, 2, 1).setMaterial({
            ambient: "#236028",
            diffuse: "#1cdd23",
            shininess: 1
        });

        const cylinderObj = Object3d.createCylinder(1, 0, 1)
            .applyMat4(new Mat4().setRotation(new Vec3(1, 0, 0), (90 * Math.PI) / 180))
            .setMaterial({
                ambient: "#773381",
                diffuse: "#ef00ff",
                shininess: 1
            });

        let parentEntity = new Entity({
            cartesian: new Vec3(0, 0, 0),
            independentPicking: true
            // geoObject: {
            //     color: "rgb(90,90,90)",
            //     scale: 1,
            //     instanced: true,
            //     tag: `baseObj`,
            //     object3d: baseObj
            // }
        });

        let childEntity = new Entity({
            cartesian: new Vec3(0, 1, 0),
            independentPicking: true,
            relativePosition: true,
            geoObject: {
                color: "rgb(90,90,90)",
                instanced: true,
                tag: `frustumObj`,
                object3d: frustumObj
            }
        });

        let childChildEntity = new Entity({
            cartesian: new Vec3(0, 3, -1),
            independentPicking: true,
            relativePosition: true,
            geoObject: {
                color: "rgb(90,90,90)",
                instanced: true,
                tag: `cylinderObj`,
                object3d: cylinderObj
            }
        });

        childEntity.appendChild(childChildEntity);
        parentEntity.appendChild(childEntity);

        let collection = new EntityCollection({
            entities: [parentEntity]
        });

        collection.addTo(this);

        this.renderer.activeCamera.set(new Vec3(-4, 21, 23), new Vec3(1, 0, 0));

        this.renderer.activeCamera.update();
        DracoDecoderModule().then((decoderModule) => {
            Gltf.connectDracoDecoderModule(decoderModule);
            Gltf.loadGlb("./maxwell_the_cat.glb").then((gltf) => {
                // const models = gltf.getObjects3d();
                const entities = gltf.toEntities();
                console.log("entities", entities);
                const cat = entities[0];
                cat.setScale(0.1);
                childChildEntity.appendChild(entities[0]);
                // childChildEntity.appendChild(
                //     new Entity({
                //         cartesian: new Vec3(0, 3, -1),
                //         independentPicking: true,
                //         relativePosition: true,
                //         geoObject: {
                //             color: "rgb(90,90,90)",
                //             instanced: true,
                //             tag: `circleObj`,
                //             object3d: models[0]
                //         }
                //     })
                // );
                this.renderer.activeCamera.update();
            });
        });

        // Gltf.loadGlb("./CesiumMilkTruck.glb").then((gltf) => {
        //     const entity = gltf.toEntities()[0];
        //     entity.setScale(1);
        //     console.log('truck entity', entity);
        //     childChildEntity.appendChild(entity);
        //     this.renderer.activeCamera.update();
        // });
    }
}

renderer.addNodes([new scene.Axes(), new MyScene()]);

async function loadGLB(url) {
    const response = await fetch(url);
    const buffer = response.arrayBuffer();
    return await buffer;
}

function parseGLB(arrayBuffer) {
    const dv = new DataView(arrayBuffer);
    const magic = dv.getUint32(0, true);
    if (magic !== 0x46546c67) throw new Error("Not a valid GLB");

    const jsonChunkLength = dv.getUint32(12, true);
    const jsonChunkStart = 20;
    const jsonChunk = new TextDecoder().decode(
        new Uint8Array(arrayBuffer, jsonChunkStart, jsonChunkLength)
    );
    const gltf = JSON.parse(jsonChunk);
    const chunks = [];
    const binChunkStart = 20 + jsonChunkLength;
    for (let i = 0; i < gltf.bufferViews.length; i++) {
        const bufferView = gltf.bufferViews[i];
        const offset = i + 1;
        const start = binChunkStart + 8 * offset + bufferView.byteOffset;
        chunks.push(arrayBuffer.slice(start, start + bufferView.byteLength));
    }

    return { gltf, chunks };
}

function getDracoCompressedAccessor(gltf) {
    for (const mesh of gltf.meshes) {
        for (const primitive of mesh.primitives) {
            if (primitive.extensions && primitive.extensions["KHR_draco_mesh_compression"]) {
                return primitive.extensions["KHR_draco_mesh_compression"];
            }
        }
    }
    return null;
}

function decodeDraco(decoderModule, binChunk, gltf) {
    console.log(gltf);
    const byteOffset = 0; // optional: read from bufferView
    const dracoBufferView = new Uint8Array(binChunk, byteOffset); // if bufferView.byteOffset is available, use it
    const decoder = new decoderModule.Decoder();
    const buffer = new decoderModule.DecoderBuffer();
    buffer.Init(dracoBufferView, dracoBufferView.byteLength);

    const geometryType = decoder.GetEncodedGeometryType(buffer);
    if (geometryType !== decoderModule.TRIANGULAR_MESH) {
        throw new Error("Not a mesh");
    }

    const mesh = new decoderModule.Mesh();
    const status = decoder.DecodeBufferToMesh(buffer, mesh);
    if (!status.ok() || mesh.ptr === 0) {
        console.log(status.error_msg());
        throw new Error("Failed to decode Draco mesh");
    }

    const posAttrId = decoder.GetAttributeId(mesh, decoderModule.POSITION);
    const posAttr = decoder.GetAttribute(mesh, posAttrId);
    const numPoints = mesh.num_points();

    const pos = new decoderModule.DracoFloat32Array();
    decoder.GetAttributeFloatForAllPoints(mesh, posAttr, pos);

    const positions = new Float32Array(numPoints * 3);
    for (let i = 0; i < positions.length; i++) {
        positions[i] = pos.GetValue(i);
    }

    decoderModule.destroy(pos);
    decoderModule.destroy(mesh);
    decoderModule.destroy(decoder);
    decoderModule.destroy(buffer);

    return positions;
}

const test = async () => {
    // const arrayBuffer = await loadGLB("./CesiumMilkTruck.glb");
    // const { gltf, chunks } = parseGLB(arrayBuffer);
    // // const dracoExt = getDracoCompressedAccessor(gltf);
    // console.log(gltf, chunks);
    // // eslint-disable-next-line no-undef
    // const decoderModule = await DracoDecoderModule();
    // await decoderModule.ready;
    // const positions = decodeDraco(decoderModule, chunks[2], gltf);
    // console.log(positions);
    // const buffer = new decoderModule.DecoderBuffer();
    // buffer.Init(cat, cat.length);
    // const decoder = new decoderModule.Decoder();
    // const geometryType = decoder.GetEncodedGeometryType(buffer);
    // console.log(decoderModule, geometryType);
    // const gltf = await Gltf.loadGlb("./CesiumMilkTruck.glb");
    // const objects = gltf.getObjects3d();
    // console.log(objects);
    // await Gltf.loadGlb("./maxwell_the_cat.glb");
};

test();
