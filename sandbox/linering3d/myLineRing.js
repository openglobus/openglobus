goog.provide('my.LineRing');

goog.require('og.scene.RenderNode');
goog.require('og.inheritance');

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.Label');
goog.require('og.LonLat');
goog.require('og.Extent');

// var extentParams = og.math.vector4(-180, -90, 0.0555556, 0.011111112);
// var viewport = og.math.vector2(1, 1);

// function vertCall(index) {
//     return vert(vPrev(index), vCurr(index), vNext(index), order(index), 10);
// };

// function vPrev(index) {
//     return og.math.vector2(lineRing._lineVertices[index * 2], lineRing._lineVertices[index * 2 + 1])
// };
// function vCurr(index) {
//     index = index * 2 + 8;
//     return og.math.vector2(lineRing._lineVertices[index], lineRing._lineVertices[index + 1])
// };
// function vNext(index) {
//     index = index * 2 + 16;
//     return og.math.vector2(lineRing._lineVertices[index], lineRing._lineVertices[index + 1])
// };

// function order(index) {
//     return lineRing._lineOrders[index];
// };

// function getIntersection(start1, end1, start2, end2) {
//     if (start1.equal(start2)) {
//         return start1;
//     }
//     var dir = end2.sub(start2);
//     var perp = new og.math.Vector2(-dir.y, dir.x);
//     var d2 = perp.dot(start2);
//     var seg = perp.dot(start1) - d2;
//     var prl = (seg - perp.dot(end1) + d2);
//     // if (prl == 0.0) {
//     //     return start1;
//     // }
//     var u = seg / prl;
//     return start1.add(end1.sub(start1).scale(u));

// };

// function proj(coordinates) {
//     // var x = -1.0 + coordinates.x - extentParams.x * extentParams.z * 1.0,
//     //     y = -1.0 + coordinates.y - extentParams.y * extentParams.w * -1.0;
//     // return new og.math.Vector2(x, y);
//     return coordinates.clone();
// };

// function vert(prev, current, next, order, thickness) {
//     var _next = next.clone();
//     var _prev = prev.clone();
//     var sOrder = 1.0;
//     if (prev.equal(current)) {
//         if (next.equal(current)) {
//             _next = current.add(og.math.Vector2(1.0, 0.0));
//             _prev = current.sub(next);
//         } else {
//             _prev = current.add(current.sub(next).normalize());
//         }
//     }
//     if (next.equal(current)) {
//         _next = current.add(current.sub(_prev).normalize());
//     }

//     var sNext = proj(_next),
//         sCurrent = proj(current),
//         sPrev = proj(_prev);
//     var dirNext = sNext.sub(sCurrent).normalize();
//     var dirPrev = sPrev.sub(sCurrent).normalize();
//     var dotNP = dirNext.dot(dirPrev);
//     var normalNext = og.math.vector2(-dirNext.y, dirNext.x).normalize();
//     var normalPrev = og.math.vector2(dirPrev.y, -dirPrev.x).normalize();
//     var d = og.math.vector2(1 / viewport.x, 1 / viewport.y).scale((thickness + 0.0) * 0.5 * Math.sign(sOrder * order));
//     var m = getIntersection(sCurrent.add(normalPrev.mul(d)), sPrev.add(normalPrev.mul(d)),
//         sCurrent.add(normalNext.mul(d)), sNext.add(normalNext.mul(d)));

//     if (dotNP > 0.5 && dirNext.add(dirPrev).dot(m.sub(sCurrent)) < 0.0) {
//         var ccw = Math.sign(dirNext.x * dirPrev.y - dirNext.y * dirPrev.x);
//         var occw = order * ccw;
//         if (occw == -1.0) {
//             m = sCurrent.add(normalPrev.mul(d));
//         } else if (occw == 1.0) {
//             m = sCurrent.add(normalNext.mul(d));
//         } else if (occw == -2.0) {
//             m = sCurrent.add(normalNext.mul(d));
//         } else if (occw == 2.0) {
//             m = sCurrent.add(normalPrev.mul(d));
//         }
//     } else {
//         var maxDist = Math.max(sCurrent.distance(sNext), sCurrent.distance(sPrev));
//         if (sCurrent.distance(m) > maxDist) {
//             m = sCurrent.add(m.sub(sCurrent).normalize().scale(maxDist));
//         }
//     }
//     return new og.math.Vector4(m.x, m.y, 0.0, 1.0);
// };

my.LineRing = function (name) {
    og.inheritance.base(this, name);

    this._lineVertices = [];
    this._lineOrders = [];
    this._lineIndexes = [];
    this._lineThickness = [];
    this._lineColors = [];
};

og.inheritance.extend(my.LineRing, og.scene.RenderNode);

var appendLineData = function (pathArr, isRing, outVertices, outOrders, outIndexes) {
    var index = 0;

    if (outIndexes.length > 0) {
        index = outIndexes[outIndexes.length - 5] + 9;
        outIndexes.push(index, index);
    } else {
        outIndexes.push(0, 0);
    }

    for (var j = 0; j < pathArr.length; j++) {
        var path = pathArr[j];
        var startIndex = index;

        var last;
        if (isRing) {
            last = path[path.length - 1];
        } else {
            last = [path[0][0] + path[0][0] - path[1][0], path[0][1] + path[0][1] - path[1][1], path[0][2] + path[0][2] - path[1][2]];
        }

        outVertices.push(last[0], last[1], last[2], last[0], last[1], last[2], last[0], last[1], last[2], last[0], last[1], last[2]);
        outOrders.push(1, -1, 2, -2);

        for (var i = 0; i < path.length; i++) {
            var cur = path[i];
            outVertices.push(cur[0], cur[1], cur[2], cur[0], cur[1], cur[2], cur[0], cur[1], cur[2], cur[0], cur[1], cur[2]);
            outOrders.push(1, -1, 2, -2);
            outIndexes.push(index++, index++, index++, index++);
        }

        var first;
        if (isRing) {
            first = path[0];
            outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
        } else {
            first = [path[path.length - 1][0] + path[path.length - 1][0] - path[path.length - 2][0],
            path[path.length - 1][1] + path[path.length - 1][1] - path[path.length - 2][1],
            path[path.length - 1][2] + path[path.length - 1][2] - path[path.length - 2][2]];
            outIndexes.push(index - 1, index - 1, index - 1, index - 1);
        }

        outVertices.push(first[0], first[1], first[2], first[0], first[1], first[2], first[0], first[1], first[2], first[0], first[1], first[2]);
        outOrders.push(1, -1, 2, -2);

        if (j < pathArr.length - 1) {
            index += 8;
            outIndexes.push(index, index);
        }
    }
};

// var appendLineRingData = function (pathArr, outVertices, outOrders, outIndexes) {
//     var index = 0;

//     if (outIndexes.length > 0) {
//         index = outIndexes[outIndexes.length - 5] + 9;
//         outIndexes.push(index, index);
//     } else {
//         outIndexes.push(0, 0);
//     }

//     for (var j = 0; j < pathArr.length; j++) {
//         path = pathArr[j];
//         var startIndex = index;
//         var last = path[path.length - 1];
//         outVertices.push(last[0], last[1], last[2], last[0], last[1], last[2], last[0], last[1], last[2], last[0], last[1], last[2]);
//         outOrders.push(1, -1, 2, -2);

//         for (var i = 0; i < path.length; i++) {
//             var cur = path[i];
//             outVertices.push(cur[0], cur[1], cur[2], cur[0], cur[1], cur[2], cur[0], cur[1], cur[2], cur[0], cur[1], cur[2]);
//             outOrders.push(1, -1, 2, -2);
//             outIndexes.push(index++, index++, index++, index++);
//         }

//         var first = path[0];
//         outVertices.push(first[0], first[1], first[2], first[0], first[1], first[2], first[0], first[1], first[2], first[0], first[1], first[2]);
//         outOrders.push(1, -1, 2, -2);
//         outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);

//         if (j < pathArr.length - 1) {
//             index += 8;
//             outIndexes.push(index, index);
//         }
//     }
// };

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
            'alpha': { type: og.shaderProgram.types.FLOAT },
            'proj': { type: og.shaderProgram.types.MAT4 },
            'view': { type: og.shaderProgram.types.MAT4 },
            'viewport': { type: og.shaderProgram.types.VEC2 },
            'uCamPos': { type: og.shaderProgram.types.VEC3 },
            'uFloatParams': { type: og.shaderProgram.types.VEC2 },
            'color': { type: og.shaderProgram.types.VEC4 },
            'thickness': { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            'prev': { type: og.shaderProgram.types.VEC3 },
            'current': { type: og.shaderProgram.types.VEC3 },
            'next': { type: og.shaderProgram.types.VEC3 },
            'order': { type: og.shaderProgram.types.FLOAT }
        },
        vertexShader: 'attribute vec3 prev;\
                attribute vec3 current;\
                attribute vec3 next;\
                attribute float order;\
                uniform float thickness;\
                uniform vec4 color;\
                uniform mat4 proj;\
                uniform mat4 view;\
                uniform vec2 viewport;\
                varying vec4 vColor;\
                varying vec3 vPos;\
                \
                const float C = 0.1;\
                const float far = 149.6e+9;\
                float logc = 2.0 / log( C * far + 1.0 );\
                \
                const float NEAR = -1.0;\
                \
                vec2 getIntersection(vec2 start1, vec2 end1, vec2 start2, vec2 end2){\
                    vec2 dir = end2 - start2;\
                    vec2 perp = vec2(-dir.y, dir.x);\
                    float d2 = dot(perp, start2);\
                    float seg = dot(perp, start1) - d2;\
                    float prl = seg - dot(perp, end1) + d2;\
                    if(prl > -1.0 && prl < 1.0){\
                        return start1;\
                    }\
                    float u = seg / prl;\
                    return start1 + u * (end1 - start1);\
                }\
                \
                vec2 project(vec4 p){\
                    return (0.5 * p.xyz / p.w + 0.5).xy * viewport;\
                }\
                \
                void main(){\
                    vColor = color;\
                    vPos = current;\
                    \
                    vec4 vCurrent = view * vec4(current, 1.0);\
                    vec4 vPrev = view * vec4(prev, 1.0);\
                    vec4 vNext = view * vec4(next, 1.0);\
                    \
                    /*Clip near plane*/\
                    if(vCurrent.z > NEAR) {\
                        if(vPrev.z < NEAR){\
                            /*to the begining path view*/\
                            vCurrent = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);\
                        }else if(vNext.z < NEAR){\
                            /*to the end path view*/\
                            vPrev = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);\
                            vCurrent = vNext + (vCurrent - vNext) * (NEAR - vNext.z) / (vCurrent.z - vNext.z);\
                        }\
                    } else if( vPrev.z > NEAR) {\
                        /*to the end path view*/\
                        vPrev = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);\
                    } else if( vNext.z > NEAR) {\
                        /*to the begining path view*/\
                        vNext = vNext + (vCurrent - vNext) * (NEAR - vNext.z) / (vCurrent.z - vNext.z);\
                    }\
                    \
                    vec4 dCurrent = proj * vCurrent;\
                    vec2 _next = project(proj * vNext);\
                    vec2 _prev = project(proj * vPrev);\
                    vec2 _current = project(dCurrent);\
                    if(_prev == _current){\
                        if(_next == _current){\
                            _next = _current + vec2(1.0, 0.0);\
                            _prev = _current - _next;\
                        }else{\
                            _prev = _current + normalize(_current - _next);\
                        }\
                    }\
                    if(_next == _current){\
                        _next = _current + normalize(_current - _prev);\
                    }\
                    \
                    vec2 sNext = _next,\
                         sCurrent = _current,\
                         sPrev = _prev;\
                    vec2 dirNext = normalize(sNext - sCurrent);\
                    vec2 dirPrev = normalize(sPrev - sCurrent);\
                    float dotNP = dot(dirNext, dirPrev);\
                    \
                    vec2 normalNext = normalize(vec2(-dirNext.y, dirNext.x));\
                    vec2 normalPrev = normalize(vec2(dirPrev.y, -dirPrev.x));\
                    \
                    float d = thickness * sign(order);\
                    \
                    vec2 m;\
                    if(dotNP >= 0.99991){\
                        m = sCurrent - normalPrev * d;\
                    }else{\
                        vec2 dir = normalPrev + normalNext;\
                        m = sCurrent + dir * d / (dirNext.x * dir.y - dirNext.y * dir.x);\
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
                    gl_Position = vec4((2.0 * m / viewport - 1.0) * dCurrent.w, dCurrent.z, dCurrent.w);\
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                }',
        fragmentShader: 'precision highp float;\
                uniform float alpha;\
                uniform vec2 uFloatParams;\
                uniform vec3 uCamPos;\
                varying vec4 vColor;\
                varying vec3 vPos;\
                void main() {\
                    vec3 look = vPos - uCamPos;\
                    float lookLength = length(look);\
                    float a = alpha * vColor.a * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(vPos,vPos) - uFloatParams[0]));\
                    gl_FragColor = vec4(vColor.rgb, a);\
                }'
    }));

    var a, b, bc, c, d, i, j, l, lnx, lny, lnz, lx, ly, lz, nx, ny, nz, result, x, y, z, _i;
    result = [];
    lx = 0;
    ly = 0;
    lz = 0;
    lnx = 1;
    lny = 0;
    lnz = 0;
    d = 0;
    bc = [1, 0, 0];
    for (j = _i = 0; _i < 20000; j = ++_i) {
        i = j * 0.1;
        a = i + 3;
        b = i + 7;
        c = i + 11;
        x = (Math.sin(a / 5) + Math.sin(a / 23) + Math.sin(a / 53)) * 1000;
        y = (Math.sin(b / 7) + Math.sin(b / 29) + Math.sin(b / 67)) * 1000;
        z = (Math.sin(b / 11) + Math.sin(b / 31) + Math.sin(b / 73)) * 1000;
        nx = x - lx;
        ny = y - ly;
        nz = z - lz;
        l = Math.sqrt(Math.pow(nx, 2) + Math.pow(ny, 2) + Math.pow(nz, 2));
        nx /= l;
        ny /= l;
        nz /= l;
        d += l;
        result.push([x, y, z]);
        lnx = nx;
        lny = ny;
        lnz = nz;
        lx = x;
        ly = y;
        lz = z;
    }


    var pathArr = [
        [
            [0, 0, 0],
            [100, 100, 100],
            [0, 100, 0]
        ],
        [
            [-200, -10, 0],
            [-10, 70, 0],
            [300, 300, 0]
        ],
        [
            [0, 0, 0],
            [-300, -300, 0]
        ]
    ];

    //pathArr[0] = result;

    appendLineData([pathArr[0]], false, this._lineVertices, this._lineOrders, this._lineIndexes);

    var h = this.renderer.handler;
    this._lineOrdersBuffer = h.createArrayBuffer(new Float32Array(this._lineOrders), 1, this._lineOrders.length / 2);
    this._lineVerticesBuffer = h.createArrayBuffer(new Float32Array(this._lineVertices), 3, this._lineVertices.length / 3);
    this._lineIndexesBuffer = h.createElementArrayBuffer(new Uint32Array(this._lineIndexes), 1, this._lineIndexes.length);
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
    gl.disable(gl.CULL_FACE);

    gl.uniformMatrix4fv(shu.proj._pName, false, r.activeCamera._projectionMatrix._m);
    gl.uniformMatrix4fv(shu.view._pName, false, r.activeCamera._viewMatrix._m);

    gl.uniform4fv(shu.color._pName, [1, 1, 1, 0.7]);
    gl.uniform3fv(shu.uCamPos._pName, r.activeCamera.eye.toVec());
    gl.uniform2fv(shu.uFloatParams._pName, [rn._planetRadius2 || 0.0, r.activeCamera._tanViewAngle_hradOneByHeight]);
    gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);
    gl.uniform1f(shu.thickness._pName, 10.0 / 2.0);
    gl.uniform1f(shu.alpha._pName, 1.0);

    var mb = this._lineVerticesBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, mb);
    gl.vertexAttribPointer(sha.prev._pName, mb.itemSize, gl.FLOAT, false, 12, 0);
    gl.vertexAttribPointer(sha.current._pName, mb.itemSize, gl.FLOAT, false, 12, 48);
    gl.vertexAttribPointer(sha.next._pName, mb.itemSize, gl.FLOAT, false, 12, 96);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._lineOrdersBuffer);
    gl.vertexAttribPointer(sha.order._pName, this._lineOrdersBuffer.itemSize, gl.FLOAT, false, 4, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._lineIndexesBuffer);
    gl.drawElements(this._drawType, this._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
};
