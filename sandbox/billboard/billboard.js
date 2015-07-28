goog.provide('my.Billboard');

goog.require('og.node.RenderNode');
goog.require('og.inheritance');


my.Billboard = function (name) {
    og.inheritance.base(this, name);
    this.texture = null;
    this.bbPos = new og.math.Vector3();
};

og.inheritance.extend(my.Billboard, og.node.RenderNode);

my.Billboard.prototype.initialization = function () {

    //gl_Position = uPMatrix * uMVMatrix * vec4(a_positions, 1.0); \n\
    //gl_Position /= gl_Position.w;\n\
    //gl_Position.xy += a_vertices.xy * (a_size / uViewSize);\n\

    var billboardShader = new og.shaderProgram.ShaderProgram("billboard", {
        uniforms: {
            u_texture: { type: og.shaderProgram.types.SAMPLER2D },
            //uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uPMatrix: { type: og.shaderProgram.types.MAT4 },
            uMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uViewSize: { type: og.shaderProgram.types.VEC2 },
            uCamPos: { type: og.shaderProgram.types.VEC3 },
            uViewAngle: { type: og.shaderProgram.types.FLOAT },
            uRatio: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            a_vertices: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_positions: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_opacity: { type: og.shaderProgram.types.FLOAT, enableArray: true },
            a_size: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_offset: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_rotation: { type: og.shaderProgram.types.FLOAT, enableArray: true }
        },
        vertexShader: ' attribute vec3 a_vertices; \
                        attribute vec2 a_texCoord; \
                        attribute vec3 a_positions; \
                        attribute float a_opacity; \
                        attribute vec2 a_size; \
                        attribute vec2 a_offset; \
                        attribute float a_rotation; \
\
                        varying vec2 v_texCoords; \
                        varying float v_opacity; \
\
                        uniform mat4 uMVMatrix; \
                        uniform mat4 uPMatrix; \
                        uniform vec2 uViewSize; \
                        uniform vec3 uCamPos; \
                        uniform float uViewAngle;\
                        uniform float uRatio;\
\
                        void main() { \
                            v_texCoords = a_texCoord; \
                            v_opacity = a_opacity; \
\
                            vec3 right = vec3( uMVMatrix[0][0], uMVMatrix[1][0], uMVMatrix[2][0] ); \
                            vec3 up = vec3( uMVMatrix[0][1], uMVMatrix[1][1], uMVMatrix[2][1] ); \n\
                            vec3 look = a_positions - uCamPos;\
\
                            float cosRot = cos(a_rotation);\
                            float sinRot = sin(a_rotation);\
                            float focalSize = 2.0 * length( a_positions - uCamPos ) * tan( uViewAngle ) / ( uViewSize.x / uRatio );\n\
                            float scaleX = a_size.x * focalSize;\n\
                            float scaleY = a_size.y * focalSize;\n\
                            mat4 scaleMatrix = mat4(scaleX,    0.0, 0.0, 0.0, \
                                                       0.0, scaleY, 0.0, 0.0, \
                                                       0.0,    0.0, 1.0, 0.0, \
                                                       0.0,    0.0, 0.0, 1.0);\
\
                            vec2 offset = a_offset * focalSize;\
                            vec3 rightCos = right * cosRot;\
                            vec3 rightSin = right * sinRot;\
                            vec3 upSin    =    up * sinRot;\
                            vec3 upCos    =    up * cosRot;\
                            vec3 c = rightCos - upSin;\
                            vec3 s = rightSin + upCos;\
                            vec3 t = c * offset.x + s * offset.y + a_positions;\
                            vec3 cs = c * scaleX;\
                            vec3 ss = s * scaleY;\
\
                            mat4 brts = mat4(cs.x,   cs.y,   cs.z, 0,\
                                             ss.x,   ss.y,   ss.z, 0,\
                                           look.x, look.y, look.z, 0,\
                                              t.x,    t.y,    t.z, 1);\
\
                            //vec4 vertex = brts * vec4(a_vertices,1.0);\n\
                            vec3 rr = cs * a_vertices.x + ss * a_vertices.y + look * a_vertices.z + t;\
                            vec4 vertex = vec4( rr, 1);\
                            gl_Position = uPMatrix * uMVMatrix * vertex;\n\
                        }',
        fragmentShader: 'precision mediump float; \
                            uniform sampler2D u_texture; \
                            varying vec2 v_texCoords; \
                            varying float v_opacity; \
                            void main () { \
                                vec4 color = texture2D(u_texture, v_texCoords);\n\
                                if(color.a<0.1)\n\
                                    discard;\n\
                                gl_FragColor = vec4(color.rgb,color.a*v_opacity);\
                            }'
    });

    this._handler = this.renderer.handler;

    this._handler.addShaderProgram(billboardShader);

    this.createBuffers();
    this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;

    this.renderer.events.on("oncharkeypressed", this, this.toogleWireframe, og.input.KEY_X);

    var that = this;
    var img = new Image();
    img.onload = function () {
        that.texture = that.renderer.handler.createTexture(this);
    };
    img.src = "wall.jpg"
};

my.Billboard.prototype.toogleWireframe = function (e) {
    if (this.drawMode === this.renderer.handler.gl.LINE_STRIP) {
        this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;
    } else {
        this.drawMode = this.renderer.handler.gl.LINE_STRIP;
    }
};

my.Billboard.prototype.createBuffers = function () {
    var tcoords = [
            0, 0,
            1, 0,
            0, 1,
            1, 1,

            1, 1,
            1, 1,
            0, 0,


            0, 0,
            1, 0,
            0, 1,
            1, 1];
    this._texCoordsBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(tcoords), 2, tcoords.length / 2);

    this._handler.deactivateFaceCulling();

    var vertices = [
            -0.5, 0.5, 0,
            0.5, 0.5, 0,
            -0.5, -0.5, 0,
            0.5, -0.5, 0,

            0.5, -0.5, 0,
            0.5, -0.5, 0,

            -0.5, 0.5, 0,


            -0.5, 0.5, 0,
            0.5, 0.5, 0,
            -0.5, -0.5, 0,
            0.5, -0.5, 0];

    this._vertexBuffer = this._handler.createArrayBuffer(new Float32Array(vertices), 3, vertices.length / 3);

    var positions = [
    0, 0, 0,
    0, 0, 0,
    0, 0, 0,
    0, 0, 0,

    0, 0, 0,
    0, 0, 0,
    0, 0, 500,


    0, 0, 500,
    0, 0, 500,
    0, 0, 500,
    0, 0, 500];

    this._posBuffer = this._handler.createArrayBuffer(new Float32Array(positions), 3, positions.length / 3);


    var opacity = [
        1.0,
        1.0,
        1.0,
        1.0,

        1.0,
        1.0,
        1.0,


        1.0,
        1.0,
        1.0,
        1.0];

    this._opacityBuffer = this._handler.createArrayBuffer(new Float32Array(opacity), 1, opacity.length);


    var size = [
    100, 100,
    100, 100,
    100, 100,
    100, 100,

    100, 100,
    100, 100,

    200, 200,

    200, 200,
    200, 200,
    200, 200,
    200, 200];

    this._sizeBuffer = this._handler.createArrayBuffer(new Float32Array(size), 2, size.length / 2);


    var offset = [
        50, 0,
        50, 0,
        50, 0,
        50, 0,

        50, 0,
        50, 0,

        0, 100,

        0, 100,
        0, 100,
        0, 100,
        0, 100];

    this._offsetBuffer = this._handler.createArrayBuffer(new Float32Array(offset), 2, offset.length / 2);


    var rotation = [
    0 * og.math.RADIANS,
    0 * og.math.RADIANS,
    0 * og.math.RADIANS,
    0 * og.math.RADIANS,

    0 * og.math.RADIANS,
    0 * og.math.RADIANS,

    45 * og.math.RADIANS,

    45 * og.math.RADIANS,
    45 * og.math.RADIANS,
    45 * og.math.RADIANS,
    45 * og.math.RADIANS];

    this._rotationBuffer = this._handler.createArrayBuffer(new Float32Array(rotation), 1, rotation.length);

};

my.Billboard.prototype.frame = function () {
    var r = this.renderer;
    this._handler.shaderPrograms.billboard.activate();
    var sh = this._handler.shaderPrograms.billboard._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var gl = this._handler.gl;

    //gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
    //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    //gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    //gl.uniformMatrix4fv(shu.uPMVMatrix._pName, false, r.activeCamera.pmvMatrix._m);
    gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera.mvMatrix._m);
    gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera.pMatrix._m);

    gl.uniform2fv(shu.uViewSize._pName, [gl.canvas.clientWidth, gl.canvas.clientHeight]);
    gl.uniform3fv(shu.uCamPos._pName, r.activeCamera.eye.toVec());

    gl.uniform1f(shu.uViewAngle._pName, r.activeCamera.viewAngle * og.math.RADIANS_HALF);
    gl.uniform1f(shu.uRatio._pName, r.handler.canvas.aspect);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.a_vertices._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._posBuffer);
    gl.vertexAttribPointer(sha.a_positions._pName, this._posBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._opacityBuffer);
    gl.vertexAttribPointer(sha.a_opacity._pName, this._opacityBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
    gl.vertexAttribPointer(sha.a_size._pName, this._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer);
    gl.vertexAttribPointer(sha.a_offset._pName, this._offsetBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer);
    gl.vertexAttribPointer(sha.a_rotation._pName, this._rotationBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(shu.u_texture._pName, 0);
    gl.drawArrays(this.drawMode, 0, this._vertexBuffer.numItems);

};

/*
void CreateBillboardMatrix(Matrix44f &bbmat, const Vector3f &right, const Vector3f &up, const Vector3f &look, const Vertex3f &pos)
{
    bbmat.matrix[0] = right.x;
    bbmat.matrix[1] = right.y;
    bbmat.matrix[2] = right.z;
    bbmat.matrix[3] = 0;
    bbmat.matrix[4] = up.x;
    bbmat.matrix[5] = up.y;
    bbmat.matrix[6] = up.z;
    bbmat.matrix[7] = 0;
    bbmat.matrix[8] = look.x;
    bbmat.matrix[9] = look.y;
    bbmat.matrix[10] = look.z;
    bbmat.matrix[11] = 0;
    // Add the translation in as well.
    bbmat.matrix[12] = pos.x;
    bbmat.matrix[13] = pos.y;
    bbmat.matrix[14] = pos.z;
    bbmat.matrix[15] = 1;
}

void BillboardAxis(const Vertex3f &pos, const Vector3f &axis, const Vertex3f &camPos)
{	// create the look vector: pos -> camPos
    Vector3f	look	= camPos - pos;
    look.Normalize();

    // billboard about the direction vector
    Vector3f	up		= axis;
    Vector3f	right	= up.Cross(look);

    // watch out when the look vector is almost equal to the up vector the right
    // vector gets close to zeroed, normalize it
    right.Normalize();

    // the billboard won't actually face the direction of the look vector we
    // created earlier, that was just used as a tempory vector to create the
    // right vector so we could calculate the correct look vector from that.
    look = right.Cross(up);

    Matrix44f	bbmat;
    CreateBillboardMatrix(bbmat, right, up, look, pos);

    // apply the billboard
    glMultMatrixf(bbmat.matrix);
};

*/