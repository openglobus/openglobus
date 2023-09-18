import * as shaders from '../shaders/skybox';
import {RenderNode} from './RenderNode';
import {WebGLBufferExt, WebGLTextureExt, Texture3DParams} from "../webgl/Handler";

class SkyBox extends RenderNode {

    public params: Texture3DParams;
    public vertexPositionBuffer: WebGLBufferExt | null;
    public texture: WebGLTextureExt | null;

    constructor(params: Texture3DParams) {
        super("skybox");
        this.params = params;
        this.vertexPositionBuffer = null;
        this.texture = null;
    }

    static createDefault(RESOURCES_URL: string) {
        return new SkyBox({
            nx: RESOURCES_URL + "skybox/gal/_nx.jpg",
            px: RESOURCES_URL + "skybox/gal/_px.jpg",
            py: RESOURCES_URL + "skybox/gal/_py.jpg",
            ny: RESOURCES_URL + "skybox/gal/_ny.jpg",
            pz: RESOURCES_URL + "skybox/gal/_pz.jpg",
            nz: RESOURCES_URL + "skybox/gal/_nz.jpg"
        });
    }

    public override init() {
        this.renderer!.handler!.addProgram(shaders.skybox(), true);
        this.texture = this.renderer!.handler.loadCubeMapTexture(this.params);
        this._createBuffers();
        this.drawMode = this.renderer!.handler.gl!.TRIANGLES;
    }

    public override frame() {
        let h = this.renderer!.handler;
        let gl = h.gl!;
        let cam = this.renderer!.activeCamera!;
        gl.disable(gl.DEPTH_TEST);

        h.programs.skybox.activate();
        let sh = h.programs.skybox._program;
        let shu = sh.uniforms;
        gl.uniformMatrix4fv(shu.projectionViewMatrix, false, cam.getProjectionViewMatrix());
        gl.uniform3fv(shu.pos, cam.eye.toArray());
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture!);
        gl.uniform1i(shu.uSampler, 0);
        let buf = this.vertexPositionBuffer!;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.vertexAttribPointer(sh.attributes.aVertexPosition, buf.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(this.drawMode, 0, buf.numItems);
        gl.enable(gl.DEPTH_TEST);
    }

    protected _createBuffers() {

        const vertices = new Float32Array([
            -100000000.0, 100000000.0, -100000000.0,
            -100000000.0, -100000000.0, -100000000.0,
            100000000.0, -100000000.0, -100000000.0,
            100000000.0, -100000000.0, -100000000.0,
            100000000.0, 100000000.0, -100000000.0,
            -100000000.0, 100000000.0, -100000000.0,

            -100000000.0, -100000000.0, 100000000.0,
            -100000000.0, -100000000.0, -100000000.0,
            -100000000.0, 100000000.0, -100000000.0,
            -100000000.0, 100000000.0, -100000000.0,
            -100000000.0, 100000000.0, 100000000.0,
            -100000000.0, -100000000.0, 100000000.0,

            100000000.0, -100000000.0, -100000000.0,
            100000000.0, -100000000.0, 100000000.0,
            100000000.0, 100000000.0, 100000000.0,
            100000000.0, 100000000.0, 100000000.0,
            100000000.0, 100000000.0, -100000000.0,
            100000000.0, -100000000.0, -100000000.0,

            -100000000.0, -100000000.0, 100000000.0,
            -100000000.0, 100000000.0, 100000000.0,
            100000000.0, 100000000.0, 100000000.0,
            100000000.0, 100000000.0, 100000000.0,
            100000000.0, -100000000.0, 100000000.0,
            -100000000.0, -100000000.0, 100000000.0,

            -100000000.0, 100000000.0, -100000000.0,
            100000000.0, 100000000.0, -100000000.0,
            100000000.0, 100000000.0, 100000000.0,
            100000000.0, 100000000.0, 100000000.0,
            -100000000.0, 100000000.0, 100000000.0,
            -100000000.0, 100000000.0, -100000000.0,

            -100000000.0, -100000000.0, -100000000.0,
            -100000000.0, -100000000.0, 100000000.0,
            100000000.0, -100000000.0, -100000000.0,
            100000000.0, -100000000.0, -100000000.0,
            -100000000.0, -100000000.0, 100000000.0,
            100000000.0, -100000000.0, 100000000.0
        ]);

        this.vertexPositionBuffer = this.renderer!.handler.createArrayBuffer(vertices, 3, vertices.length / 3);
    }
}

export {SkyBox};
