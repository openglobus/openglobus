import {createEvents, EventsHandler} from '../Events';
import {parseHTML, stringTemplate} from '../utils/shared';

export interface IViewParams<E extends string[]> {
    model?: any;
    template?: string;
    parent?: View<any, any> | null;
    classList?: string[];
    eventList?: E;
}

class View<M, E extends string[]> {

    static __counter__: number = 0;

    protected __id: number;

    protected _events: EventsHandler<E>;

    public model: M;

    public template: string;

    public parent: View<any, any> | null;

    public el: HTMLElement | null;

    protected _classList: string[];

    constructor(options: IViewParams<E> = {}) {
        this.__id = View.__counter__++;
        this._events = createEvents<E>(options.eventList || [] as any);
        this.model = options.model || null;
        this.template = options.template || "";
        this.parent = options.parent || null;
        this._classList = options.classList || [];
        this.el = null;
    }

    static getHTML(template: string, params: any): string {
        return stringTemplate(template, params);
    }

    static parseHTML(htmlStr: string): HTMLElement[] {
        return parseHTML(htmlStr);
    }

    static insertAfter(newNodes: HTMLElement | HTMLElement[], referenceNode: Node): HTMLElement[] {
        if (!Array.isArray(newNodes)) {
            newNodes = [newNodes];
        }
        for (let i = 0; i < newNodes.length; i++) {
            if (referenceNode.parentNode) {
                referenceNode.parentNode.insertBefore(newNodes[i], referenceNode.nextSibling);
            }
        }
        return newNodes;
    }

    static insertBefore(newNodes: HTMLElement | HTMLElement[], referenceNode: Node): HTMLElement[] {
        if (!Array.isArray(newNodes)) {
            newNodes = [newNodes];
        }
        for (let i = 0; i < newNodes.length; i++) {
            if (referenceNode.parentNode) {
                referenceNode.parentNode.insertBefore(newNodes[i], referenceNode);
            }
        }
        return newNodes;
    }

    public get events(): EventsHandler<E> {
        return this._events;
    }

    public on(eventName: string, callback: Function, sender?: any) {
        return this._events.on(eventName, callback, sender);
    }

    public off(eventName: string, callback: Function) {
        return this._events.off(eventName, callback);
    }

    public insertBefore(view: View<any, any> | HTMLElement) {
        if (!this.el) {
            this.render();
        }
        if (this.el) {
            if (view instanceof HTMLElement && view.parentNode) {
                View.insertBefore(this.el, view);
            }
            if (view instanceof View && view.el && view.el.parentNode) {
                View.insertBefore(this.el, view.el);
            }
        }
    }

    public insertAfter(view: View<any, any> | HTMLElement) {
        if (!this.el) {
            this.render();
        }
        if (this.el) {
            if (view instanceof HTMLElement && view.parentNode) {
                View.insertAfter(this.el, view);
            }
            if (view instanceof View && view.el && view.el.parentNode) {
                View.insertAfter(this.el, view.el);
            }
        }
    }

    public isEqual(view: View<any, any>): boolean {
        return view.__id === this.__id;
    }

    public appendTo(node: HTMLElement, clean: boolean = false, firstPosition: boolean = false) {
        if (node) {
            if (!this.el) {
                this.beforeRender(node);
                this.render();
            }

            if (this.el && this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }

            if (clean) {
                node.innerHTML = "";
            }

            if (this.el) {
                if (firstPosition) {
                    if (node.childNodes[0]) {
                        View.insertBefore(this.el, node.childNodes[0]);
                    } else {
                        node.appendChild(this.el);
                    }
                } else {
                    node.appendChild(this.el);
                }
            }
            this.afterRender(node);
        }

        return this;
    }

    public afterRender(parentNode: HTMLElement) {
    }

    public beforeRender(parentNode: HTMLElement) {
    }

    public stopPropagation() {
        this._events.stopPropagation();
    }

    public renderTemplate(params: any): HTMLElement {
        return View.parseHTML(View.getHTML(this.template, params || {}))[0];
    }

    public render(params?: any): this {
        this.el = this.renderTemplate(params);
        for (let i = 0, len = this._classList.length; i < len; i++) {
            this.el.classList.add(this._classList[i]);
        }
        return this;
    }

    public select(queryStr: string): HTMLElement | null {
        if (this.el) {
            return this.el.querySelector(queryStr);
        }
        return null;
    }

    public selectRemove(queryStr: string): HTMLElement | undefined {
        if (this.el) {
            let r = this.select(queryStr);
            if (r && r.parentNode) {
                r.parentNode.removeChild(r);
                return r;
            }
        }
    }

    public selectAll(queryStr: string, callback?: Function) {
        if (this.el) {
            const res = this.el.querySelectorAll(queryStr);
            if (callback) {
                for (let i = 0, len = res.length; i < len; i++) {
                    callback(res[i], i);
                }
            }
            return res;
        }
    }

    public remove() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
    }
}

export {View};
