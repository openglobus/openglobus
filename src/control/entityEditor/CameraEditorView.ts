import type { Camera } from "../../camera/Camera";
import type { DepthCamera } from "../depthCamera/DepthCamera";
import { Entity } from "../../entity/Entity";
import { Object3d } from "../../Object3d";
import { Checkbox } from "../../ui/Checkbox";
import { Input } from "../../ui/Input";
import { TitleBarView } from "../../ui/TitleBarView";
import { View, type IViewParams } from "../../ui/View";

interface ICameraEditorViewParams extends IViewParams {
    entity: Entity;
}

const TEMPLATE = `<div class="og-editor-panel"></div>`;

function getNumber(value: string): number | null {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function hasEntityEditorDepthCamera(entity: Entity): boolean {
    return !!entity.properties.depthCamera;
}

export class CameraEditorView extends View<Entity> {
    protected _nearView: Input;
    protected _farView: Input;
    protected _verticalFovView: Input;
    protected _horizontalFovView: Input;
    protected _viewportWidthView: Input;
    protected _viewportHeightView: Input;
    protected _orthographicView: Checkbox;
    protected _focusDistanceView: Input;
    protected _showFrustumView: Checkbox;
    protected _showFootprintView: Checkbox;
    protected _biasView: Input;
    protected _normalBiasView: Input;
    protected _depthEpsilonView: Input;

    protected _titleBarView: TitleBarView;
    protected _bodyEl: HTMLElement | null;
    protected _depthCamera: DepthCamera | null;

    constructor(params: ICameraEditorViewParams) {
        super({
            template: TEMPLATE,
            model: params.entity
        });

        this._nearView = new Input({
            label: "Near",
            type: "number",
            min: 0,
            maxFixed: 4
        });

        this._farView = new Input({
            label: "Far",
            type: "number",
            min: 0,
            maxFixed: 4
        });

        this._verticalFovView = new Input({
            label: "Vertical FOV",
            type: "number",
            min: 0.1,
            max: 179.9,
            maxFixed: 4
        });

        this._horizontalFovView = new Input({
            label: "Horizontal FOV",
            type: "number",
            min: 0.1,
            max: 179.9,
            maxFixed: 4
        });

        this._viewportWidthView = new Input({
            label: "Viewport width",
            type: "number",
            min: 1,
            step: 1,
            maxFixed: 0
        });

        this._viewportHeightView = new Input({
            label: "Viewport height",
            type: "number",
            min: 1,
            step: 1,
            maxFixed: 0
        });

        this._orthographicView = new Checkbox({
            label: "Orthographic"
        });

        this._focusDistanceView = new Input({
            label: "Focus distance",
            type: "number",
            min: 0.000001,
            step: 1,
            maxFixed: 4
        });

        this._showFrustumView = new Checkbox({
            label: "Show frustum"
        });

        this._showFootprintView = new Checkbox({
            label: "Show footprint"
        });

        this._biasView = new Input({
            label: "Depth bias",
            type: "number",
            min: 0,
            step: 0.00001,
            maxFixed: 8
        });

        this._normalBiasView = new Input({
            label: "Normal bias",
            type: "number",
            min: 0,
            step: 0.01,
            maxFixed: 4
        });

        this._depthEpsilonView = new Input({
            label: "Depth epsilon",
            type: "number",
            min: 0,
            step: 0.00001,
            maxFixed: 8
        });

        this._titleBarView = new TitleBarView({
            title: "Camera"
        });
        this._bodyEl = null;
        this._depthCamera = null;

        this.bindEntity(params.entity);
    }

    public bindEntity(entity: Entity): void {
        this.model = entity;
        this._depthCamera = entity.properties.depthCamera;
    }

    public override render(params?: unknown): this {
        super.render(params);

        this._titleBarView.appendTo(this.el!);
        this._titleBarView.events.on("change", this._onTitleBarChange);

        this._bodyEl = document.createElement("div");
        this._bodyEl.classList.add("og-editor-panel__body");
        this.el!.appendChild(this._bodyEl);

        this._nearView.appendTo(this._bodyEl);
        this._farView.appendTo(this._bodyEl);
        this._verticalFovView.appendTo(this._bodyEl);
        this._horizontalFovView.appendTo(this._bodyEl);
        this._viewportWidthView.appendTo(this._bodyEl);
        this._viewportHeightView.appendTo(this._bodyEl);
        this._orthographicView.appendTo(this._bodyEl);
        this._focusDistanceView.appendTo(this._bodyEl);
        this._showFrustumView.appendTo(this._bodyEl);
        this._showFootprintView.appendTo(this._bodyEl);
        this._biasView.appendTo(this._bodyEl);
        this._normalBiasView.appendTo(this._bodyEl);
        this._depthEpsilonView.appendTo(this._bodyEl);

        this._nearView.events.on("change", this._onChangeNear);
        this._farView.events.on("change", this._onChangeFar);
        this._verticalFovView.events.on("change", this._onChangeVerticalFov);
        this._horizontalFovView.events.on("change", this._onChangeHorizontalFov);
        this._viewportWidthView.events.on("change", this._onChangeViewportWidth);
        this._viewportHeightView.events.on("change", this._onChangeViewportHeight);
        this._orthographicView.events.on("change", this._onChangeOrthographic);
        this._focusDistanceView.events.on("change", this._onChangeFocusDistance);
        this._showFrustumView.events.on("change", this._onChangeShowFrustum);
        this._showFootprintView.events.on("change", this._onChangeShowFootprint);
        this._biasView.events.on("change", this._onChangeBias);
        this._normalBiasView.events.on("change", this._onChangeNormalBias);
        this._depthEpsilonView.events.on("change", this._onChangeDepthEpsilon);

        this.refresh();

        return this;
    }

    public refresh(): void {
        const camera = this._getCamera();
        if (!camera) return;

        const frustum = camera.frustums[0];
        if (frustum) {
            this._nearView.stopPropagation();
            this._nearView.value = frustum.near;
            this._farView.stopPropagation();
            this._farView.value = frustum.far;
        }

        this._verticalFovView.stopPropagation();
        this._verticalFovView.value = camera.verticalViewAngle;
        this._horizontalFovView.stopPropagation();
        this._horizontalFovView.value = camera.horizontalViewAngle;
        this._viewportWidthView.stopPropagation();
        this._viewportWidthView.value = camera.width;
        this._viewportHeightView.stopPropagation();
        this._viewportHeightView.value = camera.height;

        const depthCamera = this._depthCamera;
        this._showFrustumView.visibility = !!depthCamera;
        this._showFootprintView.visibility = !!depthCamera;
        this._orthographicView.visibility = !!depthCamera;
        this._focusDistanceView.visibility = !!depthCamera && depthCamera.isOrthographic;
        this._biasView.visibility = !!depthCamera;
        this._normalBiasView.visibility = !!depthCamera;
        this._depthEpsilonView.visibility = !!depthCamera;

        if (depthCamera) {
            if (this._orthographicView.checked !== depthCamera.isOrthographic) {
                this._orthographicView.stopPropagation();
                this._orthographicView.checked = depthCamera.isOrthographic;
            }
            this._focusDistanceView.stopPropagation();
            this._focusDistanceView.value = depthCamera.focusDistance;
            if (this._showFrustumView.checked !== depthCamera.showFrustum) {
                this._showFrustumView.stopPropagation();
                this._showFrustumView.checked = depthCamera.showFrustum;
            }
            if (this._showFootprintView.checked !== depthCamera.showFootprint) {
                this._showFootprintView.stopPropagation();
                this._showFootprintView.checked = depthCamera.showFootprint;
            }
            this._biasView.stopPropagation();
            this._biasView.value = depthCamera.bias;
            this._normalBiasView.stopPropagation();
            this._normalBiasView.value = depthCamera.normalBias;
            this._depthEpsilonView.stopPropagation();
            this._depthEpsilonView.value = depthCamera.depthEpsilon;
        }
    }

    protected _getCamera(): Camera | null {
        return this._depthCamera?.camera || null;
    }

    public override remove(): void {
        this._nearView.remove();
        this._farView.remove();
        this._verticalFovView.remove();
        this._horizontalFovView.remove();
        this._viewportWidthView.remove();
        this._viewportHeightView.remove();
        this._orthographicView.remove();
        this._focusDistanceView.remove();
        this._showFrustumView.remove();
        this._showFootprintView.remove();
        this._biasView.remove();
        this._normalBiasView.remove();
        this._depthEpsilonView.remove();
        this._titleBarView.events.off("change", this._onTitleBarChange);
        this._titleBarView.remove();
        this._bodyEl = null;
        super.remove();
    }

    protected _onTitleBarChange = (isCollapsed: boolean): void => {
        this._bodyEl?.classList.toggle("og-editor-panel__body_collapsed", isCollapsed);
    };

    protected _setNearFar(near: number, far: number): void {
        const camera = this._getCamera();
        if (!camera || near <= 0 || far <= near) return;

        camera.setNearFar(near, far);
        camera.update();
        this.refresh();
    }

    protected _syncFrustumEntityScale(): void {
        const camera = this._getCamera();
        if (!camera) return;

        const tag = this.model.geoObject?.tag?.toLowerCase() || "";
        if (!tag.includes("frustum")) return;

        if (this._depthCamera) {
            this.model.setScale3v(this._depthCamera.frustumScale);
        } else {
            const length = this.model.getScale().z || 1.0;
            this.model.setScale3v(
                Object3d.getFrustumScaleByCameraAngles(length, camera.horizontalViewAngle, camera.verticalViewAngle)
            );
        }
    }

    protected _onChangeNear = (value: string): void => {
        const near = getNumber(value);
        const far = this._getCamera()?.frustums[0]?.far;
        if (near !== null && far != null) {
            this._setNearFar(near, far);
        }
    };

    protected _onChangeFar = (value: string): void => {
        const far = getNumber(value);
        const near = this._getCamera()?.frustums[0]?.near;
        if (far !== null && near != null) {
            this._setNearFar(near, far);
        }
    };

    protected _onChangeVerticalFov = (value: string): void => {
        const angle = getNumber(value);
        const camera = this._getCamera();
        if (!camera || angle === null || angle <= 0 || angle >= 180) return;

        camera.setViewAngle(angle);
        camera.update();
        this._syncFrustumEntityScale();
        this.refresh();
    };

    protected _onChangeHorizontalFov = (value: string): void => {
        const angle = getNumber(value);
        const camera = this._getCamera();
        if (!camera || angle === null || angle <= 0 || angle >= 180) return;

        camera.setHorizontalViewAngle(angle);
        camera.update();
        this._syncFrustumEntityScale();
        this.refresh();
    };

    protected _setViewportSize(width: number, height: number): void {
        const camera = this._getCamera();
        if (!camera || width < 1 || height < 1) return;

        camera.setViewportSize(width, height);
        this._syncFrustumEntityScale();
        this.refresh();
    }

    protected _onChangeViewportWidth = (value: string): void => {
        const width = getNumber(value);
        const camera = this._getCamera();
        if (width !== null && camera) {
            this._setViewportSize(width, camera.height);
        }
    };

    protected _onChangeViewportHeight = (value: string): void => {
        const height = getNumber(value);
        const camera = this._getCamera();
        if (height !== null && camera) {
            this._setViewportSize(camera.width, height);
        }
    };

    protected _onChangeOrthographic = (isOrthographic: boolean): void => {
        if (this._depthCamera) {
            this._depthCamera.isOrthographic = isOrthographic;
            this._syncFrustumEntityScale();
            this.refresh();
        }
    };

    protected _onChangeFocusDistance = (value: string): void => {
        const focusDistance = getNumber(value);
        if (this._depthCamera && focusDistance !== null) {
            this._depthCamera.focusDistance = focusDistance;
            this._syncFrustumEntityScale();
            this.refresh();
        }
    };

    protected _onChangeShowFrustum = (showFrustum: boolean): void => {
        if (this._depthCamera) {
            this._depthCamera.showFrustum = showFrustum;
        }
    };

    protected _onChangeShowFootprint = (showFootprint: boolean): void => {
        if (this._depthCamera) {
            this._depthCamera.showFootprint = showFootprint;
        }
    };

    protected _onChangeBias = (value: string): void => {
        const bias = getNumber(value);
        if (this._depthCamera && bias !== null) {
            this._depthCamera.bias = bias;
        }
    };

    protected _onChangeNormalBias = (value: string): void => {
        const normalBias = getNumber(value);
        if (this._depthCamera && normalBias !== null) {
            this._depthCamera.normalBias = normalBias;
        }
    };

    protected _onChangeDepthEpsilon = (value: string): void => {
        const depthEpsilon = getNumber(value);
        if (this._depthCamera && depthEpsilon !== null) {
            this._depthCamera.depthEpsilon = depthEpsilon;
        }
    };
}
