goog.provide('my.LineRing');

goog.require('og.scene.RenderNode');
goog.require('og.inheritance');

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.Label');


my.LineRing = function(name) {
    og.inheritance.base(this, name);
    this.thickness = 50;
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
                type: og.shaderProgram.types.FLOAT
            }
        },
        vertexShader: 'attribute vec2 prev;\
                attribute vec2 current;\
                attribute vec2 next;\
                attribute float order;\
                uniform float thickness;\
                uniform vec2 viewport;\
                \
                vec2 getIntersection(vec2 start1, vec2 end1, vec2 start2, vec2 end2){\
                    if(start1 != start2){\
                        vec2 dir2 = end2 - start2;\
                        float a2 = -dir2.y;\
                        float b2 = dir2.x;\
                        float d2 = a2 * start2.x + b2 * start2.y;\
                        float seg1_start = a2 * start1.x + b2 * start1.y - d2;\
                        float u = seg1_start / (seg1_start - a2 * end1.x - b2 * end1.y + d2);\
                        return start1 + u * (end1 - start1);\
                    }\
                    return start1;\
                }\
                void main(){\
                    vec2 dirNext = normalize(next - current);\
                    vec2 dirPrev = normalize(prev - current);\
                    vec2 normalNext = normalize(vec2(-dirNext.y, dirNext.x));\
                    vec2 normalPrev = normalize(vec2(dirPrev.y, -dirPrev.x));\
                    \
                    /*vec2 dir = sNormalNext - sNormalPrev;*/\
                    /*float sinA = dirPrev.x * dir.y - dirPrev.y * dir.x;*/\
                    /*vec2 c = (current + order * dir * thickness) / viewport;*/\
                    \
                    float d = thickness * order;\
                    vec2 m = getIntersection( current + normalPrev * d, \
                        prev + normalPrev * d, current + normalNext * d, next + normalNext * d ) / viewport;\
                    gl_Position = vec4(-1.0 + m.x, 1.0 - m.y, 0.0, 1.0);\
                }',
        fragmentShader: 'precision highp float;\
                void main() {\
                    gl_FragColor = vec4(1.0);\
                }'
    }));

    this._mainData = [];
    this._orderData = [];
    this._indexData = [];

    var p0 = og.math.vector2(300, 500),
        p1 = og.math.vector2(300, 100),
        p2 = og.math.vector2(500, 100),
        p3 = og.math.vector2(800, 100);

    this._mainData.push(
        p3.x, p3.y, p3.x, p3.y,
        p0.x, p0.y, p0.x, p0.y,
        p1.x, p1.y, p1.x, p1.y,
        p2.x, p2.y, p2.x, p2.y,
        p3.x, p3.y, p3.x, p3.y,
        p0.x, p0.y, p0.x, p0.y
    );

    this._orderData.push(
        1, -1,
        1, -1,
        1, -1,
        1, -1,
        1, -1,
        1, -1
    );

    this._indexData.push(0, 1, 2, 3, 4, 5, 6, 7);

    var h = this.renderer.handler;
    this._orderBuffer = h.createArrayBuffer(new Float32Array(this._orderData), 1, (this._orderData.length / 2));
    this._mainBuffer = h.createArrayBuffer(new Float32Array(this._mainData), 2, (this._mainData.length) / 4);
    this._indexBuffer = h.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
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

    //    gl.enable(gl.BLEND);
    //    gl.blendEquation(gl.FUNC_ADD);
    //    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.disable(gl.CULL_FACE);
    gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);
    gl.uniform1f(shu.thickness._pName, this.thickness * 0.5);

    var mb = this._mainBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, mb);
    gl.vertexAttribPointer(sha.prev._pName, mb.itemSize, gl.FLOAT, false, 8, 0);
    gl.vertexAttribPointer(sha.current._pName, mb.itemSize, gl.FLOAT, false, 8, 16);
    gl.vertexAttribPointer(sha.next._pName, mb.itemSize, gl.FLOAT, false, 8, 32);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._orderBuffer);
    gl.vertexAttribPointer(sha.order._pName, this._orderBuffer.itemSize, gl.FLOAT, false, 4, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.drawElements(gl.TRIANGLE_STRIP, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
};



// struct Line {\
//     float A, B, C;\
// };\
// \
// Line getLine(vec2 p0, vec2 p1) {\
//     return Line(p1.y - p0.y, p0.x - p1.x, p1.x * p0.y - p0.x * p1.y);\
// }\
// \
// Line getParallel(Line l, vec2 p){\
//     return Line(l.A, l.B, -l.A * p.x - l.B * p.y);\
// }\
// \
// vec2 getIntersection(Line L0, Line L1, vec2 p) {\
//     if(/*L0.A / L1.A != L0.B / L1.B*/true){\
//         float x = (L1.B * L0.C - L0.B * L1.C) / (L0.B * L1.A - L1.B * L0.A);\
//         float y = -(L0.C + L0.A * x) / L0.B;\
//         return vec2(x, y);\
//     }\
//     return vec2(p);\
// }\
