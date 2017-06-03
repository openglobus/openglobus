goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.control.SimpleNavigation');
goog.require('og.control.ShowFps');
goog.require('og.shaderProgram');
goog.require('og.scene.Axes');
goog.require('my.LineRing');
goog.require('og.math.Vector3');
goog.require('og.math.Line');

function start() {

    context = new og.webgl.Handler("canvas", { alpha: false });
    context.initialize();

    renderer = new og.Renderer(context);
    renderer.initialize();

    var axes = new og.scene.Axes(10000);

    lineRing = new my.LineRing("LineRing");
    renderer.addRenderNode(axes);
    renderer.addRenderNode(lineRing);

    renderer.addControls([
        new og.control.SimpleNavigation(),
        new og.control.ShowFps()
    ]);

    renderer.start();

    renderer.activeCamera.eye.x = 139.78950005325692;
    renderer.activeCamera.eye.y = 134.6316551663209;
    renderer.activeCamera.eye.z = 1337.487396725346;
    renderer.activeCamera.refresh();
};
