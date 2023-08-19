'use strict';

import * as jd from './astro/jd.js';
import * as math from './math';
import * as mercator from './mercator';
import * as utils from './utils/shared';
import * as bv from './bv/index.js';
import * as control from './control/index';
import * as entity from './entity/index';
import * as layer from './layer/index.js';
import * as scene from './scene/index';
import * as terrain from './terrain/index.js';
import * as webgl from './webgl/index';

import {Globe} from './Globe.js';

import {Geoid} from './terrain/Geoid.js';

import {input} from './input/input';

import {
    Ellipsoid,
    wgs84
} from './ellipsoid/index';

import {
    Camera,
    PlanetCamera
} from './camera/index';

import {
    Line2,
    Line3,
    Mat3,
    Mat4,
    Plane,
    Quat,
    Ray,
    Vec2,
    Vec3,
    Vec4
} from './math/index';

import {Renderer} from './renderer/Renderer';
import {LightSource} from './light/LightSource.js';
import {Clock} from './Clock';
import {Events} from './Events';
import {Extent} from './Extent';
import {LonLat} from './LonLat';
import {RenderNode} from './scene/RenderNode';
import {Planet} from './scene/Planet.js';
import {Popup} from './Popup.js';

import {
    EarthQuadTreeStrategy,
    MarsQuadTreeStrategy,
    QuadTreeStrategy,
    quadTreeStrategyType,
    Wgs84QuadTreeStrategy
} from './quadTree/index.js';


import {Object3d} from './Object3d';

const {Handler} = webgl;
const {Control} = control;
const {Layer, Vector, XYZ, CanvasTiles, WMS, GeoImage, GeoVideo, GeoTexture2d} = layer;
const {EmptyTerrain, GlobusTerrain, MapboxTerrain, BilTerrain} = terrain;

const {
    Entity,
    EntityCollection,
    Billboard,
    Geometry,
    Label,
    PointCloud,
    Polyline,
    GeoObject
} = entity;

export {
    bv,
    jd,
    math,
    mercator,
    utils,
    input,
    layer,
    terrain,
    control,
    webgl,
    scene,
    entity,
    quadTreeStrategyType,
    wgs84,
    Layer,
    XYZ,
    Vector,
    CanvasTiles,
    WMS,
    GeoImage,
    GeoVideo,
    GeoTexture2d,
    EmptyTerrain,
    GlobusTerrain,
    MapboxTerrain,
    BilTerrain,
    Control,
    Camera,
    Ellipsoid,
    Planet,
    PlanetCamera,
    Globe,
    LightSource,
    Entity,
    EntityCollection,
    Billboard,
    Geometry,
    Label,
    PointCloud,
    Polyline,
    GeoObject,
    Handler,
    Renderer,
    Clock,
    Events,
    Extent,
    LonLat,
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
    Geoid,
    Popup,
    QuadTreeStrategy,
    MarsQuadTreeStrategy,
    EarthQuadTreeStrategy,
    Wgs84QuadTreeStrategy,
    Object3d
};
