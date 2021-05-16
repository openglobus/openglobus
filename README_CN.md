[![Build Status](https://travis-ci.com/openglobus/openglobus.svg?branch=master)](https://travis-ci.com/openglobus/openglobus)[![Join the chat at https://gitter.im/openglobus/og](https://badges.gitter.im/openglobus/og.svg)](https://gitter.im/openglobus/og?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# OpenGlobus

[OpenGlobus](http://www.openglobus.org/) 是一个用于展示带有地图瓦片、影像、矢量数据、标注、三维物体的交互式三维地图（地球）的 JavaScript 库。它基于 WebGL 技术，开源且免费。

这个库的主要目标是令三维地图的功能迅速且美观地展示，并且对用户友好，易于在相关的项目中实施。

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

查看[在线示例](http://www.openglobus.org/examples.html)，或者查看 [API 帮助文档](http://www.openglobus.org/api/)。



## 如何贡献你的代码

### 开发

1. 将官方仓库 Clone 到本机
2. 使用 `npm` 或 `yarn` 安装依赖

``` sh
npm install
# 或
yarn
```

### 打包代码

运行命令

``` sh
npm run build
```

随后会在 `dist/@openglobus/` 目录下生成下列 5 个文件：

- og-<当前版本\>-umd.js
- og-<当前版本\>-umd.js.map
- og-<当前版本\>-esm.js
- og-<当前版本\>-esm.js.map
- og-<当前版本>.css

其中，js 文件均使用 `terser` 插件进行了代码压缩。

### 其他命令

`npm run core` - 仅构建 og.core （渲染引擎）

`npm run webgl` - 仅构建 og.webgl （WebGL 的封装部分）

`npm run api` - 本地构建 API 帮助文档至 `/api` 目录

`npm run serve` - 运行本地 Web 服务器以便开发以及查看示例代码

`npm run font` - 生成自定义的字体集



## 支持此项目

有多种方式来贡献此项目：

- 帮助我们测试新的或现有的功能，并[提交 bug](https://github.com/openglobus/openglobus/issues)
- 帮助我们在[谷歌 OpenGlobus 社区](https://groups.google.com/d/forum/openglobus)回答问题以及在 Gitter 上[交流](https://gitter.im/openglobus/og)
- 为 GitHub 上的仓库打个 ⭐
- 在社交媒体上传播 OpenGlobus，推特：[点我](https://twitter.com/openglobus)
- [捐助](https://donorbox.org/openglobus)
- 成为一名贡献者



## 开源许可

MIT
=======

[![Build Status](https://travis-ci.com/openglobus/openglobus.svg?branch=master)](https://travis-ci.com/openglobus/openglobus) ![Join the chat at https://gitter.im/openglobus/og](https://badges.gitter.im/openglobus/og.svg)

