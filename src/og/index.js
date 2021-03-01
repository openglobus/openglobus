'use strict';

import * as jd from './astro/jd.js';
import * as math from './math.js';
import * as mercator from './mercator.js';
import * as utils from './utils/shared.js';

import * as control from './control/index.js';
import * as layer from './layer/index.js';
import * as bv from './bv/index.js';
import * as scene from './scene/index.js';
import * as entity from './entity/index.js';
import * as webgl from './webgl/index.js';
import * as terrain from './terrain/index.js';

import { Globe } from './Globe.js';

import { Geoid } from './terrain/Geoid.js';

import { input } from './input/input.js';

import { Ellipsoid, wgs84 } from './ellipsoid/index';

import { Camera, PlanetCamera } from './camera/index';

import { Line2, Line3, Mat3, Mat4, Plane, Quat, Ray, Vec2, Vec3, Vec4 } from './math/index';

import { Renderer } from './renderer/Renderer.js';

import { LightSource } from './light/LightSource.js';

import { Clock } from './Clock.js';
import { Events } from './Events.js';
import { Extent } from './Extent.js';
import { LonLat } from './LonLat.js';
import { RenderNode } from './scene/RenderNode.js';

import { Popup } from './Popup.js';

import pkg from "../../package.json";

const { Handler } = webgl, { Control } = control;
const { Layer } = layer;
const {
    EntityCollection,
    Entity
} = entity;

const version = {
    version: JSON.stringify(pkg.version)
};

export {
    version,
    bv,
    jd,
    math,
    mercator,
    utils,
    input,
    Layer,
    layer,
    terrain,
    Control,
    control,
    webgl,
    wgs84,
    Camera,
    Ellipsoid,
    PlanetCamera,
    Globe,
    LightSource,
    EntityCollection,
    Handler,
    Renderer,
    Clock,
    Events,
    Extent,
    LonLat,
    scene,
    RenderNode,
    Line2,
    Line3,
    Mat3,
    Mat4,
    Plane,
    Quat,
    Ray,
    Vec2,
    Vec3,
    Vec4,
    entity,
    Entity,
    Geoid,
    Popup
};