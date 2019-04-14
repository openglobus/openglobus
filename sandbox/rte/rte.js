'use strict';

import { RADIANS } from '../../src/og/math.js';
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
import { doubleToTwoFloats } from '../../src/og/math/coder.js';
import { print2d } from '../../src/og/utils/shared.js';

const MODEL_DIRECTION = new Vec3(0.0, 0.0, -1.0);

function getNorthBearingRotationFrame(cartesian) {
    let n = cartesian.normal();
    let t = Vec3.proj_b_to_plane(Vec3.UNIT_Y, n);
    return Quat.getLookRotation(t, n);
}

class Planemarker {
    constructor(options) {
        options = options || {};

        this.orientation = options.orientation ? option.orientation : new Quat(0.0, 0.0, 0.0, 1.0);
        this.position = options.position ? options.position : new Vec3();
        this.scale = options.scale || 0.02;

        this.modelMatrix = new Mat4().setIdentity();
        this._position = new Float32Array([0, 0, 0]);
        this._vericesBuffer = null;
        this._indicesBuffer = null;

        this._lonLatAlt = new LonLat(10, 10, 10000);

        this._neDir = [0, 0, 0];
        this._vel = new Vec3(0.0, 1.0, 0.0);

        this._planet = null;
        this._scene = null;

        this._lockDistance = 1000.0;
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

    setHeading(heading) {
        this._heading = heading;
        this.update();
    }

    setSpeed(speed) {
        this._speed = speed;
    }

    bind(scene) {
        this._scene = scene;
        this.init();
    }

    bindPlanet(planet) {
        this._planet = planet;
        this.update();

        planet.renderer.events.on("mousewheel", this._onMouseWheel, this);
        planet.renderer.events.on("rhold", this._onMouseHold, this);
    }

    _onMouseWheel(e) {
        let d = this._planet.renderer.activeCamera.eye.distance(this.position);
        this._lockDistance -= 0.33 * d * Math.sign(e.wheelDelta);
    }

    _onMouseHold(e) {
        let r = this._planet.renderer;
        if (r.events.mouseState.moving) {
            let p = this.position;
            var cam = r.activeCamera;
            var l = 0.5 / cam.eye.distance(p) * cam._lonLat.height * Math.PI / 180;
            if (l > 0.007) l = 0.007;
            cam.rotateHorizontal(l * (e.x - e.prev_x), false, p, p.normal());;
            cam.rotateVertical(l * (e.y - e.prev_y), p);
            cam.update();
        }
    }

    update() {
        this._planet.renderer.controls.mouseNavigation.deactivate();

        this.position.copy(this._planet.ellipsoid.lonLatToCartesian(this._lonLatAlt));
        this._orientation = Quat.yRotation(Math.atan2(this._vel.y, this._vel.x)).mul(getNorthBearingRotationFrame(this.position));
        let d = this._orientation.conjugate().mulVec3(MODEL_DIRECTION).normalize();
        this._neDir = [d.x, d.y, d.z];
    }

    init() {

        //Initialize shader program
        this._scene.renderer.handler.addProgram(new Program("AirplaneShader", {
            uniforms: {
                projectionMatrix: { type: 'mat4' },
                viewMatrix: { type: 'mat4' },
                scale: { type: 'float' },
                positionHigh: "vec3",
                positionLow: "vec3",
                eyePositionHigh: "vec3",
                eyePositionLow: "vec3",
                direction: 'vec3'
            },
            attributes: {
                aVertexPosition: 'vec3'
            },
            vertexShader:
                `precision highp float;
                attribute vec3 aVertexPosition;
                
                uniform mat4 projectionMatrix;

                uniform mat4 viewMatrix;
                uniform vec3 direction;

                uniform vec3 eyePositionHigh;
                uniform vec3 eyePositionLow;

                uniform vec3 positionHigh;
                uniform vec3 positionLow;

                uniform float scale;
                
                const float C = 0.1;
                const float far = 149.6e+9;
                float logc = 2.0 / log( C * far + 1.0 );
                
                void main(void) {

                    vec3 position = positionHigh + positionLow;
                    vec3 r = cross(normalize(-position), direction);
                    vec3 u = cross(direction, r);

                    //mat4 modelMatrix = mat4(
                    //    r.x, r.y, r.z, 0,
                    //    -u.x, -u.y, -u.z, 0,
                    //    -direction.x, -direction.y, -direction.z, 0,
                    //    0, 0, 0, 1
                    //);

                    //vec3 highDiff = positionHigh - eyePositionHigh;
                    //vec3 lowDiff = positionLow + (modelMatrix * vec4(aVertexPosition * scale, 1.0)).xyz - eyePositionLow;

                    mat3 modelMatrix = mat3(
                        r.x, r.y, r.z,
                        -u.x, -u.y, -u.z,
                        -direction.x, -direction.y, -direction.z
                    );

                    vec3 highDiff = positionHigh - eyePositionHigh;
                    vec3 lowDiff = positionLow + modelMatrix * aVertexPosition * scale - eyePositionLow;

                    mat4 viewMatrixRTE = viewMatrix;

                    viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                    gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;
                }`
            ,
            fragmentShader:
                'precision highp float;\
                \
                void main(void) {\
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\
                }'
        }));

        //Create buffers
        var vertices = [
            -1.0, 0.0, 0.5,
            0.0, 0.0, -0.5,
            1.0, 0.0, 0.5
        ];

        this._vericesBuffer = this._scene.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, vertices.length / 3);

        var cubeVertexIndices = [
            0, 1, 2,
            0, 2, 1
        ];

        this._indicesBuffer = this._scene.renderer.handler.createElementArrayBuffer(new Uint16Array(cubeVertexIndices), 1, cubeVertexIndices.length);
    }

    draw() {

        var r = this._scene.renderer;
        var sh = r.handler.programs.AirplaneShader;
        var p = sh._program;
        var gl = r.handler.gl;

        r.activeCamera.viewDistance(this.position, this._lockDistance);

        sh.activate();

        let d = this.position.distance(r.activeCamera.eye);

        gl.uniform1f(p.uniforms.scale, this.scale * d);

        print2d("lbDistance", d, 100, 100);

        gl.uniformMatrix4fv(p.uniforms.projectionMatrix, false, r.activeCamera._projectionMatrix._m);
        gl.uniformMatrix4fv(p.uniforms.viewMatrix, false, r.activeCamera._viewMatrix._m);
        gl.uniform3fv(p.uniforms.direction, this._neDir);

        let px = doubleToTwoFloats(this.position.x),
            py = doubleToTwoFloats(this.position.y),
            pz = doubleToTwoFloats(this.position.z);

        let ex = doubleToTwoFloats(r.activeCamera.eye.x),
            ey = doubleToTwoFloats(r.activeCamera.eye.y),
            ez = doubleToTwoFloats(r.activeCamera.eye.z);

        gl.uniform3fv(p.uniforms.positionHigh, [px[0], py[0], pz[0]]);
        gl.uniform3fv(p.uniforms.positionLow, [px[1], py[1], pz[1]]);

        gl.uniform3fv(p.uniforms.eyePositionHigh, [ex[0], ey[0], ez[0]]);
        gl.uniform3fv(p.uniforms.eyePositionLow, [ex[1], ey[1], ez[1]]);

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
    specular: [0.0003, 0.00012, 0.00001],
    shininess: 20,
    diffuse: [0.89, 0.9, 0.83],
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
