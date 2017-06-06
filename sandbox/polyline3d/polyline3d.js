var Polyline3d = function () {
    og.inheritance.base(this, "polyline3d");

    this.thickness = 5;
    this.color = [1, 1, 1, 0.7];
    this.path = [];

    function _f(x, z) {
        return 4 * Math.sin(Math.sqrt(x * x + z * z)) / Math.sqrt(x * x + z * z) * 100;
    };

    var constants = {
        xMin: -9, // RANGE RELATED
        xMax: 9, // RANGE RELATED
        yMin: -9, // RANGE RELATED
        yMax: 9, // RANGE RELATED
        xDelta: 0.2, // RANGE RELATED
        yDelta: 0.2, // RANGE RELATED
        dTheta: 0.05,
        surfaceScale: 24
    };

    for (var x = constants.xMin; x <= constants.xMax; x += constants.xDelta) {
        var segX = [],
            segZ = [];
        for (var z = constants.yMin; z <= constants.yMax; z += constants.yDelta) {
            segX.push([x * 100, _f(x, z), z * 100]);
            segZ.push([z * 100, _f(x, z), x * 100]);
        }
        this.path.push(segX, segZ);
    }

    this._verticesBuffer = null;
    this._ordersBuffer = null;
    this._indexesBuffer = null;

    this.initialization = function () {

        //Initialize shader program
        this.renderer.handler.addShaderProgram(new og.shaderProgram.ShaderProgram("polyline3d", {
            uniforms: {
                'viewport': { type: og.shaderProgram.types.VEC2 },
                'proj': { type: og.shaderProgram.types.MAT4 },
                'view': { type: og.shaderProgram.types.MAT4 },
                'viewport': { type: og.shaderProgram.types.VEC2 },
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
                uniform mat4 proj;\
                uniform mat4 view;\
                uniform vec2 viewport;\
                \
                const float C = 0.1;\
                const float far = 149.6e+9;\
                float logc = 2.0 / log( C * far + 1.0 );\
                \
                const float NEAR = -1.0;\
                \
                vec2 project(vec4 p){\
                    return (0.5 * p.xyz / p.w + 0.5).xy * viewport;\
                }\
                \
                void main(){\
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
                    gl_Position = vec4((2.0 * m / viewport - 1.0) * dCurrent.w, dCurrent.z, dCurrent.w);\
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
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

        Polyline3d.createLineData(this.path, false, vertices, orders, indexes);

        var h = this.renderer.handler;

        this._verticesBuffer = h.createArrayBuffer(new Float32Array(vertices), 3, vertices.length / 3);
        this._indexesBuffer = h.createElementArrayBuffer(new Uint32Array(indexes), 1, indexes.length);
        this._ordersBuffer = h.createArrayBuffer(new Float32Array(orders), 1, orders.length / 2);
    };

    this.frame = function () {

        var rn = this;
        var r = rn.renderer;
        var sh = r.handler.shaderPrograms.polyline3d;
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

        gl.uniform4fv(shu.color._pName, this.color);
        gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);
        gl.uniform1f(shu.thickness._pName, this.thickness);

        var vb = this._verticesBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.vertexAttribPointer(sha.prev._pName, vb.itemSize, gl.FLOAT, false, 12, 0);
        gl.vertexAttribPointer(sha.current._pName, vb.itemSize, gl.FLOAT, false, 12, 48);
        gl.vertexAttribPointer(sha.next._pName, vb.itemSize, gl.FLOAT, false, 12, 96);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._ordersBuffer);
        gl.vertexAttribPointer(sha.order._pName, this._ordersBuffer.itemSize, gl.FLOAT, false, 4, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer);
        gl.drawElements(gl.TRIANGLE_STRIP, this._indexesBuffer.numItems, gl.UNSIGNED_INT, 0);

        gl.enable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
    };
};

og.inheritance.extend(Polyline3d, og.scene.RenderNode);

Polyline3d.createLineData = function (pathArr, isRing, outVertices, outOrders, outIndexes) {
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

