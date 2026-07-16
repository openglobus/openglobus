import { Checkbox } from "../../ui/Checkbox";
import { Color } from "../../ui/Color";
import { Input } from "../../ui/Input";
import { TitleBarView } from "../../ui/TitleBarView";
import { View, type IViewParams } from "../../ui/View";
import { htmlColorToRgba } from "../../utils/shared";
import {
    PROJECTOR_RENDER_MODE_COLOR,
    PROJECTOR_RENDER_MODE_LIGHT,
    type Projector
} from "../../renderer/projectors/Projector";

interface IProjectorEditorViewParams extends IViewParams {
    projector: Projector;
}

const TEMPLATE = `<div class="og-editor-panel"></div>`;

const MODE_TEMPLATE = `<div class="og-select">
    <div class="og-input-label">Render mode</div>
    <select>
        <option value="color">Color</option>
        <option value="light">Light</option>
    </select>
</div>`;

function getNumber(value: string): number | null {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export class ProjectorEditorView extends View<Projector> {
    protected _enabledView: Checkbox;
    protected _colorView: Color;
    protected _opacityView: Input;
    protected _priorityView: Input;
    protected _modeEl: HTMLSelectElement | null;
    protected _modeRowEl: HTMLElement | null;
    protected _titleBarView: TitleBarView;
    protected _bodyEl: HTMLElement | null;

    constructor(params: IProjectorEditorViewParams) {
        super({
            template: TEMPLATE,
            model: params.projector
        });

        this._enabledView = new Checkbox({
            label: "Enabled"
        });

        this._colorView = new Color({
            label: "Color"
        });

        this._opacityView = new Input({
            label: "Opacity",
            type: "number",
            min: 0,
            max: 1,
            step: 0.01,
            maxFixed: 4
        });

        this._priorityView = new Input({
            label: "Priority",
            type: "number",
            step: 1,
            maxFixed: 0
        });

        this._modeEl = null;
        this._modeRowEl = null;
        this._titleBarView = new TitleBarView({
            title: "Projector"
        });
        this._bodyEl = null;
    }

    public bindProjector(projector: Projector): void {
        this.model = projector;
    }

    public override render(params?: unknown): this {
        super.render(params);

        this._titleBarView.appendTo(this.el!);
        this._titleBarView.events.on("change", this._onTitleBarChange);

        this._bodyEl = document.createElement("div");
        this._bodyEl.classList.add("og-editor-panel__body");
        this.el!.appendChild(this._bodyEl);

        this._enabledView.appendTo(this._bodyEl);
        this._colorView.appendTo(this._bodyEl);
        this._opacityView.appendTo(this._bodyEl);
        this._priorityView.appendTo(this._bodyEl);

        this._modeRowEl = View.parseHTML(MODE_TEMPLATE)[0];
        this._modeEl = this._modeRowEl.querySelector("select");
        this._bodyEl.appendChild(this._modeRowEl);

        this._enabledView.events.on("change", this._onChangeEnabled);
        this._colorView.events.on("input", this._onChangeColor);
        this._opacityView.events.on("change", this._onChangeOpacity);
        this._priorityView.events.on("change", this._onChangePriority);
        this._modeEl!.addEventListener("change", this._onChangeMode);

        this.refresh();

        return this;
    }

    public refresh(): void {
        const projector = this.model;

        if (this._enabledView.checked !== projector.enabled) {
            this._enabledView.stopPropagation();
            this._enabledView.checked = projector.enabled;
        }

        const color = projector.getColor();
        if (this._colorView.value !== color) {
            this._colorView.stopPropagation();
            this._colorView.value = color;
        }

        this._opacityView.stopPropagation();
        this._opacityView.value = projector.getOpacity();

        this._priorityView.stopPropagation();
        this._priorityView.value = projector.priority;

        if (this._modeEl) {
            this._modeEl.value = projector.renderMode === PROJECTOR_RENDER_MODE_LIGHT ? "light" : "color";
        }
    }

    public override remove(): void {
        this._enabledView.remove();
        this._colorView.remove();
        this._opacityView.remove();
        this._priorityView.remove();

        if (this._modeEl) {
            this._modeEl.removeEventListener("change", this._onChangeMode);
        }
        if (this._modeRowEl && this._modeRowEl.parentNode) {
            this._modeRowEl.parentNode.removeChild(this._modeRowEl);
        }
        this._titleBarView.events.off("change", this._onTitleBarChange);
        this._titleBarView.remove();
        this._bodyEl = null;

        super.remove();
    }

    protected _onTitleBarChange = (isCollapsed: boolean): void => {
        this._bodyEl?.classList.toggle("og-editor-panel__body_collapsed", isCollapsed);
    };

    protected _onChangeEnabled = (enabled: boolean): void => {
        this.model.enabled = enabled;
    };

    protected _onChangeColor = (color: string): void => {
        const opacity = this.model.getOpacity();
        const rgba = htmlColorToRgba(color);
        this.model.setColor(rgba.x, rgba.y, rgba.z, opacity);
    };

    protected _onChangeOpacity = (value: string): void => {
        const opacity = getNumber(value);
        if (opacity !== null) {
            this.model.setOpacity(Math.max(0, Math.min(1, opacity)));
        }
    };

    protected _onChangePriority = (value: string): void => {
        const priority = getNumber(value);
        if (priority !== null) {
            this.model.priority = priority;
        }
    };

    protected _onChangeMode = (): void => {
        if (!this._modeEl) return;

        this.model.renderMode =
            this._modeEl.value === "light" ? PROJECTOR_RENDER_MODE_LIGHT : PROJECTOR_RENDER_MODE_COLOR;
    };
}
