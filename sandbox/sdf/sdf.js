goog.provide('my.SDF');

goog.require('og.node.RenderNode');
goog.require('og.inheritance');
goog.require('og.webgl.Framebuffer');
goog.require('og.ImageCanvas');

my.SDF = function (name) {
    og.inheritance.base(this, name);

    this.sourceTexture = null;

    this.framebuffer0 = null;
    this.framebuffer1 = null;

    //this.width = 2048;
    //this.height = 4096;

    this._handler = null;

};

og.inheritance.extend(my.SDF, og.node.RenderNode);


my.SDF.prototype.initialization = function () {

    var letter = "mli";
    var face = "Arial Black";
    var style = null;
    var weight = null;
    var tis = 2048;

    this.sourceCanvas = new og.ImageCanvas(tis, tis);
    var pT = Math.round(tis * 0.75);
    var tF = (style || "normal") + " " + (weight || "normal") + " " + pT + "px " + face;

    this.sourceCanvas.fillColor("black");
    this.sourceCanvas.drawText(letter, 40, pT, tF, "white");

    this.outsideDistance = 180;
    this.insideDistance = 60;
    this.outsideMix = 0.715;
    this.insideMix = 0.709;

    this.createContext(this.sourceCanvas._canvas);
};

my.SDF.prototype.createContext = function (sourceCanvas) {

    var vfield = new og.shaderProgram.ShaderProgram("vfield", {
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
            const int maxDistance = "+ this.outsideDistance + ";\n\
            void main() {\n\
                if ( texture2D(uTex1, TexCoord / vTexSize).r > 0.5 ) {\n\
                    gl_FragColor = vec4(0.0,0.0,0.0,1.0);\n\
                    return;\n\
                }\n\
                for ( int i=1; i <= maxDistance; i++ ) {\n\
                    if(i > uDistance) break;\n\
                    if ( texture2D(uTex1, ( TexCoord + vec2(0.0, float(i)) ) / vTexSize ).r > 0.5 ) {\n\
                        gl_FragColor = vec4( vec3(float(i)/float(uDistance)), 1.0 );\n\
                        return;\n\
                    }\n\
                    if ( texture2D(uTex1, ( TexCoord - vec2(0.0, float(i))) / vTexSize ).r > 0.5 ) {\n\
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
            const int maxDistance = " + this.outsideDistance + ";\n\
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

    var neg = new og.shaderProgram.ShaderProgram("neg", {
        uniforms: {
            uTex1: { type: og.shaderProgram.types.SAMPLER2D },
        },
        attributes: {
            aPos: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            "attribute vec2 aPos;\n\
            varying vec2 TexCoord;\n\
            void main(){\n\
            TexCoord = (aPos + 1.0) * 0.5;\n\
            gl_Position.xy = aPos;\n\
            gl_Position.zw = vec2(0.0, 1.0);\n\
        }",
        fragmentShader:
            "precision highp float;\n\
            uniform sampler2D uTex1;\n\
            varying vec2 TexCoord;\n\
            void main(){\n\
                vec4 color = texture2D(uTex1, TexCoord);\n\
                gl_FragColor = vec4(vec3(1.0) - color.rgb, color.a); \n\
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
                            //float r;\n\
                            //if(s == 1.0) {\n\
                            //    d = 0.709;\n\
                            //} else {\n\
                            //    d = 0.715;\n\
                            //}\n\
                            gl_FragColor = vec4( vec3(1.0 - mix(i, o, s < 1.0 ? "+ this.outsideMix + " : " + this.insideMix + " )), 1.0); \n\
                        }"
    });


    this.sourceCanvas = sourceCanvas;
    this.width = sourceCanvas.width;
    this.height = sourceCanvas.height;

    this._handler = new og.webgl.Handler(null, {
        width: this.width, height: this.height,
        context: { alpha: true, depth: false }
    });
    this._handler.addShaderProgram(vfield);
    this._handler.addShaderProgram(hfield);
    this._handler.addShaderProgram(neg);
    this._handler.addShaderProgram(sum);
    this._handler.init();
    this._handler.deactivateFaceCulling();
    this._handler.deactivateDepthTest();

    this._vertexBuffer = this._handler.createArrayBuffer(new Float32Array([
     -1, -1,
     -1, 1,
      1, -1,
      1, 1]), 2, 4);

    this.framebuffer0 = new og.webgl.Framebuffer(this._handler.gl, this.width, this.height);
    this.framebuffer0.initialize();
    this.framebuffer1 = new og.webgl.Framebuffer(this._handler.gl, this.width, this.height);
    this.framebuffer1.initialize();
    this.framebuffer2 = new og.webgl.Framebuffer(this._handler.gl, this.width, this.height);
    this.framebuffer2.initialize();

    this.sourceTexture = this._handler.createTexture_l(sourceCanvas);
    this.makeDF();

};

my.SDF.prototype.makeDF = function () {
    var h = this._handler,
        gl = h.gl;

    //VERT
    this.framebuffer0.activate();
    h.shaderPrograms.vfield.activate();
    var sh = h.shaderPrograms.vfield._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.uniform2fv(shu.uTexSize._pName, [this.width, this.height]);
    gl.uniform1i(shu.uDistance._pName, this.outsideDistance);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer0.deactivate();

    //HORIZ
    this.framebuffer1.activate();
    h.shaderPrograms.hfield.activate();
    var sh = h.shaderPrograms.hfield._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebuffer0.texture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.uniform2fv(shu.uTexSize._pName, [this.width, this.height]);
    gl.uniform1i(shu.uDistance._pName, this.outsideDistance);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer1.deactivate();

    //NEG
    this.framebuffer0.activate();
    h.shaderPrograms.neg.activate();
    var sh = h.shaderPrograms.neg._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer0.deactivate();

    //NEG VERT
    this.framebuffer2.activate();
    h.shaderPrograms.vfield.activate();
    var sh = h.shaderPrograms.vfield._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebuffer0.texture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.uniform2fv(shu.uTexSize._pName, [this.width, this.height]);
    gl.uniform1i(shu.uDistance._pName, this.insideDistance);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer2.deactivate();

    //NEG HORIZ
    this.framebuffer0.activate();
    h.shaderPrograms.hfield.activate();
    var sh = h.shaderPrograms.hfield._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebuffer2.texture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.uniform2fv(shu.uTexSize._pName, [this.width, this.height]);
    gl.uniform1i(shu.uDistance._pName, this.insideDistance);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer0.deactivate();

    //SUM
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    h.shaderPrograms.sum.activate();
    var sh = h.shaderPrograms.sum._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebuffer1.texture);
    gl.uniform1i(shu.outside._pName, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.framebuffer0.texture);
    gl.uniform1i(shu.inside._pName, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(shu.source._pName, 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    document.body.appendChild(this._handler.canvas);

};

