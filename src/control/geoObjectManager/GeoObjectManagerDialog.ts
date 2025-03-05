import {Dialog, type IDialogParams} from "../../ui/Dialog";
import {GeoObjectCollection} from "./GeoObjectCollection";
import {Button} from "../../ui/Button";

/*<div>Icons made from <a href="https://www.onlinewebfonts.com/icon">svg icons</a>is licensed by CC BY 4.0</div>*/
const ICON_LOAD_BUTTON_SVG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Svg Vector Icons : http://www.onlinewebfonts.com/icon -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 256 256" enable-background="new 0 0 256 256" xml:space="preserve">
<metadata> Svg Vector Icons : http://www.onlinewebfonts.com/icon </metadata>
<g><g><g><path fill="#000000" d="M162.6,38.2c-10.2,2.8-13.8,4-14.4,4.7c-1.2,1.5-1.1,3.8,0.3,5.1c1.4,1.3,2.7,1.2,11.2-1.1l6.1-1.6l-5.6,5.7c-8.2,8.4-11.2,14.2-12.4,23.7c-2.5,20.8,12.4,38.9,33.5,40.8c3.1,0.2,3.6,0.2,4.7-0.7c1.6-1.3,2-3,1.1-4.7c-0.8-1.5-1.3-1.7-5.9-2.1c-4-0.4-9.9-2.4-13.2-4.7c-6.3-4.1-11.3-11.7-12.9-19.1c-1.4-6.5,0-14,3.7-20.1c1.6-2.6,12.4-14.2,12-12.8c-0.1,0.4-1,3.8-2,7.6c-1.7,6.6-1.7,7-1,8.1c1.5,2.3,5.2,2.5,6.3,0.3c0.8-1.4,7.6-28.1,7.6-29.6c0-2-1.5-3.3-3.6-3.3C177,34.5,170.1,36.2,162.6,38.2z"/><path fill="#000000" d="M19.2,71.5c-3.5,0.8-6.6,3.5-8.2,7.1c-0.9,2.1-1,2.7-1,67.9c0,62.7,0,65.9,0.9,67.7c1.3,2.9,3.3,4.9,5.9,6.2l2.4,1.1H111c68.6,0,92.3-0.1,93.7-0.6c1-0.3,2.5-1.2,3.5-2c1.5-1.3,3.2-5.4,19.7-48c10-25.6,18.1-47.1,18.1-47.9c0-1.3-1.4-3.1-2.4-3.2c-0.3,0-7.4,0-15.7,0l-15.2,0v-8.1c0-9.5-0.5-11.8-3.1-14.9c-0.9-1.1-2.8-2.5-4.1-3.2c-2.3-1.1-2.8-1.1-14.4-1.1c-12.9,0-13.2,0.1-14.1,2.5c-0.6,1.6,0,3.2,1.5,4.3c0.9,0.7,2.8,0.8,12.6,0.8c10.7,0,11.7,0,12.7,0.9c1.1,0.9,1.1,1,1.1,9.8v8.8l-75.9,0.2c-70.8,0.2-76,0.3-77.4,1c-1.8,1-4,3.7-5.3,6.3c-0.5,1-7,18.1-14.5,37.8c-7.5,19.8-13.7,36.3-13.9,36.7c-0.1,0.4-0.3-26.6-0.3-60c0-59.1,0-60.7,0.8-61.8l0.9-1.1l27.8-0.1l27.8-0.1l21.4,10.8l21.4,10.8H129h11.3l1.4-1.4c1.2-1.2,1.4-1.7,1.1-3c-0.6-3-1.1-3.2-12.9-3.2h-10.6L98,81.9L76.7,71.1l-28.1,0C33.2,71.2,20,71.3,19.2,71.5z M236.4,128.3c-5.9,15.7-33,84.7-33.4,85.1c-0.4,0.4-19,0.6-91.1,0.5l-90.5-0.1l1.5-4c0.8-2.2,7.9-21,15.8-41.7c7.8-20.7,14.6-38.4,15.1-39.2l0.9-1.4h91C232.2,127.5,236.7,127.6,236.4,128.3z"/></g></g></g>
</svg>`;

interface IGeoObjectManagerDialogParams extends IDialogParams {
    model: GeoObjectCollection
}

export class GeoObjectManagerDialog extends Dialog<GeoObjectCollection> {

    constructor(params: IGeoObjectManagerDialogParams) {
        super({
            title: "GeoObject Properties",
            visible: false,
            resizable: true,
            useHide: true,
            top: 25,
            right: 85,
            width: 252,
            height: 480,
            minHeight: 100,
            minWidth: 100,
            model: params.model
        });
    }

    public override render(params: any): this {
        super.render(params);

        let $toolbar = document.createElement("div");
        $toolbar.classList.add("og-editor_toolbar");
        this.container?.appendChild($toolbar);

        let loadBtn = new Button({
            classList: ["og-editor_toolbar-button"],
            icon: ICON_LOAD_BUTTON_SVG,
            title: "Load 3D object"
        });
        loadBtn.appendTo($toolbar);

        // cameraLockBtn.events.on("change", (isActive: boolean) => {
        //     if (isActive) {
        //         this.model.lockView();
        //     } else {
        //         this.model.unlockView();
        //     }
        // });
        //
        // this.events.on("visibility", (vis: boolean) => {
        //     if (!vis) {
        //         cameraLockBtn.events.stopPropagation();
        //         cameraLockBtn.setActive(false);
        //     }
        // })

        this.events.on("visibility", this._onVisibility);

        return this;
    }

    protected _onVisibility = (vis: boolean) => {
    }

    public override remove(): void {
        super.remove();
        //this._clearEvents();
    }

    // protected _initEvents() {
    // }
    //
    // protected _clearEvents() {
    // }
}