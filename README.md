[![NPM PACKAGE](https://img.shields.io/npm/v/@openglobus/og.svg?logo=npm&logoColor=fff&label=NPM+package&color=limegreen)](https://www.npmjs.com/package/@openglobus/og)
![BUILD](https://github.com/openglobus/openglobus/actions/workflows/push.yml/badge.svg)

# OpenGlobus

[openglobus](https://www.openglobus.org/) is a typescript/javascript library designed to display interactive 3D maps and other geospatial data at a
scale from planet to bee.

It supports various high-resolution terrain providers, imagery layers, renders thousands of 3D objects, provides
geometry measurement tools, and more. It uses the WebGL technology, open-source and
completely free.

OpenGlobus's main goal is to make 3D map features fast, good-looking, user-friendly, and easy to implement in any
related project.

## Getting Started

### Installation

```sh
npm install @openglobus/og
```

### Fast initialization

Create your first OpenGlobus application with the [create-openglobus](https://www.npmjs.com/package/create-openglobus) template. It supports JS, TS, React, and more.

Run:

```sh
npx create-openglobus
```

## React Integration

The OpenGlobus React module is available in the [openglobus-react](https://github.com/openglobus/openglobus-react) package.

```sh
npm i @openglobus/openglobus-react
```

## Documentation and Examples

- [Examples](https://sandbox.openglobus.org)
- [Wiki](https://github.com/openglobus/openglobus/wiki)
- [API documentation](https://openglobus.github.io/docs/)

## Get Started Contributing

### Development

1. Clone the repository.
2. Run in the repository folder:

```sh
npm install
```

### Build Library

Run

```sh
npm run build
```

This generates files in `lib/`:

- og.es.js
- og.es.js.map
- og.css
- ./res/...

### Run examples

First, it starts by watching sources and building into ./lib folder es module:

```sh
npm run dev
```

Second, run a local server. Then open `http://127.0.0.1:3000`:

```sh
npm run serve
```

or

```sh
npm run dev_serve
```

Third, try an example from the sandbox:

```sh
http://127.0.0.1:3000/sandbox/osm/osm.html
```

### Other scripts

`npm run docs` - build [api documentation](https://openglobus.github.io/docs/) into `docs/`

`npm run serve` - run local web server for develop and watch examples

`npm run lint` - run code linter

`npm run format` - format code and docs with Prettier

`npm run format:check` - check formatting with Prettier (non-modifying)

`npm run test` - run tests

`npm run dts` - generate TypeScript declarations

## Contributor Resources

- [Contributing guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Style guide](STYLEGUIDE.md)
- [Changelog](CHANGELOG.md)
- [Open an issue](https://github.com/openglobus/openglobus/issues/new/choose)
- [Start a discussion](https://github.com/openglobus/openglobus/discussions)
- [Open a pull request](https://github.com/openglobus/openglobus/compare)

## Support the Project

There are many ways to contribute back to the project:

- Help us test new and existing features and report [bugs](https://github.com/openglobus/openglobus/issues)
- Help answer questions on the community [forum](https://github.com/openglobus/openglobus/discussions)
  and [chat](https://gitter.im/openglobus/og)
- ⭐️ us on GitHub
- Spread the word about openglobus on [social media](https://twitter.com/openglobus)
- Become a contributor
- [Support with money](https://opencollective.com/openglobusjs)

## License

### Apache-2.0
