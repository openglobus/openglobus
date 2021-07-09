"use strict";

import { Handler } from "../../src/og/webgl/Handler.js";
import { Renderer } from "../../src/og/renderer/Renderer.js";
import { SimpleNavigation } from "../../src/og/control/SimpleNavigation.js";
import { Axes } from "../../src/og/scene/Axes.js";
import { Vec3 } from "../../src/og/math/Vec3.js";
import { Mat4 } from "../../src/og/math/Mat4.js";
import { RenderNode } from "../../src/og/scene/RenderNode.js";
import { Entity } from "../../src/og/Entity/Entity.js";
import { EntityCollection } from "../../src/og/Entity/EntityCollection.js";
import { Line3 } from "../../src/og/math/Line3.js";
import { Program } from "../../src/og/webgl/Program.js";

let handler = new Handler("frame", { autoActivate: true });
let renderer = new Renderer(handler, {
    controls: [new SimpleNavigation()],
    autoActivate: true
});

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    init() {
        !this.renderer.handler.programs.instancing &&
            this.renderer.handler.addProgram(
                new Program("instancing", {
                    uniforms: {},
                    attributes: {
                        a_position: "vec2",
                        matrix: { type: "mat4", divisor: 1, itemType: "float" },
                        color: { type: "vec4", divisor: 1, itemType: "float" }
                    },
                    vertexShader: `#version 300 es
                    in vec2 a_position;
                    in vec4 color;
                    in mat4 matrix;
 
                    out vec4 v_color;
 
                    void main() {
                      gl_Position = matrix * vec4(a_position, 0.0, 1.0);

                        v_color = color;
                    }
`,
                    fragmentShader: `#version 300 es
                    precision highp float;
 
                    in vec4 v_color;
 
                    out vec4 outColor;
 
                    void main() {
                      outColor = v_color;
                    }`
                })
            );

        let vertices = new Float32Array([
            -0.1, 0.4, -0.1, -0.4, 0.1, -0.4, 0.1, -0.4, -0.1, 0.4, 0.1, 0.4, 0.4, -0.1, -0.4, -0.1,
            -0.4, 0.1, -0.4, 0.1, 0.4, -0.1, 0.4, 0.1
        ]);

        this._verticesBuffer = this.renderer.handler.createArrayBuffer(
            vertices,
            2,
            vertices.length / 2
        );

        //
        //
        //
        this.numInstances = 5;

        this.matrixData = new Float32Array(this.numInstances * 16);

        this.matrices = [];
        for (let i = 0; i < this.numInstances; ++i) {
            const byteOffsetToMatrix = i * 16 * 4;
            const numFloatsForView = 16;
            this.matrices.push(
                new Float32Array(this.matrixData.buffer, byteOffsetToMatrix, numFloatsForView)
            );
        }

        this.colors = [
            [1, 0, 0, 1], // red
            [0, 1, 0, 1], // green
            [0, 0, 1, 1], // blue
            [1, 0, 1, 1], // magenta
            [0, 1, 1, 1] // cyan
        ];

        var sh = this.renderer.handler.programs.instancing,
            p = sh._program;

        this.matrixBuffer = this.renderer.handler.createArrayBufferLength(
            this.matrixData.byteLength
        );

        // setup colors, one per instance
        let colors = new Float32Array([
            1,
            0,
            0,
            1, // red
            0,
            1,
            0,
            1, // green
            0,
            0,
            1,
            1, // blue
            1,
            0,
            1,
            1, // magenta
            0,
            1,
            1,
            1 // cyan
        ]);

        this.colorBuffer = this.renderer.handler.createArrayBuffer(colors, 4, colors.length / 4);
    }

    frame() {
        let time = Date.now() * 0.001;

        var r = this.renderer;
        var gl = r.handler.gl;

        gl.disable(gl.CULL_FACE);

        var sh = r.handler.programs.instancing,
            p = sh._program,
            sha = p.attributes;

        sh.activate();

        //gl.enableVertexAttribArray(sha.color);
        //gl.vertexAttribDivisor(sha.color, 1);

        //for (let i = 0; i < 4; ++i) {
        //    const loc = sha.matrix + i;
        //    gl.enableVertexAttribArray(loc);
        //    gl.vertexAttribDivisor(loc, 1);
        //}

        gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBuffer);
        gl.vertexAttribPointer(
            sha.a_position,
            this._verticesBuffer.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        this.matrices.forEach((mat, ndx) => {
            let m = new Mat4()
                .setIdentity()
                .translate(new Vec3(-0.5 + ndx * 0.25, 0, 0))
                .rotate(new Vec3(0, 0, 1), time * (0.1 + 0.1 * ndx));
            mat[0] = m._m[0];
            mat[1] = m._m[1];
            mat[2] = m._m[2];
            mat[3] = m._m[3];

            mat[4] = m._m[4];
            mat[5] = m._m[5];
            mat[6] = m._m[6];
            mat[7] = m._m[7];

            mat[8] = m._m[8];
            mat[9] = m._m[9];
            mat[10] = m._m[10];
            mat[11] = m._m[11];

            mat[12] = m._m[12];
            mat[13] = m._m[13];
            mat[14] = m._m[14];
            mat[15] = m._m[15];
        });

        // upload the new matrix data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.matrixData);

        const bytesPerMatrix = 4 * 16;
        for (let i = 0; i < 4; ++i) {
            const loc = sha.matrix + i;
            // note the stride and offset
            const offset = i * 16; // 4 floats per row, 4 bytes per float
            gl.vertexAttribPointer(
                loc, // location
                4, // size (num values to pull from buffer per iteration)
                gl.FLOAT, // type of data in buffer
                false, // normalize
                bytesPerMatrix, // stride, num bytes to advance to get to next set of values
                offset // offset in buffer
            );
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.vertexAttribPointer(sha.color, 4, gl.FLOAT, false, 0, 0);

        gl.drawArraysInstanced(
            gl.TRIANGLES,
            0, // offset
            this._verticesBuffer.numItems, // num vertices per instance
            this.numInstances // num instances
        );

        gl.enable(gl.CULL_FACE);

        for (let i = 0; i < 4; ++i) {
            const loc = sha.matrix + i;
            //gl.disableVertexAttribArray(loc);
            gl.vertexAttribDivisor(loc, 0);
        }

        //gl.disableVertexAttribArray(sha.color);
        gl.vertexAttribDivisor(sha.color, 0);
    }
}

let myScene = new MyScene();

renderer.addNodes([new Axes(), myScene]);

window.Vec3 = Vec3;
window.renderer = renderer;
