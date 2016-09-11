goog.provide('MBuff');

goog.require('og.scene.RenderNode');
goog.require('og.webgl.MultiFramebuffer');
goog.require('og.math');

MBuff = function () {
    og.inheritance.base(this, "mbuff");
};

og.inheritance.extend(MBuff, og.scene.RenderNode);

MBuff.prototype.initialization = function () {

    this.renderer.handler.addShaderProgram(new og.shaderProgram.ShaderProgram("triangle", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            texture: { type: og.shaderProgram.types.SAMPLER2D }
        },
        attributes: {
            position: { type: og.shaderProgram.types.VEC3, enableArray: true },
            textureCoordinates: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            'attribute vec3 position;\
            attribute vec2 textureCoordinates;\
            \
            uniform mat4 projectionViewMatrix;\
            \
            varying vec2 tc;\
            void main(void) {\
                gl_Position = projectionViewMatrix * vec4(position, 1.0);\
                tc = textureCoordinates;\
            }',
        fragmentShader:
            'precision lowp float;\
            uniform sampler2D texture;\
            \
            varying vec2 tc;\
            \
            void main(void) {\
                gl_FragColor = texture2D( texture, tc );\
            }'
    }));


    this.renderer.handler.addShaderProgram(new og.shaderProgram.ShaderProgram("mbuff", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 }
        },
        attributes: {
            position: { type: og.shaderProgram.types.VEC3, enableArray: true },
            color: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader:
            'attribute vec3 position;\
            attribute vec3 color;\
            uniform mat4 projectionViewMatrix;\
            varying vec3 vcolor;\
            \
            void main(void) {\
                vcolor = color;\
                gl_Position = projectionViewMatrix * vec4(position, 1.0);\
            }',
        fragmentShader:
            '#extension GL_EXT_draw_buffers : require \n\
            precision highp float;\
            \
            varying vec3 vcolor;\
            void main(void) {\
                gl_FragData[0] = vec4(vcolor,1.0);\
                gl_FragData[1] = vec4(0.0,1.0,0.0,1.0);\
                /*gl_FragColor = vec4(1.0);*/\
            }'
    }));

    var vertices = [
        -10, 0, -10,
       0.0, 0.0, -10,
       0.0, 10.0, -10,

        5, 0, 0,
       0.0, 5.0, 0,
       0.0, 0.0, 0
    ];

    var colors = [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        1, 0, 0,
        1, 0, 0,
        1, 0, 0, ];

    this._camCam1 = new og.Camera(this.renderer, { aspect: 1, eye: new og.math.Vector3(0, 0, 20), look: new og.math.Vector3(0, 0, 0), up: new og.math.Vector3(0, 1, 0) });
    this._camCam2 = new og.Camera(this.renderer, { aspect: 1, eye: new og.math.Vector3(0, 0, -20), look: new og.math.Vector3(0, 0, 0), up: new og.math.Vector3(0, 1, 0) });

    this._quadVerticesBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, vertices.length / 3);
    this._quadColorsBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(colors), 3, colors.length / 3);

    cam = this._camCam1;

    this._positionData1 = [0, 0, 0,
                          0, 1000, 0,
                          1000, 1000, 0,
                          1000, 0, 0];

    this._positionData2 = [0 + 2000, 0, 0,
                      0 + 2000, 1000, 0,
                      1000 + 2000, 1000, 0,
                      1000 + 2000, 0, 0];

    this._indexData = [0, 3, 1, 1, 3, 2];

    this._textureCoordData = [
        0, 0,
        0, 1,
        1, 1,
        1, 0];

    var h = this.renderer.handler;
    this._positionBuffer1 = h.createArrayBuffer(new Float32Array(this._positionData1), 3, this._positionData1.length / 3);
    this._positionBuffer2 = h.createArrayBuffer(new Float32Array(this._positionData2), 3, this._positionData2.length / 3);

    this._indexBuffer = h.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
    this._textureCoordBuffer = h.createArrayBuffer(new Float32Array(this._textureCoordData), 2, this._textureCoordData.length / 2);

    this.fb = new og.webgl.MultiFramebuffer(this.renderer.handler);
};

var cam;
MBuff.prototype.frame = function () {

    var gl = this.renderer.handler.gl;
    gl.disable(gl.CULL_FACE);

    this.fb.activate();

    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.renderer.handler.shaderPrograms.mbuff.activate();

    var sh = this.renderer.handler.shaderPrograms.mbuff,
        p = sh._program,
        sha = p.attributes,
        shu = p.uniforms;

    sh.activate();

    gl.uniformMatrix4fv(shu.projectionViewMatrix._pName, false, cam._projectionViewMatrix._m);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadVerticesBuffer);
    gl.vertexAttribPointer(sha.position._pName, this._quadVerticesBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadColorsBuffer);
    gl.vertexAttribPointer(sha.color._pName, this._quadColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this._quadVerticesBuffer.numItems);

    this.fb.deactivate();

    gl.enable(gl.CULL_FACE);

    //
    this.renderer.handler.shaderPrograms.triangle.activate();

    var sh = this.renderer.handler.shaderPrograms.triangle,
        p = sh._program,
        sha = p.attributes,
        shu = p.uniforms,
        gl = this.renderer.handler.gl;

    sh.activate();

    gl.uniformMatrix4fv(shu.projectionViewMatrix._pName, false, this.renderer.activeCamera._projectionViewMatrix._m);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fb.textures[0]);
    gl.uniform1i(shu.texture._pName, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._textureCoordBuffer);
    gl.vertexAttribPointer(sha.textureCoordinates._pName, this._textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer1);
    gl.vertexAttribPointer(sha.position._pName, this._positionBuffer1.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.drawElements(gl.TRIANGLES, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    //////

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fb.textures[1]);
    gl.uniform1i(shu.texture._pName, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer2);
    gl.vertexAttribPointer(sha.position._pName, this._positionBuffer2.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawElements(gl.TRIANGLES, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
};