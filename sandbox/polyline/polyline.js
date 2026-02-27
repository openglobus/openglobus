import {
    control,
    Entity,
    Object3d,
    Renderer,
    Vec3,
    Mat4,
    RenderNode,
    EntityCollection,
    scene,
} from "../../lib/og.es.js";

let renderer = new Renderer("frame", {
    msaa: 0,
    controls: [new control.SimpleNavigation({speed: 0.01})],
    autoActivate: true
});

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    init() {

        let e1 = new Entity({
            polyline: {
                path3v: [[[5, 0, 5], [5, 5, 5], [0, 5, 0]], [[-5, 0, -5], [-5, 5, -5]]],
                thickness: 22.5,
                src: ["template3.png", "./template2.png"],
                //color: ["white", "white", "white"],
                isTextured: true,
                //isClosed: [true, true, true],
            }
        });

        let e2 = new Entity({
            polyline: {
                path3v: [[[18, 15, 10], [17.956, 15, 10.836], [17.825, 15, 11.663], [17.608, 15, 12.472]/*[20,20,20], [17.308, 15, 13.254]*/, [16.928, 15, 14], [16.472, 15, 14.702], [15.945, 15, 15.353], [15.353, 15, 15.945], [14.702, 15, 16.472], [14, 15, 16.928], [13.254, 15, 17.308], [12.472, 15, 17.608], [11.663, 15, 17.825], [10.836, 15, 17.956], [10, 15, 18], [9.164, 15, 17.956], [8.337, 15, 17.825], [7.528, 15, 17.608], [6.746, 15, 17.308], [6, 15, 16.928], [5.298, 15, 16.472], [4.647, 15, 15.945], [4.055, 15, 15.353], [3.528, 15, 14.702], [3.072, 15, 14], [2.692, 15, 13.254], [2.392, 15, 12.472], [2.175, 15, 11.663], [2.044, 15, 10.836], [2, 15, 10], [2.044, 15, 9.164], [2.175, 15, 8.337], [2.392, 15, 7.528], [2.692, 15, 6.746], [3.072, 15, 6], [3.528, 15, 5.298], [4.055, 15, 4.647], [4.647, 15, 4.055], [5.298, 15, 3.528], [6, 15, 3.072], [6.746, 15, 2.692], [7.528, 15, 2.392], [8.337, 15, 2.175], [9.164, 15, 2.044], [10, 15, 2], [10.836, 15, 2.044], [11.663, 15, 2.175], [12.472, 15, 2.392], [13.254, 15, 2.692], [14, 15, 3.072], [14.702, 15, 3.528], [15.353, 15, 4.055], [15.945, 15, 4.647], [16.472, 15, 5.298], [16.928, 15, 6], [17.308, 15, 6.746], [17.608, 15, 7.528], [17.825, 15, 8.337], [17.956, 15, 9.164]]],
                thickness: 5.5,
                src: ["./template2.png"],
                color: ["white"],
                isClosed: [true],
                //texParams:[{texOffsetSpeed: 0.008}]
            }
        });

        let collection = new EntityCollection({
            entities: [e1, e2]
        });

        collection.addTo(this);

        window.collection = collection;

        this.renderer.activeCamera.set(new Vec3(-4, 11, 13), new Vec3(1, 0, 0));
        this.renderer.activeCamera.update();
    }
}

renderer.addNodes([
    new scene.Axes(),
    new MyScene()
]);

function test_appendPath3v(i = 0) {
    collection.getEntities()[i].polyline.appendPath3v([[15, 10, 15], [15, 15, 15], [10, 15, 10], [15, 50, 15]]);
}

function test_setPath3v(i, path3v, pathColors, forceEqual, segmentIndex) {
    collection.getEntities()[i].polyline.setPath3v(path3v, pathColors, forceEqual, segmentIndex);
}

function test_removePath(i, segmentIndex) {
    collection.getEntities()[i].polyline.removePath(segmentIndex);
}

function test_setPathTexParams(i, segmentIndex, texOffset, strokeSize, texOffsetSpeed) {
    collection.getEntities()[i].polyline.setPathTexParams(texOffset, strokeSize, texOffsetSpeed, segmentIndex);
}

function test_setPathSrc(i, src, segmentIndex){
    collection.getEntities()[i].polyline.setPathSrc(src, segmentIndex);
}

function test_setPath3vEXT() {
    collection.getEntities()[0].polyline.setPath3v([new Vec3(2, 0, 2), new Vec3(2, 2, 2)], [[0, 1, 0], [1, 0, 0]], true, 0);
    collection.getEntities()[0].polyline.setPath3v([new Vec3(-2, 0, -2), new Vec3(-2, 2, -2), new Vec3(10, 10, 10)], [[0, 1, 0], [1, 0, 0], [1,1,1]], true, 1);
}

function test_setPath3vEXT2() {
    collection.getEntities()[0].polyline.setPath3v(
        [[new Vec3(7, 0, 7), new Vec3(7, 7, 7)], [new Vec3(-7, 0, -7), new Vec3(-7, 7, -7)]],
        null, false
    );
}

function test_addPoint3v(i = 0, poi, segIndex) {
    collection.getEntities()[i].polyline.addPoint3v(new Vec3(poi[0], poi[1], poi[2]), segIndex);
}

function test_removePoint(i, index, segmentIndex) {
    collection.getEntities()[i].polyline.removePoint(index, segmentIndex);
}

function test_setPoint3v(i, coords, index, segmentIndex) {
    collection.getEntities()[i].polyline.setPoint3v(new Vec3(coords[0], coords[1], coords[2]), index, segmentIndex);
}

// function test_start() {
//     let counter = 0
//     renderer.events.on("draw", () => {
//         if (counter % 2) {
//             test_appendPath3v(1);
//         } else {
//             test_removePath(1, 1);
//         }
//         counter++;
//     });
// }

Object.assign(window, {
    test_setPathSrc,
    test_setPathTexParams,
    //test_start,
    test_appendPath3v,
    test_addPoint3v,
    test_setPath3v,
    test_setPath3vEXT,
    test_removePoint,
    test_removePath,
    test_setPoint3v,
    test_setPath3vEXT2
});
