import { ButtonGroup } from "../ui/ButtonGroup";
import { Control } from "./Control";
import { DrawingControl } from "./drawing/DrawingControl";
import { ToggleButton } from "../ui/ToggleButton";

const ICON_POLYGON_SVG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 24.1.3, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<svg version="1.1" id="Layer_2" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
\t viewBox="0 0 1024 1024" style="enable-background:new 0 0 1024 1024;" xml:space="preserve">
<g>
\t<path d="M926.03,321.16c-16.02,0-31.11,3.94-44.48,10.79l-263.43-191.4c2.69-8.94,4.18-18.4,4.18-28.2
\t\tc0-54.02-43.95-97.97-97.97-97.97c-54.03,0-97.98,43.95-97.98,97.97c0,9.81,1.49,19.27,4.18,28.21L155.75,340.18
\t\tc-16.22-11.91-36.16-19.03-57.78-19.03C43.95,321.16,0,365.11,0,419.13c0,52.58,41.67,95.5,93.71,97.75l102.63,315.86
\t\tc-24.28,17.85-40.13,46.52-40.13,78.9c0,54.02,43.95,97.98,97.98,97.98c37.54,0,70.18-21.25,86.62-52.34h367.26
\t\tc16.44,31.08,49.08,52.34,86.63,52.34c54.03,0,97.98-43.95,97.98-97.98c0-32.46-15.94-61.21-40.33-79.05l104.11-320.4
\t\tc39.15-12.84,67.54-49.68,67.54-93.07C1024,365.11,980.05,321.16,926.03,321.16z M828.05,911.65c0,8.5-3.3,16.19-8.55,22.09
\t\tc-6.11,6.85-14.9,11.26-24.79,11.26c-13.65,0-25.37-8.26-30.52-20.02c-1.79-4.09-2.82-8.58-2.82-13.33
\t\tc0-18.39,14.95-33.35,33.34-33.35c2.93,0,5.72,0.5,8.43,1.21c13.27,3.49,23.21,14.91,24.59,28.9
\t\tC827.83,909.5,828.05,910.54,828.05,911.65z M790.48,813.89c-45.63,1.96-83.27,35.16-91.87,78.77H350.28
\t\tc-8.62-43.69-46.38-76.93-92.11-78.79L155.59,498.19c24.41-17.84,40.36-46.59,40.36-79.06c0-8.9-1.3-17.49-3.53-25.7L468.57,192.8
\t\tc15.84,11.01,35.05,17.52,55.76,17.52c20.71,0,39.92-6.5,55.76-17.52l256.56,186.4c-5.48,12.21-8.59,25.7-8.59,39.93
\t\tc0,41.02,25.36,76.17,61.21,90.75L790.48,813.89z M254.19,945c-10.11,0-19.07-4.62-25.19-11.75c-5.01-5.84-8.15-13.32-8.15-21.6
\t\tc0-0.91,0.2-1.76,0.27-2.66c1.14-14.18,11.08-25.8,24.43-29.41c2.78-0.75,5.64-1.28,8.65-1.28c18.38,0,33.33,14.96,33.33,33.35
\t\tc0,4.74-1.03,9.24-2.82,13.33C279.55,936.74,267.83,945,254.19,945z M64.88,421.49c-0.06-0.79-0.24-1.55-0.24-2.35
\t\tc0-16.41,11.93-30.01,27.55-32.76c1.89-0.33,3.8-0.58,5.78-0.58c11.94,0,22.35,6.36,28.24,15.81c3.18,5.11,5.11,11.09,5.11,17.53
\t\tc0,15.47-10.63,28.39-24.94,32.14c-2.7,0.71-5.48,1.2-8.4,1.2C80.4,452.47,66.11,438.76,64.88,421.49z M549.41,90.62
\t\tc5.07,5.85,8.25,13.39,8.25,21.72c0,7.32-2.44,14.03-6.45,19.54c-6.07,8.33-15.82,13.81-26.88,13.81
\t\tc-11.07,0-20.83-5.48-26.89-13.81c-4.01-5.51-6.45-12.22-6.45-19.54c0-8.33,3.17-15.86,8.24-21.71
\t\tc6.12-7.07,15.04-11.64,25.1-11.64C534.38,79,543.29,83.57,549.41,90.62z M959.36,419.13c0,11.94-6.36,22.35-15.82,28.24
\t\tc-5.1,3.18-11.07,5.1-17.52,5.1c-6.08,0-11.71-1.76-16.62-4.61c-9.71-5.64-16.33-15.94-16.64-27.89c-0.01-0.29-0.09-0.56-0.09-0.85
\t\tc0-11.75,6.14-22.05,15.36-28c5.2-3.35,11.35-5.35,17.99-5.35C944.41,385.78,959.36,400.75,959.36,419.13z"/>
</g>
</svg>`;

const ICON_LINESTRING_SVG = `<?xml version="1.0" encoding="utf-8"?><!-- License: MIT. Made by Esri: https://github.com/Esri/calcite-ui-icons -->
    <svg width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 6h.046l-5.25 9h-.944L10 9.455V7H7v2.926L1.862 18H0v3h3v-2.926L8.138 10h1.01L14 15.545V18h3v-3h-.046l5.25-9H24V3h-3zM8 8h1v1H8zM2 20H1v-1h1zm14-3h-1v-1h1zm7-13v1h-1V4z"/></svg>`;

const ICON_DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 4.702z"/></svg>`;

/**
 * Activate drawing control
 */
export class DrawingSwitcher extends Control {
    drawingControl: DrawingControl;
    constructor(options = {}) {
        super({
            name: "DrawingSwitcher",
            ...options
        });

        this.drawingControl = new DrawingControl();
    }

    override oninit() {
        this.planet!.addControl(this.drawingControl);
        this._createMenu();
    }

    override onactivate() {
        this.drawingControl.activate();
    }

    override ondeactivate() {
        this.drawingControl.deactivate();
    }

    _createMenu() {

        let defaultBtn = new ToggleButton({
            classList: ["og-map-button", "og-drawing-default_button"],
            icon: ICON_DEFAULT_SVG,
            name: "default",
            isActive: true
        });

        let polyBtn = new ToggleButton({
            classList: ["og-map-button", "og-drawing-polygon_button"],
            icon: ICON_POLYGON_SVG,
            name: "polygon"
        });

        let lineBtn = new ToggleButton({
            classList: ["og-map-button", "og-drawing-linestring_button"],
            icon: ICON_LINESTRING_SVG,
            name: "linestring"
        });

        let buttons = new ButtonGroup({
            buttons: [
                defaultBtn, polyBtn, lineBtn
            ]
        });

        buttons.on("change", (btn: any) => {
            this.drawingControl.deactivate();
            switch (btn.name) {
                case "polygon":
                    this.drawingControl.activatePolygonDrawing();
                    break;
                case "linestring":
                    this.drawingControl.activateLineStringDrawing();
                    break;
            }
        });

        defaultBtn.appendTo(this.renderer.div)
        polyBtn.appendTo(this.renderer.div);
        lineBtn.appendTo(this.renderer.div);
    }
}
