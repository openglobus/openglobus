import {View, IViewParams, ViewEventsList} from "../../ui/View";
import {Button} from "../../ui/Button";
import {ToggleButton} from "../../ui/ToggleButton";
import {EventsHandler} from "../../Events";
import {ElevationProfile} from "./ElevationProfile";

const TEMPLATE = '<div class="og-elevationprofile-buttons"></div>';

const RESET_SVG_ICON = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="30" height="30" viewBox="0 0 30 30" version="1.1">
  <g transform="translate(0,-289.0625)">
    <path d="M 15 6 C 10.041282 6 6 10.04128 6 15 C 6 19.95872 10.041282 24 15 24 C 16.586491 24 18.07668 23.58246 19.373047 22.857422 L 17.888672 21.375 C 17.00816 21.772814 16.032235 22 15 22 C 11.122162 22 8 18.87784 8 15 C 8 11.12216 11.122162 8 15 8 C 18.877838 8 22 11.12216 22 15 L 19 15 L 23 20 L 27 15 L 24 15 C 24 10.04128 19.958718 6 15 6 z " transform="translate(0,289.0625)" />
  </g>
</svg>`;

const LIST_SVG_ICON = `<?xml version="1.0" encoding="utf-8"?><svg width="800px" height="800px" viewBox="0 0 32 32" id="icon" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:none;}</style></defs><title>list</title><rect x="10" y="6" width="18" height="2"/><rect x="10" y="24" width="18" height="2"/><rect x="10" y="15" width="18" height="2"/><rect x="4" y="15" width="2" height="2"/><rect x="4" y="6" width="2" height="2"/><rect x="4" y="24" width="2" height="2"/></svg>`;

interface IElevationProfileButtonsViewParams extends IViewParams {

}

type ElevationProfileButtonsViewEventsList = ["reset", "list"];

const ELEVATIONPROFILEBUTTONSVIEW_EVENTS: ElevationProfileButtonsViewEventsList = ["reset", "list"];

export class ElevationProfileButtonsView extends View<ElevationProfile> {

    public override events: EventsHandler<ElevationProfileButtonsViewEventsList> & EventsHandler<ViewEventsList>;

    constructor(params: IElevationProfileButtonsViewParams = {}) {
        super({
            ...params,
            template: TEMPLATE
        });

        //@ts-ignore
        this.events = this.events.registerNames(ELEVATIONPROFILEBUTTONSVIEW_EVENTS);
    }

    public override render(params: any) {
        super.render(params);

        let resetBtn = new Button({
            classList: ["og-elevationprofile-button"],
            icon: RESET_SVG_ICON,
            title: "Reset"
        });
        resetBtn.appendTo(this.el!);

        resetBtn.events.on("click", () => {
            this.model.clear();
            this.events.dispatch(this.events.reset, this);
        })

        let pointListBtn = new ToggleButton({
            classList: ["og-elevationprofile-button"],
            icon: LIST_SVG_ICON,
            title: "Point List"
        });
        pointListBtn.appendTo(this.el!);

        pointListBtn.events.on("change", (isActive: boolean) => {
            this.events.dispatch(this.events.list, isActive);
        });

        return this;
    }
}