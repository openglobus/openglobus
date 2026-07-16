import * as shaders from "../shaders/skybox";
import { Scene } from "./Scene";
import type { WebGLBufferExt, WebGLTextureExt, Texture3DParams } from "../webgl/Handler";
import { Mat4 } from "../math/Mat4";
import { RADIANS_HALF } from "../math";

class SkyBox extends Scene {
    public params: Texture3DParams;
    public size: number;
    public vertexPositionBuffer: WebGLBufferExt | null;
    public texture: WebGLTextureExt | null;

    constructor(params: Texture3DParams, size: number = 10000) {
        super("skybox");
        this.params = params;
        this.size = size;
        this.vertexPositionBuffer = null;
        this.texture = null;
    }

    static createDefault(RESOURCES_URL: string) {
        return new SkyBox({
            nx: RESOURCES_URL + "skybox/nx.webp",
            px: RESOURCES_URL + "skybox/px.webp",
            py: RESOURCES_URL + "skybox/py.webp",
            ny: RESOURCES_URL + "skybox/ny.webp",
            pz: RESOURCES_URL + "skybox/pz.webp",
            nz: RESOURCES_URL + "skybox/nz.webp"
        });
    }

    public override init() {
        const h = this.renderer!.handler;
        const gl = h.gl!;
        h.addProgram(shaders.skybox());
        this.texture = h.loadCubeMapTexture(this.params, gl.SRGB8_ALPHA8, gl.LINEAR);
        this._createBuffers();
        this.drawMode = gl.TRIANGLES;
        this.renderer!.events.on("predraw", this._onPredraw, this);
    }

    public override onremove() {
        this.renderer?.events.off("predraw", this._onPredraw);
    }

    public setSize(size: number) {
        this.size = size;
        if (this.renderer && this.vertexPositionBuffer) {
            this.renderer.handler.gl!.deleteBuffer(this.vertexPositionBuffer);
            this._createBuffers();
        }
    }

    protected _onPredraw = () => {
        let h = this.renderer!.handler;
        let gl = h.gl!;
        let cam = this.renderer!.activeCamera!;
        gl.disable(gl.DEPTH_TEST);

        h.programs.skybox.activate();
        let sh = h.programs.skybox;
        let shu = sh.uniforms;
        if (cam.isOrthographic) {
            const near = cam.frustum.near;
            const far = cam.frustum.far;
            const aspect = cam.getAspectRatio();
            const top = near * Math.tan(cam.viewAngle * RADIANS_HALF);
            const right = top * aspect;
            const proj = new Mat4().setPerspective(-right, right, -top, top, near, far);
            const view = new Mat4().set(cam.getViewMatrix());
            view._m[12] = 0.0;
            view._m[13] = 0.0;
            view._m[14] = 0.0;
            gl.uniformMatrix4fv(shu.projectionViewMatrix, false, proj.mul(view)._m);
        } else {
            gl.uniformMatrix4fv(shu.projectionViewMatrix, false, cam.getProjectionViewRTEMatrix());
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture!);
        gl.uniform1i(shu.uSampler, 0);
        let buf = this.vertexPositionBuffer!;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.vertexAttribPointer(sh.attributes.aVertexPosition, buf.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(this.drawMode, 0, buf.numItems);
        gl.enable(gl.DEPTH_TEST);
    };

    protected _createBuffers() {
        const size = this.size;
        const vertices = new Float32Array([
            -1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            -1 * size,

            -1 * size,
            -1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            1 * size,

            1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            -1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            -1 * size,
            1 * size,
            -1 * size,
            -1 * size,

            -1 * size,
            -1 * size,
            1 * size,
            -1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            -1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            1 * size,

            -1 * size,
            1 * size,
            -1 * size,
            1 * size,
            1 * size,
            -1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            1 * size,
            -1 * size,
            1 * size,
            1 * size,
            -1 * size,
            1 * size,
            -1 * size,

            -1 * size,
            -1 * size,
            -1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            -1 * size,
            -1 * size,
            -1 * size,
            -1 * size,
            1 * size,
            1 * size,
            -1 * size,
            1 * size
        ]);

        this.vertexPositionBuffer = this.renderer!.handler.createArrayBuffer(vertices, 3, vertices.length / 3);
    }
}

export { SkyBox };
