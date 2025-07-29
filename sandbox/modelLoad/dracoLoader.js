/* eslint-disable no-undef */
import {
    Globe,
    control,
    Vector,
    LonLat,
    Entity,
    OpenStreetMap,
    EmptyTerrain,
    RgbTerrain,
    GlobusRgbTerrain,
    Object3d,
    mercator,
    Bing,
    GeoVideo,
    XYZ,
    utils,
    PlanetCamera,
    Framebuffer,
    input,
    Program,
    Vec4,
    Vec2,
    GeoImage,
    Renderer,
    Vec3,
    Mat4,
    RenderNode,
    EntityCollection,
    scene,
    Gltf,
    Easing
} from "../../lib/og.es.js";

// Создаем HTML интерфейс для слайдеров
function createSliderControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 8px;
        color: white;
        font-family: Arial, sans-serif;
        z-index: 1000;
    `;

    // Roll слайдер для suspLeftFront
    const rollContainer = document.createElement('div');
    rollContainer.style.marginBottom = '15px';

    const rollLabel = document.createElement('label');
    rollLabel.textContent = 'SuspLeftFront Roll (-90° - 90°): ';
    rollLabel.style.display = 'block';
    rollLabel.style.marginBottom = '5px';

    const rollSlider = document.createElement('input');
    rollSlider.type = 'range';
    rollSlider.min = '-90';
    rollSlider.max = '90';
    rollSlider.value = '0';
    rollSlider.step = '0.1';
    rollSlider.id = 'rollSlider';
    rollSlider.style.width = '200px';

    const rollValue = document.createElement('span');
    rollValue.id = 'rollValue';
    rollValue.textContent = '0°';
    rollValue.style.marginLeft = '10px';

    rollContainer.appendChild(rollLabel);
    rollContainer.appendChild(rollSlider);
    rollContainer.appendChild(rollValue);

    // Pitch слайдер для suspLeftFront
    const pitchContainer = document.createElement('div');
    pitchContainer.style.marginBottom = '15px';

    const pitchLabel = document.createElement('label');
    pitchLabel.textContent = 'SuspLeftFront Pitch (-45° - 45°): ';
    pitchLabel.style.display = 'block';
    pitchLabel.style.marginBottom = '5px';

    const pitchSlider = document.createElement('input');
    pitchSlider.type = 'range';
    pitchSlider.min = '-45';
    pitchSlider.max = '45';
    pitchSlider.value = '13';
    pitchSlider.step = '0.1';
    pitchSlider.id = 'pitchSlider';
    pitchSlider.style.width = '200px';

    const pitchValue = document.createElement('span');
    pitchValue.id = 'pitchValue';
    pitchValue.textContent = '13°';
    pitchValue.style.marginLeft = '10px';

    pitchContainer.appendChild(pitchLabel);
    pitchContainer.appendChild(pitchSlider);
    pitchContainer.appendChild(pitchValue);

    // Общий слайдер поворота колес
    const wheelSteerContainer = document.createElement('div');
    wheelSteerContainer.style.marginBottom = '15px';

    const wheelSteerLabel = document.createElement('label');
    wheelSteerLabel.textContent = 'Wheel Steering (-90° - 90°): ';
    wheelSteerLabel.style.display = 'block';
    wheelSteerLabel.style.marginBottom = '5px';

    const wheelSteerSlider = document.createElement('input');
    wheelSteerSlider.type = 'range';
    wheelSteerSlider.min = '-90';
    wheelSteerSlider.max = '90';
    wheelSteerSlider.value = '0';
    wheelSteerSlider.step = '0.1';
    wheelSteerSlider.id = 'wheelSteerSlider';
    wheelSteerSlider.style.width = '200px';

    const wheelSteerValue = document.createElement('span');
    wheelSteerValue.id = 'wheelSteerValue';
    wheelSteerValue.textContent = '0°';
    wheelSteerValue.style.marginLeft = '10px';

    wheelSteerContainer.appendChild(wheelSteerLabel);
    wheelSteerContainer.appendChild(wheelSteerSlider);
    wheelSteerContainer.appendChild(wheelSteerValue);

    // Roll слайдер для suspLeftBack
    const rollBackContainer = document.createElement('div');
    rollBackContainer.style.marginBottom = '15px';

    const rollBackLabel = document.createElement('label');
    rollBackLabel.textContent = 'SuspLeftBack Roll (-45° - 45°): ';
    rollBackLabel.style.display = 'block';
    rollBackLabel.style.marginBottom = '5px';

    const rollBackSlider = document.createElement('input');
    rollBackSlider.type = 'range';
    rollBackSlider.min = '-45';
    rollBackSlider.max = '45';
    rollBackSlider.value = '0';
    rollBackSlider.step = '0.1';
    rollBackSlider.id = 'rollBackSlider';
    rollBackSlider.style.width = '200px';

    const rollBackValue = document.createElement('span');
    rollBackValue.id = 'rollBackValue';
    rollBackValue.textContent = '0°';
    rollBackValue.style.marginLeft = '10px';

    rollBackContainer.appendChild(rollBackLabel);
    rollBackContainer.appendChild(rollBackSlider);
    rollBackContainer.appendChild(rollBackValue);

    // Roll слайдер для suspRightFront
    const rollRightContainer = document.createElement('div');
    rollRightContainer.style.marginBottom = '15px';

    const rollRightLabel = document.createElement('label');
    rollRightLabel.textContent = 'SuspRightFront Roll (-90° - 90°): ';
    rollRightLabel.style.display = 'block';
    rollRightLabel.style.marginBottom = '5px';

    const rollRightSlider = document.createElement('input');
    rollRightSlider.type = 'range';
    rollRightSlider.min = '-90';
    rollRightSlider.max = '90';
    rollRightSlider.value = '0';
    rollRightSlider.step = '0.1';
    rollRightSlider.id = 'rollRightSlider';
    rollRightSlider.style.width = '200px';

    const rollRightValue = document.createElement('span');
    rollRightValue.id = 'rollRightValue';
    rollRightValue.textContent = '0°';
    rollRightValue.style.marginLeft = '10px';

    rollRightContainer.appendChild(rollRightLabel);
    rollRightContainer.appendChild(rollRightSlider);
    rollRightContainer.appendChild(rollRightValue);

    // Pitch слайдер для suspRightFront
    const pitchRightContainer = document.createElement('div');
    pitchRightContainer.style.marginBottom = '15px';

    const pitchRightLabel = document.createElement('label');
    pitchRightLabel.textContent = 'SuspRightFront Pitch (-45° - 45°): ';
    pitchRightLabel.style.display = 'block';
    pitchRightLabel.style.marginBottom = '5px';

    const pitchRightSlider = document.createElement('input');
    pitchRightSlider.type = 'range';
    pitchRightSlider.min = '-45';
    pitchRightSlider.max = '45';
    pitchRightSlider.value = '-13';
    pitchRightSlider.step = '0.1';
    pitchRightSlider.id = 'pitchRightSlider';
    pitchRightSlider.style.width = '200px';

    const pitchRightValue = document.createElement('span');
    pitchRightValue.id = 'pitchRightValue';
    pitchRightValue.textContent = '-13°';
    pitchRightValue.style.marginLeft = '10px';

    pitchRightContainer.appendChild(pitchRightLabel);
    pitchRightContainer.appendChild(pitchRightSlider);
    pitchRightContainer.appendChild(pitchRightValue);

    // Roll слайдер для suspRightBack
    const rollRightBackContainer = document.createElement('div');
    rollRightBackContainer.style.marginBottom = '15px';

    const rollRightBackLabel = document.createElement('label');
    rollRightBackLabel.textContent = 'SuspRightBack Roll (-45° - 45°): ';
    rollRightBackLabel.style.display = 'block';
    rollRightBackLabel.style.marginBottom = '5px';

    const rollRightBackSlider = document.createElement('input');
    rollRightBackSlider.type = 'range';
    rollRightBackSlider.min = '-45';
    rollRightBackSlider.max = '45';
    rollRightBackSlider.value = '0';
    rollRightBackSlider.step = '0.1';
    rollRightBackSlider.id = 'rollRightBackSlider';
    rollRightBackSlider.style.width = '200px';

    const rollRightBackValue = document.createElement('span');
    rollRightBackValue.id = 'rollRightBackValue';
    rollRightBackValue.textContent = '0°';
    rollRightBackValue.style.marginLeft = '10px';

    rollRightBackContainer.appendChild(rollRightBackLabel);
    rollRightBackContainer.appendChild(rollRightBackSlider);
    rollRightBackContainer.appendChild(rollRightBackValue);

    // Pitch слайдер для cam0_base
    const cam0PitchContainer = document.createElement('div');
    cam0PitchContainer.style.marginBottom = '15px';

    const cam0PitchLabel = document.createElement('label');
    cam0PitchLabel.textContent = 'Cam0_base Pitch (-90° - 90°): ';
    cam0PitchLabel.style.display = 'block';
    cam0PitchLabel.style.marginBottom = '5px';

    const cam0PitchSlider = document.createElement('input');
    cam0PitchSlider.type = 'range';
    cam0PitchSlider.min = '-90';
    cam0PitchSlider.max = '90';
    cam0PitchSlider.value = '0';
    cam0PitchSlider.step = '0.1';
    cam0PitchSlider.id = 'cam0PitchSlider';
    cam0PitchSlider.style.width = '200px';

    const cam0PitchValue = document.createElement('span');
    cam0PitchValue.id = 'cam0PitchValue';
    cam0PitchValue.textContent = '0°';
    cam0PitchValue.style.marginLeft = '10px';

    cam0PitchContainer.appendChild(cam0PitchLabel);
    cam0PitchContainer.appendChild(cam0PitchSlider);
    cam0PitchContainer.appendChild(cam0PitchValue);

    // Yaw слайдер для cam0_joint
    const cam0JointYawContainer = document.createElement('div');
    cam0JointYawContainer.style.marginBottom = '15px';

    const cam0JointYawLabel = document.createElement('label');
    cam0JointYawLabel.textContent = 'Cam0_joint Yaw (-180° - 180°): ';
    cam0JointYawLabel.style.display = 'block';
    cam0JointYawLabel.style.marginBottom = '5px';

    const cam0JointYawSlider = document.createElement('input');
    cam0JointYawSlider.type = 'range';
    cam0JointYawSlider.min = '-180';
    cam0JointYawSlider.max = '180';
    cam0JointYawSlider.value = '0';
    cam0JointYawSlider.step = '0.1';
    cam0JointYawSlider.id = 'cam0JointYawSlider';
    cam0JointYawSlider.style.width = '200px';

    const cam0JointYawValue = document.createElement('span');
    cam0JointYawValue.id = 'cam0JointYawValue';
    cam0JointYawValue.textContent = '0°';
    cam0JointYawValue.style.marginLeft = '10px';

    cam0JointYawContainer.appendChild(cam0JointYawLabel);
    cam0JointYawContainer.appendChild(cam0JointYawSlider);
    cam0JointYawContainer.appendChild(cam0JointYawValue);

    // Pitch слайдер для cam0_head
    const cam0HeadPitchContainer = document.createElement('div');
    cam0HeadPitchContainer.style.marginBottom = '15px';

    const cam0HeadPitchLabel = document.createElement('label');
    cam0HeadPitchLabel.textContent = 'Cam0_head Pitch (-90° - 90°): ';
    cam0HeadPitchLabel.style.display = 'block';
    cam0HeadPitchLabel.style.marginBottom = '5px';

    const cam0HeadPitchSlider = document.createElement('input');
    cam0HeadPitchSlider.type = 'range';
    cam0HeadPitchSlider.min = '-90';
    cam0HeadPitchSlider.max = '90';
    cam0HeadPitchSlider.value = '0';
    cam0HeadPitchSlider.step = '0.1';
    cam0HeadPitchSlider.id = 'cam0HeadPitchSlider';
    cam0HeadPitchSlider.style.width = '200px';

    const cam0HeadPitchValue = document.createElement('span');
    cam0HeadPitchValue.id = 'cam0HeadPitchValue';
    cam0HeadPitchValue.textContent = '0°';
    cam0HeadPitchValue.style.marginLeft = '10px';

    cam0HeadPitchContainer.appendChild(cam0HeadPitchLabel);
    cam0HeadPitchContainer.appendChild(cam0HeadPitchSlider);
    cam0HeadPitchContainer.appendChild(cam0HeadPitchValue);

    // Yaw слайдер для scaner_base
    const scanerBaseYawContainer = document.createElement('div');
    scanerBaseYawContainer.style.marginBottom = '15px';

    const scanerBaseYawLabel = document.createElement('label');
    scanerBaseYawLabel.textContent = 'Scaner_base Yaw (-180° - 180°): ';
    scanerBaseYawLabel.style.display = 'block';
    scanerBaseYawLabel.style.marginBottom = '5px';

    const scanerBaseYawSlider = document.createElement('input');
    scanerBaseYawSlider.type = 'range';
    scanerBaseYawSlider.min = '-180';
    scanerBaseYawSlider.max = '180';
    scanerBaseYawSlider.value = '90';
    scanerBaseYawSlider.step = '0.1';
    scanerBaseYawSlider.id = 'scanerBaseYawSlider';
    scanerBaseYawSlider.style.width = '200px';

    const scanerBaseYawValue = document.createElement('span');
    scanerBaseYawValue.id = 'scanerBaseYawValue';
    scanerBaseYawValue.textContent = '90°';
    scanerBaseYawValue.style.marginLeft = '10px';

    scanerBaseYawContainer.appendChild(scanerBaseYawLabel);
    scanerBaseYawContainer.appendChild(scanerBaseYawSlider);
    scanerBaseYawContainer.appendChild(scanerBaseYawValue);

    // Pitch слайдер для scaner_link0
    const scanerLink0PitchContainer = document.createElement('div');
    scanerLink0PitchContainer.style.marginBottom = '15px';

    const scanerLink0PitchLabel = document.createElement('label');
    scanerLink0PitchLabel.textContent = 'Scaner_link0 Pitch (-90° - 90°): ';
    scanerLink0PitchLabel.style.display = 'block';
    scanerLink0PitchLabel.style.marginBottom = '5px';

    const scanerLink0PitchSlider = document.createElement('input');
    scanerLink0PitchSlider.type = 'range';
    scanerLink0PitchSlider.min = '-90';
    scanerLink0PitchSlider.max = '90';
    scanerLink0PitchSlider.value = '0';
    scanerLink0PitchSlider.step = '0.1';
    scanerLink0PitchSlider.id = 'scanerLink0PitchSlider';
    scanerLink0PitchSlider.style.width = '200px';

    const scanerLink0PitchValue = document.createElement('span');
    scanerLink0PitchValue.id = 'scanerLink0PitchValue';
    scanerLink0PitchValue.textContent = '0°';
    scanerLink0PitchValue.style.marginLeft = '10px';

    scanerLink0PitchContainer.appendChild(scanerLink0PitchLabel);
    scanerLink0PitchContainer.appendChild(scanerLink0PitchSlider);
    scanerLink0PitchContainer.appendChild(scanerLink0PitchValue);

    // Pitch слайдер для scaner_link1
    const scanerLink1PitchContainer = document.createElement('div');
    scanerLink1PitchContainer.style.marginBottom = '15px';

    const scanerLink1PitchLabel = document.createElement('label');
    scanerLink1PitchLabel.textContent = 'Scaner_link1 Pitch (-180° - 180°): ';
    scanerLink1PitchLabel.style.display = 'block';
    scanerLink1PitchLabel.style.marginBottom = '5px';

    const scanerLink1PitchSlider = document.createElement('input');
    scanerLink1PitchSlider.type = 'range';
    scanerLink1PitchSlider.min = '-180';
    scanerLink1PitchSlider.max = '180';
    scanerLink1PitchSlider.value = '0';
    scanerLink1PitchSlider.step = '0.1';
    scanerLink1PitchSlider.id = 'scanerLink1PitchSlider';
    scanerLink1PitchSlider.style.width = '200px';

    const scanerLink1PitchValue = document.createElement('span');
    scanerLink1PitchValue.id = 'scanerLink1PitchValue';
    scanerLink1PitchValue.textContent = '0°';
    scanerLink1PitchValue.style.marginLeft = '10px';

    scanerLink1PitchContainer.appendChild(scanerLink1PitchLabel);
    scanerLink1PitchContainer.appendChild(scanerLink1PitchSlider);
    scanerLink1PitchContainer.appendChild(scanerLink1PitchValue);

    // Pitch слайдер для scaner_joint
    const scanerJointPitchContainer = document.createElement('div');
    scanerJointPitchContainer.style.marginBottom = '15px';

    const scanerJointPitchLabel = document.createElement('label');
    scanerJointPitchLabel.textContent = 'Scaner_joint Pitch (-180° - 180°): ';
    scanerJointPitchLabel.style.display = 'block';
    scanerJointPitchLabel.style.marginBottom = '5px';

    const scanerJointPitchSlider = document.createElement('input');
    scanerJointPitchSlider.type = 'range';
    scanerJointPitchSlider.min = '-180';
    scanerJointPitchSlider.max = '180';
    scanerJointPitchSlider.value = '90';
    scanerJointPitchSlider.step = '0.1';
    scanerJointPitchSlider.id = 'scanerJointPitchSlider';
    scanerJointPitchSlider.style.width = '200px';

    const scanerJointPitchValue = document.createElement('span');
    scanerJointPitchValue.id = 'scanerJointPitchValue';
    scanerJointPitchValue.textContent = '90°';
    scanerJointPitchValue.style.marginLeft = '10px';

    scanerJointPitchContainer.appendChild(scanerJointPitchLabel);
    scanerJointPitchContainer.appendChild(scanerJointPitchSlider);
    scanerJointPitchContainer.appendChild(scanerJointPitchValue);

    // Yaw слайдер для scaner_head
    const scanerHeadYawContainer = document.createElement('div');
    scanerHeadYawContainer.style.marginBottom = '15px';

    const scanerHeadYawLabel = document.createElement('label');
    scanerHeadYawLabel.textContent = 'Scaner_head Yaw (-180° - 180°): ';
    scanerHeadYawLabel.style.display = 'block';
    scanerHeadYawLabel.style.marginBottom = '5px';

    const scanerHeadYawSlider = document.createElement('input');
    scanerHeadYawSlider.type = 'range';
    scanerHeadYawSlider.min = '-180';
    scanerHeadYawSlider.max = '180';
    scanerHeadYawSlider.value = '0';
    scanerHeadYawSlider.step = '0.1';
    scanerHeadYawSlider.id = 'scanerHeadYawSlider';
    scanerHeadYawSlider.style.width = '200px';

    const scanerHeadYawValue = document.createElement('span');
    scanerHeadYawValue.id = 'scanerHeadYawValue';
    scanerHeadYawValue.textContent = '0°';
    scanerHeadYawValue.style.marginLeft = '10px';

    scanerHeadYawContainer.appendChild(scanerHeadYawLabel);
    scanerHeadYawContainer.appendChild(scanerHeadYawSlider);
    scanerHeadYawContainer.appendChild(scanerHeadYawValue);

    controlsContainer.appendChild(rollContainer);
    controlsContainer.appendChild(pitchContainer);
    controlsContainer.appendChild(wheelSteerContainer);
    controlsContainer.appendChild(rollBackContainer);
    controlsContainer.appendChild(rollRightContainer);
    controlsContainer.appendChild(pitchRightContainer);
    controlsContainer.appendChild(rollRightBackContainer);
    controlsContainer.appendChild(cam0PitchContainer);
    controlsContainer.appendChild(cam0JointYawContainer);
    controlsContainer.appendChild(cam0HeadPitchContainer);
    controlsContainer.appendChild(scanerBaseYawContainer);
    controlsContainer.appendChild(scanerLink0PitchContainer);
    controlsContainer.appendChild(scanerLink1PitchContainer);
    controlsContainer.appendChild(scanerJointPitchContainer);
    controlsContainer.appendChild(scanerHeadYawContainer);

    document.body.appendChild(controlsContainer);

    return {
        rollSlider,
        pitchSlider,
        wheelSteerSlider,
        rollBackSlider,
        rollRightSlider,
        pitchRightSlider,
        rollRightBackSlider,
        cam0PitchSlider,
        cam0JointYawSlider,
        cam0HeadPitchSlider,
        scanerBaseYawSlider,
        scanerLink0PitchSlider,
        scanerLink1PitchSlider,
        scanerJointPitchSlider,
        scanerHeadYawSlider,
        rollValue,
        pitchValue,
        wheelSteerValue,
        rollBackValue,
        rollRightValue,
        pitchRightValue,
        rollRightBackValue,
        cam0PitchValue,
        cam0JointYawValue,
        cam0HeadPitchValue,
        scanerBaseYawValue,
        scanerLink0PitchValue,
        scanerLink1PitchValue,
        scanerJointPitchValue,
        scanerHeadYawValue
    };
}

let renderer = new Renderer("frame", {
    msaa: 8,
    controls: [new control.SimpleNavigation({ speed: 0.01 }), new control.GeoObjectEditor()],
    autoActivate: true
});

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    async init() {

        let collection = new EntityCollection({
            entities: []
        });

        collection.addTo(this);

        this.renderer.activeCamera.set(new Vec3(10, 11, 13), new Vec3(0, 2, 2));

        let base = new Entity();
        window.base = base;

        Gltf.loadGlb("./rover_base.glb").then((gltf) => {
            const entities = gltf.toEntities();
            for (let i = 0; i < entities.length; i++) {
                base.appendChild(entities[i]);
            }
        });

        //
        let cam0_base = new Entity({
            cartesian: [0.751, 0.349, 0.521],
            relativePosition: true,
            yaw: 145 * Math.PI / 180
        });
        window.cam0_base = cam0_base;

        Gltf.loadGlb("./cam0_base.glb").then((gltf) => {
            const entities = gltf.toEntities();
            cam0_base.appendChildren(entities, true);
        });
        base.appendChild(cam0_base);
        //

        //
        let cam0_joint = new Entity({
            cartesian: [0, 0.515, 0],
            relativePosition: true,
        });
        window.cam0_joint = cam0_joint;

        Gltf.loadGlb("./cam0_joint.glb").then((gltf) => {
            const entities = gltf.toEntities();
            cam0_joint.appendChildren(entities, true);
        });
        cam0_base.appendChild(cam0_joint);
        //

        //
        let cam0_head = new Entity({
            cartesian: [-0.035, 0.16, 0],
            relativePosition: true,
        });
        window.cam0_head = cam0_head;

        Gltf.loadGlb("./cam0_head.glb").then((gltf) => {
            const entities = gltf.toEntities();
            cam0_head.appendChildren(entities, true);
        });
        cam0_joint.appendChild(cam0_head);
        //

        //
        let scaner_base = new Entity({
            cartesian: [1.213, 0.022, -0.485],
            yaw: 90 * Math.PI / 180,
            relativePosition: true,
        });
        window.scaner_base = scaner_base;

        Gltf.loadGlb("./scaner_base.glb").then((gltf) => {
            const entities = gltf.toEntities();
            scaner_base.appendChildren(entities, true);
        });
        base.appendChild(scaner_base);
        //

        //
        let scaner_link0 = new Entity({
            cartesian: [0.17, -0.09, -0.18],
            relativePosition: true,
        });
        window.scaner_link0 = scaner_link0;

        Gltf.loadGlb("./scaner_link0.glb").then((gltf) => {
            const entities = gltf.toEntities();
            scaner_link0.appendChildren(entities, true);
        });
        scaner_base.appendChild(scaner_link0);
        //

        //
        let scaner_link1 = new Entity({
            cartesian: [0, 0.0, -0.838],
            relativePosition: true,
            pitch: 90 * Math.PI / 180
        });
        window.scaner_link1 = scaner_link1;

        Gltf.loadGlb("./scaner_link1.glb").then((gltf) => {
            const entities = gltf.toEntities();
            scaner_link1.appendChildren(entities, true);
        });
        scaner_link0.appendChild(scaner_link1);
        //

        //
        let scaner_joint = new Entity({
            cartesian: [-0.035, -0.005, -0.755],
            relativePosition: true,
            pitch: 90 * Math.PI / 180
        });
        window.scaner_joint = scaner_joint;

        Gltf.loadGlb("./scaner_joint.glb").then((gltf) => {
            const entities = gltf.toEntities();
            scaner_joint.appendChildren(entities, true);
        });
        scaner_link1.appendChild(scaner_joint);
        //

        //
        let scaner_head = new Entity({
            cartesian: [0.042, -.15, -0.175],
            relativePosition: true,
            pitch: 180 * Math.PI / 180
        });
        window.scaner_head = scaner_head;

        Gltf.loadGlb("./scaner_head.glb").then((gltf) => {
            const entities = gltf.toEntities();
            scaner_head.appendChildren(entities, true);
        });
        scaner_joint.appendChild(scaner_head);
        //

        let suspLeftFront = new Entity({
            cartesian: new Vec3(0.26, -0.0, -0.78),
            pitch: 13 * Math.PI / 180,
            relativePosition: true,
        });

        window.suspLeftFront = suspLeftFront;

        Gltf.loadGlb("./susp_left_front.glb").then((gltf) => {
            const entities = gltf.toEntities();
            for (let i = 0; i < entities.length; i++) {
                entities[i].relativePosition = true;
                suspLeftFront.appendChild(entities[i]);
            }
        });


        //
        let suspRightFront = new Entity({
            cartesian: new Vec3(0.253, 0.01, 0.711),
            pitch: -13 * Math.PI / 180,
            relativePosition: true,
        });

        window.suspRightFront = suspRightFront;

        Gltf.loadGlb("./susp_right_front.glb").then((gltf) => {
            const entities = gltf.toEntities();
            for (let i = 0; i < entities.length; i++) {
                entities[i].relativePosition = true;
                suspRightFront.appendChild(entities[i]);
            }
        });
        //

        let amortLeftFront = new Entity({
            cartesian: new Vec3(0.876, -0.3, -0.26),
            relativePosition: true,
            pitch: -103 * Math.PI / 180,
        });

        window.amortLeftFront = amortLeftFront;

        Gltf.loadGlb("./amort_left_front.glb").then((gltf) => {
            const entities = gltf.toEntities();
            amortLeftFront.appendChildren(entities, true);
        });

        suspLeftFront.appendChild(amortLeftFront);

        //
        let amortRightFront = new Entity({
            cartesian: new Vec3(0.876, -0.3, 0.26),
            relativePosition: true,
            pitch: -77 * Math.PI / 180,
        });

        window.amortRightFront = amortRightFront;

        Gltf.loadGlb("./amort_right_front.glb").then((gltf) => {
            const entities = gltf.toEntities();
            amortRightFront.appendChildren(entities, true);
        });

        suspRightFront.appendChild(amortRightFront);
        //


        let suspLeftBack = new Entity({
            cartesian: new Vec3(-0.757, -0.222, -0.008),
            relativePosition: true,
            pitch: -13 * Math.PI / 180
        });

        window.suspLeftBack = suspLeftBack;

        Gltf.loadGlb("./susp_left_back.glb").then((gltf) => {
            const entities = gltf.toEntities();
            for (let i = 0; i < entities.length; i++) {
                entities[i].relativePosition = true;
                suspLeftBack.appendChild(entities[i]);
            }
        });

        suspLeftFront.appendChild(suspLeftBack);

        //
        let suspRightBack = new Entity({
            cartesian: new Vec3(-0.756, -0.243, 0.008),
            relativePosition: true,
            pitch: 13 * Math.PI / 180
        });

        window.suspRightBack = suspRightBack;

        Gltf.loadGlb("./susp_right_back.glb").then((gltf) => {
            const entities = gltf.toEntities();
            for (let i = 0; i < entities.length; i++) {
                entities[i].relativePosition = true;
                suspRightBack.appendChild(entities[i]);
            }
        });

        suspRightFront.appendChild(suspRightBack);
        //

        let amortLeftBack = new Entity({
            cartesian: new Vec3(-0.625, -0.01, -0.263),
            relativePosition: true,
        });

        window.amortLeftBack = amortLeftBack;

        Gltf.loadGlb("./amort_left_back.glb").then((gltf) => {
            const entities = gltf.toEntities()[0];
            entities.relativePosition = true;
            amortLeftBack.appendChild(entities)
        });

        suspLeftBack.appendChild(amortLeftBack);

        //
        let amortRightBack = new Entity({
            cartesian: new Vec3(-0.622, -0.0, 0.263),
            relativePosition: true,
        });

        window.amortRightBack = amortRightBack;

        Gltf.loadGlb("./amort_right_back.glb").then((gltf) => {
            const entities = gltf.toEntities()[0];
            entities.relativePosition = true;
            amortRightBack.appendChild(entities)
        });

        suspRightBack.appendChild(amortRightBack);
        //

        suspLeftFront.appendChild(amortLeftFront);

        base.appendChild(suspLeftFront);
        base.appendChild(suspRightFront);


        let wheelFrontLeft = new Entity({
            cartesian: new Vec3(0, -0.05, -0.395),
            relativePosition: true,
            pitch: 90 * Math.PI / 180
        });

        let wheelBackLeft = new Entity({
            cartesian: new Vec3(0, -0.392, 0.065),
            relativePosition: true,
        });

        let wheelMiddleLeft = new Entity({
            cartesian: new Vec3(0.45, -0.4, -0.3),
            relativePosition: true,
        });

        Gltf.loadGlb("./wheel_left.glb").then((gltf) => {
            const entities = gltf.toEntities()[0];
            entities.relativePosition = true;
            wheelFrontLeft.appendChild(entities);
        });

        Gltf.loadGlb("./wheel_left.glb").then((gltf) => {
            const entities = gltf.toEntities()[0];
            entities.relativePosition = true;
            wheelBackLeft.appendChild(entities);
        });

        Gltf.loadGlb("./wheel_left.glb").then((gltf) => {
            const entities = gltf.toEntities()[0];
            entities.relativePosition = true;
            wheelMiddleLeft.appendChild(entities);
        });

        amortLeftFront.appendChild(wheelFrontLeft);
        amortLeftBack.appendChild(wheelBackLeft);
        suspLeftBack.appendChild(wheelMiddleLeft);

        //
        let wheelFrontRight = new Entity({
            cartesian: new Vec3(0.003, 0.065, -0.391),
            relativePosition: true,
            pitch: -90 * Math.PI / 180,
            yaw: 180 * Math.PI / 180
        });

        let wheelBackRight = new Entity({
            cartesian: new Vec3(0, -0.392, -0.065),
            relativePosition: true,
            yaw: 180 * Math.PI / 180
        });

        let wheelMiddleRight = new Entity({
            cartesian: new Vec3(.45, -0.4, 0.319),
            relativePosition: true,
            yaw: 180 * Math.PI / 180
        });

        Gltf.loadGlb("./wheel_left.glb").then((gltf) => {
            const entities = gltf.toEntities()[0];
            entities.relativePosition = true;
            wheelFrontRight.appendChild(entities);
        });

        Gltf.loadGlb("./wheel_left.glb").then((gltf) => {
            const entities = gltf.toEntities()[0];
            entities.relativePosition = true;
            wheelBackRight.appendChild(entities);
        });

        Gltf.loadGlb("./wheel_left.glb").then((gltf) => {
            const entities = gltf.toEntities()[0];
            entities.relativePosition = true;
            wheelMiddleRight.appendChild(entities);
        });

        amortRightFront.appendChild(wheelFrontRight);
        amortRightBack.appendChild(wheelBackRight);
        suspRightBack.appendChild(wheelMiddleRight);

        window.wheelFrontRight = wheelFrontRight;
        window.wheelBackRight = wheelBackRight;
        window.wheelMiddleRight = wheelMiddleRight;
        //

        let wheelRoll = 0;
        this.renderer.events.on("draw", () => {
            wheelFrontLeft.setRoll(wheelRoll * Math.PI / 180);
            wheelBackLeft.setRoll(wheelRoll * Math.PI / 180);
            wheelMiddleLeft.setRoll(wheelRoll * Math.PI / 180);

            wheelFrontRight.setRoll(-wheelRoll * Math.PI / 180);
            wheelBackRight.setRoll(-wheelRoll * Math.PI / 180);
            wheelMiddleRight.setRoll(-wheelRoll * Math.PI / 180);

            wheelRoll -= 0.3;
        });

        collection.add(base);

        // Создаем слайдеры после загрузки модели
        const sliders = createSliderControls();

        // Настройка обработчиков событий для слайдеров
        sliders.rollSlider.addEventListener('input', (e) => {
            const rollDegrees = parseFloat(e.target.value);
            const rollRadians = rollDegrees * (Math.PI / 180);
            suspLeftFront.setRoll(rollRadians);
            sliders.rollValue.textContent = rollDegrees.toFixed(1) + '°';
        });

        sliders.pitchSlider.addEventListener('input', (e) => {
            const pitchDegrees = parseFloat(e.target.value);
            const pitchRadians = pitchDegrees * (Math.PI / 180);
            suspLeftFront.setPitch(pitchRadians);
            sliders.pitchValue.textContent = pitchDegrees.toFixed(1) + '°';
        });

        sliders.wheelSteerSlider.addEventListener('input', (e) => {
            const wheelSteerDegrees = parseFloat(e.target.value);
            const wheelSteerRadians = wheelSteerDegrees * (Math.PI / 180);
            // Передние амортизаторы используют setRoll
            amortLeftFront.setRoll(wheelSteerRadians);
            amortRightFront.setRoll(wheelSteerRadians);
            // Задние амортизаторы используют setYaw
            amortLeftBack.setYaw(wheelSteerRadians);
            amortRightBack.setYaw(wheelSteerRadians);
            sliders.wheelSteerValue.textContent = wheelSteerDegrees.toFixed(1) + '°';
        });

        sliders.rollBackSlider.addEventListener('input', (e) => {
            const rollBackDegrees = parseFloat(e.target.value);
            const rollBackRadians = rollBackDegrees * (Math.PI / 180);
            suspLeftBack.setRoll(rollBackRadians);
            sliders.rollBackValue.textContent = rollBackDegrees.toFixed(1) + '°';
        });

        sliders.rollRightSlider.addEventListener('input', (e) => {
            const rollRightDegrees = parseFloat(e.target.value);
            const rollRightRadians = rollRightDegrees * (Math.PI / 180);
            suspRightFront.setRoll(rollRightRadians);
            sliders.rollRightValue.textContent = rollRightDegrees.toFixed(1) + '°';
        });

        sliders.pitchRightSlider.addEventListener('input', (e) => {
            const pitchRightDegrees = parseFloat(e.target.value);
            const pitchRightRadians = pitchRightDegrees * (Math.PI / 180);
            suspRightFront.setPitch(pitchRightRadians);
            sliders.pitchRightValue.textContent = pitchRightDegrees.toFixed(1) + '°';
        });

        sliders.rollRightBackSlider.addEventListener('input', (e) => {
            const rollRightBackDegrees = parseFloat(e.target.value);
            const rollRightBackRadians = rollRightBackDegrees * (Math.PI / 180);
            suspRightBack.setRoll(rollRightBackRadians);
            sliders.rollRightBackValue.textContent = rollRightBackDegrees.toFixed(1) + '°';
        });

        sliders.cam0PitchSlider.addEventListener('input', (e) => {
            const cam0PitchDegrees = parseFloat(e.target.value);
            const cam0PitchRadians = cam0PitchDegrees * (Math.PI / 180);
            cam0_base.setPitch(cam0PitchRadians);
            sliders.cam0PitchValue.textContent = cam0PitchDegrees.toFixed(1) + '°';
        });

        sliders.cam0JointYawSlider.addEventListener('input', (e) => {
            const cam0JointYawDegrees = parseFloat(e.target.value);
            const cam0JointYawRadians = cam0JointYawDegrees * (Math.PI / 180);
            cam0_joint.setYaw(cam0JointYawRadians);
            sliders.cam0JointYawValue.textContent = cam0JointYawDegrees.toFixed(1) + '°';
        });

        sliders.cam0HeadPitchSlider.addEventListener('input', (e) => {
            const cam0HeadPitchDegrees = parseFloat(e.target.value);
            const cam0HeadPitchRadians = cam0HeadPitchDegrees * (Math.PI / 180);
            cam0_head.setPitch(cam0HeadPitchRadians);
            sliders.cam0HeadPitchValue.textContent = cam0HeadPitchDegrees.toFixed(1) + '°';
        });

        sliders.scanerBaseYawSlider.addEventListener('input', (e) => {
            const scanerBaseYawDegrees = parseFloat(e.target.value);
            const scanerBaseYawRadians = scanerBaseYawDegrees * (Math.PI / 180);
            scaner_base.setYaw(scanerBaseYawRadians);
            sliders.scanerBaseYawValue.textContent = scanerBaseYawDegrees.toFixed(1) + '°';
        });

        sliders.scanerLink0PitchSlider.addEventListener('input', (e) => {
            const scanerLink0PitchDegrees = parseFloat(e.target.value);
            const scanerLink0PitchRadians = scanerLink0PitchDegrees * (Math.PI / 180);
            scaner_link0.setPitch(scanerLink0PitchRadians);
            sliders.scanerLink0PitchValue.textContent = scanerLink0PitchDegrees.toFixed(1) + '°';
        });

        sliders.scanerLink1PitchSlider.addEventListener('input', (e) => {
            const scanerLink1PitchDegrees = parseFloat(e.target.value);
            const scanerLink1PitchRadians = scanerLink1PitchDegrees * (Math.PI / 180);
            scaner_link1.setPitch(scanerLink1PitchRadians);
            sliders.scanerLink1PitchValue.textContent = scanerLink1PitchDegrees.toFixed(1) + '°';
        });

        sliders.scanerJointPitchSlider.addEventListener('input', (e) => {
            const scanerJointPitchDegrees = parseFloat(e.target.value);
            const scanerJointPitchRadians = scanerJointPitchDegrees * (Math.PI / 180);
            scaner_joint.setPitch(scanerJointPitchRadians);
            sliders.scanerJointPitchValue.textContent = scanerJointPitchDegrees.toFixed(1) + '°';
        });

        sliders.scanerHeadYawSlider.addEventListener('input', (e) => {
            const scanerHeadYawDegrees = parseFloat(e.target.value);
            const scanerHeadYawRadians = scanerHeadYawDegrees * (Math.PI / 180);
            scaner_head.setYaw(scanerHeadYawRadians);
            sliders.scanerHeadYawValue.textContent = scanerHeadYawDegrees.toFixed(1) + '°';
        });
    }
}

renderer.addNodes([new scene.Axes(), new MyScene()]);
