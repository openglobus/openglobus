goog.provide('my.LineRing');

goog.require('og.scene.RenderNode');
goog.require('og.inheritance');

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.Label');

function getIntersection(start1, end1, start2, end2) {
    if (!start1.equal(start2)) {
        var dir = end2.sub(start2);
        var perp = new og.math.Vector2(-dir.y, dir.x);
        var d2 = perp.dot(start2);
        var seg = perp.dot(start1) - d2;
        var u = seg / (seg - perp.dot(end1) + d2);
        return start1.add(end1.sub(start1).scale(u));
    }
    return start1;
}

function test0(order) {
    thickness = 20;
    current = og.math.vector2(100, 300), prev = og.math.vector2(700, 300), next = og.math.vector2(700, 300);
    dirNext = next.sub(current).normalize(), dirPrev = next.sub(current).normalize();
    normalNext = og.math.vector2(-dirNext.y, dirNext.x).normalize();
    normalPrev = og.math.vector2(dirPrev.y, -dirPrev.x).normalize();
    d = thickness * Math.sign(order);
    //vec2 m = getIntersection( current + normalPrev * d, prev + normalPrev * d,
    //    current + normalNext * d, next + normalNext * d );
    m = getIntersection(current.add(normalPrev.scaleTo(d)), prev.add(normalPrev.scaleTo(d)),
        current.add(normalNext.scaleTo(d)), next.add(normalNext.scaleTo(d)));

    ccw = Math.sign(dirNext.x * dirPrev.y - dirNext.y * dirPrev.x);
    if (ccw == 0.0) ccw = 1.0;
}

my.LineRing = function(name) {
    og.inheritance.base(this, name);
    this.thickness = 55;
};

og.inheritance.extend(my.LineRing, og.scene.RenderNode);

my.LineRing.prototype.initialization = function() {
    this.renderer.events.on("charkeypress", og.input.KEY_X, function() {
        if (this._drawType == this.renderer.handler.gl.LINE_STRIP) {
            this._drawType = this.renderer.handler.gl.TRIANGLE_STRIP;
        } else {
            this._drawType = this.renderer.handler.gl.LINE_STRIP;
        }
    }, this);

    this._drawType = this.renderer.handler.gl.TRIANGLE_STRIP;

    this.renderer.handler.addShaderProgram(new og.shaderProgram.ShaderProgram("lineRing", {
        uniforms: {
            'viewport': {
                type: og.shaderProgram.types.VEC2
            },
            'thickness': {
                type: og.shaderProgram.types.FLOAT
            },
            'alpha': {
                type: og.shaderProgram.types.FLOAT
            },
            'color': {
                type: og.shaderProgram.types.VEC4
            },

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
                    /*if(start1 != start2) {*/\
                        vec2 dir = end2 - start2;\
                        vec2 perp = vec2(-dir.y, dir.x);\
                        float d2 = dot(perp, start2);\
                        float seg = dot(perp, start1) - d2;\
                        float u = seg / (seg - dot(perp, end1) + d2);\
                        return start1 + u * (end1 - start1);\
                    /*}\
                    return start1;*/\
                }\
                void main(){\
                    vec2 dirNext = normalize(next - current);\
                    vec2 dirPrev = normalize(prev - current);\
                    vec2 normalNext = normalize(vec2(-dirNext.y, dirNext.x));\
                    vec2 normalPrev = normalize(vec2(dirPrev.y, -dirPrev.x));\
                    float d = thickness * sign(order);\
                    \
                    vec2 m;\
                    float dotNP = dot(dirNext, dirPrev);\
                    if(abs(dotNP) != 1.0){\
                        m = getIntersection( current + normalPrev * d, prev + normalPrev * d,\
                            current + normalNext * d, next + normalNext * d );\
                    }else{\
                        m = current + normalPrev * d;\
                    }\
                    \
                    if( dotNP > 0.5 && dot(dirNext + dirPrev, m - current) < 0.0 ){\
                        float ccw = sign(dirNext.x * dirPrev.y - dirNext.y * dirPrev.x);\
                        float occw = order * ccw;\
                        if(occw == -1.0){\
                            m = current + normalPrev * d;\
                        }else if(occw == 1.0){\
                            m = current + normalNext * d;\
                        }else if(occw == -2.0){\
                            m = current + normalNext * d;\
                        }else if(occw == 2.0){\
                            m = current + normalPrev * d;\
                        }\
                    }else{\
                        float maxDist = max(distance(current, next), distance(current, prev));\
                        if(distance(current, m) > maxDist){\
                            m = current + maxDist * normalize(m - current);\
                        }\
                    }\
                    m /= viewport;\
                    gl_Position = vec4(-1.0 + m.x, 1.0 - m.y, 0.0, 1.0);\
                }',
        fragmentShader: 'precision highp float;\
                uniform float alpha;\
                uniform vec4 color;\
                void main() {\
                    gl_FragColor = vec4(color.rgb, alpha * color.a);\
                }'
    }));

    var path = [
        [100, 100],
        [400, 100],
        [400, 110],
        [100, 120]
    ];

    this._mainData = [];
    this._orderData = [];
    this._indexData = [];

    var last = path[path.length - 1];
    var prev = last;
    this._mainData.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
    this._orderData.push(1, -1, 2, -2);
    var k = 0;
    for (var i = 0; i < path.length; i++) {
        var cur = path[i];
        if (cur[0] != prev[0] || cur[1] != prev[1]) {
            this._mainData.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
            this._orderData.push(1, -1, 2, -2);
            this._indexData.push(k++, k++, k++, k++);
        }
        prev = cur;
    }
    var first = path[0];
    this._mainData.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
    this._orderData.push(1, -1, 2, -2);
    this._indexData.push(0, 1);

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

    gl.enable(gl.BLEND);
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
    gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA
    );
    gl.disable(gl.DEPTH_TEST);

    gl.disable(gl.CULL_FACE);
    gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);
    gl.uniform1f(shu.thickness._pName, (this.thickness + 2) * 0.5);
    gl.uniform1f(shu.alpha._pName, 0.54);
    gl.uniform4fv(shu.color._pName, [1.0, 0.0, 0.0, 0.5]);

    var mb = this._mainBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, mb);
    gl.vertexAttribPointer(sha.prev._pName, mb.itemSize, gl.FLOAT, false, 0, 0);
    gl.vertexAttribPointer(sha.current._pName, mb.itemSize, gl.FLOAT, false, 0, 32);
    gl.vertexAttribPointer(sha.next._pName, mb.itemSize, gl.FLOAT, false, 0, 64);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._orderBuffer);
    gl.vertexAttribPointer(sha.order._pName, this._orderBuffer.itemSize, gl.FLOAT, false, 4, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.drawElements(this._drawType, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.uniform1f(shu.thickness._pName, this.thickness * 0.5);
    gl.uniform1f(shu.alpha._pName, 1.0);
    gl.drawElements(this._drawType, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

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
