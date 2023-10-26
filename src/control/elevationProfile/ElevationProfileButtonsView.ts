import {View, IViewParams, ViewEventsList} from "../../ui/View";
import {Button} from "../../ui/Button";
import {ToggleButton} from "../../ui/ToggleButton";
import {EventsHandler} from "../../Events";
import {ElevationProfile} from "./ElevationProfile";
import {Dialog} from "../../ui/Dialog";

const TEMPLATE = '<div class="og-elevationprofile-buttons"></div>';

const RESET_SVG_ICON = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="30" height="30" viewBox="0 0 30 30" version="1.1">
  <g transform="translate(0,-289.0625)">
    <path d="M 15 6 C 10.041282 6 6 10.04128 6 15 C 6 19.95872 10.041282 24 15 24 C 16.586491 24 18.07668 23.58246 19.373047 22.857422 L 17.888672 21.375 C 17.00816 21.772814 16.032235 22 15 22 C 11.122162 22 8 18.87784 8 15 C 8 11.12216 11.122162 8 15 8 C 18.877838 8 22 11.12216 22 15 L 19 15 L 23 20 L 27 15 L 24 15 C 24 10.04128 19.958718 6 15 6 z " transform="translate(0,289.0625)" />
  </g>
</svg>`;

const LIST_SVG_ICON = `<?xml version="1.0" encoding="utf-8"?><svg width="800px" height="800px" viewBox="0 0 32 32" id="icon" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:none;}</style></defs><title>list</title><rect x="10" y="6" width="18" height="2"/><rect x="10" y="24" width="18" height="2"/><rect x="10" y="15" width="18" height="2"/><rect x="4" y="15" width="2" height="2"/><rect x="4" y="6" width="2" height="2"/><rect x="4" y="24" width="2" height="2"/></svg>`;

const LOCATION_SVG_ICON = `<?xml version="1.0" encoding="utf-8"?>
<!-- Svg Vector Icons : http://www.onlinewebfonts.com/icon -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 256 256" enable-background="new 0 0 256 256" xml:space="preserve">
<metadata> Svg Vector Icons : http://www.onlinewebfonts.com/icon </metadata>
<g><g><path fill="#000000" d="M127,169.4c23.7,0,42.8-18.3,42.8-41s-19.2-41-42.8-41c-23.7,0-42.8,18.4-42.8,41S103.4,169.4,127,169.4z"/><path fill="#000000" d="M221.7,120.2c-3.8-44-40.9-78.9-87-82V15h-16.3v23.6c-44.8,4-80.3,38.5-84.1,81.7H10v15.6h24.3c3.8,43.1,39.3,77.4,84.1,81.7V241h16.3v-23.2c46-3.1,83.2-37.9,87-82H246v-15.6H221.7L221.7,120.2L221.7,120.2z M128,201.6c-42.5,0-76.7-33-76.7-73.4c0-40.4,34.5-73.4,76.7-73.4c42.5,0,76.7,33,76.7,73.4C204.7,168.5,170.5,201.6,128,201.6L128,201.6z"/></g></g>
</svg>`;

interface IElevationProfileButtonsViewParams extends IViewParams {
}

type ElevationProfileButtonsViewEventsList = ["reset", "list", "location"];

const ELEVATIONPROFILEBUTTONSVIEW_EVENTS: ElevationProfileButtonsViewEventsList = ["reset", "list", "location"];

export class ElevationProfileButtonsView extends View<ElevationProfile> {

    public override events: EventsHandler<ElevationProfileButtonsViewEventsList> & EventsHandler<ViewEventsList>;
    public pointListBtn: ToggleButton;

    constructor(params: IElevationProfileButtonsViewParams = {}) {
        super({
            ...params,
            template: TEMPLATE
        });

        //@ts-ignore
        this.events = this.events.registerNames(ELEVATIONPROFILEBUTTONSVIEW_EVENTS);

        this.pointListBtn = new ToggleButton({
            classList: ["og-elevationprofile-button"],
            icon: LIST_SVG_ICON,
            title: "Point List"
        });

        this.pointListBtn.events.on("change", (isActive: boolean) => {
            this.events.dispatch(this.events.list, isActive);
        });
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
        });

        this.pointListBtn.appendTo(this.el!);

        let locationBtn = new Button({
            classList: ["og-elevationprofile-button", "og-elevationprofile-button__location"],
            icon: LOCATION_SVG_ICON,
            title: "View bounds"
        });
        locationBtn.appendTo(this.el!);

        locationBtn.events.on("click", () => {
            this.events.dispatch(this.events.location, this);
        });

        return this;
    }
}