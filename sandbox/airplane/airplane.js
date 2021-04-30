'use strict';

import * as math from '../../src/og/math.js';
import { RADIANS, MAX32 } from '../../src/og/math.js';
import { SimpleNavigation } from '../../src/og/control/SimpleNavigation.js';
import { RenderNode } from '../../src/og/scene/RenderNode.js';
import { Program } from '../../src/og/webgl/Program.js';
import { Vec3 } from '../../src/og/math/Vec3.js';
import { Mat4 } from '../../src/og/math/Mat4.js';
import { Quat } from '../../src/og/math/Quat.js';
import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { LonLat } from '../../src/og/LonLat.js';
import { Planet } from '../../src/og/scene/Planet.js';

const MODEL_FORWARD = new Vec3(0.0, 0.0, -1.0);
const MAX_SCALE = 0.007;
const MIN_SCALE = 0.003;
const MAX_SCALE_HEIGHT = 3000.0;
const MIN_SCALE_HEIGHT = 1900000.0;

//function getNorthBearingRotationFrame(cartesian) {
//    let n = cartesian.normal();
//    let t = Vec3.proj_b_to_plane(Vec3.UNIT_Y, n);
//    return Quat.getLookRotation(t, n);
//};

class Planemarker {
    constructor(options) {
        options = options || {};

        //this.orientation = options.orientation ? option.orientation : new Quat(0.0, 0.0, 0.0, 1.0);
        //this.position = options.position ? options.position : new Vec3();
        this.scale = options.scale || 0.02;

        //this._mxModel = new Mat4().setIdentity();
        //this._position = new Float32Array([0, 0, 0]);
        this._vericesBuffer = null;
        this._indicesBuffer = null;

        this._posCart = new Vec3();
        this._posHigh = new Float32Array([0, 0, 0]);
        this._posLow = new Float32Array([0, 0, 0]);

        this._lonLatAlt = new LonLat(0, 0, 100000);

        this.scaleByDistance = new Float32Array(options.scaleByDistance || [MAX32, MAX32, MAX32]);

        this._pitch = 0.0;
        this._yaw = 0.0;
        this._roll = 0.0;

        this._planet = null;
        this._scene = null;

        this._color = new Float32Array([1, 1, 0, 1]);

        this._uOrientation = new Float32Array(3);
    }

    set(lon, lat, alt, heading, speed) {
        this._lonLatAlt.lon = lon;
        this._lonLatAlt.lat = lat;
        this._lonLatAlt.height = alt;
        this._heading = heading || this._heading;
        this._speed = speed || this._speed;
        this.update();
    }

    setLonLat(lon, lat, alt) {
        this._lonLatAlt.lon = lon;
        this._lonLatAlt.lat = lat;
        this._lonLatAlt.height = alt;
        this.update();
    }

    bind(scene) {
        this._scene = scene;
        this.init();
    }

    bindPlanet(planet) {
        this._planet = planet;
        this.update();
    }

    update() {
        this._qNorthFrame = new Quat();

        this._planet.ellipsoid.lonLatToCartesianRes(this._lonLatAlt, this._posCart);
        this._qNorthFrame = Planet.getBearingNorthRotationQuat(this._posCart);

        let qq = Quat.yRotation(this._yaw * RADIANS).mul(this._qNorthFrame).conjugate();
        this.orientation = qq.mulVec3(MODEL_FORWARD).normalize();

        this._uOrientation[0] = this.orientation.x;
        this._uOrientation[1] = this.orientation.y;
        this._uOrientation[2] = this.orientation.z;
    }

    init() {

        this._scene.renderer.handler.addProgram(new Program("AirplaneShader", {
            uniforms: {
                viewMatrix: 'mat4',
                projectionMatrix: 'mat4',
                normalMatrix: 'mat3',

                direction: 'vec3',
                scale: 'float',
                color: 'vec4',
                uScaleByDistance: 'vec3',
                pitchRoll: 'vec2',

                positionHigh: "vec3",
                positionLow: "vec3",
                eyePositionHigh: "vec3",
                eyePositionLow: "vec3",

                lightsPositions: 'vec4',
                lightsParamsv: 'vec3',
                lightsParamsf: 'float'
            },
            attributes: {
                aVertexPosition: 'vec3',
                aVertexNormal: 'vec3'
            },
            vertexShader:
                `precision highp float;

            attribute vec3 aVertexPosition;
            attribute vec3 aVertexNormal; 
            
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform mat3 normalMatrix;
            uniform vec3 uScaleByDistance;
            uniform vec2 pitchRoll;
            
            uniform vec3 direction;

            uniform float scale;

            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;

            uniform vec3 positionHigh;
            uniform vec3 positionLow;                

            varying vec3 vNormal;
            varying vec4 vPosition;         
            
            const float RADIANS = 3.141592653589793 / 180.0;

            void main(void) {                    

                float roll = pitchRoll.y * RADIANS;
                mat3 rotZ = mat3(
                     vec3(cos(roll), -sin(roll), 0.0),
                     vec3(sin(roll), cos(roll), 0.0), 
                     vec3(0.0, 0.0, 1.0) 
                );

                float pitch = pitchRoll.x * RADIANS;
                mat3 rotX = mat3(
                    vec3(1.0, 0.0, 0.0),
                    vec3(0.0, cos(pitch), -sin(pitch)), 
                    vec3(0.0, sin(pitch), cos(pitch)) 
               );

                vec3 position = positionHigh + positionLow;
                vec3 r = cross(normalize(-position), direction);
                mat3 modelMatrix = mat3(r, normalize(position), -direction) * rotX * rotZ; /*up=-cross(direction, r)*/

                vec3 look = position - (eyePositionHigh + eyePositionLow);
                float lookLength = length(look);
                float scd = scale * (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookLength)) * (1.0 - step(uScaleByDistance[2], lookLength));
                vNormal = normalMatrix * modelMatrix * aVertexNormal;

                vec3 highDiff = positionHigh - eyePositionHigh;
                vec3 lowDiff = positionLow + modelMatrix * (aVertexPosition * scd) - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vPosition = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);

                gl_Position = projectionMatrix * vPosition;
            }`,
            fragmentShader:
                `precision highp float;

                uniform vec4 color;
                
                #define MAX_POINT_LIGHTS 1
                
                uniform vec4 lightsPositions[MAX_POINT_LIGHTS];
                uniform vec3 lightsParamsv[MAX_POINT_LIGHTS * 3];
                uniform float lightsParamsf[MAX_POINT_LIGHTS];
                
                varying vec3 vNormal;
                varying vec4 vPosition;
                
                void main(void) {
                    vec3 lightWeighting;
                    vec3 lightDirection;
                    vec3 normal;
                    vec3 eyeDirection;
                    vec3 reflectionDirection;
                    float specularLightWeighting;
                    float diffuseLightWeighting;
                
                    lightDirection = normalize(lightsPositions[0].xyz - vPosition.xyz * lightsPositions[0].w);
                    normal = normalize(vNormal);
                    eyeDirection = normalize(-vPosition.xyz);
                    reflectionDirection = reflect(-lightDirection, normal);
                    specularLightWeighting = pow(max(dot(reflectionDirection, eyeDirection), 0.0), lightsParamsf[0]);
                    diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);
                    lightWeighting = lightsParamsv[0] + lightsParamsv[1] * diffuseLightWeighting + lightsParamsv[2] * specularLightWeighting;
                    gl_FragColor = vec4(lightWeighting, 1.0) * color;
                }`
        }));

        //Create buffers
        var vertices = [
            -1.0, 0.0, 0.5,
            0.0, 0.0, -0.5,
            1.0, 0.0, 0.5
        ];

        this._vericesBuffer = this._scene.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, vertices.length / 3);

        //Create buffers
        var normals = [
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0
        ];

        this._normalsBuffer = this._scene.renderer.handler.createArrayBuffer(new Float32Array(normals), 3, normals.length / 3);

        var cubeVertexIndices = [
            0, 1, 2,
            0, 2, 1
        ];

        this._indicesBuffer = this._scene.renderer.handler.createElementArrayBuffer(new Uint16Array(cubeVertexIndices), 1, cubeVertexIndices.length);
    }

    draw() {

        var r = this._scene.renderer;
        var sh = r.handler.programs.AirplaneShader;
        var p = sh._program,
            u = p.uniforms;
        var gl = r.handler.gl;

        sh.activate();

        let t = 1.0 - (r.activeCamera._lonLat.height - MAX_SCALE_HEIGHT) / (MIN_SCALE_HEIGHT - MAX_SCALE_HEIGHT);
        this._distanceToCamera = this._posCart.distance(r.activeCamera.eye);
        this._viewScale = math.lerp(t < 0 ? 0 : t, this.scale, MIN_SCALE) * this._distanceToCamera;
        Vec3.doubleToTwoFloat32Array(this._posCart, this._posHigh, this._posLow);

        gl.uniform3fv(u.uScaleByDistance, this.scaleByDistance);

        gl.uniform3fv(u.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(u.eyePositionLow, r.activeCamera.eyeLow);

        gl.uniformMatrix4fv(u.projectionMatrix, false, r.activeCamera.getProjectionMatrix());
        gl.uniformMatrix4fv(u.viewMatrix, false, r.activeCamera.getViewMatrix());
        gl.uniformMatrix3fv(u.normalMatrix, false, r.activeCamera._normalMatrix._m);

        //gl.uniform4fv(u.lightsPositions, this._scene._lightsTransformedPositions);
        gl.uniform4fv(u.lightsPositions, this._planet._lightsTransformedPositions);
        gl.uniform3fv(u.lightsParamsv, this._planet._lightsParamsv);
        gl.uniform1fv(u.lightsParamsf, this._planet._lightsParamsf);

        gl.uniform1f(u.scale, this._viewScale);
        gl.uniform3fv(u.positionHigh, this._posHigh);
        gl.uniform3fv(u.positionLow, this._posLow);
        gl.uniform2fv(u.pitchRoll, [-this._pitch, this._roll]);
        gl.uniform4fv(u.color, this._color);
        gl.uniform3fv(u.direction, this._uOrientation);

        //gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBuffer);
        //gl.vertexAttribPointer(p.attributes.aVertexPosition, this._verticesBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //gl.drawArrays(gl.TRIANGLES, 0, this._verticesBuffer.numItems);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._normalsBuffer);
        gl.vertexAttribPointer(p.attributes.aVertexNormal, this._normalsBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vericesBuffer);
        gl.vertexAttribPointer(p.attributes.aVertexPosition, this._vericesBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indicesBuffer);
        gl.drawElements(gl.TRIANGLES, this._indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    }
}

class SkyTraffic extends RenderNode {
    constructor(options) {
        super("SkyTraffic");

        this.marker = new Planemarker();

        this._planet;

        options = options || {};
    }

    init() {
        this.marker.bind(this);
        this.marker.bindPlanet(this._planet);
    }

    frame() {
        this.marker.draw();
    }

    bind(planet) {
        this._planet = planet;
    }
}

let osm = new XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: 'Data @ OpenStreetMap contributors, ODbL'
});

let globe = new Globe({
    "target": "globus",
    "name": "Earth",
    "terrain": new GlobusTerrain(),
    "layers": [osm]
});

var skytraffic = new SkyTraffic();

skytraffic.bind(globe.planet);

globe.renderer.addNode(skytraffic);

window.skytraffic = skytraffic;
window.Vec3 = Vec3;
window.LonLat = LonLat;
window.Quat = Quat;
window.globe = globe;
