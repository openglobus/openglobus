goog.provide('og.scene.SkyBox');

goog.require('og.inheritance');
goog.require('og.scene.RenderNode');
goog.require('og.shaderProgram.skybox');

og.scene.defaultSkyBox = function () {
    return new og.scene.SkyBox({
        "nx": "resources/images/skyboxes/gal/_nx.jpg",
        "px": "resources/images/skyboxes/gal/_px.jpg",
        "py": "resources/images/skyboxes/gal/_py.jpg",
        "ny": "resources/images/skyboxes/gal/_ny.jpg",
        "pz": "resources/images/skyboxes/gal/_pz.jpg",
        "nz": "resources/images/skyboxes/gal/_nz.jpg"
    });
};

og.scene.SkyBox = function (params) {
    og.inheritance.base(this, "skybox");
    this.params = params;
    this.vertexPositionBuffer = null;
    this.texture = null;
};

og.inheritance.extend(og.scene.SkyBox, og.scene.RenderNode);

og.scene.SkyBox.prototype.initialization = function () {
    this.renderer.handler.addShaderProgram(og.shaderProgram.skybox(), true);
    this.texture = this.renderer.handler.loadCubeMapTexture(this.params);
    this.createBuffers();
    this.drawMode = this.renderer.handler.gl.TRIANGLES;
};

og.scene.SkyBox.prototype.frame = function () {
    var h = this.renderer.handler;
    var gl = h.gl;
    var cam = this.renderer.activeCamera;
    gl.disable(h.gl.DEPTH_TEST);

    h.shaderPrograms.skybox.activate();
    sh = h.shaderPrograms.skybox._program;
    var shu = sh.uniforms;
    gl.uniformMatrix4fv(shu.projectionViewMatrix._pName, false, cam._projectionViewMatrix._m);
    gl.uniform3fv(shu.pos._pName, cam.eye.toVec());
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
    gl.uniform1i(shu.uSampler._pName, 0);
    var buf = this.vertexPositionBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(sh.attributes.aVertexPosition._pName, buf.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawArrays(this.drawMode, 0, buf.numItems);
    h.gl.enable(h.gl.DEPTH_TEST);
};

og.scene.SkyBox.prototype.createBuffers = function () {

    var vertices = new Float32Array([
        - 10000.0 ,   10000.0 , - 10000.0 ,
        - 10000.0 , - 10000.0 , - 10000.0 ,
          10000.0 , - 10000.0 , - 10000.0 ,
          10000.0 , - 10000.0 , - 10000.0 ,
          10000.0 ,   10000.0 , - 10000.0 ,
        - 10000.0 ,   10000.0 , - 10000.0 ,
  
        - 10000.0 , - 10000.0 ,   10000.0 ,
        - 10000.0 , - 10000.0 , - 10000.0 ,
        - 10000.0 ,   10000.0 , - 10000.0 ,
        - 10000.0 ,   10000.0 , - 10000.0 ,
        - 10000.0 ,   10000.0 ,   10000.0 ,
        - 10000.0 , - 10000.0 ,   10000.0 ,
  
          10000.0 , - 10000.0 , - 10000.0 ,
          10000.0 , - 10000.0 ,   10000.0 ,
          10000.0 ,   10000.0 ,   10000.0 ,
          10000.0 ,   10000.0 ,   10000.0 ,
          10000.0 ,   10000.0 , - 10000.0 ,
          10000.0 , - 10000.0 , - 10000.0 ,
   
        - 10000.0 , - 10000.0 ,   10000.0 ,
        - 10000.0 ,   10000.0 ,   10000.0 ,
          10000.0 ,   10000.0 ,   10000.0 ,
          10000.0 ,   10000.0 ,   10000.0 ,
          10000.0 , - 10000.0 ,   10000.0 ,
        - 10000.0 , - 10000.0 ,   10000.0 ,
  
        - 10000.0 ,   10000.0 , - 10000.0 ,
          10000.0 ,   10000.0 , - 10000.0 ,
          10000.0 ,   10000.0 ,   10000.0 ,
          10000.0 ,   10000.0 ,   10000.0 ,
        - 10000.0 ,   10000.0 ,   10000.0 ,
        - 10000.0 ,   10000.0 , - 10000.0 ,
  
        - 10000.0 , - 10000.0 , - 10000.0 ,
        - 10000.0 , - 10000.0 ,   10000.0 ,
          10000.0 , - 10000.0 , - 10000.0 ,
          10000.0 , - 10000.0 , - 10000.0 ,
        - 10000.0 , - 10000.0 ,   10000.0 ,
          10000.0 , - 10000.0 ,   10000.0 
    ]);

    this.vertexPositionBuffer = this.renderer.handler.createArrayBuffer(vertices, 3, vertices.length / 3);
};