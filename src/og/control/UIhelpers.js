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
    let textIndex = textArray.indexOf(elementText)
    var nextIndex = 0
    textIndex >= 0 && textIndex < textArray.length - 1 ?
        nextIndex = textIndex + 1 :
        nextIndex = 0
    return textArray[nextIndex]
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
            document.removeEventListener('mousemove', mouseMove)
            planet.renderer.controls.mouseNavigation.activate()
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

    return {behaviour, mouseMove}
}