[![NPM PACKAGE](https://img.shields.io/npm/v/@openglobus/og.svg?logo=npm&logoColor=fff&label=NPM+package&color=limegreen)](https://www.npmjs.com/@openglobus/og)

# Openglobus

[English](README.md) | [简体中文](README_CN.md) | Portuguese-BR

[Openglobus](http://www.openglobus.org/) é uma biblioteca projetada para dispor um mapa 3D para planetas
por meio de "tiles maps" (mapa ou imagens em ladrilho), imagens e dados em vetores, marcadores e objeto 3D. Usando tecnologia WebGL , de código aberto e completamente livre.

O principal objetivo do Openglobus é proporcionar um mapa 3D leve e rápido, com boa aparencia, de interface amigável e fácil implementação para qualquer projeto.

## Começando

### Instalação

```sh
npm install @openglobus/og
# or
yarn add @openglobus/og
```

### Código: usando umd lib

```html
<link rel="stylesheet" href="./libs/og.css">
<script src="./libs/og.umd.js"></script>
<div id="globus"></div>
<script>

  const osm = new og.layer.XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
  })

  const globus = new og.Globe({
    target: "globus", // a HTMLDivElement which its id is `globus`
    name: "Earth",
    terrain: new og.terrain.GlobusTerrain(),
    layers: [osm],
    autoActivated: true,
    viewExtent: [5.56707, 45.15679, 5.88834, 45.22260]
  })

</script>
```

### Código: usando esm lib

``` html
<link rel="stylesheet" href="./libs/og.css">
<div id="globus"></div>
<script type="module">

  import { layer, Globe, terrain } from './libs/og.esm.js'
  const { XYZ } = layer
  const { GlobusTerrain } = terrain

  const osm = new XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
  })

  const globus = new Globe({
    target: "globus", // a HTMLDivElement which its id is `globus`
    name: "Earth",
    terrain: new GlobusTerrain(),
    layers: [osm],
    autoActivated: true,
    viewExtent: [5.56707, 45.15679, 5.88834, 45.22260]
  })

</script>
```

## Integrações de Frameworks 

Openglobus se integra bem com frameworks como React, Angular ou Vuejs [Read more here](./framework-intergration.md).

## Documentação

De uma olhada em: [hosted examples](http://www.openglobus.org/examples.html), or
the [API documentation](http://www.openglobus.org/api/).

## Comece a contribuir

### Desenvolvimento

1. Clone repository.
2. Run in the repo folder:

```sh
npm install
# if you use yarn, you can run `yarn`
yarn
```

### Construindo Bibliotecas

Run

```sh
npm run build
```

Then, it will generate 5 files at `dist/@openglobus/`:

- og.umd.js
- og.umd.js.map
- og.esm.js
- og.esm.js.map
- og.css

All JavaScript files are compressed by `terser` plugin.

### Outros scripts

`npm run core` - build og.core (rendering engine) stand-alone

`npm run webgl` - build og.webgl (webgl wrap) stand-alone

`npm run docs` - build [documentation](https://www.openglobus.org/api/) into /api folder

`npm run serve` - run local web server for develop and watch examples

`npm run font` - generate custom font atlas

## Ajude o projeto

Há varias maneiras de contribuir com o projeto:

- Ajudando a testar e reportando problemas [bugs](https://github.com/openglobus/openglobus/issues)
- Ajudando a fazer perguntas [forum](https://groups.google.com/d/forum/openglobus)
  e [chat](https://gitter.im/openglobus/og)
- ⭐️ Estamos no Github
- Espalhe coisas sobre o openglobus no [social media](https://twitter.com/openglobus)
- Se torne um contribuidor

## Licença

MIT
=======
