var Polyline2d = function () {
    og.inheritance.base(this, "polyline2d");

    this.thickness = 15;
    this.color = [1, 1, 1, 0.7];
    this.path = [[[0, 0], [200, 0], [300, 100], [0, 100], [0, 200], [-200, 200], [300, 150], [50, -50], [50, -200]]];

    this._verticesBuffer = null;
    this._ordersBuffer = null;
    this._indexesBuffer = null;

    this.initialization = function () {

        //Initialize shader program
        this.renderer.handler.addShaderProgram(new og.shaderProgram.ShaderProgram("polyline2d", {
            uniforms: {
                'viewport': { type: og.shaderProgram.types.VEC2 },
                'color': { type: og.shaderProgram.types.VEC4 },
                'thickness': { type: og.shaderProgram.types.FLOAT }
            },
            attributes: {
                'prev': { type: og.shaderProgram.types.VEC2 },
                'current': { type: og.shaderProgram.types.VEC2 },
                'next': { type: og.shaderProgram.types.VEC2 },
                'order': { type: og.shaderProgram.types.FLOAT }
            },
            vertexShader: 'attribute vec2 prev;\
                attribute vec2 current;\
                attribute vec2 next;\
                attribute float order;\
                \
                uniform float thickness;\
                uniform vec2 viewport;\
                \
                vec2 proj(vec2 coordinates){\
                    return coordinates / viewport;\
                }\
                \
                void main(){\
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
                    vec2 sNext = _next,\
                         sCurrent = current,\
                         sPrev = _prev;\
                    vec2 dirNext = normalize(sNext - sCurrent);\
                    vec2 dirPrev = normalize(sPrev - sCurrent);\
                    float dotNP = dot(dirNext, dirPrev);\
                    \
                    vec2 normalNext = normalize(vec2(-dirNext.y, dirNext.x));\
                    vec2 normalPrev = normalize(vec2(dirPrev.y, -dirPrev.x));\
                    float d = thickness * 0.5 * sign(order);\
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
                    m = proj(m);\
                    gl_Position = vec4(m.x, m.y, 0.0, 1.0);\
                }',
            fragmentShader: 'precision highp float;\
                uniform vec4 color;\
                void main() {\
                    gl_FragColor = color;\
                }'
        }));

        this.createBuffers();
    };

    this.createBuffers = function () {

        var vertices = [],
            orders = [],
            indexes = [];

        Polyline2d.createLineData(this.path, true, vertices, orders, indexes);

        var h = this.renderer.handler;

        this._verticesBuffer = h.createArrayBuffer(new Float32Array(vertices), 2, vertices.length / 2);
        this._indexesBuffer = h.createElementArrayBuffer(new Uint32Array(indexes), 1, indexes.length);
        this._ordersBuffer = h.createArrayBuffer(new Float32Array(orders), 1, orders.length / 2);
    };

    this.frame = function () {

        var r = this.renderer;
        var sh = r.handler.shaderPrograms.polyline2d;
        var p = sh._program,
            sha = p.attributes,
            shu = p.uniforms;
        var gl = r.handler.gl;

        gl.enable(gl.BLEND);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);

        sh.activate();

        var width = r.handler.canvas.width,
            height = r.handler.canvas.height;

        gl.uniform2fv(shu.viewport._pName, [width, height]);
        gl.uniform1f(shu.thickness._pName, this.thickness);
        gl.uniform4fv(shu.color._pName, this.color);

        var vb = this._verticesBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.vertexAttribPointer(sha.prev._pName, vb.itemSize, gl.FLOAT, false, 8, 0);
        gl.vertexAttribPointer(sha.current._pName, vb.itemSize, gl.FLOAT, false, 8, 32);
        gl.vertexAttribPointer(sha.next._pName, vb.itemSize, gl.FLOAT, false, 8, 64);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._ordersBuffer);
        gl.vertexAttribPointer(sha.order._pName, this._ordersBuffer.itemSize, gl.FLOAT, false, 4, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer);
        gl.drawElements(gl.TRIANGLE_STRIP, this._indexesBuffer.numItems, gl.UNSIGNED_INT, 0);
    };
};

og.inheritance.extend(Polyline2d, og.scene.RenderNode);

Polyline2d.createLineData = function (pathArr, isClosed, outVertices, outOrders, outIndexes) {
    var index = 0;

    outIndexes.push(0, 0);

    for (var j = 0; j < pathArr.length; j++) {
        path = pathArr[j];
        var startIndex = index;
        var last = [path[0][0] + path[0][0] - path[1][0], path[0][1] + path[0][1] - path[1][1]];
        outVertices.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
        outOrders.push(1, -1, 2, -2);

        for (var i = 0; i < path.length; i++) {
            var cur = path[i];
            outVertices.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
            outOrders.push(1, -1, 2, -2);
            outIndexes.push(index++, index++, index++, index++);
        }

        var first = [path[path.length - 1][0] + path[path.length - 1][0] - path[path.length - 2][0], path[path.length - 1][1] + path[path.length - 1][1] - path[path.length - 2][1]];
        outVertices.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
        outOrders.push(1, -1, 2, -2);
        outIndexes.push(index - 1, index - 1, index - 1, index - 1);

        if (j < pathArr.length - 1) {
            index += 8;
            outIndexes.push(index, index);
        }
    }
};


