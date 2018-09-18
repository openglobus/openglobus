/**
 * @module og/scene/SkyBox
 */

'use strict';

import * as shaders from '../Program/skybox.js';
import { RenderNode } from './RenderNode.js';

const RESOURCES_URL = "";

class SkyBox extends RenderNode {
    constructor(params) {
        super("skybox");
        this.params = params;
        this.vertexPositionBuffer = null;
        this.texture = null;
    }

    static createDefault(RESOURCES_URL) {
        return new SkyBox({
            "nx": RESOURCES_URL + "skybox/gal/_nx.jpg",
            "px": RESOURCES_URL + "skybox/gal/_px.jpg",
            "py": RESOURCES_URL + "skybox/gal/_py.jpg",
            "ny": RESOURCES_URL + "skybox/gal/_ny.jpg",
            "pz": RESOURCES_URL + "skybox/gal/_pz.jpg",
            "nz": RESOURCES_URL + "skybox/gal/_nz.jpg"
        });
    }

    initialization() {
        this.renderer.handler.addProgram(shaders.skybox(), true);
        this.texture = this.renderer.handler.loadCubeMapTexture(this.params);
        this._createBuffers();
        this.drawMode = this.renderer.handler.gl.TRIANGLES;
    }

    frame() {
        var h = this.renderer.handler;
        var gl = h.gl;
        var cam = this.renderer.activeCamera;
        gl.disable(h.gl.DEPTH_TEST);

        h.Programs.skybox.activate();
        sh = h.Programs.skybox._program;
        var shu = sh.uniforms;
        gl.uniformMatrix4fv(shu.projectionViewMatrix, false, cam._projectionViewMatrix._m);
        gl.uniform3fv(shu.pos, cam.eye.toVec());
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
        gl.uniform1i(shu.uSampler, 0);
        var buf = this.vertexPositionBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.vertexAttribPointer(sh.attributes.aVertexPosition, buf.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(this.drawMode, 0, buf.numItems);
        h.gl.enable(h.gl.DEPTH_TEST);
    }

    _createBuffers() {

        var vertices = new Float32Array([
            - 10000.0, 10000.0, - 10000.0,
            - 10000.0, - 10000.0, - 10000.0,
            10000.0, - 10000.0, - 10000.0,
            10000.0, - 10000.0, - 10000.0,
            10000.0, 10000.0, - 10000.0,
            - 10000.0, 10000.0, - 10000.0,

            - 10000.0, - 10000.0, 10000.0,
            - 10000.0, - 10000.0, - 10000.0,
            - 10000.0, 10000.0, - 10000.0,
            - 10000.0, 10000.0, - 10000.0,
            - 10000.0, 10000.0, 10000.0,
            - 10000.0, - 10000.0, 10000.0,

            10000.0, - 10000.0, - 10000.0,
            10000.0, - 10000.0, 10000.0,
            10000.0, 10000.0, 10000.0,
            10000.0, 10000.0, 10000.0,
            10000.0, 10000.0, - 10000.0,
            10000.0, - 10000.0, - 10000.0,

            - 10000.0, - 10000.0, 10000.0,
            - 10000.0, 10000.0, 10000.0,
            10000.0, 10000.0, 10000.0,
            10000.0, 10000.0, 10000.0,
            10000.0, - 10000.0, 10000.0,
            - 10000.0, - 10000.0, 10000.0,

            - 10000.0, 10000.0, - 10000.0,
            10000.0, 10000.0, - 10000.0,
            10000.0, 10000.0, 10000.0,
            10000.0, 10000.0, 10000.0,
            - 10000.0, 10000.0, 10000.0,
            - 10000.0, 10000.0, - 10000.0,

            - 10000.0, - 10000.0, - 10000.0,
            - 10000.0, - 10000.0, 10000.0,
            10000.0, - 10000.0, - 10000.0,
            10000.0, - 10000.0, - 10000.0,
            - 10000.0, - 10000.0, 10000.0,
            10000.0, - 10000.0, 10000.0
        ]);

        this.vertexPositionBuffer = this.renderer.handler.createArrayBuffer(vertices, 3, vertices.length / 3);
    }
};

export { SkyBox };