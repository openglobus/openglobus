export interface MouseHandlerEvent {
    button?: any;
    clientX: number;
    clientY: number;
}

type MouseHandlerEventCallback = (sys: MouseEvent | WheelEvent, event?: MouseHandlerEvent) => void;

class MouseHandler {

    protected _htmlObject: HTMLElement;

    constructor(htmlObject: HTMLElement) {
        this._htmlObject = htmlObject;
    }

    public setEvent(event: string, sender: any, callback: MouseHandlerEventCallback) {
        switch (event) {
            case "mousewheel":
                this._htmlObject.addEventListener('mousewheel', function (event: any) {
                    let delta = event.deltaY || event.detail || event.wheelDelta;
                    if (event.wheelDelta == undefined) {
                        event.wheelDelta = delta * (-120);
                    }
                    callback.call(sender, event);
                    event.preventDefault();
                }, false);

                this._htmlObject.addEventListener('wheel', function (event: MouseEvent) {
                    //@ts-ignore
                    let delta = event.deltaY || event.detail || event.wheelDelta;
                    //@ts-ignore
                    if (event.wheelDelta == undefined) {
                        //@ts-ignore
                        event.wheelDelta = delta * (-120);
                    }
                    callback.call(sender, event);
                    event.preventDefault();
                }, false);
                break;

            case "mousedown":
                this._htmlObject.addEventListener('mousedown', function (event: MouseEvent) {
                    let rect = this.getBoundingClientRect();
                    callback.call(sender, event, {
                        button: event.button,
                        clientX: event.clientX - rect.left,
                        clientY: event.clientY - rect.top
                    });
                });
                this._htmlObject.addEventListener('contextmenu', function (event: MouseEvent) {
                    event.preventDefault();
                    return false;
                });
                break;

            case "mouseup":
                this._htmlObject.addEventListener('mouseup', function (event: MouseEvent) {
                    let rect = this.getBoundingClientRect();
                    callback.call(sender, event, {
                        button: event.button,
                        clientX: event.clientX - rect.left,
                        clientY: event.clientY - rect.top
                    });
                });
                break;

            case "mousemove":
                this._htmlObject.addEventListener('mousemove', function (event: MouseEvent) {
                    let rect = this.getBoundingClientRect();
                    callback.call(sender, event, {
                        clientX: event.clientX - rect.left,
                        clientY: event.clientY - rect.top
                    });
                });
                break;

            case "mouseleave":
                this._htmlObject.addEventListener('mouseleave', function (event: MouseEvent) {
                    callback.call(sender, event);
                });
                break;

            case "mouseout":
                this._htmlObject.addEventListener('mouseout', function (event: MouseEvent) {
                    callback.call(sender, event);
                });
                break;

            case "mouseover":
                this._htmlObject.addEventListener('mouseover', function (event: MouseEvent) {
                    callback.call(sender, event);
                });
                break;

            case "mouseenter":
                this._htmlObject.addEventListener('mouseenter', function (event: MouseEvent) {
                    callback.call(sender, event);
                });
                break;
        }
    }
}

export {MouseHandler};
