'use strict';

import { Handler } from '../../src/og/webgl/Handler.js';
import { Renderer } from '../../src/og/renderer/Renderer.js';

let handler = new Handler("frame", { 'autoActivate': true });
let renderer = new Renderer(handler, { 'autoActivate': true });

window.renderer = renderer;
