export type TouchEventExt = TouchEvent & { offsetLeft: number; offsetTop: number };
type TouchHandlerEventCallback = (sys: TouchEventExt) => void;

class TouchHandler {

    protected _htmlObject: HTMLElement;

    constructor(htmlObject: HTMLElement) {
        this._htmlObject = htmlObject;
    }

    public setEvent(event: string, sender: any, callback: TouchHandlerEventCallback) {
        switch (event) {
            case "touchcancel":
                this._htmlObject.addEventListener('touchcancel', function (event: TouchEvent) {
                    event.preventDefault();
                    const rect = this.getBoundingClientRect();
                    const eventExt: TouchEventExt = Object.assign(event, { offsetLeft: rect.left, offsetTop: rect.top });
                    callback.call(sender, eventExt);
                });
                break;

            case "touchstart":
                this._htmlObject.addEventListener('touchstart', function (event: TouchEvent) {
                    event.preventDefault();
                    const rect = this.getBoundingClientRect();
                    const eventExt: TouchEventExt = Object.assign(event, { offsetLeft: rect.left, offsetTop: rect.top });
                    callback.call(sender, eventExt);
                });
                break;

            case "touchend":
                this._htmlObject.addEventListener('touchend', function (event: TouchEvent) {
                    event.preventDefault();
                    const rect = this.getBoundingClientRect();
                    const eventExt: TouchEventExt = Object.assign(event, { offsetLeft: rect.left, offsetTop: rect.top });
                    callback.call(sender, eventExt);
                });
                break;

            case "touchmove":
                this._htmlObject.addEventListener('touchmove', function (event: TouchEvent) {
                    event.preventDefault();
                    const rect = this.getBoundingClientRect();
                    const eventExt: TouchEventExt = Object.assign(event, { offsetLeft: rect.left, offsetTop: rect.top });
                    callback.call(sender, eventExt);
                });
                break;
        }
    }
}

export {TouchHandler};

