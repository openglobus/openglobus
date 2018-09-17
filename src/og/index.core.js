'use strict';

import * as jd from './astro/jd.js';
import * as math from './math.js';
import * as utils from './utils/shared.js';

import { Box } from './bv/Box.js';
import { Sphere } from './bv/Sphere.js';

const bv = {
    'Box': Box,
    'Sphere': Sphere
};

import { Control } from './control/Control.js';
import { DebugInfo } from './control/DebugInfo';
import { SimpleNavigation } from './control/SimpleNavigation.js';
import { ShowFps } from './control/ShowFps.js';

const control = {
    'DebugInfo': DebugInfo,
    'SimpleNavigation': SimpleNavigation,
    'ShowFps': ShowFps
};

import { Entity } from './entity/Entity.js';
import { EntityCollection } from './entity/EntityCollection.js';
import { Billboard } from './entity/Billboard.js';
import { Label } from './entity/Label.js';
import { PointCloud } from './entity/PointCloud.js';
import { Polyline } from './entity/Polyline.js';

const entity = {
    'Billboard': Billboard,
    'Label': Label,
    'PointCloud': PointCloud,
    'Polyline': Polyline
};

import { input } from './input/input.js';

import { Camera } from './camera/Camera.js';

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
import { ShaderProgram } from './webgl/ShaderProgram.js';

const webgl = {
    'Framebuffer': Framebuffer,
    'Handler': Handler,
    'MultiFramebuffer': MultiFramebuffer,
    'types': types,
    'ShaderProgram': ShaderProgram
};

import { Renderer } from './renderer/Renderer.js';

import { LightSource } from './light/LightSource.js';

import { Clock } from './Clock.js';
import { Events } from './Events.js';

import { Axes } from './scene/Axes.js';
import { RenderNode } from './scene/RenderNode.js';

const scene = {
    'Axes': Axes
};

export {
    bv,
    jd,
    math,
    utils,
    input,
    Control,
    control,
    webgl,
    Camera,
    LightSource,
    EntityCollection,
    Handler,
    Renderer,
    Clock,
    Events,
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