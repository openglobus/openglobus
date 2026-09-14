const { version } = require("./package.json");

module.exports = {
  "source" : {
    "include" : [
      "README.md"
    ],
    "includePattern" : "(.js$|.ts$)",
    "excludePattern" : "(node_modules/|docs)"
  },
  "plugins" : [
    "plugins/markdown",
    "node_modules/jsdoc-babel"
  ],
  "opts" : {
    "encoding" : "utf8",
    "readme" : "./README.md",
    "destination" : "./docs",
    "recurse" : true,
    "private" : false,
    "lenient" : true,
    "template" : "./node_modules/clean-jsdoc-theme/dist",
    "basePath": "/docs",
    "siteName": `OpenGlobus v${version}`
  },
  "babel": {
    "extensions": ["ts", "tsx"],
    "ignore": ["**/*.(test|spec).ts"],
    "babelrc": false,
    "presets": [["@babel/preset-env", { "targets": { "node": true } }], "@babel/preset-typescript"],
    "plugins": ["@babel/proposal-class-properties", "@babel/proposal-object-rest-spread"]
  },
  "markdown" : {
    "hardwrap" : false,
    "idInHeadings" : true
  }
};
