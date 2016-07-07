//goog.require('og');
//goog.require('og.webgl.Handler');
//goog.require('og.Renderer');
//goog.require('og.control.KeyboardNavigation');
//goog.require('og.shaderProgram.shape');
//goog.require('og.scene.Axes');
//goog.require('my.Heatmap');
//goog.require('og.math.Vector3');
//goog.require('og.utils');

function start() {

    og.webgl.MAX_FRAME_DELAY = 15;


    var heatmap = new og.shaderProgram.ShaderProgram("heatmap", {
        uniforms: {
            resolution: { type: og.shaderProgram.types.VEC2 },
            type: { type: og.shaderProgram.types.FLOAT },
            points: { type: og.shaderProgram.types.VEC4 },
            pointsLength: { type: og.shaderProgram.types.INT }
        },
        attributes: {
            a_position: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        //'attribute vec2 position; void main() { gl_Position = vec4(2.0*position-1.0, 0.0, 1.0);}'
        vertexShader: og.utils.readTextFile("vs.txt"),
        fragmentShader: og.utils.readTextFile("fs.txt")
    });

    context = new og.webgl.Handler("canvas");
    context.addShaderProgram(heatmap);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    hm = new Heatmap();
    renderer.addRenderNode(hm);

    renderer.start();
};