'use strict'

// Used to compose other functions,
// in a specific order to return to desired output.

const compose = x => ({
    run: f => compose(f(x)), // runs the function 
    runForEach: f => compose(x.map(el => f(el))), // runs the function for an array
    end: () => x, // result
})

export {compose}

