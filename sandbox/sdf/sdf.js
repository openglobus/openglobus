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

    var letter = "fi";
    var face = "arial";
    var style = null;
    var weight = null;
    var tis = 2048;

    this.sourceCanvas = new og.ImageCanvas(tis, tis);
    var pT = Math.round(tis * 0.75);
    var tF = (style || "normal") + " " + (weight || "normal") + " " + pT + "px " + face;

    this.sourceCanvas.fillColor("black");
    this.sourceCanvas.drawText(letter, 40, pT, tF, "white");

    this.outsideDistance = 100;
    this.insideDistance = 30;


    //var that = this;
    //var img = new Image();
    //img.onload = function () {
    //    that.createContext(this);
    //};
    //img.src = "pantera.png";    

    this.createContext(this.sourceCanvas._canvas);
};

my.SDF.prototype.createContext = function (sourceCanvas) {

    var vfield = new og.shaderProgram.ShaderProgram("vfield", {
        uniforms: {
            uTexSize: { type: og.shaderProgram.types.VEC2 },
            uTex1: { type: og.shaderProgram.types.SAMPLER2D },
            uHPass: { type: og.shaderProgram.types.BOOL },
            //uMod16: { type: og.shaderProgram.types.FLOAT },
            uDistance: { type: og.shaderProgram.types.INT },
            uOrd: { type: og.shaderProgram.types.VEC2 }
        },
        attributes: {
            aPos: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("vfield_vs.txt"),
        fragmentShader: og.utils.readTextFile("vfield_fs.txt")
    });

    var neg = new og.shaderProgram.ShaderProgram("neg", {
        uniforms: {
            uTex1: { type: og.shaderProgram.types.SAMPLER2D },
        },
        attributes: {
            aPos: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: "attribute vec2 aPos;\n\
                        varying vec2 TexCoord;\n\
                        void main(){\n\
                            TexCoord = (aPos + 1.0) * 0.5;\n\
                            gl_Position.xy = aPos;\n\
                            gl_Position.zw = vec2(0.0, 1.0);\n\
                        }",
        fragmentShader: "precision highp float;\n\
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
                            vec4 o = texture2D(outside, TexCoord);\n\
                            vec4 i = texture2D(inside, TexCoord);\n\
                            vec4 s = texture2D(source, TexCoord);\n\
                            vec3 res;\n\
                            if(s.r == 1.0) {\n\
                                res = vec3( mix(1.0 - i.r, o.r, 0.699) );\n\
                            } else {\n\
                                res = vec3( mix(1.0 - i.r, o.r, 0.715) );\n\
                            }\n\
                            gl_FragColor = vec4(vec3(1.0) - res, 1.0); \n\
                        }"
    });


    this.sourceCanvas = sourceCanvas;
    this.width = sourceCanvas.width;
    this.height = sourceCanvas.height;

    //initialize hidden handler
    this._handler = new og.webgl.Handler(null, {
        width: this.width, height: this.height,
        context: { alpha: true, depth: false }
    });
    this._handler.addShaderProgram(vfield);
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

//my.SDF.prototype.frame = function () {
    //this.framebuffer && this.makeDF();
//}

my.SDF.prototype.makeDF = function () {
    var h = this._handler,
        gl = h.gl;

    h.shaderPrograms.vfield.activate();
    var sh = h.shaderPrograms.vfield._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.uniform2fv(shu.uTexSize._pName, [this.width, this.height]);
    gl.uniform2fv(shu.uOrd._pName, [1, 1]);
    gl.uniform1i(shu.uDistance._pName, this.outsideDistance);
    gl.uniform1f(shu.uHPass._pName, false);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //VERT
    this.framebuffer0.activate();
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer0.deactivate();

    //HORIZ
    this.framebuffer1.activate();
    gl.uniform1f(shu.uHPass._pName, true);
    gl.uniform2fv(shu.uOrd._pName, [1.0, 1.0]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebuffer0.texture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer1.deactivate();

    //NEG
    h.shaderPrograms.neg.activate();
    var sh = h.shaderPrograms.neg._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    this.framebuffer0.activate();
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer0.deactivate();

    //NEG VERT
    h.shaderPrograms.vfield.activate();
    var sh = h.shaderPrograms.vfield._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebuffer0.texture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.uniform2fv(shu.uTexSize._pName, [this.width, this.height]);
    gl.uniform2fv(shu.uOrd._pName, [1, 1]);
    gl.uniform1i(shu.uDistance._pName, this.insideDistance);
    gl.uniform1f(shu.uHPass._pName, false);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    this.framebuffer2.activate();
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer2.deactivate();

    //NEG HORIZ
    this.framebuffer0.activate();
    gl.uniform1f(shu.uHPass._pName, true);
    gl.uniform2fv(shu.uOrd._pName, [1.0, 1.0]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebuffer2.texture);
    gl.uniform1i(shu.uTex1._pName, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer0.deactivate();

    //SUM
    //this.framebuffer2.activate();
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

    //this.framebuffer2.deactivate();


    document.body.appendChild(this._handler.canvas);

};

