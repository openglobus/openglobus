"use strict";

import { Handler } from "../../src/og/webgl/Handler.js";
import { Renderer } from "../../src/og/renderer/Renderer.js";
import { SimpleNavigation } from "../../src/og/control/SimpleNavigation.js";
import { Axes } from "../../src/og/scene/Axes.js";
import { Vec3 } from "../../src/og/math/Vec3.js";
import { RenderNode } from "../../src/og/scene/RenderNode.js";
import { Entity } from "../../src/og/Entity/Entity.js";
import { EntityCollection } from "../../src/og/Entity/EntityCollection.js";
import { Line3 } from "../../src/og/math/Line3.js";

let handler = new Handler("frame", { autoActivate: true });
let renderer = new Renderer(handler, {
    controls: [new SimpleNavigation()],
    autoActivate: true
});

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");

        this.ec = new EntityCollection({
            entities: [
                //new Entity({
                //    'name': 'test line',
                //    'strip': {
                //        'path': [[[0, 0, 0], [0, 100, 0]], [[200, 0, 0], [200, 100, 0]], [[250, 0, 100], [250, 100, 100]]],
                //    }
                //})
                new Entity({
                    name: "line1",
                    polyline: {
                        isClosed: false,
                        path3v: [
                            [
                                [0, 0, 0],
                                [100, 100, 100]
                            ],
                            [
                                [100, 0, 0],
                                [200, 100, 0],
                                [300, 0, 0]
                            ],
                            [
                                [0, 100, 0],
                                [0, 200, 0],
                                [0, 200, 100]
                            ]
                        ],
                        pathColors: [
                            [
                                [1, 0, 0, 1],
                                [0, 1, 0, 1]
                            ],
                            [
                                [1, 0, 0],
                                [0, 1, 0],
                                [0, 0, 1]
                            ],
                            [
                                [1, 1, 0],
                                [0, 0, 0]
                            ]
                        ],
                        thickness: 10
                    }
                })
            ]
        });
    }

    init() {
        this.ec.addTo(this);
    }

    frame() {}
}

let myScene = new MyScene();

renderer.addNodes([new Axes(), myScene]);

window.Vec3 = Vec3;
window.renderer = renderer;

function test() {
    let seg = new Line3(new Vec3(0, 1, 0), new Vec3(1, 2, 0));

    let p = new Vec3(-0.5, 0, 0),
        c = new Vec3();

    let res = seg.getNearestDistancePoint(p, c);

    console.log(res, c);

    //let p = myScene.ec._entities[1].polyline;
    //p.appendPoint3v(new Vec3(200, 200, 200));
    //p.appendPoint3v(new Vec3(-333, -333, -333));
    //p.setPoint3v(new Vec3(300, 300, 300), 3);
    //p.appendPoint3v(new Vec3(0, 0, 100), [0, 0, 1]);
    //p.setPointColor([1, 1, 1, 1], 0, 0);
    //p.insertPoint3v(new Vec3(50, 0, 50), 2, [0, 0, 1]);
    //p = myScene.ec._entities[0].strip;
    //p.insertEdge3v(new Vec3(20, 0, 50), new Vec3(20, 50, 50), 3);
}

window.Vec3 = Vec3;

window.test = test;

window.polyline = myScene.ec._entities[0].polyline;

test();
