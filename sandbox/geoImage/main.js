goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');
goog.require('GeoImage');

function start() {

    og.webgl.MAX_FRAME_DELAY = 15;

    var geoImageShader = new og.shaderProgram.ShaderProgram("geoImage", {
        uniforms: {
            u_sourceImage: { type: og.shaderProgram.types.SAMPLER2D },
            u_extentParams: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            a_corner: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: 'attribute vec2 a_corner; \
                        attribute vec2 a_texCoord; \
                        varying vec2 v_texCoords; \
                        uniform vec4 u_extentParams; \
                        void main() { \
                            v_texCoords = a_texCoord; \
                            gl_Position = vec4(-1.0 + (a_corner - u_extentParams.xy) * u_extentParams.zw, 0, 1); \
                        }',
        fragmentShader: 'precision mediump float; \
                            uniform sampler2D uSourceImage; \
                            varying vec2 v_texCoords; \
                            void main () { \
                                gl_FragColor = texture2D(uSourceImage, v_texCoords); \
                            }'
    });


    var geoImageMercProjShader = new og.shaderProgram.ShaderProgram("geoImageMercProj", {
        uniforms: {
            u_sampler: { type: og.shaderProgram.types.SAMPLER2D },
            u_extent: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            a_vertex: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: 'attribute vec2 a_vertex; \
                            attribute vec2 a_texCoord; \
                            varying vec2 v_texCoords; \
                            void main() { \
                                v_texCoords = a_texCoord; \
                                gl_Position = vec4(a_vertex, 0, 1); \
                            }',
        fragmentShader: 'precision highp float; \n\
                        uniform sampler2D u_sampler; \n\
                        uniform vec4 u_extent; \n\
                        varying vec2 v_texCoords; \n\
                        const float POLE=20037508.34; \n\
                        const float PI=3.141592653589793; \n\
                        \n\
                        vec2 forward(vec2 lonLat){\n\
                            return vec2(lonLat.x * POLE / 180.0, log(tan((90.0 + lonLat.y) * PI / 360.0)) / PI * POLE);\n\
                        }\n\
                        vec2 inverse(vec2 lonLat){\n\
                            return vec2(180.0 * lonLat.x / POLE, 180.0 / PI * (2.0 * atan(exp((lonLat.y / POLE) * PI)) - PI / 2.0));\n\
                        }\n\
                        \n\
                        void main () {\n\
                            vec2 minMerc = forward(u_extent.xy); \n\
                            vec2 d = (inverse(minMerc + (forward(u_extent.zw) - minMerc) * \
                                vec2(v_texCoords.x, 1.0 - v_texCoords.y)) - u_extent.xy) / \
                                vec2(u_extent.z - u_extent.x, u_extent.w - u_extent.y);\n\
                            gl_FragColor = texture2D(u_sampler, vec2(d.x, 1.0 - d.y));\n\
            }'
    });

    context = new og.webgl.Handler("canvas");
    context.addShaderProgram(geoImageShader);
    context.addShaderProgram(geoImageMercProjShader);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    gi = new GeoImage();
    renderer.addRenderNode(gi);

    renderer.start();
};