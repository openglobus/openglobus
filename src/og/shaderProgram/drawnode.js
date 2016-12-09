goog.provide('og.shaderProgram.drawnode_nl');
goog.provide('og.shaderProgram.drawnode_wl');
goog.provide('og.shaderProgram.drawnode_screen_nl');
goog.provide('og.shaderProgram.drawnode_screen_wl');
goog.provide('og.shaderProgram.drawnode_colorPicking');
goog.provide('og.shaderProgram.drawnode_heightPicking');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');


og.shaderProgram.drawnode_nl = function () {
    return new og.shaderProgram.ShaderProgram("drawnode_nl", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            samplerCount: { type: og.shaderProgram.types.INT },
            tileOffsetArr: { type: og.shaderProgram.types.VEC4 },
            visibleExtentOffsetArr: { type: og.shaderProgram.types.VEC4 },
            samplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            transparentColorArr: { type: og.shaderProgram.types.VEC4 },
            pickingColorArr: { type: og.shaderProgram.types.VEC3 },
            defaultTexture: { type: og.shaderProgram.types.SAMPLER2D },
            height: { type: og.shaderProgram.types.FLOAT },
            cameraPosition: { type: og.shaderProgram.types.VEC3 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            'attribute vec3 aVertexPosition;\
            attribute vec2 aTextureCoord;\
            uniform mat4 projectionViewMatrix;\
            uniform float height;\
            uniform vec3 cameraPosition;\
            varying vec2 vTextureCoord;\
            varying float range;\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main(void) {\
                range = distance(cameraPosition, aVertexPosition + normalize(aVertexPosition) * height);\
                vTextureCoord = aTextureCoord;\
                gl_Position = projectionViewMatrix * vec4(aVertexPosition + normalize(aVertexPosition) * height, 1.0);\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
            }',
        fragmentShader:
            '#extension GL_EXT_draw_buffers : require\n\
            #ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            uniform vec4 tileOffsetArr[5];\
            uniform vec4 visibleExtentOffsetArr[5];\
            uniform vec4 transparentColorArr[5];\
            uniform vec3 pickingColorArr[5];\
            uniform sampler2D defaultTexture;\
            uniform sampler2D samplerArr[5];\
            uniform int samplerCount;\
            varying vec2 vTextureCoord;\
            varying float range;\
            /* return 1 if v inside the box, return 0 otherwise */\
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {\
                vec2 s = step(bottomLeft, v) - step(topRight, v);\
                return s.x * s.y;\
            }\
            vec3 encode32(highp float f) {\
                float F = abs(f);\
                float s = step(0.0,-f);\
                float e = floor(log2(F));\
                float m = exp2(- e) * F;\
                e = floor(log2(F) + 127.0) + floor(log2(m));\
                vec3 rgb;\
                rgb[0] = 128.0 * s  + floor(e*exp2(-1.0));\
                rgb[1] = 128.0 * mod(e,2.0) + mod(floor(m*128.0),128.0);\
                rgb[2] = floor(mod(floor(m*exp2(23.0 -8.0)),exp2(8.0)));\
                return rgb / 255.0;\
            }\
            const vec2 BOTTOMLEFT = vec2(0.0);\
            const vec2 TOPRIGHT = vec2(1.0);\
            void main(void) {\
                gl_FragData[0] = texture2D( defaultTexture, vTextureCoord );\
                gl_FragData[1] = vec4(0.0);\
                gl_FragData[2] = vec4(encode32(range), gl_FragData[0].a);\
                if( samplerCount == 0 ) return;\
\
                vec4 t = texture2D( samplerArr[0], tileOffsetArr[0].xy + vTextureCoord * tileOffsetArr[0].zw ) * insideBox(visibleExtentOffsetArr[0].xy + vTextureCoord * visibleExtentOffsetArr[0].zw, BOTTOMLEFT, TOPRIGHT);\
                float emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[0].rgb ));\
                gl_FragData[0] = mix( gl_FragData[0], t, transparentColorArr[0].a * emptiness);\
                gl_FragData[1] = vec4(pickingColorArr[0], step(1.0, emptiness));\
                gl_FragData[2] = mix( gl_FragData[2], vec4(encode32(range), 1.0), step(1.0, emptiness));\
                if( samplerCount == 1 ) return;\
\
                t = texture2D( samplerArr[1], tileOffsetArr[1].xy + vTextureCoord * tileOffsetArr[1].zw ) * insideBox(visibleExtentOffsetArr[1].xy + vTextureCoord * visibleExtentOffsetArr[1].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[1].rgb ));\
                gl_FragData[0] = mix( gl_FragData[0], t, transparentColorArr[1].a * emptiness);\
                gl_FragData[1] = mix( gl_FragData[1], vec4(pickingColorArr[1], 1.0), step(1.0, emptiness));\
                gl_FragData[2] = mix( gl_FragData[2], vec4(encode32(range), 1.0), step(1.0, emptiness));\
                if( samplerCount == 2 ) return;\
\
                t = texture2D( samplerArr[2], tileOffsetArr[2].xy + vTextureCoord * tileOffsetArr[2].zw ) * insideBox(visibleExtentOffsetArr[2].xy + vTextureCoord * visibleExtentOffsetArr[2].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[2].rgb ));\
                gl_FragData[0] = mix( gl_FragData[0], t, transparentColorArr[2].a * emptiness);\
                gl_FragData[1] = mix( gl_FragData[1], vec4(pickingColorArr[2], 1.0), step(1.0, emptiness));\
                gl_FragData[2] = mix( gl_FragData[2], vec4(encode32(range), 1.0), step(1.0, emptiness));\
                if( samplerCount == 3 ) return;\
\
                t = texture2D( samplerArr[3], tileOffsetArr[3].xy + vTextureCoord * tileOffsetArr[3].zw ) * insideBox(visibleExtentOffsetArr[3].xy + vTextureCoord * visibleExtentOffsetArr[3].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[3].rgb ));\
                gl_FragData[0] = mix( gl_FragData[0], t, transparentColorArr[3].a * emptiness);\
                gl_FragData[1] = mix( gl_FragData[1], vec4(pickingColorArr[3], 1.0), step(1.0, emptiness));\
                gl_FragData[2] = mix( gl_FragData[2], vec4(encode32(range), 1.0), step(1.0, emptiness));\
                if( samplerCount == 4 ) return;\
\
                t = texture2D( samplerArr[4], tileOffsetArr[4].xy + vTextureCoord * tileOffsetArr[4].zw ) * insideBox(visibleExtentOffsetArr[4].xy + vTextureCoord * visibleExtentOffsetArr[4].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[4].rgb ));\
                gl_FragData[0] = mix( gl_FragData[0], t, transparentColorArr[4].a * emptiness);\
                gl_FragData[1] = mix( gl_FragData[1], vec4(pickingColorArr[4], 1.0), step(1.0, emptiness));\
                gl_FragData[2] = mix( gl_FragData[2], vec4(encode32(range), 1.0), step(1.0, emptiness));\
            }'
    });
};

og.shaderProgram.drawnode_screen_nl = function () {
    return new og.shaderProgram.ShaderProgram("drawnode_screen_nl", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            samplerCount: { type: og.shaderProgram.types.INT },
            tileOffsetArr: { type: og.shaderProgram.types.VEC4 },
            visibleExtentOffsetArr: { type: og.shaderProgram.types.VEC4 },
            samplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            transparentColorArr: { type: og.shaderProgram.types.VEC4 },
            defaultTexture: { type: og.shaderProgram.types.SAMPLER2D },
            height: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            'attribute vec3 aVertexPosition;\
            attribute vec2 aTextureCoord;\
            uniform mat4 projectionViewMatrix;\
            uniform float height;\
            varying vec2 vTextureCoord;\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main(void) {\
                vTextureCoord = aTextureCoord;\
                gl_Position = projectionViewMatrix * vec4(aVertexPosition + normalize(aVertexPosition) * height, 1.0);\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
            }',
        fragmentShader:
            '#ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            uniform vec4 tileOffsetArr[5];\
            uniform vec4 visibleExtentOffsetArr[5];\
            uniform vec4 transparentColorArr[5];\
            uniform sampler2D defaultTexture;\
            uniform sampler2D samplerArr[5];\
            uniform int samplerCount;\
            varying vec2 vTextureCoord;\
            /* return 1 if v inside the box, return 0 otherwise */\
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {\
                vec2 s = step(bottomLeft, v) - step(topRight, v);\
                return s.x * s.y;\
            }\
            const vec2 BOTTOMLEFT = vec2(0.0);\
            const vec2 TOPRIGHT = vec2(1.0);\
            void main(void) {\
                gl_FragColor = texture2D( defaultTexture, vTextureCoord );\
                if( samplerCount == 0 ) return;\
\
                vec4 t = texture2D( samplerArr[0], tileOffsetArr[0].xy + vTextureCoord * tileOffsetArr[0].zw ) * insideBox(visibleExtentOffsetArr[0].xy + vTextureCoord * visibleExtentOffsetArr[0].zw, BOTTOMLEFT, TOPRIGHT);\
                float emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[0].rgb ));\
                gl_FragColor = mix( gl_FragData[0], t, transparentColorArr[0].a * emptiness);\
                if( samplerCount == 1 ) return;\
\
                t = texture2D( samplerArr[1], tileOffsetArr[1].xy + vTextureCoord * tileOffsetArr[1].zw ) * insideBox(visibleExtentOffsetArr[1].xy + vTextureCoord * visibleExtentOffsetArr[1].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[1].rgb ));\
                gl_FragColor = mix( gl_FragData[0], t, transparentColorArr[1].a * emptiness);\
                if( samplerCount == 2 ) return;\
\
                t = texture2D( samplerArr[2], tileOffsetArr[2].xy + vTextureCoord * tileOffsetArr[2].zw ) * insideBox(visibleExtentOffsetArr[2].xy + vTextureCoord * visibleExtentOffsetArr[2].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[2].rgb ));\
                gl_FragColor = mix( gl_FragData[0], t, transparentColorArr[2].a * emptiness);\
                if( samplerCount == 3 ) return;\
\
                t = texture2D( samplerArr[3], tileOffsetArr[3].xy + vTextureCoord * tileOffsetArr[3].zw ) * insideBox(visibleExtentOffsetArr[3].xy + vTextureCoord * visibleExtentOffsetArr[3].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[3].rgb ));\
                gl_FragColor = mix( gl_FragData[0], t, transparentColorArr[3].a * emptiness);\
                if( samplerCount == 4 ) return;\
\
                t = texture2D( samplerArr[4], tileOffsetArr[4].xy + vTextureCoord * tileOffsetArr[4].zw ) * insideBox(visibleExtentOffsetArr[4].xy + vTextureCoord * visibleExtentOffsetArr[4].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[4].rgb ));\
                gl_FragColor = mix( gl_FragData[0], t, transparentColorArr[4].a * emptiness);\
            }'
    });
};

og.shaderProgram.drawnode_colorPicking = function () {
    return new og.shaderProgram.ShaderProgram("drawnode_colorPicking", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            samplerCount: { type: og.shaderProgram.types.INT },
            tileOffsetArr: { type: og.shaderProgram.types.VEC4 },
            visibleExtentOffsetArr: { type: og.shaderProgram.types.VEC4 },
            samplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            transparentColorArr: { type: og.shaderProgram.types.VEC4 },
            pickingColorArr: { type: og.shaderProgram.types.VEC3 },
            defaultTexture: { type: og.shaderProgram.types.SAMPLER2D },
            height: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            'attribute vec3 aVertexPosition;\
            attribute vec2 aTextureCoord;\
            uniform mat4 projectionViewMatrix;\
            uniform float height;\
            varying vec2 vTextureCoord;\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main(void) {\
                vTextureCoord = aTextureCoord;\
                gl_Position = projectionViewMatrix * vec4(aVertexPosition + normalize(aVertexPosition) * height, 1.0);\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
            }',
        fragmentShader:
            '#ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            uniform vec4 tileOffsetArr[5];\
            uniform vec4 visibleExtentOffsetArr[5];\
            uniform vec4 transparentColorArr[5];\
            uniform vec3 pickingColorArr[5];\
            uniform sampler2D defaultTexture;\
            uniform sampler2D samplerArr[5];\
            uniform int samplerCount;\
            varying vec2 vTextureCoord;\
            /* return 1 if v inside the box, return 0 otherwise */\
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {\
                vec2 s = step(bottomLeft, v) - step(topRight, v);\
                return s.x * s.y;\
            }\
            const vec2 BOTTOMLEFT = vec2(0.0);\
            const vec2 TOPRIGHT = vec2(1.0);\
            void main(void) {\
                gl_FragColor = vec4(0.0);\
                if( samplerCount == 0 ) return;\
\
                vec4 t = texture2D( samplerArr[0], tileOffsetArr[0].xy + vTextureCoord * tileOffsetArr[0].zw ) * insideBox(visibleExtentOffsetArr[0].xy + vTextureCoord * visibleExtentOffsetArr[0].zw, BOTTOMLEFT, TOPRIGHT);\
                float emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[0].rgb ));\
                gl_FragColor = vec4(pickingColorArr[0], step(1.0, emptiness));\
                if( samplerCount == 1 ) return;\
\
                t = texture2D( samplerArr[1], tileOffsetArr[1].xy + vTextureCoord * tileOffsetArr[1].zw ) * insideBox(visibleExtentOffsetArr[1].xy + vTextureCoord * visibleExtentOffsetArr[1].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[1].rgb ));\
                gl_FragColor = mix( gl_FragData[1], vec4(pickingColorArr[1], 1.0), step(1.0, emptiness));\
                if( samplerCount == 2 ) return;\
\
                t = texture2D( samplerArr[2], tileOffsetArr[2].xy + vTextureCoord * tileOffsetArr[2].zw ) * insideBox(visibleExtentOffsetArr[2].xy + vTextureCoord * visibleExtentOffsetArr[2].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[2].rgb ));\
                gl_FragColor = mix( gl_FragData[1], vec4(pickingColorArr[2], 1.0), step(1.0, emptiness));\
                if( samplerCount == 3 ) return;\
\
                t = texture2D( samplerArr[3], tileOffsetArr[3].xy + vTextureCoord * tileOffsetArr[3].zw ) * insideBox(visibleExtentOffsetArr[3].xy + vTextureCoord * visibleExtentOffsetArr[3].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[3].rgb ));\
                gl_FragColor = mix( gl_FragData[1], vec4(pickingColorArr[3], 1.0), step(1.0, emptiness));\
                if( samplerCount == 4 ) return;\
\
                t = texture2D( samplerArr[4], tileOffsetArr[4].xy + vTextureCoord * tileOffsetArr[4].zw ) * insideBox(visibleExtentOffsetArr[4].xy + vTextureCoord * visibleExtentOffsetArr[4].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[4].rgb ));\
                gl_FragColor = mix( gl_FragData[1], vec4(pickingColorArr[4], 1.0), step(1.0, emptiness));\
            }'
    });
};

og.shaderProgram.drawnode_heightPicking = function () {
    return new og.shaderProgram.ShaderProgram("drawnode_heightPicking", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            samplerCount: { type: og.shaderProgram.types.INT },
            tileOffsetArr: { type: og.shaderProgram.types.VEC4 },
            visibleExtentOffsetArr: { type: og.shaderProgram.types.VEC4 },
            samplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            transparentColorArr: { type: og.shaderProgram.types.VEC4 },
            pickingColorArr: { type: og.shaderProgram.types.VEC3 },
            defaultTexture: { type: og.shaderProgram.types.SAMPLER2D },
            height: { type: og.shaderProgram.types.FLOAT },
            cameraPosition: { type: og.shaderProgram.types.VEC3 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            'attribute vec3 aVertexPosition;\
            attribute vec2 aTextureCoord;\
            uniform mat4 projectionViewMatrix;\
            uniform float height;\
            uniform vec3 cameraPosition;\
            varying vec2 vTextureCoord;\
            varying float range;\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main(void) {\
                range = distance(cameraPosition, aVertexPosition + normalize(aVertexPosition) * height);\
                vTextureCoord = aTextureCoord;\
                gl_Position = projectionViewMatrix * vec4(aVertexPosition + normalize(aVertexPosition) * height, 1.0);\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
            }',
        fragmentShader:
            '#ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            uniform vec4 tileOffsetArr[5];\
            uniform vec4 visibleExtentOffsetArr[5];\
            uniform vec4 transparentColorArr[5];\
            uniform vec3 pickingColorArr[5];\
            uniform sampler2D defaultTexture;\
            uniform sampler2D samplerArr[5];\
            uniform int samplerCount;\
            varying vec2 vTextureCoord;\
            varying float range;\
            /* return 1 if v inside the box, return 0 otherwise */\
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {\
                vec2 s = step(bottomLeft, v) - step(topRight, v);\
                return s.x * s.y;\
            }\
            vec3 encode32(highp float f) {\
                float F = abs(f);\
                float s = step(0.0,-f);\
                float e = floor(log2(F));\
                float m = exp2(- e) * F;\
                e = floor(log2(F) + 127.0) + floor(log2(m));\
                vec3 rgb;\
                rgb[0] = 128.0 * s  + floor(e*exp2(-1.0));\
                rgb[1] = 128.0 * mod(e,2.0) + mod(floor(m*128.0),128.0);\
                rgb[2] = floor(mod(floor(m*exp2(23.0 -8.0)),exp2(8.0)));\
                return rgb / 255.0;\
            }\
            const vec2 BOTTOMLEFT = vec2(0.0);\
            const vec2 TOPRIGHT = vec2(1.0);\
            void main(void) {\
                gl_FragColor = vec4(encode32(range), gl_FragData[0].a);\
                if( samplerCount == 0 ) return;\
\
                vec4 t = texture2D( samplerArr[0], tileOffsetArr[0].xy + vTextureCoord * tileOffsetArr[0].zw ) * insideBox(visibleExtentOffsetArr[0].xy + vTextureCoord * visibleExtentOffsetArr[0].zw, BOTTOMLEFT, TOPRIGHT);\
                float emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[0].rgb ));\
                gl_FragColor = mix( gl_FragData[2], vec4(encode32(range), 1.0), step(1.0, emptiness));\
                if( samplerCount == 1 ) return;\
\
                t = texture2D( samplerArr[1], tileOffsetArr[1].xy + vTextureCoord * tileOffsetArr[1].zw ) * insideBox(visibleExtentOffsetArr[1].xy + vTextureCoord * visibleExtentOffsetArr[1].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[1].rgb ));\
                gl_FragColor = mix( gl_FragData[2], vec4(encode32(range), 1.0), step(1.0, emptiness));\
                if( samplerCount == 2 ) return;\
\
                t = texture2D( samplerArr[2], tileOffsetArr[2].xy + vTextureCoord * tileOffsetArr[2].zw ) * insideBox(visibleExtentOffsetArr[2].xy + vTextureCoord * visibleExtentOffsetArr[2].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[2].rgb ));\
                gl_FragColor = mix( gl_FragData[2], vec4(encode32(range), 1.0), step(1.0, emptiness));\
                if( samplerCount == 3 ) return;\
\
                t = texture2D( samplerArr[3], tileOffsetArr[3].xy + vTextureCoord * tileOffsetArr[3].zw ) * insideBox(visibleExtentOffsetArr[3].xy + vTextureCoord * visibleExtentOffsetArr[3].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[3].rgb ));\
                gl_FragColor = mix( gl_FragData[2], vec4(encode32(range), 1.0), step(1.0, emptiness));\
                if( samplerCount == 4 ) return;\
\
                t = texture2D( samplerArr[4], tileOffsetArr[4].xy + vTextureCoord * tileOffsetArr[4].zw ) * insideBox(visibleExtentOffsetArr[4].xy + vTextureCoord * visibleExtentOffsetArr[4].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[4].rgb ));\
                gl_FragColor = mix( gl_FragData[2], vec4(encode32(range), 1.0), step(1.0, emptiness));\
            }'
    });
};



og.shaderProgram.drawnode_wl = function () {
    return new og.shaderProgram.ShaderProgram("drawnode_wl", {
        uniforms: {
            projectionMatrix: { type: og.shaderProgram.types.MAT4 },
            viewMatrix: { type: og.shaderProgram.types.MAT4 },
            samplerCount: { type: og.shaderProgram.types.INT },
            tileOffsetArr: { type: og.shaderProgram.types.VEC4 },
            visibleExtentOffsetArr: { type: og.shaderProgram.types.VEC4 },
            samplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            transparentColorArr: { type: og.shaderProgram.types.VEC4 },
            pickingColorArr: { type: og.shaderProgram.types.VEC3 },
            defaultTexture: { type: og.shaderProgram.types.SAMPLER2D },
            height: { type: og.shaderProgram.types.FLOAT },
            cameraPosition: { type: og.shaderProgram.types.VEC3 },
            uGlobalTextureCoord: { type: og.shaderProgram.types.VEC4 },
            normalMatrix: { type: og.shaderProgram.types.MAT3 },
            uNormalMap: { type: og.shaderProgram.types.SAMPLER2D },
            uNormalMapBias: { type: og.shaderProgram.types.VEC3 },
            uGlobalTextureCoord: { type: og.shaderProgram.types.VEC4 },
            nightTexture: { type: og.shaderProgram.types.SAMPLER2D },
            specularTexture: { type: og.shaderProgram.types.SAMPLER2D },
            lightsPositions: { type: og.shaderProgram.types.VEC4 },
            diffuseMaterial: { type: og.shaderProgram.types.VEC3 },
            ambientMaterial: { type: og.shaderProgram.types.VEC3 },
            specularMaterial: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            'attribute vec3 aVertexPosition;\
            attribute vec2 aTextureCoord;\
            uniform mat4 projectionMatrix;\
            uniform mat4 viewMatrix;\
            uniform float height;\
            uniform vec3 cameraPosition;\
            uniform vec4 uGlobalTextureCoord;\
            uniform vec3 uNormalMapBias;\
            varying vec4 vTextureCoord;\
            varying float range;\
            varying vec2 vGlobalTextureCoord;\
            varying vec4 v_vertex;\
            varying float v_height;\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main(void) {\
                v_height = height;\
                vec3 heightVertex = aVertexPosition + normalize(aVertexPosition) * height;\
                v_vertex = viewMatrix * vec4(heightVertex, 1.0);\
                range = distance(cameraPosition, heightVertex);\
                vTextureCoord.xy = aTextureCoord;\
                vGlobalTextureCoord = uGlobalTextureCoord.xy + (uGlobalTextureCoord.zw - uGlobalTextureCoord.xy) * aTextureCoord;\
                vTextureCoord.zw = uNormalMapBias.z * ( aTextureCoord + uNormalMapBias.xy );\
                gl_Position = projectionMatrix * v_vertex;\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
            }',
        fragmentShader:
            '#extension GL_EXT_draw_buffers : require\n\
            #ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
\n\
            #define MAX_POINT_LIGHTS 1\n\
            #define MAX_OVERLAYS 5\n\
            #define MAX_OVERLAYS_PLUS_ONE 6\n\
\
            uniform vec3 diffuseMaterial[MAX_OVERLAYS_PLUS_ONE];\
            uniform vec3 ambientMaterial[MAX_OVERLAYS_PLUS_ONE];\
            uniform vec4 specularMaterial[MAX_OVERLAYS_PLUS_ONE];\
\
            uniform sampler2D uNormalMap;\
            uniform vec4 lightsPositions[MAX_POINT_LIGHTS];\
            uniform mat3 normalMatrix;\
            uniform sampler2D nightTexture;\
            uniform sampler2D specularTexture;\
\
            uniform vec4 tileOffsetArr[MAX_OVERLAYS];\
            uniform vec4 visibleExtentOffsetArr[MAX_OVERLAYS];\
            uniform vec4 transparentColorArr[MAX_OVERLAYS];\
            uniform vec3 pickingColorArr[MAX_OVERLAYS];\
\
            uniform sampler2D defaultTexture;\
            uniform sampler2D samplerArr[MAX_OVERLAYS];\
            uniform int samplerCount;\
\
            varying vec4 vTextureCoord;\
            varying float range;\
            varying vec2 vGlobalTextureCoord;\
            varying vec4 v_vertex;\
            varying float v_height;\
\
            /* return 1 if v inside the box, return 0 otherwise */\
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {\
                vec2 s = step(bottomLeft, v) - step(topRight, v);\
                return s.x * s.y;\
            }\
\
            vec3 encode24(highp float f) {\
                float F = abs(f);\
                float s = step( 0.0, -f );\
                float e = floor( log2(F) );\
                float m = exp2(- e) * F;\
                e = floor( log2(F) + 127.0 ) + floor( log2(m) );\
                return vec3(\
                    ( 128.0 * s + floor( e * exp2(-1.0) ) ) / 255.0,\
                    ( 128.0 * mod( e, 2.0 ) + mod( floor( m * 128.0 ), 128.0 ) ) / 255.0,\
                    floor( mod( floor( m * exp2( 23.0 - 8.0) ), exp2(8.0) ) ) / 255.0);\
            }\
\
            const vec2 BOTTOMLEFT = vec2(0.0);\
            const vec2 TOPRIGHT = vec2(1.0);\
            const vec3 nightStep = 10.0 * vec3(0.58, 0.48, 0.25);\
\
            void main(void) {\
\
                vec3 range24 = encode24(range);\
                float overGround = 1.0 - step(0.1, v_height);\
                vec3 normal = normalize(normalMatrix * ((texture2D(uNormalMap, vTextureCoord.zw).rgb - 0.5) * 2.0));\
                vec3 lightDirection = normalize(lightsPositions[0].xyz - v_vertex.xyz * lightsPositions[0].w);\
                vec3 eyeDirection = normalize(-v_vertex.xyz);\
                vec3 reflectionDirection = reflect(-lightDirection, normal);\
                vec4 nightImageColor = texture2D( nightTexture, vGlobalTextureCoord.st );\
                float shininess = texture2D( specularTexture, vGlobalTextureCoord.st ).r * 255.0 * overGround;\
                float reflection = max( dot(reflectionDirection, eyeDirection), 0.0);\
                float diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);\
                vec3 night = nightStep * (0.3 - diffuseLightWeighting) * nightImageColor.rgb;\
                night *= overGround * step(0.0, night);\
\
\
\
                vec3 spec = specularMaterial[0].rgb * pow( reflection, specularMaterial[0].w) * shininess;\
                vec3 lightWeighting = ambientMaterial[0] + diffuseMaterial[0] * diffuseLightWeighting + spec;\
\
                vec4 t = texture2D( defaultTexture, vTextureCoord.xy );\
                gl_FragData[0] = vec4(t.rgb * lightWeighting + night + spec, t.a);\
                gl_FragData[1] = vec4(0.0);\
                gl_FragData[2] = vec4(range24, gl_FragData[0].a);\
                if( samplerCount == 0 ) return;\
\
\
\
                spec = specularMaterial[1].rgb * pow( reflection, specularMaterial[1].w) * (1.0 + shininess);\
                lightWeighting = ambientMaterial[1] + diffuseMaterial[1] * diffuseLightWeighting + spec;\
\
                t = texture2D( samplerArr[0], tileOffsetArr[0].xy + vTextureCoord.xy * tileOffsetArr[0].zw ) * insideBox(visibleExtentOffsetArr[0].xy + vTextureCoord.xy * visibleExtentOffsetArr[0].zw, BOTTOMLEFT, TOPRIGHT);\
                float emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[0].rgb ));\
                gl_FragData[0] = mix( gl_FragData[0], vec4(t.rgb * lightWeighting + night + spec, t.a), transparentColorArr[0].a * emptiness);\
                emptiness = step(1.0, emptiness);\
                gl_FragData[1] = vec4(pickingColorArr[0], emptiness);\
                gl_FragData[2] = mix( gl_FragData[2], vec4(range24, 1.0), emptiness);\
                if( samplerCount == 1 ) return;\
\
\
\
                spec = specularMaterial[2].rgb * pow( reflection, specularMaterial[2].w);\
                lightWeighting = ambientMaterial[2] + diffuseMaterial[2] * diffuseLightWeighting + spec;\
\
                t = texture2D( samplerArr[1], tileOffsetArr[1].xy + vTextureCoord.xy * tileOffsetArr[1].zw ) * insideBox(visibleExtentOffsetArr[1].xy + vTextureCoord.xy * visibleExtentOffsetArr[1].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[1].rgb ));\
                gl_FragData[0] = mix( gl_FragData[0], vec4(t.rgb * lightWeighting + night + spec, t.a), transparentColorArr[1].a * emptiness);\
                emptiness = step(1.0, emptiness);\
                gl_FragData[1] = mix( gl_FragData[1], vec4(pickingColorArr[1], 1.0), emptiness);\
                gl_FragData[2] = mix( gl_FragData[2], vec4(range24, 1.0), emptiness);\
                if( samplerCount == 2 ) return;\
\
\
\
                spec = specularMaterial[3].rgb * pow( reflection, specularMaterial[3].w);\
                lightWeighting = ambientMaterial[3] + diffuseMaterial[3] * diffuseLightWeighting + spec;\
\
                t = texture2D( samplerArr[2], tileOffsetArr[2].xy + vTextureCoord.xy * tileOffsetArr[2].zw ) * insideBox(visibleExtentOffsetArr[2].xy + vTextureCoord.xy * visibleExtentOffsetArr[2].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[2].rgb ));\
                gl_FragData[0] = mix( gl_FragData[0], vec4(t.rgb * lightWeighting + night + spec, t.a), transparentColorArr[2].a * emptiness);\
                emptiness = step(1.0, emptiness);\
                gl_FragData[1] = mix( gl_FragData[1], vec4(pickingColorArr[2], 1.0), emptiness);\
                gl_FragData[2] = mix( gl_FragData[2], vec4(range24, 1.0), emptiness);\
                if( samplerCount == 3 ) return;\
\
\
\
                spec = specularMaterial[4].rgb * pow( reflection, specularMaterial[4].w);\
                lightWeighting = ambientMaterial[4] + diffuseMaterial[4] * diffuseLightWeighting + spec;\
\
                t = texture2D( samplerArr[3], tileOffsetArr[3].xy + vTextureCoord.xy * tileOffsetArr[3].zw ) * insideBox(visibleExtentOffsetArr[3].xy + vTextureCoord.xy * visibleExtentOffsetArr[3].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[3].rgb ));\
                gl_FragData[0] = mix( gl_FragData[0], vec4(t.rgb * lightWeighting + night + spec, t.a), transparentColorArr[3].a * emptiness);\
                emptiness = step(1.0, emptiness);\
                gl_FragData[1] = mix( gl_FragData[1], vec4(pickingColorArr[3], 1.0), emptiness);\
                gl_FragData[2] = mix( gl_FragData[2], vec4(range24, 1.0), emptiness);\
                if( samplerCount == 4 ) return;\
\
\
\
                spec = specularMaterial[5].rgb * pow( reflection, specularMaterial[5].w);\
                lightWeighting = ambientMaterial[5] + diffuseMaterial[5] * diffuseLightWeighting + spec;\
\
                t = texture2D( samplerArr[4], tileOffsetArr[4].xy + vTextureCoord.xy * tileOffsetArr[4].zw ) * insideBox(visibleExtentOffsetArr[4].xy + vTextureCoord.xy * visibleExtentOffsetArr[4].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[4].rgb ));\
                gl_FragData[0] = mix( gl_FragData[0], vec4(t.rgb * lightWeighting + night + spec, t.a), transparentColorArr[4].a * emptiness);\
                emptiness = step(1.0, emptiness);\
                gl_FragData[1] = mix( gl_FragData[1], vec4(pickingColorArr[4], 1.0), emptiness);\
                gl_FragData[2] = mix( gl_FragData[2], vec4(range24, 1.0), emptiness);\
            }'
    });
};

og.shaderProgram.drawnode_screen_wl = function () {
    return new og.shaderProgram.ShaderProgram("drawnode_screen_wl", {
        uniforms: {
            projectionMatrix: { type: og.shaderProgram.types.MAT4 },
            viewMatrix: { type: og.shaderProgram.types.MAT4 },
            samplerCount: { type: og.shaderProgram.types.INT },
            tileOffsetArr: { type: og.shaderProgram.types.VEC4 },
            visibleExtentOffsetArr: { type: og.shaderProgram.types.VEC4 },
            samplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            transparentColorArr: { type: og.shaderProgram.types.VEC4 },
            defaultTexture: { type: og.shaderProgram.types.SAMPLER2D },
            height: { type: og.shaderProgram.types.FLOAT },
            uGlobalTextureCoord: { type: og.shaderProgram.types.VEC4 },
            normalMatrix: { type: og.shaderProgram.types.MAT3 },
            uNormalMap: { type: og.shaderProgram.types.SAMPLER2D },
            uNormalMapBias: { type: og.shaderProgram.types.VEC3 },
            uGlobalTextureCoord: { type: og.shaderProgram.types.VEC4 },
            nightTexture: { type: og.shaderProgram.types.SAMPLER2D },
            specularTexture: { type: og.shaderProgram.types.SAMPLER2D },
            lightsPositions: { type: og.shaderProgram.types.VEC4 },
            diffuseMaterial: { type: og.shaderProgram.types.VEC3 },
            ambientMaterial: { type: og.shaderProgram.types.VEC3 },
            specularMaterial: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            'attribute vec3 aVertexPosition;\
            attribute vec2 aTextureCoord;\
            uniform mat4 projectionMatrix;\
            uniform mat4 viewMatrix;\
            uniform float height;\
            uniform vec4 uGlobalTextureCoord;\
            uniform vec3 uNormalMapBias;\
            varying vec4 vTextureCoord;\
            varying vec2 vGlobalTextureCoord;\
            varying vec4 v_vertex;\
            varying float v_height;\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main(void) {\
                v_height = height;\
                vec3 heightVertex = aVertexPosition + normalize(aVertexPosition) * height;\
                v_vertex = viewMatrix * vec4(heightVertex, 1.0);\
                vTextureCoord.xy = aTextureCoord;\
                vGlobalTextureCoord = uGlobalTextureCoord.xy + (uGlobalTextureCoord.zw - uGlobalTextureCoord.xy) * aTextureCoord;\
                vTextureCoord.zw = uNormalMapBias.z * ( aTextureCoord + uNormalMapBias.xy );\
                gl_Position = projectionMatrix * v_vertex;\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
            }',
        fragmentShader:
            '#ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
\n\
            #define MAX_POINT_LIGHTS 1\n\
            #define MAX_OVERLAYS 5\n\
            #define MAX_OVERLAYS_PLUS_ONE 6\n\
\
            uniform vec3 diffuseMaterial[MAX_OVERLAYS_PLUS_ONE];\
            uniform vec3 ambientMaterial[MAX_OVERLAYS_PLUS_ONE];\
            uniform vec4 specularMaterial[MAX_OVERLAYS_PLUS_ONE];\
\
            uniform sampler2D uNormalMap;\
            uniform vec4 lightsPositions[MAX_POINT_LIGHTS];\
            uniform mat3 normalMatrix;\
            uniform sampler2D nightTexture;\
            uniform sampler2D specularTexture;\
\
            uniform vec4 tileOffsetArr[MAX_OVERLAYS];\
            uniform vec4 visibleExtentOffsetArr[MAX_OVERLAYS];\
            uniform vec4 transparentColorArr[MAX_OVERLAYS];\
\
            uniform sampler2D defaultTexture;\
            uniform sampler2D samplerArr[MAX_OVERLAYS];\
            uniform int samplerCount;\
\
            varying vec4 vTextureCoord;\
            varying vec2 vGlobalTextureCoord;\
            varying vec4 v_vertex;\
            varying float v_height;\
\
            /* return 1 if v inside the box, return 0 otherwise */\
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {\
                vec2 s = step(bottomLeft, v) - step(topRight, v);\
                return s.x * s.y;\
            }\
\
            const vec2 BOTTOMLEFT = vec2(0.0);\
            const vec2 TOPRIGHT = vec2(1.0);\
            const vec3 nightStep = 10.0 * vec3(0.58, 0.48, 0.25);\
\
            void main(void) {\
\
                float overGround = 1.0 - step(0.1, v_height);\
                vec3 normal = normalize(normalMatrix * ((texture2D(uNormalMap, vTextureCoord.zw).rgb - 0.5) * 2.0));\
                vec3 lightDirection = normalize(lightsPositions[0].xyz - v_vertex.xyz * lightsPositions[0].w);\
                vec3 eyeDirection = normalize(-v_vertex.xyz);\
                vec3 reflectionDirection = reflect(-lightDirection, normal);\
                vec4 nightImageColor = texture2D( nightTexture, vGlobalTextureCoord.st );\
                float shininess = texture2D( specularTexture, vGlobalTextureCoord.st ).r * 255.0 * overGround;\
                float reflection = max( dot(reflectionDirection, eyeDirection), 0.0);\
                float diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);\
                vec3 night = nightStep * (0.3 - diffuseLightWeighting) * nightImageColor.rgb;\
                night *= overGround * step(0.0, night);\
\
\
\
                vec3 spec = specularMaterial[0].rgb * pow( reflection, specularMaterial[0].w) * shininess;\
                vec3 lightWeighting = ambientMaterial[0] + diffuseMaterial[0] * diffuseLightWeighting + spec;\
\
                vec4 t = texture2D( defaultTexture, vTextureCoord.xy );\
                gl_FragColor = vec4(t.rgb * lightWeighting + night + spec, t.a);\
                if( samplerCount == 0 ) return;\
\
\
\
                spec = specularMaterial[1].rgb * pow( reflection, specularMaterial[1].w) * (1.0 + shininess);\
                lightWeighting = ambientMaterial[1] + diffuseMaterial[1] * diffuseLightWeighting + spec;\
\
                t = texture2D( samplerArr[0], tileOffsetArr[0].xy + vTextureCoord.xy * tileOffsetArr[0].zw ) * insideBox(visibleExtentOffsetArr[0].xy + vTextureCoord.xy * visibleExtentOffsetArr[0].zw, BOTTOMLEFT, TOPRIGHT);\
                float emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[0].rgb ));\
                gl_FragColor = mix( gl_FragData[0], vec4(t.rgb * lightWeighting + night + spec, t.a), transparentColorArr[0].a * emptiness);\
                if( samplerCount == 1 ) return;\
\
\
\
                spec = specularMaterial[2].rgb * pow( reflection, specularMaterial[2].w);\
                lightWeighting = ambientMaterial[2] + diffuseMaterial[2] * diffuseLightWeighting + spec;\
\
                t = texture2D( samplerArr[1], tileOffsetArr[1].xy + vTextureCoord.xy * tileOffsetArr[1].zw ) * insideBox(visibleExtentOffsetArr[1].xy + vTextureCoord.xy * visibleExtentOffsetArr[1].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[1].rgb ));\
                gl_FragColor = mix( gl_FragData[0], vec4(t.rgb * lightWeighting + night + spec, t.a), transparentColorArr[1].a * emptiness);\
                if( samplerCount == 2 ) return;\
\
\
\
                spec = specularMaterial[3].rgb * pow( reflection, specularMaterial[3].w);\
                lightWeighting = ambientMaterial[3] + diffuseMaterial[3] * diffuseLightWeighting + spec;\
\
                t = texture2D( samplerArr[2], tileOffsetArr[2].xy + vTextureCoord.xy * tileOffsetArr[2].zw ) * insideBox(visibleExtentOffsetArr[2].xy + vTextureCoord.xy * visibleExtentOffsetArr[2].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[2].rgb ));\
                gl_FragColor = mix( gl_FragData[0], vec4(t.rgb * lightWeighting + night + spec, t.a), transparentColorArr[2].a * emptiness);\
                if( samplerCount == 3 ) return;\
\
\
\
                spec = specularMaterial[4].rgb * pow( reflection, specularMaterial[4].w);\
                lightWeighting = ambientMaterial[4] + diffuseMaterial[4] * diffuseLightWeighting + spec;\
\
                t = texture2D( samplerArr[3], tileOffsetArr[3].xy + vTextureCoord.xy * tileOffsetArr[3].zw ) * insideBox(visibleExtentOffsetArr[3].xy + vTextureCoord.xy * visibleExtentOffsetArr[3].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[3].rgb ));\
                gl_FragColor = mix( gl_FragData[0], vec4(t.rgb * lightWeighting + night + spec, t.a), transparentColorArr[3].a * emptiness);\
                if( samplerCount == 4 ) return;\
\
\
\
                spec = specularMaterial[5].rgb * pow( reflection, specularMaterial[5].w);\
                lightWeighting = ambientMaterial[5] + diffuseMaterial[5] * diffuseLightWeighting + spec;\
\
                t = texture2D( samplerArr[4], tileOffsetArr[4].xy + vTextureCoord.xy * tileOffsetArr[4].zw ) * insideBox(visibleExtentOffsetArr[4].xy + vTextureCoord.xy * visibleExtentOffsetArr[4].zw, BOTTOMLEFT, TOPRIGHT);\
                emptiness = t.a * smoothstep(0.35, 0.5, distance( t.rgb, transparentColorArr[4].rgb ));\
                gl_FragColor = mix( gl_FragData[0], vec4(t.rgb * lightWeighting + night + spec, t.a), transparentColorArr[4].a * emptiness);\
            }'
    });
};