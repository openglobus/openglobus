'use strict';

/* 
* Helper functions for UI/UX
*/

// Creates new DOM elements and assigns attributes
export function elementFactory(type, attributes, ...children) {
    const el = document.createElement(type)
    let key = null;
    for (key in attributes) {
        el.setAttribute(key, attributes[key])
    }

    children.forEach(child => {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child))
        } else {
            el.appendChild(child)
        }
    })

    return el;
}

// Appends array of children to parent
export function appendChildren(parent, childrenArray) {
    childrenArray.forEach(child => parent.appendChild(child))
}

// Cycles an array of text and outputs next
export function toggleText(elementText, textArray) {
    let textIndex = textArray.indexOf(elementText);
    let nextIndex;
    textIndex >= 0 && textIndex < textArray.length - 1 ?
        nextIndex = textIndex + 1 :
        nextIndex = 0;
    return textArray[nextIndex];
}

// Enables a movement of a DOM element. Also disables/enables mouse navigations for og-planet
export function enableElmovement(el, planet) {

    let newPosX = 0,
        newPosY = 0,
        startPosX = 0,
        startPosY = 0;

    const behaviour = (e) => {
        e.preventDefault();
        planet.renderer.controls.mouseNavigation.deactivate()
        // get the starting position of the cursor
        startPosX = e.clientX;
        startPosY = e.clientY;

        document.addEventListener('mousemove', mouseMove);

        document.addEventListener('mouseup', function (e) {
            document.removeEventListener('mousemove', mouseMove);
            planet.renderer.controls.mouseNavigation.activate();
        });
    }

    const mouseMove = (e) => {
        // calculate the new position
        newPosX = startPosX - e.clientX;
        newPosY = startPosY - e.clientY;

        // with each move we also want to update the start X and Y
        startPosX = e.clientX;
        startPosY = e.clientY;

        // set the element's new position:
        el.style.top = (el.offsetTop - newPosY) + "px";
        el.style.left = (el.offsetLeft - newPosX) + "px";
    }

    return { behaviour, mouseMove }
}

// Get all nodes of a class
export function getAllnodes(CSSclass) {
    return document.querySelectorAll(CSSclass);
}

// Convert nodelist to an Array
export function nodesToArray(nodeList) {
    return Array.from(nodeList);
}

// Adds a class to all elements selected
export function setAllCSSclass(CSSclass, nodeArray) {
    return nodeArray.forEach(x => x.classList.add(CSSclass));
}

// Sets all menu buttons to off
export function allMenuBtnOFF() {
    setAllCSSclass('og-OFF', nodesToArray(getAllnodes('.og-menu-btn')));
}

// Hides all dialoges of main menu
export function allDialogsHide() {
    setAllCSSclass('og-hide', nodesToArray(getAllnodes('.og-dialog')));
}

function isString(v) {
    return typeof v === 'string' || v instanceof String;
}

// Handles the click inside/outside a dialog - closes dialog when click outside
export function btnClickHandler(btn_id, dialog_id, dialog_selector, btn_icon_id, callback) {
    let btn = isString(btn_id) ? document.getElementById(btn_id) : btn_id;
    let dialog = document.getElementById(dialog_id);
    btn.onclick = function (e) {
        
        let off = true;
        
        if (this.classList.contains('og-OFF')) {
            // Turn to ON
            off = false;
            allMenuBtnOFF();
            allDialogsHide();
            this.classList.remove('og-OFF');
            if (dialog) {
                dialog.classList.remove('og-hide');
            }

            if (this.classList.contains('og-has-dialog')) {
                document.addEventListener('click', (e) => {
                    if (e.target.matches(dialog_selector) || e.target.matches(btn_icon_id)) { //inside
                        return;
                    } else {//outside
                        btn.classList.add('og-OFF');
                        if (dialog) {
                            dialog.classList.add('og-hide')
                        }
                        // TODO needs fix
                        // this.removeEventListener('click', arguments.callee);
                    }
                })
            }
        } else {
            // Turn to OFF
            off = true;
            this.classList.add('og-OFF');
            if (dialog) {
                dialog.classList.add('og-hide');
            }
        }
        
        if (callback && typeof callback === 'function'){
            callback(off);
        }
    }
}