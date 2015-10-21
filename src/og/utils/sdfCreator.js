goog.provide('og.utils.SDFCreator');

goog.require("og.webgl.Handler");
goog.require("og.webgl.Framebuffer");
goog.require("og.shaderProgram.ShaderProgram");

og.utils.SDFCreator = function (width, height) {
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
};

og.utils.SDFCreator.prototype.initialize = function () {
    this._initHandler(this._width, this._height);
    this._initShaders();
}

og.utils.SDFCreator.prototype._initHandler = function (width, height) {

    this._handler = new og.webgl.Handler(null, {
        width: width, height: height,
        context: { alpha: true, depth: false }
    });
    this._handler.init();
    this._handler.deactivateFaceCulling();
    this._handler.deactivateDepthTest();

    this._vertexBuffer = this._handler.createArrayBuffer(new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1]), 2, 4);

    this._framebuffer0 = new og.webgl.Framebuffer(this._handler.gl, width, height, true);
    this._framebuffer1 = new og.webgl.Framebuffer(this._handler.gl, width, height, true);
    this._framebuffer2 = new og.webgl.Framebuffer(this._handler.gl, width, height, true);
};

og.utils.SDFCreator.prototype._initShaders = function () {
    var vfield = new og.shaderProgram.ShaderProgram("vfield", {
        uniforms: {
            uTexSize: { type: og.shaderProgram.types.VEC2 },
            uTex1: { type: og.shaderProgram.types.SAMPLER2D },
            uDistance: { type: og.shaderProgram.types.INT },
            uNeg: { type: og.shaderProgram.types.VEC2 }
        },
        attributes: {
            aPos: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            "attribute vec2 aPos;\n\
            uniform vec2 uTexSize;\n\
            varying vec2 TexCoord;\n\
            varying vec2 vTexSize;\n\
            void main() {\n\
                TexCoord = (aPos + 1.0) * 0.5;\n\
                TexCoord *= uTexSize;\n\
                vTexSize = uTexSize;\n\
                gl_Position.xy = aPos;\n\
                gl_Position.zw = vec2(0.0, 1.0);\n\
            }",
        fragmentShader:
              "precision highp float;\n\
            uniform sampler2D uTex1;\n\
            uniform int uDistance;\n\
            uniform vec2 uNeg;\n\
            varying vec2 TexCoord;\n\
            varying vec2 vTexSize;\n\
            const int maxDistance = "+ this._outsideDistance + ";\n\
            void main() {\n\
                if ( uNeg.x - uNeg.y * texture2D(uTex1, TexCoord / vTexSize).r > 0.5 ) {\n\
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n\
                    return;\n\
                }\n\
                for ( int i=1; i <= maxDistance; i++ ) {\n\
                    if(i > uDistance) break;\n\
                    if ( uNeg.x - uNeg.y * texture2D(uTex1, ( TexCoord + vec2(0.0, i) ) / vTexSize ).r > 0.5 ) {\n\
                        gl_FragColor = vec4( vec3(float(i)/float(uDistance)), 1.0 );\n\
                        return;\n\
                    }\n\
                    if ( uNeg.x - uNeg.y * texture2D(uTex1, ( TexCoord - vec2(0.0, i)) / vTexSize ).r > 0.5 ) {\n\
                        gl_FragColor = vec4(vec3(float(i)/float(uDistance)), 1.0);\n\
                        return;\n\
                    }\n\
                }\n\
                gl_FragColor = vec4(1.0);\n\
            }"
    });

    var hfield = new og.shaderProgram.ShaderProgram("hfield", {
        uniforms: {
            uTexSize: { type: og.shaderProgram.types.VEC2 },
            uTex1: { type: og.shaderProgram.types.SAMPLER2D },
            uDistance: { type: og.shaderProgram.types.INT }
        },
        attributes: {
            aPos: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            "attribute vec2 aPos;\n\
            uniform vec2 uTexSize;\n\
            varying vec2 TexCoord;\n\
            varying vec2 vTexSize;\n\
            void main() {\n\
                TexCoord = (aPos + 1.0) * 0.5;\n\
                TexCoord *= uTexSize;\n\
                vTexSize = uTexSize;\n\
                gl_Position.xy = aPos;\n\
                gl_Position.zw = vec2(0.0, 1.0);\n\
            }",
        fragmentShader:
            "precision highp float;\n\
            uniform sampler2D uTex1;\n\
            uniform int uDistance;\n\
            varying vec2 TexCoord;\n\
            varying vec2 vTexSize;\n\
            const int maxDistance = " + this._outsideDistance + ";\n\
            float CalcC(float H, float V) {\n\
                return ( sqrt( H * H + V * V ) );\n\
            }\n\
            void main(){\n\
                float dist = CalcC( 0.0, texture2D( uTex1, TexCoord / vTexSize ).r );\n\
                for ( int i = 1; i <= maxDistance; i++ ) {\n\
                    if(i > uDistance) break;\n\
                    float H = float(i) / float(uDistance);\n\
                    dist = min( dist, CalcC( H, texture2D( uTex1, ( TexCoord + vec2( float(i), 0.0) ) / vTexSize ).r ) );\n\
                    dist = min( dist, CalcC( H, texture2D( uTex1, ( TexCoord - vec2( float(i), 0.0) ) / vTexSize ).r ) );\n\
                }\n\
                gl_FragColor = vec4(dist);\n\
                gl_FragColor.w = 1.0;\n\
            }"
    });

    var sum = new og.shaderProgram.ShaderProgram("sum", {
        uniforms: {
            outside: { type: og.shaderProgram.types.SAMPLER2D },
            inside: { type: og.shaderProgram.types.SAMPLER2D },
            source: { type: og.shaderProgram.types.SAMPLER2D }
        },
        attributes: {
            aPos: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: "attribute vec2 aPos;\n\
                        varying vec2 TexCoord;\n\
                        void main(){\n\
                            TexCoord = (aPos * vec2(1.0,-1.0) + 1.0) * 0.5;\n\
                            gl_Position.xy = aPos;\n\
                            gl_Position.zw = vec2(0.0, 1.0);\n\
                        }",
        fragmentShader: "precision highp float;\n\
                        uniform sampler2D outside;\n\
                        uniform sampler2D inside;\n\
                        uniform sampler2D source;\n\
                        varying vec2 TexCoord;\n\
                        void main(){\n\
                            float o = texture2D(outside, TexCoord).r;\n\
                            float i = 1.0 - texture2D(inside, TexCoord).r;\n\
                            float s = texture2D(source, TexCoord).r;\n\
                            gl_FragColor = vec4( vec3(1.0 - mix(i, o, s < 1.0 ? "+ this._outsideMix + " : " + this._insideMix + " )), 1.0); \n\
                        }"
    });

    this._handler.addShaderPrograms([vfield, hfield, sum]);
};

og.utils.SDFCreator.prototype.setSize = function (width, height) {
    if (width != this._width || height != this._height) {
        this._width = width;
        this._height = height;
        this._handler.setSize(width, height);
        this._framebuffer0.setSize(width, height);
        this._framebuffer1.setSize(width, height);
    }
};

og.utils.SDFCreator.prototype.createSDF = function (sourceCanvas, width, height) {

    var h = this._handler,
        gl = h.gl;

    h.setSize(this._width, this._height);

    gl.deleteTexture(this._sourceTexture);

    this._sourceTexture = h.createTexture_l(sourceCanvas);

    h.shaderPrograms.vfield.activate();
    var sh = h.shaderPrograms.vfield._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.uniform2fv(shu.uTexSize._pName, [this._width, this._height]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //VERT
    this._framebuffer0.activate();
    gl.uniform1i(shu.uDistance._pName, this._outsideDistance);
    gl.uniform2fv(shu.uNeg._pName, [0.0, -1.0]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this._framebuffer0.deactivate();

    //NEG VERT
    this._framebuffer2.activate();
    gl.uniform2fv(shu.uNeg._pName, [1.0, 1.0]);
    gl.uniform1i(shu.uDistance._pName, this._insideDistance);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this._framebuffer2.deactivate();

    h.shaderPrograms.hfield.activate();
    var sh = h.shaderPrograms.hfield._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.uniform2fv(shu.uTexSize._pName, [this._width, this._height]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //HORIZ
    this._framebuffer1.activate();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._framebuffer0.texture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.uniform1i(shu.uDistance._pName, this._outsideDistance);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this._framebuffer1.deactivate();

    //NEG HORIZ
    this._framebuffer0.activate();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._framebuffer2.texture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.uniform1i(shu.uDistance._pName, this._insideDistance);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this._framebuffer0.deactivate();

    h.setSize(width || this._width, height || this._height);

    //SUM
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    h.shaderPrograms.sum.activate();
    var sh = h.shaderPrograms.sum._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._framebuffer1.texture);
    gl.uniform1i(shu.outside._pName, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._framebuffer0.texture);
    gl.uniform1i(shu.inside._pName, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
    gl.uniform1i(shu.source._pName, 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    return h.canvas;
};
