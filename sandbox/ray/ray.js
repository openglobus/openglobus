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
            uFloatParams: "vec2",
            uOpacity: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_posHigh: "vec3",
            a_posLow: "vec3",
            a_direction: "vec3",
            a_size: "vec2",
            a_rgba: "vec4"
        },
        vertexShader:
            `precision highp float;
            attribute vec2 a_vertices;
            attribute vec2 a_texCoord;
            attribute vec3 a_posHigh;
            attribute vec3 a_posLow;
            attribute vec3 a_direction;
            attribute vec2 a_size;
            attribute vec4 a_rgba;

            varying vec2 v_texCoords;
            varying vec4 v_rgba;

            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            //uniform vec3 uCamPos;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            uniform vec2 uFloatParams;
            uniform float uOpacity;

            const vec3 ZERO3 = vec3(0.0);
            const float C = 0.1;
            const float far = 149.6e+9;
            float logc = 2.0 / log( C * far + 1.0 );

            void main() {

                vec3 a_position = a_posHigh + a_posLow;
                vec3 uCamPos = eyePositionHigh + eyePositionLow;

                v_texCoords = a_texCoord;
                vec3 look = a_position - uCamPos;
                float lookLength = length(look);
                v_rgba = a_rgba;
                /*v_rgba.a *= uOpacity * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_position, a_position) - uFloatParams[0]));*/
                if(uOpacity * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_position, a_position) - uFloatParams[0])) == 0.0){
                    return;
                }

                vec3 up = normalize(a_direction);
                vec3 right = normalize(cross(look,up));
                look = cross(up,right);

                float dist = dot(uCamPos - a_position, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
                float focalSize = 2.0 * dist * uFloatParams[1];
                vec2 scale = a_size * focalSize;
                vec3 rr = right * scale.x * a_vertices.x + up * scale.y * a_vertices.y;

                vec3 highDiff = a_posHigh - eyePositionHigh;
                vec3 lowDiff = a_posLow + rr - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;
            }`,
        fragmentShader:
            `precision highp float;
            varying vec2 v_texCoords;
            varying vec4 v_rgba;
            void main () {
                gl_FragColor = v_rgba;
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

        let pos = new Vec3(0, 0, 0);

        let posHigh = new Vec3(),
            posLow = new Vec3();

        let direction = new Vec3(0, 1, 0);

        let width = 5,
            height = 50;

        let color = new Vec4(1, 1, 1, 1);

        this._vertexArr = [];
        this._posHighArr = [];
        this._posLowArr = [];
        this._sizeArr = [];
        this._rgbaArr = [];
        this._dirArr = [];

        concArr(this._vertexArr, [-0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);

        var x = posHigh.x, y = posHigh.y, z = posHigh.z, w;
        concArr(this._posHighArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = posLow.x, y = posLow.y, z = posLow.z;
        concArr(this._posLowArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = width; y = height;
        concArr(this._sizeArr, [x, y, x, y, x, y, x, y, x, y, x, y]);

        x = color.x; y = color.y; z = color.z; w = color.w;
        concArr(this._rgbaArr, [x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w]);

        x = direction.x, y = direction.y, z = direction.z;
        concArr(this._dirArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        this._posHighBuffer = null;
        this._posLowBuffer = null;
        this._sizeBuffer = null;
        this._rgbaBuffer = null;
        this._vertexBuffer = null;
        this._dirBuffer = null;

        var h = this.renderer.handler;

        this._posHighBuffer = h.createArrayBuffer(new Float32Array(this._posHighArr), 3, this._posHighArr.length / 3, h.gl.DYNAMIC_DRAW);

        this._posLowBuffer = h.createArrayBuffer(new Float32Array(this._posLowArr), 3, this._posLowArr.length / 3, h.gl.DYNAMIC_DRAW);


        this._sizeBuffer = h.createArrayBuffer(new Float32Array(this._sizeArr), 2, this._sizeArr.length / 2);

        this._rgbaBuffer = h.createArrayBuffer(new Float32Array(this._rgbaArr), 4, this._rgbaArr.length / 4);

        this._vertexBuffer = h.createArrayBuffer(new Float32Array(this._vertexArr), 2, this._vertexArr.length / 2, h.gl.DYNAMIC_DRAW);

        this._dirBuffer = h.createArrayBuffer(new Float32Array(this._dirArr), 3, this._dirArr.length / 3);
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

        gl.uniform2fv(shu.uFloatParams, [0, r.activeCamera._tanViewAngle_hradOneByHeight]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._posHighBuffer);
        gl.vertexAttribPointer(sha.a_posHigh, this._posHighBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._posLowBuffer);
        gl.vertexAttribPointer(sha.a_posLow, this._posLowBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer);
        gl.vertexAttribPointer(sha.a_rgba, this._rgbaBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
        gl.vertexAttribPointer(sha.a_size, this._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._dirBuffer);
        gl.vertexAttribPointer(sha.a_direction, this._dirBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(sha.a_vertices, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);
    }
};

let myScene = new MyScene();

renderer.addNodes([new Axes(), myScene]);

window.Vec3 = Vec3;
window.renderer = renderer;

