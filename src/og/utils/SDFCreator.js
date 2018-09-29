/**
 * @module og/utils/SDFCreator
 */

'use strict';

import { Framebuffer } from '../webgl/Framebuffer.js';
import { Handler } from '../webgl/Handler.js';
import { Program } from '../webgl/Program.js';
import { types } from '../webgl/types.js';

class SDFCreator {
    constructor(width, height) {
        this._handler = null;
        this._framebuffer0 = null;
        this._framebuffer1 = null;
        this._framebuffer2 = null;
        this._vertexBuffer = null;

        //default params
        this._width = width || 512;
        this._height = height || 512;
        var s = Math.max(this._width, this._height);
        this._outsideDistance = Math.round(80 * s / 512);
        this._insideDistance = Math.round(10 * s / 512);
        this._outsideMix = 0.710;
        this._insideMix = 0.679;
        this._sourceTexture = null;

        this.initialize();
    }

    initialize() {
        this._initHandler(this._width, this._height);
        this._initShaders();
    }

    _initHandler(width, height) {

        this._handler = new Handler(null, {
            width: width, height: height,
            context: { alpha: true, depth: false }
        });
        this._handler.initialize();
        this._handler.deactivateFaceCulling();
        this._handler.deactivateDepthTest();

        this._vertexBuffer = this._handler.createArrayBuffer(new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1]), 2, 4);

        this._framebuffer0 = new Framebuffer(this._handler, { useDepth: false });
        this._framebuffer1 = new Framebuffer(this._handler, { useDepth: false });
        this._framebuffer2 = new Framebuffer(this._handler, { useDepth: false });

        this._framebuffer0.init();
        this._framebuffer1.init();
        this._framebuffer2.init();
    }
    _initShaders() {
        var vfield = new Program("vfield", {
            uniforms: {
                uTexSize: { type: types.VEC2 },
                uTex1: { type: types.SAMPLER2D },
                uDistance: { type: types.INT },
                uNeg: { type: types.VEC2 }
            },
            attributes: {
                aPos: { type: types.VEC2, enableArray: true }
            },
            vertexShader:
            "precision highp float;\
            attribute vec2 aPos;\
            uniform vec2 uTexSize;\
            varying vec2 TexCoord;\
            varying vec2 vTexSize;\
            void main() {\
                TexCoord = (aPos + 1.0) * 0.5;\
                TexCoord *= uTexSize;\
                vTexSize = uTexSize;\
                gl_Position.xy = aPos;\
                gl_Position.zw = vec2(0.0, 1.0);\
            }",
            fragmentShader:
            "precision highp float;\
            uniform sampler2D uTex1;\
            uniform int uDistance;\
            uniform vec2 uNeg;\
            varying vec2 TexCoord;\
            varying vec2 vTexSize;\
            const int maxDistance = " + this._outsideDistance + ";\
            void main() {\
                if ( uNeg.x - uNeg.y * texture2D(uTex1, TexCoord / vTexSize).r > 0.5 ) {\
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\
                    return;\
                }\
                for ( int i=1; i <= maxDistance; i++ ) {\
                    if(i > uDistance) break;\
                    if ( uNeg.x - uNeg.y * texture2D(uTex1, ( TexCoord + vec2(0.0, i) ) / vTexSize ).r > 0.5 ) {\
                        gl_FragColor = vec4( vec3(float(i)/float(uDistance)), 1.0 );\
                        return;\
                    }\
                    if ( uNeg.x - uNeg.y * texture2D(uTex1, ( TexCoord - vec2(0.0, i)) / vTexSize ).r > 0.5 ) {\
                        gl_FragColor = vec4(vec3(float(i)/float(uDistance)), 1.0);\
                        return;\
                    }\
                }\
                gl_FragColor = vec4(1.0);\
            }"
        });

        var hfield = new Program("hfield", {
            uniforms: {
                uTexSize: { type: types.VEC2 },
                uTex1: { type: types.SAMPLER2D },
                uDistance: { type: types.INT }
            },
            attributes: {
                aPos: { type: types.VEC2, enableArray: true }
            },
            vertexShader:
            "precision highp float;\
            attribute vec2 aPos;\
            uniform vec2 uTexSize;\
            varying vec2 TexCoord;\
            varying vec2 vTexSize;\
            void main() {\n\
                TexCoord = (aPos + 1.0) * 0.5;\
                TexCoord *= uTexSize;\
                vTexSize = uTexSize;\
                gl_Position.xy = aPos;\
                gl_Position.zw = vec2(0.0, 1.0);\
            }",
            fragmentShader:
            "precision highp float;\
            uniform sampler2D uTex1;\
            uniform int uDistance;\
            varying vec2 TexCoord;\
            varying vec2 vTexSize;\
            const int maxDistance = " + this._outsideDistance + ";\
            float CalcC(float H, float V) {\
                return ( sqrt( H * H + V * V ) );\
            }\
            void main(){\
                float dist = CalcC( 0.0, texture2D( uTex1, TexCoord / vTexSize ).r );\
                for ( int i = 1; i <= maxDistance; i++ ) {\
                    if(i > uDistance) break;\
                    float H = float(i) / float(uDistance);\
                    dist = min( dist, CalcC( H, texture2D( uTex1, ( TexCoord + vec2( float(i), 0.0) ) / vTexSize ).r ) );\
                    dist = min( dist, CalcC( H, texture2D( uTex1, ( TexCoord - vec2( float(i), 0.0) ) / vTexSize ).r ) );\
                }\
                gl_FragColor = vec4(dist);\
                gl_FragColor.w = 1.0;\
            }"
        });

        var sum = new Program("sum", {
            uniforms: {
                outside: { type: types.SAMPLER2D },
                inside: { type: types.SAMPLER2D },
                source: { type: types.SAMPLER2D }
            },
            attributes: {
                aPos: { type: types.VEC2, enableArray: true }
            },
            vertexShader: "attribute vec2 aPos;\n\
                        varying vec2 TexCoord;\n\
                        void main(){\n\
                            TexCoord = (aPos * vec2(1.0,-1.0) + 1.0) * 0.5;\n\
                            gl_Position.xy = aPos;\n\
                            gl_Position.zw = vec2(0.0, 1.0);\n\
                        }",
            fragmentShader:
            "precision highp float;\n\
                        uniform sampler2D outside;\n\
                        uniform sampler2D inside;\n\
                        uniform sampler2D source;\n\
                        varying vec2 TexCoord;\n\
                        void main(){\n\
                            float o = texture2D(outside, TexCoord).r;\n\
                            float i = 1.0 - texture2D(inside, TexCoord).r;\n\
                            float s = texture2D(source, TexCoord).r;\n\
                            gl_FragColor = vec4( vec3(1.0 - mix(i, o, step(0.5, s) * " + this._outsideMix + " + (1.0 - step(0.5, s)) * " + this._insideMix + " )), 1.0);\n\
                        }"
        });
        this._handler.addPrograms([vfield, hfield, sum]);
    };

    setSize(width, height) {
        if (width !== this._width || height !== this._height) {
            this._width = width;
            this._height = height;
            this._handler.setSize(width, height);
            this._framebuffer0.setSize(width, height);
            this._framebuffer1.setSize(width, height);
        }
    }

    createSDF(sourceCanvas, width, height) {

        var h = this._handler,
            gl = h.gl;

        h.setSize(this._width, this._height);

        gl.deleteTexture(this._sourceTexture);

        this._sourceTexture = h.createTexture_l(sourceCanvas);

        h.programs.vfield.activate();
        var sh = h.programs.vfield._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
        gl.uniform1i(shu.uTex1, 0);
        gl.uniform2fv(shu.uTexSize, [this._width, this._height]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(sha.aPos, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //VERT
        this._framebuffer0.activate();
        gl.uniform1i(shu.uDistance, this._outsideDistance);
        gl.uniform2fv(shu.uNeg, [0.0, -1.0]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this._framebuffer0.deactivate();

        //NEG VERT
        this._framebuffer2.activate();
        gl.uniform2fv(shu.uNeg, [1.0, 1.0]);
        gl.uniform1i(shu.uDistance, this._insideDistance);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this._framebuffer2.deactivate();

        h.programs.hfield.activate();
        var sh = h.programs.hfield._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        gl.uniform2fv(shu.uTexSize, [this._width, this._height]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(sha.aPos, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //HORIZ
        this._framebuffer1.activate();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer0.texture);
        gl.uniform1i(shu.uTex1, 0);
        gl.uniform1i(shu.uDistance, this._outsideDistance);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this._framebuffer1.deactivate();

        //NEG HORIZ
        this._framebuffer0.activate();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer2.texture);
        gl.uniform1i(shu.uTex1, 0);
        gl.uniform1i(shu.uDistance, this._insideDistance);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this._framebuffer0.deactivate();

        h.setSize(width || this._width, height || this._height);

        //SUM
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        h.programs.sum.activate();
        var sh = h.programs.sum._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer1.texture);
        gl.uniform1i(shu.outside, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer0.texture);
        gl.uniform1i(shu.inside, 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
        gl.uniform1i(shu.source, 2);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(sha.aPos, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        return h.canvas;
    }
}

export { SDFCreator };
