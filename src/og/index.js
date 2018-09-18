'use strict';

import '../../css/og.css';

import * as jd from './astro/jd.js';
import * as math from './math.js';
import * as mercator from './mercator.js';
import * as utils from './utils/shared.js';

import { Globe } from './Globe.js';

import { Box } from './bv/Box.js';
import { Sphere } from './bv/Sphere.js';

const bv = {
    'Box': Box,
    'Sphere': Sphere
};

import { CanvasTiles } from './layer/CanvasTiles.js';
import { GeoImage } from './layer/GeoImage.js';
import { GeoTexture2d } from './layer/GeoTexture2d.js';
import { GeoVideo } from './layer/GeoVideo.js';
import { Layer } from './layer/Layer.js';
import { Vector } from './layer/Vector.js';
import { WMS } from './layer/WMS.js';
import { XYZ } from './layer/XYZ.js';

const layer = {
    'CanvasTiles': CanvasTiles,
    'GeoImage': GeoImage,
    'GeoTexture2d': GeoTexture2d,
    'GeoVideo': GeoVideo,
    'Vector': Vector,
    'WMS': WMS,
    'XYZ': XYZ,
};

import { Control } from './control/Control.js';
import { DebugInfo } from './control/DebugInfo';
import { EarthCoordinates } from './control/EarthCoordinates.js';
import { GeoImageDragControl } from './control/GeoImageDragControl.js';
import { KeyboardNavigation } from './control/KeyboardNavigation.js';
import { LayerSwitcher } from './control/LayerSwitcher.js';
import { MouseNavigation } from './control/MouseNavigation.js';
import { ToggleWireframe } from './control/ToggleWireframe.js';
import { TouchNavigation } from './control/TouchNavigation.js';
import { SimpleNavigation } from './control/SimpleNavigation.js';
import { ShowFps } from './control/ShowFps.js';
import { Sun } from './control/Sun.js';
import { ZoomControl } from './control/ZoomControl.js';

const control = {
    'DebugInfo': DebugInfo,
    'EarthCoordinates': EarthCoordinates,
    'GeoImageDragControl': GeoImageDragControl,
    'KeyboardNavigation': KeyboardNavigation,
    'LayerSwitcher': LayerSwitcher,
    'MouseNavigation': MouseNavigation,
    'ToggleWireframe': ToggleWireframe,
    'TouchNavigation': TouchNavigation,
    'SimpleNavigation': SimpleNavigation,
    'ShowFps': ShowFps,
    'Sun': Sun,
    'ZoomControl': ZoomControl
};

import { Entity } from './entity/Entity.js';
import { EntityCollection } from './entity/EntityCollection.js';
import { Billboard } from './entity/Billboard.js';
import { Geometry } from './entity/Geometry.js';
import { Label } from './entity/Label.js';
import { PointCloud } from './entity/PointCloud.js';
import { Polyline } from './entity/Polyline.js';

const entity = {
    'Billboard': Billboard,
    'Geometry': Geometry,
    'Label': Label,
    'PointCloud': PointCloud,
    'Polyline': Polyline
};

import { input } from './input/input.js';

import { Ellipsoid } from './ellipsoid/Ellipsoid.js';
import { wgs84 } from './ellipsoid/wgs84.js';

import { EmptyTerrain } from './terrain/EmptyTerrain.js';
import { GlobusTerrain } from './terrain/GlobusTerrain.js';
import { MapboxTerrain } from './terrain/MapboxTerrain.js';

const terrain = {
    'EmptyTerrain': EmptyTerrain,
    'GlobusTerrain': GlobusTerrain,
    'MapboxTerrain': MapboxTerrain
};

import { Camera } from './camera/Camera.js';
import { PlanetCamera } from './camera/PlanetCamera.js';

import { Line2 } from './math/Line2.js';
import { Line3 } from './math/Line3.js';
import { Mat3 } from './math/Mat3.js';
import { Mat4 } from './math/Mat4.js';
import { Plane } from './math/Plane.js';
import { Quat } from './math/Quat.js';
import { Ray } from './math/Ray.js';
import { Vec2 } from './math/Vec2.js';
import { Vec3 } from './math/Vec3.js';
import { Vec4 } from './math/Vec4.js';

import { Framebuffer } from './webgl/Framebuffer.js';
import { Handler } from './webgl/Handler.js';
import { MultiFramebuffer } from './webgl/MultiFramebuffer.js';
import { types } from './webgl/types.js';
import { Program } from './webgl/Program.js';

const webgl = {
    'Framebuffer': Framebuffer,
    'Handler': Handler,
    'MultiFramebuffer': MultiFramebuffer,
    'types': types,
    'Program': Program
};

import { Renderer } from './renderer/Renderer.js';

import { LightSource } from './light/LightSource.js';

import { Clock } from './Clock.js';
import { Events } from './Events.js';
import { Extent } from './Extent.js';
import { LonLat } from './LonLat.js';

import { Axes } from './scene/Axes.js';
import { Planet } from './scene/Planet.js';
import { RenderNode } from './scene/RenderNode.js';

const scene = {
    'Planet': Planet,
    'Axes': Axes
};

export {
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
    Entity
};