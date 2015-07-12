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

    var billboardShader = new og.shaderProgram.ShaderProgram("billboard", {
        uniforms: {
            u_texture: { type: og.shaderProgram.types.SAMPLER2D },
            //uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uPMatrix: { type: og.shaderProgram.types.MAT4 },
            uMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uViewSize: { type: og.shaderProgram.types.VEC2 },
            uCamPos: { type: og.shaderProgram.types.VEC3 }
        },
        attributes: {
            a_vertices: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_positions: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_opacity: { type: og.shaderProgram.types.FLOAT, enableArray: true },
            a_size: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: 'attribute vec3 a_vertices; \
                        attribute vec2 a_texCoord; \
                        attribute vec3 a_positions; \
                        attribute float a_opacity; \
                        attribute vec2 a_size; \
                        varying vec2 v_texCoords; \
                        varying float v_opacity; \
                        //uniform mat4 uPMVMatrix; \n\
                        uniform mat4 uMVMatrix; \
                        uniform mat4 uPMatrix; \
                        uniform vec2 uViewSize; \
                        uniform vec3 uCamPos; \
                        mat4 CreateBillboardMatrix(vec3 right, vec3 up, vec3 look, vec3 pos) { \
                            return mat4(right.x, right.y, right.z, 0.0, \
                                        up.x, up.y, up.z, 0.0, \
                                        look.x, look.y, look.z, 0.0, \
                                        pos.x, pos.y, pos.z, 1.0); \
                        } \
                        void main() { \
                            v_texCoords = a_texCoord; \
                            v_opacity = a_opacity; \
                            //gl_Position = uPMatrix * uMVMatrix * vec4(a_positions, 1.0); \n\
                            //gl_Position /= gl_Position.w;\n\
                            //gl_Position.xy += a_vertices.xy * (a_size / uViewSize);\n\
                            vec3 X = vec3( uMVMatrix[0][0], uMVMatrix[1][0], uMVMatrix[2][0] ); \
                            vec3 Y = vec3( uMVMatrix[0][1], uMVMatrix[1][1], uMVMatrix[2][1] ); \n\
                            mat4 bbm = CreateBillboardMatrix(X, Y, a_positions - uCamPos, a_positions); \
                            float angle = 45.0*3.14/180.0;\
                            float cosTheta = cos(angle);\
                            float sinTheta = sin(angle);\
                            mat4 rotationMatrix = mat4(cosTheta, -sinTheta, 0.0, 0.0, \
                                                        sinTheta, cosTheta, 0.0, 0.0, \
                                                             0.0,      0.0, 1.0, 0.0, \
                                                             0.0,      0.0, 0.0, 1.0);\
                            float viewAngle = 35.0  * 3.14/360.0;\n\
                            float dist = length(a_positions - uCamPos);\n\
                            float ratio = uViewSize.x/uViewSize.y;\
                            vec2 offset = vec2(0.0, 50.0) / uViewSize;\n\
                            //float w = 2.0/uViewSize.x; float h=2.0/uViewSize.y;float far=100000000.0;float near=0.1;float q=1.0/(far-near);\n\
                            //mat4 orto = mat4(w,0.0,0.0,0.0 ,0.0,h,0.0,0.0, 0.0,0.0,q,-q*near, 0.0,0.0,0.0,1.0);\n\
                            float scaleX = a_size.x * dist * 2.0 * tan(viewAngle)/(uViewSize.x/ratio);\n\
                            float scaleY = a_size.y * dist * 2.0 * tan(viewAngle)/(uViewSize.x/ratio);\n\
                            mat4 scaleMatrix = mat4(scaleX,    0.0, 0.0, 0.0, \
                                                       0.0, scaleY, 0.0, 0.0, \
                                                       0.0,    0.0, 1.0, 0.0, \
                                                       0.0,    0.0, 0.0, 1.0);\
                            float yOffset = 50.0 * dist * 2.0 * tan(viewAngle)/(uViewSize.x/ratio);\
                            mat4 transMatrix = mat4(1.0, 0.0, 0.0, 0.0, \
                                                    0.0, 1.0, 0.0, 0.0, \
                                                    0.0, 0.0, 1.0, 0.0, \
                                                    0.0, yOffset, 0.0, 1.0);\
                            //vec3 vertex = a_vertices.x * X * 100.0 + a_vertices.y * Y * 100.0 + a_positions; \n\
                            vec4 vertex = bbm * rotationMatrix * transMatrix*scaleMatrix * vec4(a_vertices,1.0);\n\
                            gl_Position = uPMatrix * uMVMatrix * vec4(vertex.xyz,1.0);\n\
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
    img.src = "marker.png"
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

    100, 100,

    100, 100,
    100, 100,
    100, 100,
    100, 100];

    this._sizeBuffer = this._handler.createArrayBuffer(new Float32Array(size), 2, size.length / 2);

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