'use strict';

import { Handler } from '../../src/og/webgl/Handler.js';
import { Renderer } from '../../src/og/renderer/Renderer.js';
import { SimpleNavigation } from '../../src/og/control/SimpleNavigation.js';
import { Axes } from '../../src/og/scene/Axes.js';
import { Vec3 } from '../../src/og/math/Vec3.js';
import { Vec4 } from '../../src/og/math/Vec4.js';
import { RenderNode } from '../../src/og/scene/RenderNode.js';
import { Program } from '../../src/og/webgl/Program.js';

function concArr(dest, curr) {
    for (var i = 0; i < curr.length; i++) {
        dest.push(curr[i]);
    }
}

export function ray_screen() {
    return new Program("ray", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            resolution: "float",
            uOpacity: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_startPosHigh: "vec3",
            a_startPosLow: "vec3",
            a_endPosHigh: "vec3",
            a_endPosLow: "vec3",
            a_length: "float",
            a_thickness: "float",
            a_rgba: "vec4"
        },
        vertexShader:
            `precision highp float;
            attribute vec2 a_vertices;
            attribute vec3 a_startPosHigh;
            attribute vec3 a_startPosLow;
            attribute vec3 a_endPosHigh;
            attribute vec3 a_endPosLow;
            attribute float a_thickness;
            attribute float a_length;
            attribute vec4 a_rgba;

            varying vec4 v_rgba;

            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            uniform float resolution;

            const float far = 149.6e+9;
            const float Fcoef = 2.0 / log2(far + 1.0);

            void main() {

                v_rgba = a_rgba;

                vec3 camPos = eyePositionHigh + eyePositionLow;

                vec3 startPos = a_startPosHigh + a_startPosLow;
                vec3 direction = normalize((a_endPosHigh + a_endPosLow) - startPos);
                vec3 vertPos = startPos + a_vertices.y * direction * a_length;

                vec3 look = vertPos - camPos;
                vec3 up = normalize(direction);
                vec3 right = normalize(cross(look,up));
 
                float dist = dot(camPos - vertPos, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
                float focalSize = 2.0 * dist * resolution;
                vec3 rr = right * a_thickness * focalSize * a_vertices.x + up * a_length * a_vertices.y;

                vec3 highDiff = a_startPosHigh - eyePositionHigh;
                vec3 lowDiff = a_startPosLow + rr - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vec4 pos = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
                
                gl_Position = projectionMatrix * pos;
            }`,
        fragmentShader:
            `precision highp float;
            uniform float uOpacity;
            varying vec4 v_rgba;
            void main () {
                gl_FragColor = v_rgba * uOpacity;
            }`
    });
}


let handler = new Handler("frame", { 'autoActivate': true });
let renderer = new Renderer(handler, {
    'controls': [new SimpleNavigation()],
    'autoActivate': true
});

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    init() {
        this.renderer.handler.addProgram(ray_screen());

        let startPos = new Vec3(0, 0, 0),
            endPos = new Vec3(10, 10, 10);

        let startPosHigh = new Vec3(),
            startPosLow = new Vec3(),
            endPosHigh = new Vec3(),
            endPosLow = new Vec3();

        Vec3.doubleToTwoFloats(startPos, startPosHigh, startPosLow);
        Vec3.doubleToTwoFloats(endPos, endPosHigh, endPosLow);

        let thickness = 10;

        let length = 100;

        let colorStart = [1, 0, 0, 1],
            colorEnd = [0, 1, 0, 1];

        const R = 0;
        const G = 1;
        const B = 2;
        const A = 3;

        this._vertexArr = [];
        this._startPosHighArr = [];
        this._startPosLowArr = [];
        this._endPosHighArr = [];
        this._endPosLowArr = [];
        this._thicknessArr = [];
        this._lengthArr = [];
        this._rgbaArr = [];

        concArr(this._vertexArr, [-0.5, 1, -0.5, 0, 0.5, 0, 0.5, 0, 0.5, 1, -0.5, 1]);

        var x = startPosHigh.x, y = startPosHigh.y, z = startPosHigh.z, w;
        concArr(this._startPosHighArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = startPosLow.x, y = startPosLow.y, z = startPosLow.z;
        concArr(this._startPosLowArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        var x = endPosHigh.x, y = endPosHigh.y, z = endPosHigh.z, w;
        concArr(this._endPosHighArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = endPosLow.x, y = endPosLow.y, z = endPosLow.z;
        concArr(this._endPosLowArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = thickness;
        concArr(this._thicknessArr, [x, x, x, x, x, x]);

        x = length;
        concArr(this._lengthArr, [x, x, x, x, x, x]);

        let r0 = colorStart[R], g0 = colorStart[G], b0 = colorStart[B], a0 = colorStart[A];
        let r1 = colorEnd[R], g1 = colorEnd[G], b1 = colorEnd[B], a1 = colorEnd[A];
        concArr(this._rgbaArr, [r1, g1, b1, a1, r0, g0, b0, a0, r0, g0, b0, a0, r0, g0, b0, a0, r1, g1, b1, a1, r1, g1, b1, a1]);

        this._startPosHighBuffer = null;
        this._startPosLowBuffer = null;
        this._lowPosHighBuffer = null;
        this._lowPosLowBuffer = null;
        this._thicknessBuffer = null;
        this._lengthBuffer = null;
        this._rgbaBuffer = null;
        this._vertexBuffer = null;

        var h = this.renderer.handler;

        this._startPosHighBuffer = h.createArrayBuffer(new Float32Array(this._startPosHighArr), 3, this._startPosHighArr.length / 3, h.gl.DYNAMIC_DRAW);
        this._startPosLowBuffer = h.createArrayBuffer(new Float32Array(this._startPosLowArr), 3, this._startPosLowArr.length / 3, h.gl.DYNAMIC_DRAW);

        this._endPosHighBuffer = h.createArrayBuffer(new Float32Array(this._endPosHighArr), 3, this._endPosHighArr.length / 3, h.gl.DYNAMIC_DRAW);
        this._endPosLowBuffer = h.createArrayBuffer(new Float32Array(this._endPosLowArr), 3, this._endPosLowArr.length / 3, h.gl.DYNAMIC_DRAW);

        this._thicknessBuffer = h.createArrayBuffer(new Float32Array(this._thicknessArr), 1, this._thicknessArr.length);

        this._lengthBuffer = h.createArrayBuffer(new Float32Array(this._lengthArr), 1, this._lengthArr.length);

        this._rgbaBuffer = h.createArrayBuffer(new Float32Array(this._rgbaArr), 4, this._rgbaArr.length / 4);

        this._vertexBuffer = h.createArrayBuffer(new Float32Array(this._vertexArr), 2, this._vertexArr.length / 2, h.gl.DYNAMIC_DRAW);

    }

    frame() {
        var r = this.renderer;
        var h = r.handler;
        h.programs.ray.activate();
        var sh = h.programs.ray._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var gl = h.gl;

        gl.uniform1f(shu.uOpacity, 1.0);

        gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera._viewMatrix._m);
        gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera._projectionMatrix._m);

        gl.uniform3fv(shu.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, r.activeCamera.eyeLow);

        gl.uniform1f(shu.resolution, r.activeCamera._tanViewAngle_hradOneByHeight);



        gl.bindBuffer(gl.ARRAY_BUFFER, this._startPosHighBuffer);
        gl.vertexAttribPointer(sha.a_startPosHigh, this._startPosHighBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._startPosLowBuffer);
        gl.vertexAttribPointer(sha.a_startPosLow, this._startPosLowBuffer.itemSize, gl.FLOAT, false, 0, 0);


        gl.bindBuffer(gl.ARRAY_BUFFER, this._endPosHighBuffer);
        gl.vertexAttribPointer(sha.a_endPosHigh, this._endPosHighBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._endPosLowBuffer);
        gl.vertexAttribPointer(sha.a_endPosLow, this._endPosLowBuffer.itemSize, gl.FLOAT, false, 0, 0);



        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer);
        gl.vertexAttribPointer(sha.a_rgba, this._rgbaBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._thicknessBuffer);
        gl.vertexAttribPointer(sha.a_thickness, this._thicknessBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._lengthBuffer);
        gl.vertexAttribPointer(sha.a_length, this._lengthBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(sha.a_vertices, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);

    }
};

let myScene = new MyScene();

renderer.addNodes([new Axes(), myScene]);

window.Vec3 = Vec3;
window.renderer = renderer;

