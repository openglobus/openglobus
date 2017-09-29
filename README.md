# OpenGlobus

[OpenGlobus](http://www.openglobus.org/) is a javascript library designed to display interactive 3d maps and planets with map tiles, imagery and vector data, markers and 3d objects. It uses the WebGL technology, open source and completely free.

## Documentation

Check out the [hosted examples](http://www.openglobus.org/examples.html), or the [API documentation](http://www.openglobus.org/api/).

## Get Started to contribute

### Development

1. Clone repositiory.
2. Run **npm install** in the repo folder.
3. Bind openglobus repo folder with http server virtual directory. 
4. Now you can open sandbox example --virtual directory name--/sandbox/1/index.html (or create your own) in a browser, and change sources.
  
### Build

1. Development steps have to be made.
2. When you adds js module with goog.provide and require always run **/build/makedeps.bat** to modify **/src/og/og-deps.js** script. Now you can see changes you've made.
3. Run **/build/build.bat** to create **/buid/og.js** build. BTW: check **/build/all.js** out to add your module in the neccessary assemblage.
