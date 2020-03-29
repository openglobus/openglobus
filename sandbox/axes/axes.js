'use strict';

import { Handler } from '../../src/og/webgl/Handler.js';
import { Renderer } from '../../src/og/renderer/Renderer.js';
import { SimpleNavigation } from '../../src/og/control/SimpleNavigation.js';
import { Axes } from '../../src/og/scene/Axes.js';
import { Vec3 } from '../../src/og/math/Vec3.js';
import { RenderNode } from '../../src/og/scene/RenderNode.js';
import { Entity } from '../../src/og/Entity/Entity.js';
import { EntityCollection } from '../../src/og/Entity/EntityCollection.js';

let handler = new Handler("frame", { 'autoActivate': true });
let renderer = new Renderer(handler, {
    'controls': [new SimpleNavigation()],
    'autoActivate': true
});

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");

        this.ec = new EntityCollection({
            'entities': [
                //new Entity({
                //    'name': 'test line',
                //    'strip': {
                //        'path': [[[0, 0, 0], [0, 100, 0]], [[200, 0, 0], [200, 100, 0]], [[250, 0, 100], [250, 100, 100]]],
                //    }
                //})
                new Entity({
                    'name': 'line1',
                    'polyline': {
                        'isClosed': false,
                        'path3v': [[[0, 0, 0], [100, 100, 100], [200, 200, 200]]],
                        'thickness': 10
                    }
                }),
                new Entity({
                    'name': 'line2',
                    'polyline': {
                        'isClosed': false,
                        'path3v': [[[0, 0, 0], [100, 100, 100]]],
                        'thickness': 10
                    }
                }),
                //new Entity({
                //    'name': 'test line',
                //    'ray': {
                //        'startPosition': [0, 0, 0],
                //        'endPosition': [100, 100, 100],
                //        'length': 100,
                //        'thickness': 15,
                //        'startColor': "#ffffff",
                //        'endColor': "#ff0000"
                //    }
                //}),
                //new Entity({
                //    'name': 'test line',
                //    'ray': {
                //        'startPosition': [10, 100, 0],
                //        'endPosition': [100, 100, 0],
                //        'length': 10,
                //        'thickness': 5,
                //        'startColor': "#0000ff",
                //        'endColor': "#00ff00"
                //    }
                //})
            ]
        });
    }

    init() {
        this.ec.addTo(this);
    }

    frame() {

    }
};

let myScene = new MyScene();

renderer.addNodes([new Axes(), myScene]);

window.Vec3 = Vec3;
window.renderer = renderer;

function test() {
    let p = myScene.ec._entities[1].polyline;
    p.appendPoint3v(new Vec3(200, 200, 200));
    //p.appendPoint3v(new Vec3(0, 0, 100), [0, 0, 1]);
    //p.setPointColor([1, 1, 1, 1], 0, 0);
    //p.insertPoint3v(new Vec3(50, 0, 50), 2, [0, 0, 1]);
    //p = myScene.ec._entities[0].strip;
    //p.insertEdge3v(new Vec3(20, 0, 50), new Vec3(20, 50, 50), 3);
}

window.test = test;

//test();