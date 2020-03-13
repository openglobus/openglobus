'use strict';

class Boom {
    constructor(id) {
        this.id = id;
    }
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
}

function repeat(cb, type) {
    console.log(`%c Started data ${type}`, 'color: red');
    const start = performance.now();
    for (let i = 0; i < repeats; i++) {
        cb();
    }
    const end = performance.now();
    console.log('Finished data locality test run in ', ((end - start) / 1000).toFixed(4), ' seconds');
    return end - start;
}

const ROWS = 1000;
const COLS = 1000;
const repeats = 100;
const arr = new Array(ROWS * COLS).fill(0).map((a, i) => new Boom(i));

class Test {
    constructor() {
        this.arr = new Array(ROWS * COLS).fill(0).map((a, i) => new Boom(i));
    }

    localAccess() {
        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                this.arr[i * ROWS + j].x = 0;
            }
        }
    }

    repeat(cb, type) {
        console.log(`%c Started data ${type}`, 'color: red');
        const start = performance.now();
        for (let i = 0; i < repeats; i++) {
            cb();
        }
        const end = performance.now();
        console.log('Finished data locality test run in ', ((end - start) / 1000).toFixed(4), ' seconds');
        return end - start;
    }

    start() {
        const start = performance.now();
        const diffArr = new Array(ROWS * COLS).fill(0);

        for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < ROWS; row++) {
                diffArr[row * ROWS + col] = this.arr[col * COLS + row];
            }
        }
        this.repeat(() => {
            this.access(diffArr);
        }, 'Local this');

        const end = performance.now();
        console.log('This test finished in ', ((end - start) / 1000).toFixed(4), ' seconds');
    }

    access(diffArr) {
        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                diffArr[j * ROWS + i].x = 0;
            }
        }
    }
};

let test = new Test();

window.test = test;


function localAccess() {
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            arr[i * ROWS + j].x = 0;
        }
    }
}

function farAccess() {
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            arr[j * ROWS + i].x = 0;
        }
    }
}

repeat(farAccess, 'Non Local');

repeat(localAccess, 'Local');


/*
const diffArr = new Array(ROWS * COLS).fill(0);
for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
        diffArr[row * ROWS + col] = arr[col * COLS + row];
    }
}

function farAccess2(array) {
    let data = arr;
    if (array) {
        data = array;
    }
    for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
            data[j * ROWS + i].x = 0;
        }
    }
}

repeat(localAccess, 'Local');
setTimeout(() => {
    repeat(farAccess2, 'Non Local')
    setTimeout(() => {
        repeat(() => farAccess2(diffArr), 'Non Local Sorted')
    }, 2000);
}, 2000);
*/