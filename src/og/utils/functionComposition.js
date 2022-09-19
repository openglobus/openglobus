'use strict'

// HELPER for function composition

// Basically, it's a function used to compose other functions,
// in a specific order to return to desired output.

const compose = x => ({
    run: f => compose(f(x)), // runs the function 
    runForEach: f => compose(x.map(el => f(el))), // runs the function for an array
    end: () => x, // result
})

export {compose}

// Example

// const lower = str => str.toLowerCase();
// const sanitize = str => str.replace(/[^a-z0-9 -]/g, '');
// const clean = str => str.replace(/\\\\s+/gm, '-');

// const slugify = str => compose(str)
//   .run(lower)
//   .run(sanitize)
//   .run(clean)
//   .end();

// console.log(slugify('I love $$$ noodles')); // i-love-noodles