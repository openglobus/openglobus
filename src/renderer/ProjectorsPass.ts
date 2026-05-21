import { Mat4 } from "../math/Mat4";
import { projectorsPass } from "../shaders/projectorsPass/projectorsPass";
import type { Renderer } from "./Renderer";
import type { Framebuffer } from "../webgl/Framebuffer";
import type { RendererProjector } from "./RendererProjector";
import type { NumberArray16 } from "../math/Mat4";
import type { Vec3 } from "../math/Vec3";

const CORNERS = [-1, -1, -1, 1, -1, -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, 1, 1, 1, 1, 1];

/**
 * Deferred projector lighting pass.
 * For every active projector draws a fullscreen quad clipped by a per-projector screen-space.
 * Skipped entirely when no projectors are active.
 * Scissor gives only ~5% optimization.
 */
export class ProjectorsPass {
    protected _renderer: Renderer;
    protected _cornerBuffer: WebGLBuffer | null = null;
    protected _indexBuffer: WebGLBuffer | null = null;
    protected _indexCount: number = 0;
    protected _tmpInverse: Mat4 = new Mat4();
    protected _scissor: [number, number, number, number] = [0, 0, 0, 0];

    constructor(renderer: Renderer) {
        this._renderer = renderer;
    }

    public init(): void {
        const h = this._renderer.handler;
        const gl = h.gl as WebGL2RenderingContext;
        if (!gl) return;

        h.addProgram(projectorsPass());

        const corners = new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]);
        const indices = new Uint16Array([0, 1, 3, 0, 3, 2]);
        this._indexCount = indices.length;

        this._cornerBuffer = h.createArrayBuffer(corners, 3, corners.length / 3);
        this._indexBuffer = h.createElementArrayBuffer(indices, 1, indices.length);
    }

    public dispose(): void {
        const gl = this._renderer.handler.gl;
        if (!gl) return;
        if (this._cornerBuffer) {
            gl.deleteBuffer(this._cornerBuffer);
            this._cornerBuffer = null;
        }
        if (this._indexBuffer) {
            gl.deleteBuffer(this._indexBuffer);
            this._indexBuffer = null;
        }
        this._renderer.handler.removeProgram("projectorsPass");
    }

    /**
     * Compute the projector frustum screen-space AABB in pixels (origin = bottom-left).
     * Returns:
     *   - true  + filled `_scissor` rect when the projector is on-screen.
     *   - false when the projector is entirely off-screen (caller should skip the draw).
     *
     * If any frustum corner is behind the main camera (w<=0), falls back to the full viewport
     * (CPU-side near-plane clipping of the volume is too costly to be worth it here).
     */
    protected _computeScissor(
        projector: RendererProjector,
        mainPV: NumberArray16,
        mainEye: Vec3,
        viewportW: number,
        viewportH: number
    ): boolean {
        const projPV = projector.camera.getProjectionViewRTEMatrix();
        this._tmpInverse.set(projPV).inverseTo(this._tmpInverse);
        const inv = this._tmpInverse._m;

        const projEye = projector.camera.eye;
        const dx = projEye.x - mainEye.x;
        const dy = projEye.y - mainEye.y;
        const dz = projEye.z - mainEye.z;

        const ndc = CORNERS;
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        for (let k = 0; k < 8; k++) {
            const k3 = k * 3;
            const cx = ndc[k3],
                cy = ndc[k3 + 1],
                cz = ndc[k3 + 2];

            // NDC -> projector RTE space.
            const px = inv[0] * cx + inv[4] * cy + inv[8] * cz + inv[12];
            const py = inv[1] * cx + inv[5] * cy + inv[9] * cz + inv[13];
            const pz = inv[2] * cx + inv[6] * cy + inv[10] * cz + inv[14];
            const pw = inv[3] * cx + inv[7] * cy + inv[11] * cz + inv[15];
            if (Math.abs(pw) < 1e-12) continue;
            const iw = 1.0 / pw;

            // World-RTE relative to main camera eye.
            const wx = px * iw + dx;
            const wy = py * iw + dy;
            const wz = pz * iw + dz;

            // Main camera clip space.
            const ex = mainPV[0] * wx + mainPV[4] * wy + mainPV[8] * wz + mainPV[12];
            const ey = mainPV[1] * wx + mainPV[5] * wy + mainPV[9] * wz + mainPV[13];
            const ew = mainPV[3] * wx + mainPV[7] * wy + mainPV[11] * wz + mainPV[15];

            if (ew <= 1e-6) {
                // Corner behind/at main camera -> safe fallback to fullscreen.
                this._scissor[0] = 0;
                this._scissor[1] = 0;
                this._scissor[2] = viewportW;
                this._scissor[3] = viewportH;
                return true;
            }

            const sx = ex / ew;
            const sy = ey / ew;
            if (sx < minX) minX = sx;
            if (sx > maxX) maxX = sx;
            if (sy < minY) minY = sy;
            if (sy > maxY) maxY = sy;
        }

        if (minX === Infinity) return false;

        // Clip NDC AABB to [-1,1] and convert to pixels.
        if (minX > 1 || maxX < -1 || minY > 1 || maxY < -1) return false;
        if (minX < -1) minX = -1;
        if (maxX > 1) maxX = 1;
        if (minY < -1) minY = -1;
        if (maxY > 1) maxY = 1;

        const x0 = Math.max(0, Math.floor((minX * 0.5 + 0.5) * viewportW));
        const y0 = Math.max(0, Math.floor((minY * 0.5 + 0.5) * viewportH));
        const x1 = Math.min(viewportW, Math.ceil((maxX * 0.5 + 0.5) * viewportW));
        const y1 = Math.min(viewportH, Math.ceil((maxY * 0.5 + 0.5) * viewportH));
        if (x1 <= x0 || y1 <= y0) return false;

        this._scissor[0] = x0;
        this._scissor[1] = y0;
        this._scissor[2] = x1 - x0;
        this._scissor[3] = y1 - y0;
        return true;
    }

    /**
     * Apply per-projector additive projector color(lighting) into the currently bound framebuffer.
     */
    public apply(gBuffer: Framebuffer): void {
        const r = this._renderer;
        const projectors = r.projectors;
        const total = projectors.activeCount;

        if (total === 0) return;

        const h = r.handler;
        const gl = h.gl!;
        const sh = h.programs.projectorsPass;
        const p = sh;
        const u = p.uniforms;

        sh.activate();

        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
        gl.blendEquation(gl.FUNC_ADD);
        gl.enable(gl.SCISSOR_TEST);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._cornerBuffer);
        gl.enableVertexAttribArray(p.attributes.a_corners);
        gl.vertexAttribPointer(p.attributes.a_corners, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);

        gl.uniformMatrix3fv(u.u_normalMatrix, false, r.activeCamera.getNormalMatrix());

        // G-buffer textures (slots 0..2 unused by projectors.bind starting at 6).
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, gBuffer.textures[1]);
        gl.uniform1i(u.u_materialsTexture, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, gBuffer.textures[2]);
        gl.uniform1i(u.u_normalTexture, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, gBuffer.textures[3]);
        gl.uniform1i(u.u_viewPositionTexture, 2);

        const mainPV = r.activeCamera.getProjectionViewRTEMatrix();
        const mainEye = r.activeCamera.eye;
        const vpW = gBuffer.width;
        const vpH = gBuffer.height;
        const active = projectors.active;

        for (let i = 0; i < total; i++) {
            if (!this._computeScissor(active[i], mainPV, mainEye, vpW, vpH)) {
                continue;
            }
            gl.scissor(this._scissor[0], this._scissor[1], this._scissor[2], this._scissor[3]);
            projectors.bindDeferred(p, 6, i);
            gl.drawElements(gl.TRIANGLES, this._indexCount, gl.UNSIGNED_SHORT, 0);
        }

        gl.disableVertexAttribArray(p.attributes.a_corners);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        gl.disable(gl.SCISSOR_TEST);
        gl.scissor(0, 0, vpW, vpH);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    }
}
