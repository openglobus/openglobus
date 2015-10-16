goog.provide('my.Df');

goog.require('og.node.RenderNode');
goog.require('og.inheritance');

my.Df = function (name) {
    og.inheritance.base(this, name);

    this.texture = null;

    this._vertexBuffer = null;
    this._texCoordBuffer = null;

    this._texCoordArr = [];
    this._vertexArr = [];
};

og.inheritance.extend(my.Df, og.node.RenderNode);


my.Df.prototype.initialization = function () {

    var size = 1000;

    this._vertexArr = [-0.5 * size, 0.5 * size, 100,
                       -0.5 * size, -0.5 * size, 100,
                        0.5 * size, -0.5 * size, 100,
                        0.5 * size, -0.5 * size, 100,
                        0.5 * size, 0.5 * size, 100,
                       -0.5 * size, 0.5 * size, 100];

    this._texCoordArr = [0, 0,
                         0, 1,
                         1, 1,
                         1, 1,
                         1, 0,
                         0, 0];

    var h = this.renderer.handler;
    this._vertexBuffer = h.createArrayBuffer(new Float32Array(this._vertexArr), 3, this._vertexArr.length / 3);
    this._texCoordBuffer = h.createArrayBuffer(new Float32Array(this._texCoordArr), 2, this._texCoordArr.length / 2);

    var img = new Image();
    that = this;
    img.onload = function () {
        that.texture = h.createTexture_l(this);
    };
    img.src = "hw.png";

    var sdfShader = new og.shaderProgram.ShaderProgram("sdf", {
        uniforms: {
            uMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uPMatrix: { type: og.shaderProgram.types.MAT4 },
            u_texture: { type: og.shaderProgram.types.SAMPLER2D },
            u_color: { type: og.shaderProgram.types.VEC4 },
            u_gamma: { type: og.shaderProgram.types.FLOAT },
            u_buffer: { type: og.shaderProgram.types.FLOAT },
            uZ: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            a_vertices: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: "attribute vec3 a_vertices; \n\
                        attribute vec2 a_texCoord; \n\
                        \n\
                        uniform mat4 uPMatrix;\n\
                        uniform mat4 uMVMatrix;\n\
                        uniform float uZ;\n\
                        \n\
                        varying vec2 vTextureCoord;\n\
                        \n\
                        void main(void) {\n\
                            vTextureCoord = a_texCoord;\n\
                            gl_Position = uPMatrix * uMVMatrix * vec4(a_vertices, 1.0);\n\
                            gl_Position.z+=uZ;\n\
                        }\n\
                    ",
        fragmentShader: "precision highp float;\n\
                            varying vec2 vTextureCoord;\n\
                            uniform sampler2D u_texture;\n\
                            uniform vec4 u_color;\n\
                            uniform float u_buffer;\n\
                            uniform float u_gamma;\n\
                            \n\
                            void main(void) {\n\
                                float dist = texture2D(u_texture, vTextureCoord).r;\n\
                                float alpha = smoothstep(u_buffer - u_gamma, u_buffer + u_gamma, dist);\n\
                                if(alpha<=0.5)discard;\n\
                                gl_FragColor = vec4(u_color.rgb, alpha * u_color.a);\n\
                            }"
    });

    h.addShaderProgram(sdfShader);
};

var gamma = 0;
var buffer = 0.5;

var bcolor = [1, 1, 1, 1];
var color = [0, 0, 0, 1];

my.Df.prototype.frame = function () {

    var r = this.renderer;
    var h = r.handler;
    h.shaderPrograms.sdf.activate();
    var sh = h.shaderPrograms.sdf._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var gl = h.gl;


    gl.enable(gl.BLEND);
    //gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);


    gl.disable(gl.CULL_FACE);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.uniform1i(shu.u_texture._pName, 0);

    gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera.mvMatrix._m);
    gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera.pMatrix._m);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.a_vertices._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);

    gl.uniform4fv(shu.u_color._pName, bcolor);
    gl.uniform1f(shu.u_buffer._pName, buffer);
    gl.uniform1f(shu.uZ._pName, 0);
    gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);

    gl.uniform4fv(shu.u_color._pName, color);
    gl.uniform1f(shu.u_buffer._pName, 192 / 256);
    gl.uniform1f(shu.u_gamma._pName, gamma);
    gl.uniform1f(shu.uZ._pName, -0.01);
    gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);

};

