goog.provide('my.LineRing');

goog.require('og.scene.RenderNode');
goog.require('og.inheritance');

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.Label');


my.LineRing = function(name) {
    og.inheritance.base(this, name);
    this.thickness = 20;
};

og.inheritance.extend(my.LineRing, og.scene.RenderNode);

my.LineRing.prototype.initialization = function() {
    this.renderer.handler.addShaderProgram(new og.shaderProgram.ShaderProgram("lineRing", {
        uniforms: {
            'viewport': {
                type: og.shaderProgram.types.VEC2
            },
            'thickness': {
                type: og.shaderProgram.types.FLOAT
            }
        },
        attributes: {
            'prev': {
                type: og.shaderProgram.types.VEC2
            },
            'current': {
                type: og.shaderProgram.types.VEC2
            },
            'next': {
                type: og.shaderProgram.types.VEC2
            },
            'order': {
                type: og.shaderProgram.types.VEC2
            }
        },
        vertexShader: 'attribute vec2 prev;\
                attribute vec2 current;\
                attribute vec2 next;\
                attribute vec2 order;\
                uniform vec2 viewport;\
                uniform float thickness;\
                void main(){\
                    vec2 dirNext = next - current;\
                    vec2 dirPrev = normalize(prev - current);\
                    vec2 sNormalNext = normalize(vec2(-dirNext[1], dirNext[0]));\
                    vec2 sNormalPrev = normalize(vec2(-dirPrev[1], dirPrev[0]));\
                    vec2 dir = sNormalNext - sNormalPrev;\
                    float sinA = dirPrev[0] * dir[1] - dirPrev[1] * dir[0];\
                    if(abs(sinA) < 0.3){\
                        if(order[1] == 0.0){\
                            float ccw = sign(dirNext[0] * dirPrev[1] - dirNext[1] * dirPrev[0]);\
                            if(order[0] == 1.0) {\
                                dir = sNormalPrev * ccw;\
                            } else {\
                                dir = sNormalNext * order[0] * ccw;\
                            }\
                        } else if(order[1] == 1.0) {\
                            dir = sNormalPrev * order[0];\
                        } else {\
                            dir = sNormalNext * order[0];\
                        }\
                    }else{\
                        dir /= order[1] * sinA * order[0];\
                    }\
                    \
                    vec2 c = (current + dir * thickness) / viewport;\
                    gl_Position = vec4(-1.0 + c[0], 1.0 - c[1], 0.0, 1.0);\
                }',
        fragmentShader: 'precision highp float;\
                void main() {\
                    gl_FragColor = vec4(1.0);\
                }'
    }));

    var path = [[80,80], [800,800], [1300,100], [900,900], [1500,900]];

    this._mainData = [];
    this._orderData = [];
    for(var i = 0; i < path.length; i++) {
        var cur = path[i],
            pre,
            nex,
            nex2;

            if(i == 0){
                pre = path[path.length - 1];
            }else{
                pre = path[i - 1];
            }

            if(i == path.length - 2){
                nex2 = path[0];
            } else {
                nex2 = path[i + 2];
            }

            if(i == path.length - 1){
                nex = path[0];
                nex2 = path[1];
            }else{
                nex = path[i + 1];
            }

        this._mainData.push(
                cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
                cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
                nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],

                cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
                nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
                nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],

                //<
                nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
                nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
                nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1]
                //>
        );

        this._orderData.push(
            1, -1,
            -1, -1,
            1, 1,

            1, -1,
            -1, 1,
            1, 1,

            -1, 0,
            0, 0,
            1, 0
        );
    }
//[[100,100],[1300,100], [900,900],[100,900]]
    // var pre = new og.math.Vector2(100, 100),
    //     cur = new og.math.Vector2(1300, 100),
    //     nex = new og.math.Vector2(900, 900),
    //     nex2 = new og.math.Vector2(100, 900);
    //
    // this._mainData = [
    //     pre[0], pre[1], nex2[0], nex2[1], cur[0], cur[1],
    //     pre[0], pre[1], nex2[0], nex2[1], cur[0], cur[1],
    //     cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
    //
    //     pre[0], pre[1], nex2[0], nex2[1], cur[0], cur[1],
    //     cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
    //     cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
    //
    //     //<
    //     cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
    //     cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
    //     cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
    //     //>
    //
    //     cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
    //     cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
    //     nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
    //
    //     cur[0], cur[1], pre[0], pre[1], nex[0], nex[1],
    //     nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
    //     nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
    //
    //     //<
    //     nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
    //     nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
    //     nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
    //     //>
    //
    //     nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
    //     nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
    //     nex2[0], nex2[1], nex[0], nex[1], pre[0], pre[1],
    //
    //     nex[0], nex[1], cur[0], cur[1], nex2[0], nex2[1],
    //     nex2[0], nex2[1], nex[0], nex[1], pre[0], pre[1],
    //     nex2[0], nex2[1], nex[0], nex[1], pre[0], pre[1],
    //
    //     //<
    //     nex2[0], nex2[1], nex[0], nex[1], pre[0], pre[1],
    //     nex2[0], nex2[1], nex[0], nex[1], pre[0], pre[1],
    //     nex2[0], nex2[1], nex[0], nex[1], pre[0], pre[1],
    //     //>
    //
    //     nex2[0], nex2[1], nex[0], nex[1], pre[0], pre[1],
    //     nex2[0], nex2[1], nex[0], nex[1], pre[0], pre[1],
    //     pre[0], pre[1], nex2[0], nex2[1], cur[0], cur[1],
    //
    //     nex2[0], nex2[1], nex[0], nex[1], pre[0], pre[1],
    //     pre[0], pre[1], nex2[0], nex2[1], cur[0], cur[1],
    //     pre[0], pre[1], nex2[0], nex2[1], cur[0], cur[1],
    //
    //     //<
    //     pre[0], pre[1], nex2[0], nex2[1], cur[0], cur[1],
    //     pre[0], pre[1], nex2[0], nex2[1], cur[0], cur[1],
    //     pre[0], pre[1], nex2[0], nex2[1], cur[0], cur[1],
    //     //>
    //
    // ];
    // this._orderData = [
    //     1, -1,
    //     -1, -1,
    //     1, 1,
    //
    //     1, -1,
    //     -1, 1,
    //     1, 1,
    //
    //     //<
    //     -1, 0,
    //     0, 0,
    //     1, 0,
    //     //>
    //
    //     1, -1,
    //     -1, -1,
    //     1, 1,
    //
    //     1, -1,
    //     -1, 1,
    //     1, 1,
    //
    //     //<
    //     -1, 0,
    //     0, 0,
    //     1, 0,
    //     //>
    //
    //     1, -1,
    //     -1, -1,
    //     1, 1,
    //
    //     1, -1,
    //     -1, 1,
    //     1, 1,
    //
    //     //<
    //     -1, 0,
    //     0, 0,
    //     1, 0,
    //     //>
    //
    //     1, -1,
    //     -1, -1,
    //     1, 1,
    //
    //     1, -1,
    //     -1, 1,
    //     1, 1,
    //
    //     //<
    //     -1, 0,
    //     0, 0,
    //     1, 0,
    //     //>
    //
    // ];

    var h = this.renderer.handler;
    this._orderBuffer = h.createArrayBuffer(new Float32Array(this._orderData), 2, (this._orderData.length) / 2);
    this._mainBuffer = h.createArrayBuffer(new Float32Array(this._mainData), 2, (this._mainData.length) / 6);

};


my.LineRing.prototype.frame = function() {

    var rn = this;
    var r = rn.renderer;
    var sh = r.handler.shaderPrograms.lineRing;
    var p = sh._program;
    var gl = r.handler.gl,
        sha = p.attributes,
        shu = p.uniforms;

    sh.activate();

    gl.disable(gl.CULL_FACE);
    gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);
    gl.uniform1f(shu.thickness._pName, this.thickness * 0.5);

    var mb = this._mainBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, mb);
    gl.vertexAttribPointer(sha.current._pName, mb.itemSize, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(sha.prev._pName, mb.itemSize, gl.FLOAT, false, 24, 8);
    gl.vertexAttribPointer(sha.next._pName, mb.itemSize, gl.FLOAT, false, 24, 16);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._orderBuffer);
    gl.vertexAttribPointer(sha.order._pName, this._orderBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this._mainBuffer.numItems);
    gl.enable(gl.CULL_FACE);
};
