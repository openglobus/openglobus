goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.control.SimpleNavigation');
goog.require('og.control.ShowFps');
goog.require('og.shaderProgram');
goog.require('og.scene.Axes');
goog.require('my.LineString');
goog.require('og.math.Vector3');

function start() {

    og.webgl.MAX_FRAME_DELAY = 15;

    context = new og.webgl.Handler("canvas", { alpha: false });
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var axes = new og.scene.Axes(10000);

    testNode = new my.LineString("LineString");
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