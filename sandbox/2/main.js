goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.node.Node3D');
goog.require('og.control.KeyboardNavigation');
goog.require('og.shaderProgram');
goog.require('og.node.Axes');

function start() {

    var flatShader = new og.shaderProgram.ShaderProgram("flat", {
        uniforms: {
            uPMVMatrix: { type: og.shaderProgram.types.MAT4 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aVertexColor: { type: og.shaderProgram.types.VEC4, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "flat_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "flat_fs.txt")
    });


    context = new og.webgl.Handler("canvas");
    context.addShaderProgram(flatShader);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var axes = new og.node.Axes(10000);

    renderer.addRenderNode(axes);

    renderer.addControls([
        new og.control.KeyboardNavigation({ autoActivate: true }),
    ]);

    renderer.Start();
};