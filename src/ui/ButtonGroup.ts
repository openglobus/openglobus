import {ToggleButton} from "./ToggleButton";
import {createEvents, EventsHandler} from '../Events';

interface IButtonGroupParams {
    buttons?: ToggleButton[];
}

type ButtonGroupEventsList = ["change"];

const BUTTONGROUP_EVENTS: ButtonGroupEventsList = ["change"];

class ButtonGroup {

    public events: EventsHandler<ButtonGroupEventsList>;

    protected _buttons: ToggleButton[];

    constructor(options: IButtonGroupParams = {}) {

        this.events = createEvents<ButtonGroupEventsList>(BUTTONGROUP_EVENTS);

        this._buttons = options.buttons || [];

        for (let i = 0; i < this._buttons.length; i++) {
            this._bindButton(this._buttons[i]);
        }
    }

    protected _bindButton(button: ToggleButton) {
        button.events.on("change", this._onChange);
    }

    public add(button: ToggleButton) {
        this._buttons.push(button);
        this._bindButton(button);
    }

    protected _onChange = (isActive: boolean, btn: ToggleButton) => {
        if (isActive) {
            btn.preventClick = true;
            for (let i = 0; i < this._buttons.length; i++) {
                let bi = this._buttons[i];
                if (!bi.isEqual(btn)) {
                    bi.setActive(false);
                    bi.preventClick = false;
                }
            }
            this.events.dispatch(this.events.change, btn);
        }
    }

    public remove(button: ToggleButton) {
        for (let i = 0; i < this._buttons.length; i++) {
            if (this._buttons[i].isEqual(button)) {
                this._buttons.splice(i);
                button.events.off("change", this._onChange);
                return;
            }
        }
    }
}

export {ButtonGroup}