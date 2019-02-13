'use strict';

import { Handler } from '../../src/og/webgl/Handler.js';
import { Renderer } from '../../src/og/renderer/Renderer.js';
import { SimpleNavigation } from '../../src/og/control/SimpleNavigation.js';
import { Axes } from '../../src/og/scene/Axes.js';
import { Strip } from './Strip.js';
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
            'entities': [new Entity({
                'name': 'test line',
                'polyline': {
                    'path3v': [[[0, 0, 0], [10, 10, 10]]],
                    'thickness': 10
                }
            })]
        });
    }    

    init() {
        this.ec.addTo(this);
    }

    frame() {

    }
};

let strip = new Strip();
let myScene = new MyScene();

renderer.addNodes([new Axes(), strip, myScene]);

window.Vec3 = Vec3;
window.renderer = renderer;
window.strip = strip;

function test() {

    myScene.ec._entities[0].polyline.appendPoint3v(new Vec3(20, 0, 0));
    myScene.ec._entities[0].polyline.appendPoint3v(new Vec3(20, 20, 20));
    //strip.addEdge(new Vec3(-2, 10, 0), new Vec3(0, 0, 0));
    //strip.addEdge(new Vec3(10, 11, 0), new Vec3(10, 5, 0));
    //strip.addEdge(new Vec3(20, 5, 10), new Vec3(20, 0, 10));
    //strip.addEdge(new Vec3(30, 20, 0), new Vec3(30, 0, 0))
    //strip.addEdge(new Vec3(60, 10, 0), new Vec3(60, 0, 10))
    //strip.addEdge(new Vec3(0, 20, 40), new Vec3(0, 0, 40))

    //strip.addEdge(new Vec3(0, 10, 0), new Vec3(0, 0, 0));
    //strip.addEdge(new Vec3(10, 10, 0), new Vec3(10, 0, 0));
    //strip.addEdge(new Vec3(15, 10, 10), new Vec3(15, 0, 10));
}

test();