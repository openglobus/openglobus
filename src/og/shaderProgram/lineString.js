goog.provide('og.shaderProgram.lineString');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.lineString = function() {
    new og.shaderProgram.ShaderProgram("lineString", {
        uniforms: {
            'viewport': {
                type: og.shaderProgram.types.VEC2
            }
        },
        attributes: {
            'color': {
                type: og.shaderProgram.types.VEC4
            },
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
            },
            'thickness': {
                type: og.shaderProgram.types.FLOAT
            }
        },
        vertexShader: 'attribute vec2 prev;\
                attribute vec2 current;\
                attribute vec2 next;\
                attribute vec2 order;\
                attribute vec4 color;\
                attribute float thickness;\
                uniform vec2 viewport;\
                varying vec4 vColor;\
                void main(){\
                    vColor = color;\
                    vec2 dirNext = next - current;\
                    vec2 dirPrev = normalize(prev - current);\
                    vec2 sNormalNext = normalize(vec2(-dirNext[1], dirNext[0]));\
                    vec2 sNormalPrev = normalize(vec2(-dirPrev[1], dirPrev[0]));\
                    vec2 dir = sNormalNext - sNormalPrev;\
                    float sinA = dirPrev[0] * dir[1] - dirPrev[1] * dir[0];\
                    if(abs(sinA) < 0.3){\
                        if(order.y == 0.0){\
                            if(order.x == 1.0) {\
                                dir = sNormalPrev * sign(dirNext[0] * dirPrev[1] - dirNext[1] * dirPrev[0]);\
                            } else {\
                                dir = sNormalNext * order.x * sign(dirNext[0] * dirPrev[1] - dirNext[1] * dirPrev[0]);\
                            }\
                        } else if(order.y == 1.0) {\
                            dir = sNormalPrev * order.x;\
                        } else {\
                            dir = sNormalNext * order.x;\
                        }\
                    }else{\
                        dir /= order.y * sinA * order.x;\
                    }\
                    \
                    vec2 c = (current + dir * thickness) / viewport;\
                    gl_Position = vec4(-1.0 + c.x, 1.0 - c.y, 0.0, 1.0);\
                }',
        fragmentShader: 'precision highp float;\
                    varying vec4 vColor;\
                void main() {\
                    gl_FragColor = vColor;\
                }'
    });
};

og.shaderProgram.lineString.createLineStringData = function(path) {

};

og.shaderProgram.lineString.createLineRingData = function(path, color, t) {

    t = t != undefined ? t || 1.0;

    var vertexArr = [],
        orderArr = [],
        colorArr = [],
        thicknessArr = [];

    for (var i = 0; i < path.length; i++) {
        var cur = path[i],
            pre,
            nex,
            nex2;

        if (i == 0) {
            pre = path[path.length - 1];
        } else {
            pre = path[i - 1];
        }

        if (i == path.length - 2) {
            nex2 = path[0];
        } else {
            nex2 = path[i + 2];
        }

        if (i == path.length - 1) {
            nex = path[0];
            nex2 = path[1];
        } else {
            nex = path[i + 1];
        }

        vertexArr.push(
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

        orderArr.push(
            1, -1, -1, -1,
            1, 1,

            1, -1, -1, 1,
            1, 1,

            -1, 0,
            0, 0,
            1, 0
        );
        var r = color.x,
            g = color.y,
            b = color.z,
            a = color.w;

        colorArr.push(
            r, g, b, a,
            r, g, b, a,
            r, g, b, a,
            r, g, b, a,
            r, g, b, a,
            r, g, b, a,
            r, g, b, a,
            r, g, b, a,
            r, g, b, a);

        thicknessArr.push(
            t,
            t,
            t,
            t,
            t,
            t,
            t,
            t,
            t);
    }

    return {
        'vertexArr': vertexArr,
        'orderArr': orderArr,
        'colorArr': colorArr,
        'thicknessArr': thicknessArr
    };
};
