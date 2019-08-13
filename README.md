# 简易 Webpack

## 项目介绍

原生 JS 实现 1个简易的Webpack, 支持 ES5, ES6 语法。

### 支持 ES5 语法

#### 创建源文件
./src/index.js
```
let action = require('./action.js').action;
let name = require('./name.js').name;

let message = `${name} is ${action}`;
console.log( message )
```
./src/action.js
```
let action = 'making webpack'

exports.action = action
```
./src/name.js
```
let familyName = require('./family-name').name

exports.name = `${familyName} ming`
```
.src/family-name.js
```
exports.name = 'xiao'
```

#### Step-1

通过一个函数对这些模块进行处理，通过外面传递进来的 require exports 函数对这些模块进行处理，require 函数处理引用关系得到结果，exports 函数导出结果。

```
//index.js
function(require, exports, module) {
  let action = require('./action.js').action
  let name = require('./name').name;

  let message = `${name} is ${action}`
  console.log( message )
}

//action.js
function(require, exports, module) {
  let action = 'making webpack'

  exports.action = action
}

//name.js
function(require, exports, module) {
  let familyName = require('./family-name.js').name

  exports.name = `${familyName} ming`
}

//family-name.js
function(require, exports, module) {
  exports.name = 'xiao'
}
```

#### Step-2

经过工具对源码进行处理后，生成 modules,所有的模块都放到这个对象中进行管理，方便后续的处理，webpack 处理后生成一个文件，这个文件就是下面的代码，就可以执行了。

```
modules = {
  0: function(require, exports) {
    let action = require('./action.js').action
    let name = require('./name').name

    let message = `${name} is ${action}`
    console.log( message )
  },

  1: function(require, exports) {
    let action = 'making webpack'

    exports.action = action
  },

  2: function(require, exports) {
    let familyName = require('./family-name.js').name

    exports.name = `${familyName} ming`
  },

  3: function(require, exports) {
    exports.name = 'xiao'
  }
}

//执行模块，返回结果
function exec(id) {
  let fn = modules[id]
  let exports = {}

  fn(require, exports)

  function require(path) {
    //todo...
    //根据模块路径，返回模块执行的结果
  }
}

exec(0)
```

#### Step-3

通过工具处理，源码变成 moudules 集合，解析过程中根据模块的引用路径构造出引用模块与ID的对应关系，方便根据路径找到对应的ID，再根据ID去处理下一个模块。
```
modules = {
0: [
    ...
    {
      './action.js': 1,
      './name.js': 2
    }
  ],
}
```

完整代码
```
modules = {
  0: [
    function (require, exports) {
      let action = require('./action.js').action
      let name = require('./name.js').name

      let message = `${name} is ${action}`
      console.log(message)
    },
    {
      './action.js': 1,
      './name.js': 2
    }
  ],

  1: [
    function(require, exports) {
      let action = 'making webpack'

      exports.action = action
    },
    {

    }
  ],

  2: [
    function(require, exports) {
      let familyName = require('./family-name.js').name

      exports.name = `${familyName} ming`
    },
    {
      './family-name.js': 3
    }
  ],

  3: [
    function(require, exports) {
      exports.name = 'xiao'
    },
    {

    }
  ]
}

//执行模块，返回结果
function exec(id) {
  let [fn, mapping] = modules[id]
  console.log(fn, mapping)
  let exports = {}

  fn && fn(require, exports)

  function require(path) {
    //执行模块路径对应的模块
    return exec(mapping[path])
  }

  //返回结果，也就是模块内部对 exports 做的处理
  return exports

}

exec(0)
```

测试

执行`node step_1-3.js`，会输出 'xiao ming is making webpack',表示正常运行。

**接下来对源码进行处理，生成一个文件，文件包含以上代码（最终打包后的浏览器可运行的代码）**

#### Step-4

执行函数不变，变化的是 modules，所以工具的核心是如何解析 JS 文件，分析他们之间的依赖，然后生成 modules

解析 js 文件的依赖
```
const fs = require('fs')
//读取文件内容
let fileContent = fs.readFileSync('./src/index.js')

function getDependencies(str) {
  let reg = /require\(['"](.+?)['"]\)/g
  let result = null
  let getDependencies = []
  //reg.exec(str)过滤出引用路径
  //第一次循环，匹配到'./action.js' 赋值给 result 并 push 到 dependencies 中
  //第二次循环，匹配到 './name.js' 赋值给 result 并 push 到 dependencies 中 
  //第三次循环，匹配到的值为 null 赋值给 result 退出循环
  while (result = reg.exec(str)) {
    console.log(result)
    getDependencies.push(result[1])  
  }

  //返回的结果 [ './action.js', './name.js' ]
  return getDependencies
}

console.log(getDependencies(fileContent))
```

测试

执行`node Step_4-7.js`，得到如下输出
```
[ 'require(\'./action.js\')',
  './action.js',
  index: 13,
  input: 'let action = require(\'./action.js\').action;\nlet name = require(\'./name.js\').name;\n\nlet message = `${name} is ${action}`;\nconsole.log( message )',
  groups: undefined ]
[ 'require(\'./name.js\')',
  './name.js',
  index: 55,
  input: 'let action = require(\'./action.js\').action;\nlet name = require(\'./name.js\').name;\n\nlet message = `${name} is ${action}`;\nconsole.log( message )',
  groups: undefined ]
[ './action.js', './name.js' ]
```

#### Step-5

对文件进行解析，得到一个对象 {id:xx, filename:xx, dependecies:xxx, code:xxx} 便于后续的处理（之前是一坨字符串）

```
const fs = require('fs')
let ID = 0

function getDependencies(str) {
  let reg = /require\(['"](.+?)['"]\)/g
  let result = null
  let getDependencies = []

  while (result = reg.exec(str)) {
    getDependencies.push(result[1])  
  }

  return getDependencies
}

function createAsset(filename) {
  let fileContent = fs.readFileSync(filename)
  const id = ID++
  return {
    id: id,
    filename: filename,
    dependencies: getDependencies(fileContent),
    //字符串拼接：构造 Step-3 中的部分代码...
    code: `
      function(require, export, module) {
        ${fileContent}
      }
    `
  }
}

let result = createAsset('./src/index.js')
console.log(result)
```

测试

运行`node Step_4-7.js`，输出结果
```
{ id: 0,
  filename: './src/index.js',
  dependencies: [ './action.js', './name.js' ],
  code:
   '\n      function(require, export, module) {\n        let action = require(\'./action.js\').action;\nlet name = require(\'./name.js\').name;\n\nlet message = `${na
me} is ${action}`;\nconsole.log( message )\n      }\n    ' 
}
```

#### Step-6











