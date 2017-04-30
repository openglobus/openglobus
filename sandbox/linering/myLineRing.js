goog.provide('my.LineRing');

goog.require('og.scene.RenderNode');
goog.require('og.inheritance');

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.Label');
goog.require('og.LonLat');
goog.require('og.Extent');

var extentParams = og.math.vector4(-180, -90, 0.0555556, 0.011111112);
var viewport = og.math.vector2(1, 1);

function vertCall(index) {
    return vert(vPrev(index), vCurr(index), vNext(index), order(index), 10);
};

function vPrev(index) {
    return og.math.vector2(lineRing._lineVertices[index * 2], lineRing._lineVertices[index * 2 + 1])
};
function vCurr(index) {
    index = index * 2 + 8;
    return og.math.vector2(lineRing._lineVertices[index], lineRing._lineVertices[index + 1])
};
function vNext(index) {
    index = index * 2 + 16;
    return og.math.vector2(lineRing._lineVertices[index], lineRing._lineVertices[index + 1])
};

function order(index) {
    return lineRing._lineOrders[index];
};

function getIntersection(start1, end1, start2, end2) {
    if (start1.equal(start2)) {
        return start1;
    }
    var dir = end2.sub(start2);
    var perp = new og.math.Vector2(-dir.y, dir.x);
    var d2 = perp.dot(start2);
    var seg = perp.dot(start1) - d2;
    var prl = (seg - perp.dot(end1) + d2);
    // if (prl == 0.0) {
    //     return start1;
    // }
    var u = seg / prl;
    return start1.add(end1.sub(start1).scale(u));

};

function proj(coordinates) {
    // var x = -1.0 + coordinates.x - extentParams.x * extentParams.z * 1.0,
    //     y = -1.0 + coordinates.y - extentParams.y * extentParams.w * -1.0;
    // return new og.math.Vector2(x, y);
    return coordinates.clone();
};

function vert(prev, current, next, order, thickness) {
    var _next = next.clone();
    var _prev = prev.clone();
    var sOrder = 1.0;
    if (prev.equal(current)) {
        if (next.equal(current)) {
            _next = current.add(og.math.Vector2(1.0, 0.0));
            _prev = current.sub(next);
        } else {
            _prev = current.add(current.sub(next).normalize());
        }
    }
    if (next.equal(current)) {
        _next = current.add(current.sub(_prev).normalize());
    }

    var sNext = proj(_next),
        sCurrent = proj(current),
        sPrev = proj(_prev);
    var dirNext = sNext.sub(sCurrent).normalize();
    var dirPrev = sPrev.sub(sCurrent).normalize();
    var dotNP = dirNext.dot(dirPrev);
    var normalNext = og.math.vector2(-dirNext.y, dirNext.x).normalize();
    var normalPrev = og.math.vector2(dirPrev.y, -dirPrev.x).normalize();
    var d = og.math.vector2(1 / viewport.x, 1 / viewport.y).scale((thickness + 0.0) * 0.5 * Math.sign(sOrder * order));
    var m = getIntersection(sCurrent.add(normalPrev.mul(d)), sPrev.add(normalPrev.mul(d)),
        sCurrent.add(normalNext.mul(d)), sNext.add(normalNext.mul(d)));

    if (dotNP > 0.5 && dirNext.add(dirPrev).dot(m.sub(sCurrent)) < 0.0) {
        var ccw = Math.sign(dirNext.x * dirPrev.y - dirNext.y * dirPrev.x);
        var occw = order * ccw;
        if (occw == -1.0) {
            m = sCurrent.add(normalPrev.mul(d));
        } else if (occw == 1.0) {
            m = sCurrent.add(normalNext.mul(d));
        } else if (occw == -2.0) {
            m = sCurrent.add(normalNext.mul(d));
        } else if (occw == 2.0) {
            m = sCurrent.add(normalPrev.mul(d));
        }
    } else {
        var maxDist = Math.max(sCurrent.distance(sNext), sCurrent.distance(sPrev));
        if (sCurrent.distance(m) > maxDist) {
            m = sCurrent.add(m.sub(sCurrent).normalize().scale(maxDist));
        }
    }
    return new og.math.Vector4(m.x, m.y, 0.0, 1.0);
};

my.LineRing = function (name) {
    og.inheritance.base(this, name);

    this._lineVertices = [];
    this._lineOrders = [];
    this._lineIndexes = [];
    this._lineThickness = [];
    this._lineColors = [];
};

og.inheritance.extend(my.LineRing, og.scene.RenderNode);

var appendLineStringData = function (pathArr, color, pickingColor, thickness, strokeColor, strokeSize,
    outVertices, outOrders, outIndexes, outColors, outPickingColors, outThickness, outStrokeColors, outStrokes, outThicknessMask,
    outVertices2) {
    var index = 0;

    if (outIndexes.length > 0) {
        index = outIndexes[outIndexes.length - 5] + 9;
        outIndexes.push(index, index);
    } else {
        outIndexes.push(0, 0);
    }

    var t = thickness,
        c = [color.x, color.y, color.z, color.w],
        s = strokeSize,
        sc = [strokeColor.x, strokeColor.y, strokeColor.z, strokeColor.w],
        p = [pickingColor.x, pickingColor.y, pickingColor.z, 1.0];

    for (var j = 0; j < pathArr.length; j++) {
        path = pathArr[j];
        var startIndex = index;
        var last = [path[0][0] + path[0][0] - path[1][0], path[0][1] + path[0][1] - path[1][1]];
        outVertices.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
        outVertices2.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
        outOrders.push(1, -1, 2, -2);

        outThickness.push(t, t, t, t);
        outStrokes.push(s, s, s, s);
        outThicknessMask.push(1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0);
        outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
        outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
        outPickingColors.push(p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);

        for (var i = 0; i < path.length; i++) {
            var cur = path[i];
            outVertices.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
            outVertices2.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
            outOrders.push(1, -1, 2, -2);
            outThickness.push(t, t, t, t);
            outStrokes.push(s, s, s, s);
            outThicknessMask.push(1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0);
            outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
            outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
            outPickingColors.push(p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);
            outIndexes.push(index++, index++, index++, index++);
        }

        var first = [path[path.length - 1][0] + path[path.length - 1][0] - path[path.length - 2][0], path[path.length - 1][1] + path[path.length - 1][1] - path[path.length - 2][1]];
        outVertices.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
        outVertices2.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
        outOrders.push(1, -1, 2, -2);
        outThickness.push(t, t, t, t);
        outStrokes.push(s, s, s, s);
        outThicknessMask.push(1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0);
        outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
        outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
        outPickingColors.push(p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);
        outIndexes.push(index - 1, index - 1, index - 1, index - 1);

        if (j < pathArr.length - 1) {
            index += 8;
            outIndexes.push(index, index);
        }
    }
};

var appendLineRingData = function (pathArr, color, pickingColor, thickness, strokeColor, strokeSize,
    outVertices, outOrders, outIndexes, outColors, outPickingColors, outThickness, outStrokeColors, outStrokes, outThicknessMask,
    outVertices2) {
    var index = 0;

    if (outIndexes.length > 0) {
        index = outIndexes[outIndexes.length - 5] + 9;
        outIndexes.push(index, index);
    } else {
        outIndexes.push(0, 0);
    }

    var t = thickness,
        c = [color.x, color.y, color.z, color.w],
        s = strokeSize,
        sc = [strokeColor.x, strokeColor.y, strokeColor.z, strokeColor.w],
        p = [pickingColor.x, pickingColor.y, pickingColor.z, 1.0];

    for (var j = 0; j < pathArr.length; j++) {
        path = pathArr[j];
        var startIndex = index;
        var last = path[path.length - 1];
        outVertices.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
        outVertices2.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
        outOrders.push(1, -1, 2, -2);

        outThickness.push(t, t, t, t);
        outStrokes.push(s, s, s, s);
        outThicknessMask.push(1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0);
        outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
        outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
        outPickingColors.push(p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);

        for (var i = 0; i < path.length; i++) {
            var cur = path[i];
            outVertices.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
            outVertices2.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
            outOrders.push(1, -1, 2, -2);
            outThickness.push(t, t, t, t);
            outStrokes.push(s, s, s, s);
            outThicknessMask.push(1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0);
            outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
            outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
            outPickingColors.push(p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);
            outIndexes.push(index++, index++, index++, index++);
        }

        var first = path[0];
        outVertices.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
        outVertices2.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
        outOrders.push(1, -1, 2, -2);
        outThickness.push(t, t, t, t);
        outStrokes.push(s, s, s, s);
        outThicknessMask.push(1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0);
        outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
        outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
        outPickingColors.push(p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);
        outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);

        if (j < pathArr.length - 1) {
            index += 8;
            outIndexes.push(index, index);
        }
    }
};

my.LineRing.prototype.initialization = function () {
    this.renderer.events.on("charkeypress", og.input.KEY_X, function () {
        if (this._drawType == this.renderer.handler.gl.LINE_STRIP) {
            this._drawType = this.renderer.handler.gl.TRIANGLE_STRIP;
        } else {
            this._drawType = this.renderer.handler.gl.LINE_STRIP;
        }
    }, this);

    this._drawType = this.renderer.handler.gl.TRIANGLE_STRIP;


    //Line
    this.renderer.handler.addShaderProgram(new og.shaderProgram.ShaderProgram("vectorTileLineRasterization", {
        uniforms: {
            'viewport': { type: og.shaderProgram.types.VEC2 },
            'thicknessOutline': { type: og.shaderProgram.types.FLOAT },
            'alpha': { type: og.shaderProgram.types.FLOAT },
            'extentParams': { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            'prev': { type: og.shaderProgram.types.VEC2 },
            'current': { type: og.shaderProgram.types.VEC2 },
            'next': { type: og.shaderProgram.types.VEC2 },
            'order': { type: og.shaderProgram.types.FLOAT },
            'color': { type: og.shaderProgram.types.VEC4 },
            'thickness': { type: og.shaderProgram.types.FLOAT }
        },
        vertexShader: 'attribute vec2 prev;\
                attribute vec2 current;\
                attribute vec2 next;\
                attribute float order;\
                attribute float thickness;\
                attribute vec4 color;\
                uniform float thicknessOutline;\
                uniform vec2 viewport;\
                uniform vec4 extentParams;\
                varying vec4 vColor;\
                \
                vec2 getIntersection(vec2 start1, vec2 end1, vec2 start2, vec2 end2){\
                    if(start1 == start2) return start1;\
                    \
                    vec2 dir = end2 - start2;\
                    vec2 perp = vec2(-dir.y, dir.x);\
                    float d2 = dot(perp, start2);\
                    float seg = dot(perp, start1) - d2;\
                    float prl = seg - dot(perp, end1) + d2;\
                    if(prl == 0.0){\
                        return start1;\
                    }\
                    float u = seg / prl;\
                    return start1 + u * (end1 - start1);\
                }\
                \
                vec2 proj(vec2 coordinates){\
                    vec4 a = extentParams;\
                    return coordinates / vec2(512.0);\
                    /*return vec2(-1.0 + (coordinates - extentParams.xy) * extentParams.zw) * vec2(1.0, -1.0);*/\
                }\
                \
                void main(){\
                    vColor = color;\
                    vec2 _next = next;\
                    vec2 _prev = prev;\
                    if(prev == current){\
                        if(next == current){\
                            _next = current + vec2(1.0, 0.0);\
                            _prev = current - next;\
                        }else{\
                            _prev = current + normalize(current - next);\
                        }\
                    }\
                    if(next == current){\
                        _next = current + normalize(current - _prev);\
                    }\
                    \
                    vec2 sNext = proj(_next),\
                         sCurrent = proj(current),\
                         sPrev = proj(_prev);\
                    vec2 dirNext = normalize(sNext - sCurrent);\
                    vec2 dirPrev = normalize(sPrev - sCurrent);\
                    float dotNP = dot(dirNext, dirPrev);\
                    \
                    vec2 normalNext = normalize(vec2(-dirNext.y, dirNext.x));\
                    vec2 normalPrev = normalize(vec2(dirPrev.y, -dirPrev.x));\
                    vec2 d = (thickness + thicknessOutline) * 0.5 * sign(order) / viewport;\
                    \
                    vec2 m;\
                    if(dotNP >= 0.9999991){\
                        m = sCurrent - normalPrev * d;\
                    }else{\
                        m = getIntersection( sCurrent + normalPrev * d, sPrev + normalPrev * d,\
                            sCurrent + normalNext * d, sNext + normalNext * d );\
                        \
                        if( dotNP > 0.5 && dot(dirNext + dirPrev, m - sCurrent) < 0.0 ){\
                            float occw = order * sign(dirNext.x * dirPrev.y - dirNext.y * dirPrev.x);\
                            if(occw == -1.0){\
                                m = sCurrent + normalPrev * d;\
                            }else if(occw == 1.0){\
                                m = sCurrent + normalNext * d;\
                            }else if(occw == -2.0){\
                                m = sCurrent + normalNext * d;\
                            }else if(occw == 2.0){\
                                m = sCurrent + normalPrev * d;\
                            }\
                        }else if(distance(sCurrent, m) > min(distance(sCurrent, sNext), distance(sCurrent, sPrev))){\
                            m = sCurrent + normalNext * d;\
                        }\
                    }\
                    gl_Position = vec4(m.x, m.y, 0.0, 1.0);\
                }',
        fragmentShader: 'precision highp float;\
                uniform float alpha;\
                varying vec4 vColor;\
                void main() {\
                    gl_FragColor = vec4(vColor.rgb, alpha * vColor.a);\
                }'
    }));

    var pathArr = [
        [
            [0,10],
            [200, 170],
            [-100, -100]
        ],
        [
            [-200, -10],
            [-10, 70],
            [300, 300]
        ]

    ];


    var _linePickingColors = [],
        _lineStrokeColors = [],
        _lineStrokes = [],
        _lineThicknessMask = [],
        _lineVertices2 = [];

    appendLineStringData([pathArr[0]], new og.math.Vector4(1, 1, 1, 0.5), new og.math.Vector3(1, 0, 0), 50, new og.math.Vector4(0, 0, 0, 0), 0,
        this._lineVertices, this._lineOrders, this._lineIndexes, this._lineColors, _linePickingColors, this._lineThickness, _lineStrokeColors, _lineStrokes, _lineThicknessMask,
        _lineVertices2);


    appendLineStringData([pathArr[1]], new og.math.Vector4(1, 0, 0, 0.5), new og.math.Vector3(1, 1, 0), 25, new og.math.Vector4(0, 0, 0, 0), 0,
        this._lineVertices, this._lineOrders, this._lineIndexes, this._lineColors, _linePickingColors, this._lineThickness, _lineStrokeColors, _lineStrokes, _lineThicknessMask,
        _lineVertices2);

    var h = this.renderer.handler;
    this._lineOrdersBuffer = h.createArrayBuffer(new Float32Array(this._lineOrders), 1, this._lineOrders.length / 2);
    this._lineVerticesBuffer = h.createArrayBuffer(new Float32Array(this._lineVertices), 2, this._lineVertices.length / 2);
    this._lineIndexesBuffer = h.createElementArrayBuffer(new Uint16Array(this._lineIndexes), 1, this._lineIndexes.length);

    this._lineThicknessBuffer = h.createArrayBuffer(new Float32Array(this._lineThickness), 1, this._lineThickness.length);
    this._lineColorsBuffer = h.createArrayBuffer(new Float32Array(this._lineColors), 4, this._lineColors.length / 4);
};

my.LineRing.prototype.frame = function () {

    var rn = this;
    var r = rn.renderer;
    var sh = r.handler.shaderPrograms.vectorTileLineRasterization;
    var p = sh._program;
    var gl = r.handler.gl,
        sha = p.attributes,
        shu = p.uniforms;

    sh.activate();

    gl.enable(gl.BLEND);
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    gl.uniform2fv(shu.viewport._pName, [512, 512]);

    var extent = new og.Extent(new og.LonLat(-180, -90), new og.LonLat(180, 90));
    gl.uniform4fv(shu.extentParams._pName, [extent.southWest.lon, extent.southWest.lat, 2.0 / extent.getWidth(), 2.0 / extent.getHeight()]);

    //thickness
    gl.bindBuffer(gl.ARRAY_BUFFER, this._lineThicknessBuffer);
    gl.vertexAttribPointer(sha.thickness._pName, this._lineThicknessBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //color
    gl.bindBuffer(gl.ARRAY_BUFFER, this._lineColorsBuffer);
    gl.vertexAttribPointer(sha.color._pName, this._lineColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //vertex
    var mb = this._lineVerticesBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, mb);
    gl.vertexAttribPointer(sha.prev._pName, mb.itemSize, gl.FLOAT, false, 8, 0);
    gl.vertexAttribPointer(sha.current._pName, mb.itemSize, gl.FLOAT, false, 8, 32);
    gl.vertexAttribPointer(sha.next._pName, mb.itemSize, gl.FLOAT, false, 8, 64);

    //order
    gl.bindBuffer(gl.ARRAY_BUFFER, this._lineOrdersBuffer);
    gl.vertexAttribPointer(sha.order._pName, this._lineOrdersBuffer.itemSize, gl.FLOAT, false, 4, 0);

    // //
    // //Antialiase pass
    // gl.uniform1f(shu.thicknessOutline._pName, 2);
    // gl.uniform1f(shu.alpha._pName, 0.54);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._lineIndexesBuffer);
    // gl.drawElements(this._drawType, this._lineIndexesBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    //
    //Aliased pass
    gl.uniform1f(shu.thicknessOutline._pName, 1);
    gl.uniform1f(shu.alpha._pName, 1.0);
    gl.drawElements(this._drawType, this._lineIndexesBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
};
