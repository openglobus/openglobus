import { createEvents } from "../Events";
import type { EventsHandler } from "../Events";
import type { Dialog, DialogElement } from "./Dialog";

export type DockSide = "top" | "bottom" | "left" | "right" | "center";

/** How a side lays its dialogs out. */
export type DockDirection = "row" | "column";

/** Which third of a side a dialog was dropped on, and so where it goes. */
export type DockPlacement = "start" | "middle" | "end";

export interface IDockManagerParams {
    host: HTMLElement;
    /** How close to an edge a dragged dialog has to come before that side offers itself. */
    edgeThreshold?: number;
    /** Size a side takes when nothing better is known. */
    defaultSize?: number;
}

type DockEventsList = ["dock", "undock", "layout"];

const DOCK_EVENTS: DockEventsList = ["dock", "undock", "layout"];

/** Default `edgeThreshold`: the band along a free edge where an unused side offers itself. */
const DEFAULT_EDGE_THRESHOLD = 56;

/** Default `defaultSize`: what a side opens at when the dialog it takes has no size drawn yet. */
const DEFAULT_SIZE = 280;

/** No side gets thinner than this, however far its seam is dragged inwards. */
const MIN_ZONE_SIZE = 60;

/** What a side has to leave of the rectangle it takes from, so the sides after it still fit. */
const MIN_FREE_SIZE = 120;

/** The least of a side a dialog stacked in it keeps, so a seam never squeezes one out of sight. */
const MIN_ITEM_SHARE = 0.08;

/** How much of a side's length each of its end bands takes. */
const END_BAND = 0.3;

/** What the pointer gets. The seam it paints is a hairline in the middle of that. */
const SPLITTER_GRAB = 11;

/** A finger is blunter than a cursor and needs more of an edge to catch. */
const SPLITTER_GRAB_COARSE = 22;

function splitterGrab(): number {
    const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

    return coarse ? SPLITTER_GRAB_COARSE : SPLITTER_GRAB;
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface DockZone {
    side: DockSide;
    direction: DockDirection;
    size: number;
    rect: Rect;
    el: HTMLElement;
    items: Dialog<any>[];
    shares: number[];
}

/** A draggable edge: the side's own when `after` is null, otherwise a seam inside its stack. */
interface DockSplitter {
    el: HTMLElement;
    zone: DockZone;
    after: number | null;
}

interface FloatingState {
    left: string;
    top: string;
    width: string;
    height: string;
    position: string;
}

interface DialogState {
    attached: boolean;
    opened: boolean;
    floating: FloatingState | null;
}

function isVertical(side: DockSide): boolean {
    return side === "left" || side === "right";
}

/** Stacking that runs the length of a side. */
function alongDirection(side: DockSide): DockDirection {
    return isVertical(side) ? "column" : "row";
}

/** Stacking that cuts a side across, so its dialogs divide its thickness. */
function acrossDirection(side: DockSide): DockDirection {
    return isVertical(side) ? "row" : "column";
}

function dialogOf(node: Node): Dialog<any> | null {
    if (!(node instanceof HTMLElement) || !node.classList.contains("og-ddialog")) {
        return null;
    }

    return (node as DialogElement).__og_dialog__ || null;
}

/**
 * Docks dialogs to the sides of a host element. Sides claim bands in first-use
 * order, while dialogs on the same side stack and share its length.
 *
 * Draggable edges render in a separate layer, keeping panels flush and preventing
 * clipped seams or thickness-related layout adjustments.
 */
export class DockManager {
    public readonly events: EventsHandler<DockEventsList>;

    protected _host: HTMLElement;
    protected _edgeThreshold: number;
    protected _defaultSize: number;
    protected _zones: DockZone[];
    protected _splitters: DockSplitter[];
    protected _splitterLayer: HTMLElement;
    protected _grab: number;
    protected _dialogs: Map<Dialog<any>, DialogState>;
    protected _hint: HTMLElement;
    protected _free: Rect;
    protected _resizeObserver: ResizeObserver;
    protected _domObserver: MutationObserver;
    protected _dragging: Dialog<any> | null;
    protected _drop: { side: DockSide; placement: DockPlacement } | null;
    protected _pointer: { x: number; y: number };

    constructor(params: IDockManagerParams) {
        this.events = createEvents(DOCK_EVENTS, this);

        this._host = params.host;
        this._edgeThreshold = params.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD;
        this._defaultSize = params.defaultSize ?? DEFAULT_SIZE;
        this._zones = [];
        this._splitters = [];
        this._grab = splitterGrab();
        this._dialogs = new Map();
        this._free = { x: 0, y: 0, width: 0, height: 0 };
        this._dragging = null;
        this._drop = null;
        this._pointer = { x: 0, y: 0 };

        this._splitterLayer = document.createElement("div");
        this._splitterLayer.className = "og-dock-splitters";
        this._host.appendChild(this._splitterLayer);

        this._hint = document.createElement("div");
        this._hint.className = "og-dock-hint";
        this._hint.style.display = "none";
        this._host.appendChild(this._hint);

        this._resizeObserver = new ResizeObserver(() => this.layout());
        this._resizeObserver.observe(this._host);

        this._domObserver = new MutationObserver(this._onMutations);
        this._domObserver.observe(this._host, { childList: true });

        for (const el of this._host.querySelectorAll(".og-ddialog")) {
            this._attachElement(el);
        }

        document.addEventListener("pointerdown", this._onPointerDown, true);
    }

    /** The rectangle no side has taken, in host coordinates. */
    public get freeRect(): Rect {
        return { ...this._free };
    }

    public getSide(dialog: Dialog<any>): DockSide | null {
        return this._zones.find((zone) => zone.items.includes(dialog))?.side ?? null;
    }

    public isDocked(dialog: Dialog<any>): boolean {
        return this.getSide(dialog) !== null;
    }

    public attach(dialog: Dialog<any>): void {
        const state = this._state(dialog);

        if (state.attached) return;

        state.attached = true;
        dialog.events.on("dragstart", this._onDragStart, this);
        dialog.events.on("dragend", this._onDragEnd, this);
        dialog.events.on("visibility", this._onDialogVisibility, this);

        this._openDocked(dialog);
    }

    public detach(dialog: Dialog<any>): void {
        if (!this._dialogs.get(dialog)?.attached) return;

        dialog.events.off("dragstart", this._onDragStart);
        dialog.events.off("dragend", this._onDragEnd);
        dialog.events.off("visibility", this._onDialogVisibility);

        this.undock(dialog);
        this._dialogs.delete(dialog);
    }

    protected _state(dialog: Dialog<any>): DialogState {
        let state = this._dialogs.get(dialog);

        if (!state) {
            state = { attached: false, opened: false, floating: null };
            this._dialogs.set(dialog, state);
        }

        return state;
    }

    public dock(dialog: Dialog<any>, side: DockSide, placement: DockPlacement = "end"): void {
        if (this.getSide(dialog) === side) return;

        this.undock(dialog);
        this._remember(dialog);

        const untouched = !this._zones.some((item) => item.side === side);
        const zone = this._getZone(side);

        if (untouched) {
            zone.size = this._dockSize(dialog, side);
        }

        zone.direction = placement === "middle" ? acrossDirection(side) : alongDirection(side);

        const share = zone.shares.length ? this._averageShare(zone) : 1;

        if (placement === "start" && zone.items.length) {
            zone.items.unshift(dialog);
            zone.shares.unshift(share);
        } else {
            zone.items.push(dialog);
            zone.shares.push(share);
        }

        this._normalize(zone);

        dialog.el!.classList.add("og-ddialog__docked");

        this._refresh(zone);

        this.events.dispatch(this.events.dock, dialog, side);
    }

    public undock(dialog: Dialog<any>): void {
        const zone = this._zones.find((item) => item.items.includes(dialog));

        if (!zone) return;

        const index = zone.items.indexOf(dialog);

        zone.items.splice(index, 1);
        zone.shares.splice(index, 1);

        dialog.el!.classList.remove("og-ddialog__docked");

        if (dialog.el!.isConnected) {
            this._host.appendChild(dialog.el!);
        }

        this._restore(dialog);

        if (zone.items.length) {
            this._normalize(zone);
            this._refresh(zone);
        } else {
            this._removeZone(zone);
            this._rebuildSplitters();
            this.layout();
        }

        this.events.dispatch(this.events.undock, dialog);
    }

    /** Recomputes every side from the host rectangle, taking a band off it in dock order. */
    public layout(): void {
        let rest: Rect = { x: 0, y: 0, width: this._host.clientWidth, height: this._host.clientHeight };

        for (const zone of this._zones) {
            if (zone.side === "center") continue;

            if (!this._visibleItems(zone).length) {
                zone.el.style.display = "none";
                zone.rect = { x: rest.x, y: rest.y, width: 0, height: 0 };
                continue;
            }

            const band = this._band(rest, zone.side, zone.size);

            zone.size = band.size;
            rest = band.rest;

            this._applyZoneRect(zone, band.zone);
        }

        this._free = rest;

        const center = this._zones.find((zone) => zone.side === "center");

        if (center) {
            if (this._visibleItems(center).length) {
                this._applyZoneRect(center, rest);
            } else {
                center.rect = rest;
                center.el.style.display = "none";
            }
        }

        this._positionSplitters();

        this.events.dispatch(this.events.layout, this._free);
    }

    public destroy(): void {
        document.removeEventListener("pointerdown", this._onPointerDown, true);
        this._resizeObserver.disconnect();
        this._domObserver.disconnect();

        for (const dialog of [...this._dialogs.keys()]) {
            this.detach(dialog);
        }

        this._splitterLayer.remove();
        this._hint.remove();
    }

    /** What a side opens at for this dialog: its width standing on end, or its height. */
    protected _dockSize(dialog: Dialog<any> | null, side: DockSide): number {
        if (!dialog?.el) return this._defaultSize;

        const vertical = isVertical(side);
        const drawn = vertical ? dialog.el.offsetWidth : dialog.el.offsetHeight;

        return drawn || (vertical ? dialog.width : dialog.height) || this._defaultSize;
    }

    protected _applyZoneRect(zone: DockZone, rect: Rect): void {
        zone.rect = rect;

        zone.el.style.display = "flex";
        zone.el.style.left = `${rect.x}px`;
        zone.el.style.top = `${rect.y}px`;
        zone.el.style.width = `${rect.width}px`;
        zone.el.style.height = `${rect.height}px`;
    }

    /** The band a side takes off a rectangle, and what the sides after it will see. */
    protected _band(rect: Rect, side: DockSide, size: number): { zone: Rect; rest: Rect; size: number } {
        const along = isVertical(side) ? rect.width : rect.height;
        const clamped = Math.max(MIN_ZONE_SIZE, Math.min(size, along - MIN_FREE_SIZE));

        switch (side) {
            case "top":
                return {
                    size: clamped,
                    zone: { x: rect.x, y: rect.y, width: rect.width, height: clamped },
                    rest: { x: rect.x, y: rect.y + clamped, width: rect.width, height: rect.height - clamped }
                };
            case "bottom":
                return {
                    size: clamped,
                    zone: { x: rect.x, y: rect.y + rect.height - clamped, width: rect.width, height: clamped },
                    rest: { x: rect.x, y: rect.y, width: rect.width, height: rect.height - clamped }
                };
            case "left":
                return {
                    size: clamped,
                    zone: { x: rect.x, y: rect.y, width: clamped, height: rect.height },
                    rest: { x: rect.x + clamped, y: rect.y, width: rect.width - clamped, height: rect.height }
                };
            default:
                return {
                    size: clamped,
                    zone: { x: rect.x + rect.width - clamped, y: rect.y, width: clamped, height: rect.height },
                    rest: { x: rect.x, y: rect.y, width: rect.width - clamped, height: rect.height }
                };
        }
    }

    /**
     * Returns a newcomer's stack share: the existing average, normalized to 1 / (count + 1).
     */
    protected _slot(rect: Rect, direction: DockDirection, atStart: boolean, count: number): Rect {
        const fraction = 1 / (count + 1);

        if (direction === "column") {
            const height = rect.height * fraction;

            return { x: rect.x, y: atStart ? rect.y : rect.y + rect.height - height, width: rect.width, height };
        }

        const width = rect.width * fraction;

        return { x: atStart ? rect.x : rect.x + rect.width - width, y: rect.y, width, height: rect.height };
    }

    protected _attachElement(node: Node): void {
        const dialog = dialogOf(node);

        if (dialog) {
            this.attach(dialog);
        }
    }

    protected _onMutations = (records: MutationRecord[]): void => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                this._attachElement(node);
            }

            for (const node of record.removedNodes) {
                const dialog = dialogOf(node);

                if (dialog && !this._host.contains(node)) {
                    this.detach(dialog);
                }
            }
        }
    };

    /**
     * A dialog can ask to open docked, and it takes its side as soon as it turns up - a
     * dialog created hidden would otherwise let a later one claim the corner first. A side
     * with nothing shown in it costs no room until something is.
     */
    protected _openDocked(dialog: Dialog<any>): void {
        const side = dialog.dock;
        const state = this._state(dialog);

        if (!side || state.opened) return;

        state.opened = true;
        this.dock(dialog, side);
    }

    protected _onDialogVisibility = (visible: boolean, dialog: Dialog<any>): void => {
        if (visible) {
            this._openDocked(dialog);
        }

        const zone = this._zones.find((item) => item.items.includes(dialog));

        if (zone) {
            this._refresh(zone);
        }
    };

    protected _getZone(side: DockSide): DockZone {
        const existing = this._zones.find((zone) => zone.side === side);

        if (existing) return existing;

        const el = document.createElement("div");

        el.className = `og-dock og-dock__${side}`;

        this._host.insertBefore(el, this._splitterLayer);
        this._domObserver.observe(el, { childList: true });

        const zone: DockZone = {
            side,
            direction: alongDirection(side),
            size: this._defaultSize,
            rect: { x: 0, y: 0, width: 0, height: 0 },
            el,
            items: [],
            shares: []
        };

        this._zones.push(zone);

        return zone;
    }

    protected _removeZone(zone: DockZone): void {
        zone.el.remove();
        this._zones = this._zones.filter((item) => item !== zone);
    }

    protected _averageShare(zone: DockZone): number {
        return zone.shares.reduce((sum, share) => sum + share, 0) / zone.shares.length;
    }

    protected _normalize(zone: DockZone): void {
        const total = zone.shares.reduce((sum, share) => sum + share, 0) || 1;

        zone.shares = zone.shares.map((share) => Math.max(MIN_ITEM_SHARE, share / total));
    }

    // A hidden panel leaves its share behind, so the visible ones rarely add up to one and
    // are always weighed against their own sum: flex that falls short of one stops short of
    // filling the side, and a seam placed on the raw shares would miss the boundary
    protected _shares(zone: DockZone): { visible: number[]; total: number } {
        const visible = this._visibleItems(zone);
        const total = visible.reduce((sum, index) => sum + zone.shares[index], 0) || 1;

        return { visible, total };
    }

    protected _visibleItems(zone: DockZone): number[] {
        const visible: number[] = [];

        zone.items.forEach((dialog, index) => {
            if (dialog.getVisibility()) {
                visible.push(index);
            }
        });

        return visible;
    }

    protected _refresh(zone: DockZone): void {
        this._renderZone(zone);
        this._rebuildSplitters();
        this.layout();
    }

    protected _renderZone(zone: DockZone): void {
        const { visible, total } = this._shares(zone);
        const shown = new Set(visible);

        // A hidden dialog keeps its place among the children: taking it out of the element
        // would read as a dialog closed for good, and it would never come back when shown.
        // Flex passes over a child that is display:none anyway, and the seams are built from
        // the visible ones, so nothing is left standing in its stead.
        const children = zone.items.map((dialog, index) => {
            const el = dialog.el!;

            if (shown.has(index)) {
                el.style.flex = `${zone.shares[index] / total} 1 0`;
            }

            return el;
        });

        zone.el.style.flexDirection = zone.direction;
        zone.el.replaceChildren(...children);
    }

    protected _rebuildSplitters(): void {
        this._splitters = [];
        this._splitterLayer.replaceChildren();

        for (const zone of this._zones) {
            if (!this._visibleItems(zone).length) continue;

            if (zone.side !== "center") {
                this._splitters.push({ el: this._createSplitter(zone, null), zone, after: null });
            }

            const visible = this._visibleItems(zone);

            for (let order = 1; order < visible.length; order++) {
                const after = visible[order];

                this._splitters.push({ el: this._createSplitter(zone, after), zone, after });
            }
        }
    }

    protected _createSplitter(zone: DockZone, after: number | null): HTMLElement {
        const el = document.createElement("div");

        const upright = after === null ? isVertical(zone.side) : zone.direction === "row";

        el.className = `og-dock-splitter og-dock-splitter__${upright ? "v" : "h"}`;
        el.addEventListener("pointerdown", (event) => this._onSplitterDown(event, zone, after));

        this._splitterLayer.appendChild(el);

        return el;
    }

    protected _positionSplitters(): void {
        const grab = this._grab;
        const half = grab * 0.5;

        for (const splitter of this._splitters) {
            const rect = splitter.zone.rect;
            const style = splitter.el.style;

            if (splitter.after === null) {
                const side = splitter.zone.side;

                if (isVertical(side)) {
                    style.left = `${(side === "left" ? rect.x + rect.width : rect.x) - half}px`;
                    style.top = `${rect.y}px`;
                    style.width = `${grab}px`;
                    style.height = `${rect.height}px`;
                } else {
                    style.left = `${rect.x}px`;
                    style.top = `${(side === "top" ? rect.y + rect.height : rect.y) - half}px`;
                    style.width = `${rect.width}px`;
                    style.height = `${grab}px`;
                }

                continue;
            }

            const offset = this._itemOffset(splitter.zone, splitter.after);

            if (splitter.zone.direction === "column") {
                style.left = `${rect.x}px`;
                style.top = `${rect.y + offset - half}px`;
                style.width = `${rect.width}px`;
                style.height = `${grab}px`;
            } else {
                style.left = `${rect.x + offset - half}px`;
                style.top = `${rect.y}px`;
                style.width = `${grab}px`;
                style.height = `${rect.height}px`;
            }
        }
    }

    protected _itemOffset(zone: DockZone, item: number): number {
        const { visible, total } = this._shares(zone);
        const length = zone.direction === "column" ? zone.rect.height : zone.rect.width;

        let before = 0;

        for (const index of visible) {
            if (index === item) break;

            before += zone.shares[index];
        }

        return (before / total) * length;
    }

    protected _onSplitterDown = (event: PointerEvent, zone: DockZone, after: number | null): void => {
        const el = event.currentTarget as HTMLElement;

        event.preventDefault();
        el.setPointerCapture(event.pointerId);
        el.classList.add("og-dock-splitter__active");

        const move = after === null ? this._zoneResizer(zone, event) : this._stackResizer(zone, after, event);

        const up = (upEvent: PointerEvent) => {
            el.releasePointerCapture(upEvent.pointerId);
            el.classList.remove("og-dock-splitter__active");
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerup", up);
            el.removeEventListener("pointercancel", up);
        };

        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
    };

    protected _zoneResizer(zone: DockZone, start: PointerEvent): (event: PointerEvent) => void {
        const startSize = zone.size;
        const startX = start.clientX;
        const startY = start.clientY;

        return (event: PointerEvent) => {
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;

            zone.size =
                zone.side === "left"
                    ? startSize + dx
                    : zone.side === "right"
                      ? startSize - dx
                      : zone.side === "top"
                        ? startSize + dy
                        : startSize - dy;

            this.layout();
        };
    }

    protected _stackResizer(zone: DockZone, after: number, start: PointerEvent): (event: PointerEvent) => void {
        const { visible, total } = this._shares(zone);
        const before = visible[visible.indexOf(after) - 1];
        const vertical = zone.direction === "column";
        const from = vertical ? start.clientY : start.clientX;
        const span = vertical ? zone.el.clientHeight : zone.el.clientWidth;
        const startBefore = zone.shares[before];
        const pair = startBefore + zone.shares[after];

        return (event: PointerEvent) => {
            // The pointer walks the whole side, the shares only cover the visible part of it
            const delta = (((vertical ? event.clientY : event.clientX) - from) / (span || 1)) * total;

            zone.shares[before] = Math.max(MIN_ITEM_SHARE, Math.min(pair - MIN_ITEM_SHARE, startBefore + delta));
            zone.shares[after] = pair - zone.shares[before];

            zone.items[before].el!.style.flex = `${zone.shares[before] / total} 1 0`;
            zone.items[after].el!.style.flex = `${zone.shares[after] / total} 1 0`;

            this._positionSplitters();
        };
    }

    protected _remember(dialog: Dialog<any>): void {
        const state = this._state(dialog);

        if (state.floating) return;

        const style = dialog.el!.style;

        state.floating = {
            left: style.left,
            top: style.top,
            width: style.width,
            height: style.height,
            position: style.position
        };
    }

    protected _restore(dialog: Dialog<any>): void {
        const floating = this._dialogs.get(dialog)?.floating;
        const style = dialog.el!.style;

        style.flex = "";

        if (!floating) return;

        style.left = floating.left;
        style.top = floating.top;
        style.width = floating.width;
        style.height = floating.height;
        style.position = floating.position;

        this._dialogs.get(dialog)!.floating = null;
    }

    protected _onPointerDown = (event: PointerEvent): void => {
        this._pointer = { x: event.clientX, y: event.clientY };
    };

    protected _onDragStart = (dialog: Dialog<any>): void => {
        if (this.isDocked(dialog)) {
            const width = dialog.width;
            const height = dialog.height;
            const rect = this._host.getBoundingClientRect();

            this.undock(dialog);

            dialog.setPosition(
                Math.max(0, this._pointer.x - rect.left - width * 0.5),
                Math.max(0, this._pointer.y - rect.top - 10)
            );

            dialog.el!.style.width = `${width}px`;
            dialog.el!.style.height = `${height}px`;
        }

        this._dragging = dialog;
        this._drop = null;

        document.addEventListener("mousemove", this._onDragMove);
        document.addEventListener("pointermove", this._onDragMove);
    };

    protected _onDragMove = (event: MouseEvent | PointerEvent): void => {
        if (!this._dragging) return;

        this._pointer = { x: event.clientX, y: event.clientY };
        this._drop = this._dropAt(event.clientX, event.clientY);

        this._showHint(this._drop);
    };

    protected _onDragEnd = (dialog: Dialog<any>): void => {
        document.removeEventListener("mousemove", this._onDragMove);
        document.removeEventListener("pointermove", this._onDragMove);

        const drop = this._drop;

        this._showHint(null);
        this._dragging = null;
        this._drop = null;

        if (drop) {
            this.dock(dialog, drop.side, drop.placement);
        }
    };

    protected _shownZone(side: DockSide): DockZone | null {
        const zone = this._zones.find((item) => item.side === side);

        return zone && this._visibleItems(zone).length ? zone : null;
    }

    protected _sideAt(clientX: number, clientY: number, host: DOMRect): DockSide | null {
        const x = clientX - host.left;
        const y = clientY - host.top;

        if (x < 0 || y < 0 || x > host.width || y > host.height) return null;

        // A side not in use yet has nothing to point at, so it is offered near the edge of
        // what the sides before it left free. This goes first: the middle covers that same
        // rectangle, and a dialog dragged over the map is not asking to be docked into it
        const free = this._free;
        const nearest = (
            [
                ["left", x - free.x],
                ["right", free.x + free.width - x],
                ["top", y - free.y],
                ["bottom", free.y + free.height - y]
            ] as [DockSide, number][]
        )
            .filter(([side]) => !this._shownZone(side))
            .sort((left, right) => left[1] - right[1])[0];

        if (nearest && nearest[1] >= 0 && nearest[1] <= this._edgeThreshold) {
            return nearest[0];
        }

        // A side already in use is aimed at by pointing anywhere over it - what is offered
        // is what is seen
        for (const zone of this._zones) {
            const rect = zone.rect;

            if (
                zone.side !== "center" &&
                this._visibleItems(zone).length &&
                x >= rect.x &&
                x <= rect.x + rect.width &&
                y >= rect.y &&
                y <= rect.y + rect.height
            ) {
                return zone.side;
            }
        }

        return null;
    }

    /** The band a side would occupy, whether it is in use yet or not. */
    protected _sideRect(side: DockSide): Rect {
        if (side === "center") return this._free;

        const shown = this._shownZone(side);

        if (shown) return shown.rect;

        const zone = this._zones.find((item) => item.side === side);
        const size = zone ? zone.size : this._dockSize(this._dragging, side);

        return this._band(this._free, side, size).zone;
    }

    protected _dropAt(clientX: number, clientY: number): { side: DockSide; placement: DockPlacement } | null {
        const host = this._host.getBoundingClientRect();
        const side = this._sideAt(clientX, clientY, host);

        if (!side) return null;

        const rect = this._sideRect(side);
        const along = isVertical(side)
            ? (clientY - host.top - rect.y) / (rect.height || 1)
            : (clientX - host.left - rect.x) / (rect.width || 1);
        const clamped = Math.max(0, Math.min(1, along));

        return {
            side,
            placement: clamped < END_BAND ? "start" : clamped > 1 - END_BAND ? "end" : "middle"
        };
    }

    protected _showHint(drop: { side: DockSide; placement: DockPlacement } | null): void {
        if (!drop) {
            this._hint.style.display = "none";
            return;
        }

        const zone = this._shownZone(drop.side);

        let rect = this._sideRect(drop.side);

        if (zone) {
            const visible = this._visibleItems(zone).length;

            if (visible > 0) {
                const direction = drop.placement === "middle" ? acrossDirection(drop.side) : alongDirection(drop.side);

                rect = this._slot(rect, direction, drop.placement === "start", visible);
            }
        }

        this._hint.style.display = "block";
        this._hint.style.left = `${rect.x}px`;
        this._hint.style.top = `${rect.y}px`;
        this._hint.style.width = `${rect.width}px`;
        this._hint.style.height = `${rect.height}px`;
    }
}
