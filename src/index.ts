import "../css/og.css";

import * as jd from "./astro/jd";
import * as math from "./math";
import * as mercator from "./mercator";
import * as utils from "./utils/shared";
import * as bv from "./bv/index";
import * as control from "./control/index";
import * as scene from "./scene/index";
import * as terrain from "./terrain/index";
import * as layer from "./layer/index";
import * as ui from "./ui/index";
import * as webgl from "./webgl/index";

export * from "./control/Control";
export * from "./entity/index";
export * from "./layer/index";
export * from "./Globe";

export type { IControlParams } from "./control/Control";
export type { ITouchState } from "./renderer/RendererEvents";
export type { IDeferredShadingPass } from "./renderer/IDeferredShadingPass";
export type { ITransparencyPass } from "./renderer/ITransparencyPass";
export { PhongDeferredShading } from "./renderer/PhongDeferredShading";
export { AtmosphereDeferredShading } from "./renderer/AtmosphereDeferredShading";
export { WOITPass } from "./renderer/WOITPass";
export { SHADE_MODE_UNLIT, SHADE_MODE_PHONG, SHADE_MODE_PBR } from "./shadeModeConstants";

declare const __OG_VERSION__: string;
export const version = __OG_VERSION__;
((globalThis as any).og ??= {}).version = __OG_VERSION__;

import { Geoid } from "./terrain/Geoid";

import { input } from "./input/input";

import { Ellipsoid, wgs84, moon, mars } from "./ellipsoid/index";

import { Camera, PlanetCamera } from "./camera/index";

import { Line2, Line3, Mat3, Mat4, Plane, Quat, Ray, Vec2, Vec3, Vec4 } from "./math/index";

import { Renderer } from "./renderer/Renderer";
import { LightSource } from "./light/LightSource";
import { Clock } from "./Clock";
import { Events, type EventsHandler, createEvents } from "./Events";
import { Extent } from "./Extent";
import { LonLat } from "./LonLat";
import { RenderNode } from "./scene/RenderNode";
import { Planet } from "./scene/Planet";
import { Popup } from "./Popup";
import { Loader, type IResponse } from "./utils/Loader";

import {
    EarthQuadTreeStrategy,
    EquiQuadTreeStrategy,
    QuadTreeStrategy,
    quadTreeStrategyType,
    Wgs84QuadTreeStrategy
} from "./quadTree/index";

import { Object3d } from "./Object3d";

import { Handler, Program, Framebuffer, Multisample } from "./webgl/index";

import { EmptyTerrain, GlobusTerrain, RgbTerrain, BilTerrain, GlobusRgbTerrain } from "./terrain/index";

import { MoveAxisEntity } from "./control/geoObjectEditor/MoveAxisEntity";
import { Gltf } from "./utils/gltf/gltfParser";
import { Easing } from "./utils/easing";
import type { EasingFunction } from "./utils/easing";

export {
    bv,
    jd,
    math,
    mercator,
    utils,
    input,
    control,
    scene,
    quadTreeStrategyType,
    wgs84,
    moon,
    mars,
    terrain,
    layer,
    ui,
    webgl,
    Easing,
    EasingFunction,
    Framebuffer,
    EmptyTerrain,
    GlobusTerrain,
    RgbTerrain,
    GlobusRgbTerrain,
    BilTerrain,
    Camera,
    Ellipsoid,
    Planet,
    PlanetCamera,
    LightSource,
    Program,
    Handler,
    Multisample,
    Renderer,
    Clock,
    Events,
    EventsHandler,
    createEvents,
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
    EquiQuadTreeStrategy,
    EarthQuadTreeStrategy,
    Wgs84QuadTreeStrategy,
    Object3d,
    Gltf,
    MoveAxisEntity,
    Loader,
    IResponse
};
