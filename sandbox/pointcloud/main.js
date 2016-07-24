goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.control.SimpleNavigation');
goog.require('og.control.ShowFps');
goog.require('og.shaderProgram');
goog.require('og.scene.Axes');
goog.require('my.PointCloud');
goog.require('og.math.Vector3');

function start() {

    og.webgl.MAX_FRAME_DELAY = 15;

    var flatShader = new og.shaderProgram.ShaderProgram("flat", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aVertexColor: { type: og.shaderProgram.types.VEC4, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "flat_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "flat_fs.txt")
    });

    context = new og.webgl.Handler("canvas", { alpha: false });
    context.addShaderProgram(flatShader);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var axes = new og.scene.Axes(10000);

    testNode = new my.PointCloud("PointCloud");
    //renderer.addRenderNode(axes);
    renderer.addRenderNode(testNode);

    renderer.addControls([
        new og.control.SimpleNavigation({ autoActivate: true }),
        new og.control.ShowFps({ autoActivate: true })
    ]);

    renderer.start();

    renderer.activeCamera.eye.x = 139.78950005325692;
    renderer.activeCamera.eye.y = 134.6316551663209;
    renderer.activeCamera.eye.z = 1337.487396725346;
    renderer.activeCamera.refresh();
};