[![Build Status](https://travis-ci.com/openglobus/openglobus.svg?branch=master)](https://travis-ci.com/openglobus/openglobus)[![Join the chat at https://gitter.im/openglobus/og](https://badges.gitter.im/openglobus/og.svg)](https://gitter.im/openglobus/og?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# OpenGlobus

[OpenGlobus](http://www.openglobus.org/) （TOTRANSLATE）

## 起步

### 安装

```sh
npm install @openglobus/og
# 或者
yarn add @openglobus/og
```

### 代码：使用 umd 引用

``` html
<link rel="stylesheet" href="./libs/og-0.8.10.css">
<script src="./libs/og-0.8.10-umd.js"></script>
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
    viewExtent: [108.28125, 20.63278, 118.125, 25.79989] // 广州上空
  })

</script>
```

### 代码：使用 esm 引用

```html
<link rel="stylesheet" href="./libs/og-0.8.10.css">
<div id="globus"></div>
<script type="module">

  import { layer, Globe, terrain } from './libs/og-0.8.10-esm.js'
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
    viewExtent: [108.28125, 20.63278, 118.125, 25.79989] // 广州上空
  })

</script>
```



## 文档

（TOTRANSLATE）



## 开始贡献你的代码

### 开发

1. 仓库 Clone 
2. 使用 `npm` 安装依赖

``` sh
npm install
```

### 构建完整的库

运行命令

``` sh
npm run build
```

### 其他命令

（TOTRANSLATE）



## 支持此项目

有多种方式来贡献此项目：

- （TOTRANSLATE）



## 开源许可

MIT
=======

[![Build Status](https://travis-ci.com/openglobus/openglobus.svg?branch=master)](https://travis-ci.com/openglobus/openglobus) ![Join the chat at https://gitter.im/openglobus/og](https://badges.gitter.im/openglobus/og.svg)

