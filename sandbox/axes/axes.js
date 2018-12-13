'use strict';

import { Handler } from '../../src/og/webgl/Handler.js';
import { Renderer } from '../../src/og/renderer/Renderer.js';
import { SimpleNavigation } from '../../src/og/control/SimpleNavigation.js';
import { Axes } from '../../src/og/scene/Axes.js';
import { Strip } from './Strip.js';
import { Vec3 } from '../../src/og/math/Vec3.js';

let handler = new Handler("frame", { 'autoActivate': true });
let renderer = new Renderer(handler, {
    'controls': [new SimpleNavigation()],
    'autoActivate': true
});

let strip = new Strip();

renderer.addNodes([new Axes(), strip]);

window.Vec3 = Vec3;
window.renderer = renderer;
window.strip = strip;

function test() {
    strip.addEdge(new Vec3(-2, 10, 0), new Vec3(0, 0, 0));
    strip.addEdge(new Vec3(10, 11, 0), new Vec3(10, 5, 0));
    strip.addEdge(new Vec3(20, 5, 10), new Vec3(20, 0, 10));
    strip.addEdge(new Vec3(30, 20, 0), new Vec3(30, 0, 0))
    strip.addEdge(new Vec3(60, 10, 0), new Vec3(60, 0, 10))
    strip.addEdge(new Vec3(0, 20, 40), new Vec3(0, 0, 40))

    //strip.addEdge(new Vec3(0, 10, 0), new Vec3(0, 0, 0));
    //strip.addEdge(new Vec3(10, 10, 0), new Vec3(10, 0, 0));
    //strip.addEdge(new Vec3(15, 10, 10), new Vec3(15, 0, 10));
}

test();