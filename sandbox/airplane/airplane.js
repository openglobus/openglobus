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

class Planemarker {
    constructor(options) {
        options = options || {};

        this.orientation = options.orientation ? option.orientation : new Quat(0.0, 0.0, 0.0, 1.0);
        this.position = options.position ? options.position : new Vec3();
        this.scale = options.scale || 0.02;

        this._mxModel = new Mat4().setIdentity();
        this._position = new Float32Array([0, 0, 0]);
        this._vericesBuffer = null;
        this._indicesBuffer = null;

        this._lonLatAlt = new LonLat();
        this._speed = 0.0;
        this._heading = 0.0;

        this._planet = null;
        this._scene = null;
    }

    static getNorthBearingRotationFrame(cartesian) {
        let n = cartesian.normal();
        let t = Vec3.proj_b_to_plane(Vec3.UNIT_Y, n);
        return Quat.getLookRotation(t, n);
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
    }

    update() {
        this.position.copy(this._planet.ellipsoid.lonLatToCartesian(this._lonLatAlt));

        this.orientation.copy(
            Quat.yRotation(this._heading * RADIANS).mul(Planemarker.getNorthBearingRotationFrame(this.position))
        );

        this._position[0] = this.position.x;
        this._position[1] = this.position.y;
        this._position[2] = this.position.z;

        this._mxModel = this.orientation.getMat4();
    }

    init() {

        //Initialize shader program
        this._scene.renderer.handler.addProgram(new Program("AirplaneShader", {
            uniforms: {
                projectionViewMatrix: { type: 'mat4' },
                modelMatrix: { type: 'mat4' },
                scale: { type: 'float' },
                position: { type: 'vec3' }
            },
            attributes: {
                aVertexPosition: 'vec3'
            },
            vertexShader:
                'attribute vec3 aVertexPosition;\
                \
                uniform mat4 projectionViewMatrix;\
                uniform mat4 modelMatrix;\
                uniform float scale;\
                uniform vec3 position;\
                \
                const float C = 0.1;\
                const float far = 149.6e+9;\
                float logc = 2.0 / log( C * far + 1.0 );\
                \
                void main(void) {\
                    gl_Position = projectionViewMatrix * (vec4(position, 0.0) + modelMatrix * vec4(aVertexPosition * scale, 1.0));\
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                }'
            ,
            fragmentShader:
                'precision mediump float;\
                \
                void main(void) {\
                    gl_FragColor = vec4(1.0);\
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

        sh.activate();

        gl.uniform1f(p.uniforms.scale, this.scale * this.position.distance(r.activeCamera.eye));
        gl.uniform3fv(p.uniforms.position, this._position);

        gl.uniformMatrix4fv(p.uniforms.modelMatrix, false, this._mxModel._m);

        gl.uniformMatrix4fv(p.uniforms.projectionViewMatrix, false, r.activeCamera.getProjectionViewMatrix());

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
