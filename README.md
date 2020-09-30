# babel-plugin-custom-import

[![NPM version](https://img.shields.io/npm/v/babel-plugin-custom-import.svg?style=flat)](https://npmjs.org/package/babel-plugin-custom-import) [![NPM downloads](http://img.shields.io/npm/dm/babel-plugin-custom-import.svg?style=flat)](https://npmjs.org/package/babel-plugin-custom-import)

## Intro

It's a babel plugin to transform the ESM (`import`) syntax to your own call expression (e.g. `__my_require__()`) , in order to passby webpack's compiling.

## Installation

```sh
yarn add -D babel-plugin-custom-import
```

## Usage

webpack config -> babel plugin

```javascript
// webpack.config.js

module.exports = {
  entry: {
    // ...
  },
  output: {
    // ...
  },
  module: {
    rules: [
      {
        test: /\.js|jsx$/,
        use: {
          loader: "babel-loader",
          options: {
            plugins: [
              // default configuration
              "babel-plugin-custom-import",
              // custom configuration
              [
                "babel-plugin-custom-import",
                {
                  externalScheme: "^runtime:",
                  syncFunc: "__my_require__",
                  asyncFunc: "__my_require__",
                  asyncFuncAttr: "async",
                  isReplaceScheme: true
                }
              ]
            ]
          }
        }
      }
    ]
  }
  // ...
};
```

## Example

Then, source code

```javascript
import main from "runtime:main";
import * as util from "runtime:util";
import { add } from "runtime:calc";
import { Nav as Mynav, Banner } from "runtime:common/component";
import "runtime:common/reset";

import("runtime:calc/divide").then(divide => {
  alert(divide(3, 2));
});
```

will be transformed to (webpack bundles output)

```javascript
var main = __my_require__("main")["default"];
var util = __my_require__("util");
var add = __my_require__("calc")["add"];
var Mynav = __my_require__("common/component")["Nav"];
var Banner = __my_require__("common/component")["Banner"];
__my_require__("common/reset");

__my_require__.async("calc/divide").then(divide => {
  alert(divide(3, 2));
});
```
