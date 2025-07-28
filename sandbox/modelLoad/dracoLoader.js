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

    // Yaw слайдер для amortLeftFront
    const yawContainer = document.createElement('div');
    yawContainer.style.marginBottom = '15px';

    const yawLabel = document.createElement('label');
    yawLabel.textContent = 'AmortLeftFront Roll (-180° - 180°): ';
    yawLabel.style.display = 'block';
    yawLabel.style.marginBottom = '5px';

    const yawSlider = document.createElement('input');
    yawSlider.type = 'range';
    yawSlider.min = '-180';
    yawSlider.max = '180';
    yawSlider.value = '0';
    yawSlider.step = '0.1';
    yawSlider.id = 'yawSlider';
    yawSlider.style.width = '200px';

    const yawValue = document.createElement('span');
    yawValue.id = 'yawValue';
    yawValue.textContent = '0°';
    yawValue.style.marginLeft = '10px';

    yawContainer.appendChild(yawLabel);
    yawContainer.appendChild(yawSlider);
    yawContainer.appendChild(yawValue);

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

    // Yaw слайдер для amortLeftBack
    const yawBackContainer = document.createElement('div');
    yawBackContainer.style.marginBottom = '15px';

    const yawBackLabel = document.createElement('label');
    yawBackLabel.textContent = 'AmortLeftBack Yaw (-90° - 90°): ';
    yawBackLabel.style.display = 'block';
    yawBackLabel.style.marginBottom = '5px';

    const yawBackSlider = document.createElement('input');
    yawBackSlider.type = 'range';
    yawBackSlider.min = '-180';
    yawBackSlider.max = '180';
    yawBackSlider.value = '0';
    yawBackSlider.step = '0.1';
    yawBackSlider.id = 'yawBackSlider';
    yawBackSlider.style.width = '200px';

    const yawBackValue = document.createElement('span');
    yawBackValue.id = 'yawBackValue';
    yawBackValue.textContent = '0°';
    yawBackValue.style.marginLeft = '10px';

    yawBackContainer.appendChild(yawBackLabel);
    yawBackContainer.appendChild(yawBackSlider);
    yawBackContainer.appendChild(yawBackValue);

    controlsContainer.appendChild(rollContainer);
    controlsContainer.appendChild(pitchContainer);
    controlsContainer.appendChild(yawContainer);
    controlsContainer.appendChild(rollBackContainer);
    controlsContainer.appendChild(yawBackContainer);

    document.body.appendChild(controlsContainer);

    return {
        rollSlider,
        pitchSlider,
        yawSlider,
        rollBackSlider,
        yawBackSlider,
        rollValue,
        pitchValue,
        yawValue,
        rollBackValue,
        yawBackValue
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

        suspLeftFront.appendChild(amortLeftFront);

        base.appendChild(suspLeftFront);


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

        let wheelRoll = 0;
        this.renderer.events.on("draw", () => {
            wheelFrontLeft.setRoll(wheelRoll * Math.PI / 180);
            wheelBackLeft.setRoll(wheelRoll * Math.PI / 180);
            wheelMiddleLeft.setRoll(wheelRoll * Math.PI / 180);
            wheelRoll -= 0.3;
        })

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

        sliders.yawSlider.addEventListener('input', (e) => {
            const yawDegrees = parseFloat(e.target.value);
            const yawRadians = yawDegrees * (Math.PI / 180);
            //amortLeftFront.childEntities[0].childEntities[0].setYaw(yawRadians);
            amortLeftFront.setRoll(yawRadians);
            sliders.yawValue.textContent = yawDegrees.toFixed(1) + '°';
        });

        sliders.rollBackSlider.addEventListener('input', (e) => {
            const rollBackDegrees = parseFloat(e.target.value);
            const rollBackRadians = rollBackDegrees * (Math.PI / 180);
            suspLeftBack.setRoll(rollBackRadians);
            sliders.rollBackValue.textContent = rollBackDegrees.toFixed(1) + '°';
        });

        sliders.yawBackSlider.addEventListener('input', (e) => {
            const yawBackDegrees = parseFloat(e.target.value);
            const yawBackRadians = yawBackDegrees * (Math.PI / 180);
            amortLeftBack.setYaw(yawBackRadians);
            sliders.yawBackValue.textContent = yawBackDegrees.toFixed(1) + '°';
        });
    }
}

renderer.addNodes([new scene.Axes(), new MyScene()]);
