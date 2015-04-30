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
            //a_position: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_corner: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("vs.txt"),
        fragmentShader: og.utils.readTextFile("fs.txt")
    });

    context = new og.webgl.Handler("canvas");
    context.addShaderProgram(geoImageShader);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    gi = new GeoImage();
    renderer.addRenderNode(gi);

    renderer.start();
};