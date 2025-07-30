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
    // Основной контейнер для двух колонок
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
        position: absolute;
        bottom: 10px;
        left: 0;
        width: 100vw;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        pointer-events: none;
        z-index: 1000;
    `;

    // Левая колонка (Suspension, Wheel Steering)
    const leftColumn = document.createElement('div');
    leftColumn.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 30px;
        margin-left: 10px;
        pointer-events: auto;
    `;

    // Правая колонка (Camera, Scaner)
    const rightColumn = document.createElement('div');
    rightColumn.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 30px;
        margin-right: 10px;
        align-items: flex-end;
        pointer-events: auto;
    `;

    // Функция для создания группы слайдеров
    function createSliderGroup(title, sliders) {
        const groupContainer = document.createElement('div');
        groupContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-width: 200px;
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
        `;

        const groupTitle = document.createElement('h3');
        groupTitle.textContent = title;
        groupTitle.style.cssText = `
            margin: 0 0 10px 0;
            font-size: 14px;
            text-align: center;
            color: #ffd700;
        `;
        groupContainer.appendChild(groupTitle);

        sliders.forEach(slider => {
            groupContainer.appendChild(slider);
        });

        return groupContainer;
    }

    // Функция для создания отдельного слайдера
    function createSlider(id, label, min, max, value, step = '0.1') {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;

        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.style.cssText = `
            font-size: 11px;
            color: #ccc;
        `;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.value = value;
        slider.step = step;
        slider.id = id;
        slider.style.cssText = `
            width: 180px;
            height: 20px;
        `;

        const valueElement = document.createElement('span');
        valueElement.id = id + 'Value';
        valueElement.textContent = value + '°';
        valueElement.style.cssText = `
            font-size: 10px;
            color: #aaa;
            text-align: center;
        `;

        container.appendChild(labelElement);
        container.appendChild(slider);
        container.appendChild(valueElement);

        return container;
    }

    // Suspension группа
    const suspensionSliders = [
        createSlider('rollSlider', 'LeftFront Roll', '-90', '90', '0'),
        createSlider('pitchSlider', 'LeftFront Pitch', '-45', '45', '13'),
        createSlider('rollBackSlider', 'LeftBack Roll', '-45', '45', '0'),
        createSlider('rollRightSlider', 'RightFront Roll', '-90', '90', '0'),
        createSlider('pitchRightSlider', 'RightFront Pitch', '-45', '45', '-13'),
        createSlider('rollRightBackSlider', 'RightBack Roll', '-45', '45', '0')
    ];

    // Wheel Steering группа
    const wheelSteeringSliders = [
        createSlider('wheelSteerSlider', 'Wheel Steering', '-90', '90', '0')
    ];

    // Camera группа
    const cameraSliders = [
        createSlider('cam0PitchSlider', 'Cam0_base Pitch', '-90', '90', '0'),
        createSlider('cam0JointYawSlider', 'Cam0_joint Yaw', '-180', '180', '0'),
        createSlider('cam0HeadPitchSlider', 'Cam0_head Pitch', '-90', '90', '0')
    ];

    // Scaner группа
    const scanerSliders = [
        createSlider('scanerBaseYawSlider', 'Scaner_base Yaw', '-180', '180', '90'),
        createSlider('scanerLink0PitchSlider', 'Scaner_link0 Pitch', '-90', '90', '0'),
        createSlider('scanerLink1PitchSlider', 'Scaner_link1 Pitch', '-180', '180', '90'),
        createSlider('scanerJointPitchSlider', 'Scaner_joint Pitch', '-180', '180', '90'),
        createSlider('scanerHeadYawSlider', 'Scaner_head Yaw', '-180', '180', '0')
    ];

    // Создаем группы
    const suspensionGroup = createSliderGroup('Suspension', suspensionSliders);
    const wheelSteeringGroup = createSliderGroup('Wheel Steering', wheelSteeringSliders);
    const cameraGroup = createSliderGroup('Camera', cameraSliders);
    const scanerGroup = createSliderGroup('Scaner', scanerSliders);

    // Добавляем группы в соответствующие колонки
    leftColumn.appendChild(suspensionGroup);
    leftColumn.appendChild(wheelSteeringGroup);
    rightColumn.appendChild(cameraGroup);
    rightColumn.appendChild(scanerGroup);

    // Добавляем колонки в основной контейнер
    controlsContainer.appendChild(leftColumn);
    controlsContainer.appendChild(rightColumn);

    document.body.appendChild(controlsContainer);

    // Возвращаем все слайдеры и значения для обработчиков событий
    return {
        rollSlider: document.getElementById('rollSlider'),
        pitchSlider: document.getElementById('pitchSlider'),
        wheelSteerSlider: document.getElementById('wheelSteerSlider'),
        rollBackSlider: document.getElementById('rollBackSlider'),
        rollRightSlider: document.getElementById('rollRightSlider'),
        pitchRightSlider: document.getElementById('pitchRightSlider'),
        rollRightBackSlider: document.getElementById('rollRightBackSlider'),
        cam0PitchSlider: document.getElementById('cam0PitchSlider'),
        cam0JointYawSlider: document.getElementById('cam0JointYawSlider'),
        cam0HeadPitchSlider: document.getElementById('cam0HeadPitchSlider'),
        scanerBaseYawSlider: document.getElementById('scanerBaseYawSlider'),
        scanerLink0PitchSlider: document.getElementById('scanerLink0PitchSlider'),
        scanerLink1PitchSlider: document.getElementById('scanerLink1PitchSlider'),
        scanerJointPitchSlider: document.getElementById('scanerJointPitchSlider'),
        scanerHeadYawSlider: document.getElementById('scanerHeadYawSlider'),
        rollValue: document.getElementById('rollSliderValue'),
        pitchValue: document.getElementById('pitchSliderValue'),
        wheelSteerValue: document.getElementById('wheelSteerSliderValue'),
        rollBackValue: document.getElementById('rollBackSliderValue'),
        rollRightValue: document.getElementById('rollRightSliderValue'),
        pitchRightValue: document.getElementById('pitchRightSliderValue'),
        rollRightBackValue: document.getElementById('rollRightBackSliderValue'),
        cam0PitchValue: document.getElementById('cam0PitchSliderValue'),
        cam0JointYawValue: document.getElementById('cam0JointYawSliderValue'),
        cam0HeadPitchValue: document.getElementById('cam0HeadPitchSliderValue'),
        scanerBaseYawValue: document.getElementById('scanerBaseYawSliderValue'),
        scanerLink0PitchValue: document.getElementById('scanerLink0PitchSliderValue'),
        scanerLink1PitchValue: document.getElementById('scanerLink1PitchSliderValue'),
        scanerJointPitchValue: document.getElementById('scanerJointPitchSliderValue'),
        scanerHeadYawValue: document.getElementById('scanerHeadYawSliderValue')
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

        // Устанавливаем начальные значения для camera
        cam0_base.setYaw(145 * Math.PI / 180);
        
        // Обновляем отображение значений слайдеров
        sliders.pitchValue.textContent = '13.0°';
        sliders.pitchRightValue.textContent = '-13.0°';
        sliders.scanerBaseYawValue.textContent = '90.0°';
        sliders.scanerLink1PitchValue.textContent = '90.0°';
        sliders.scanerJointPitchValue.textContent = '90.0°';

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

        // Устанавливаем начальные значения для scaner объектов
        scaner_base.setYaw(90 * Math.PI / 180);
        scaner_link1.setPitch(90 * Math.PI / 180);
        scaner_joint.setPitch(90 * Math.PI / 180);
        scaner_head.setPitch(180 * Math.PI / 180);
    }
}

renderer.addNodes([new scene.Axes(), new MyScene()]);
