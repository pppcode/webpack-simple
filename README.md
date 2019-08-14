# 简易 Webpack

## 项目介绍

原生 JS 实现一个简易的Webpack, 支持 ES5, ES6 语法。

### 支持 ES5 语法

遵循 CommonJS 规范，使用 ES5 语法，require exports

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

实现 Step-3 中的 modules

```
const fs = require('fs')
const path = require('path')

let ID = 0

function getDependencies(str) {
  let reg = /require\(['"](.+?)['"]\)/g;
  let result = null;
  let dependencies = [];
  while(result = reg.exec(str)) {
    dependencies.push(result[1]);
  }
  return dependencies;
}

function createAsset(filename) {
  let fileContent = fs.readFileSync(filename, 'utf-8');
  const id = ID++;
  return {
    id: id,
    filename: filename,
    dependencies: getDependencies(fileContent),
    code: `function(require, exports, module) { 
        ${fileContent}
    }`
  }
}

function createGraph(filename) {
  let asset = createAsset(filename)
  //对象变数组
  let queue = [asset]

  for(let asset of queue) {
    //获取当前文件所在的目录名，'./src/index.js' => './src'
    const dirname = path.dirname(asset.filename)
    asset.mapping = {}
    asset.dependencies.forEach(relativePath => {
      //createAsset()中的 readFileSync 读取文件，必须传入的是绝对路径，否则找不到
      //拼接路径，absolutePath = './src/action.js'
      const absolutePath = path.join(dirname, relativePath)
      //解析 './src/action.js' 这个文件
      const child = createAsset(absolutePath)
      //构造 {'./action':1, ...}
      asset.mapping[relativePath] = child.id
      //把解析好的模块放入到这个数组中
      queue.push(child)
    })
  }
  
  return queue
}

let result = createGraph('./src/index.js')
console.log(result)
```
测试

输出结果
```
[ { id: 0,
    filename: './src/index.js',
    dependencies: [ './action.js', './name.js' ],
    code:
     'function(require, exports, module) { \n        let action = require(\'./action.js\').action;\nlet name = require(\'./name.js\').name;\n\nlet message = `${name} 
is ${action}`;\nconsole.log( message )\n    }',
    mapping: { './action.js': 1, './name.js': 2 } },
  { id: 1,
    filename: 'src/action.js',
    dependencies: [],
    code:
     'function(require, exports, module) { \n        let action = \'making webpack\'\n\nexports.action = action\n    }',
    mapping: {} },
  { id: 2,
    filename: 'src/name.js',
    dependencies: [ './family-name.js' ],
    code:
     'function(require, exports, module) { \n        let familyName = require(\'./family-name.js\').name\n\nexports.name = `${familyName} ming`\n    }',
    mapping: { './family-name.js': 3 } },
  { id: 3,
    filename: 'src/family-name.js',
    dependencies: [],
    code:
     'function(require, exports, module) { \n        exports.name = \'xiao\'\n    }',
    mapping: {} } ]
```


#### Step-7

实现 Step-3 中的执行函数，并打包到一个文件中

```
const fs = require('fs');
const path = require('path');

let ID = 0;

function getDependencies(str) {
  let reg = /require\(['"](.+?)['"]\)/g;
  let result = null;
  let dependencies = [];
  while(result = reg.exec(str)) {
    dependencies.push(result[1]);
  }
  return dependencies;
}

function createAsset(filename) {
  let fileContent = fs.readFileSync(filename, 'utf-8');
  const id = ID++;
  return {
    id: id,
    filename: filename,
    dependencies: getDependencies(fileContent),
    code: `function(require, exports, module) { 
        ${fileContent}
    }`
  }
}

function createGraph(filename) {
  let asset = createAsset(filename);
  let queue = [asset];
  
  for(let asset of queue) {
    const dirname = path.dirname(asset.filename);
    asset.mapping = {};
    asset.dependencies.forEach(relativePath => {
      const absolutePath = path.join(dirname, relativePath);
      const child = createAsset(absolutePath);
      asset.mapping[relativePath] = child.id;
      queue.push(child);
    });

  }

  return queue;
}

//打包生成一个文件,把内容放到这个文件中
function createBundle(graph) {
  //生成 modules
  let modules = ''

  graph.forEach(mod => {
    modules += `
      ${mod.id}: [
        ${mod.code},
        ${JSON.stringify(mod.mapping)}
      ],
    `
  })

  //立即执行函数
  const result = `
    (
      function(modules) {
        function exec(id) {
          let [fn, mapping] = modules[id]
          console.log(fn, mapping)
          let exports = { exports: {} }
        
          fn && fn(require, module.exports, module)
        
          function require(path) {
            return exec(mapping[path])
          }

          return module.exports
        }
        exec(0)
      }
    )
    (
      {${modules}}
    )
  `
  //console.log(modules)
  fs.writeFileSync('./dist/bundle.js', result)
  //console.log(result)

}

let graph = createGraph('./src/index.js')
createBundle(graph)
```

测试

执行`node Step_4-7.js`生成 bundle.js, 在 dist 下执行`node bundle.js`,会输出`xiao ming is making webpack-es5`，至此实现了一个能够打包 ES5 语法的 Webpack。

### 支持 ES6 语法

使用 ES6 语法，import export。

实现上和 ES5 的差异主要是使用 babylon 把文件内容变成抽象语法树，在对抽象语法树进行遍历，得到 dependencies。

对文件进行结构化处理，得到一个对象 {id:xx, filename:xx, dependecies:xxx, code:xxx} ，再对处理好的文件进行解析，并打包到一个文件中

```
const fs = require('fs');
const path = require('path');
//此工具把源码变成抽象语法树
const babylon = require('babylon');
//遍历语法树
const traverse = require('babel-traverse').default;
const babel = require('babel-core');

let ID = 0;

function createAsset(filename) {
  //传递文件名，读取文件，得到文件内容
  const content = fs.readFileSync(filename, 'utf-8');
  
  //把当前文件内容变成语法树对象
  const ast = babylon.parse(content, {
    sourceType: 'module'
  });
  
  
  const dependencies = [];

  //遍历语法树
  traverse(ast, {
    //对 import 的代码进行过滤
    ImportDeclaration: ({node}) => {
      //console.log(node)
      //value = './message.js',把依赖的模块路径放入到 dependencies 中
      //得到里面的 source value 就可以把依赖全部拿出来
      dependencies.push(node.source.value);
    }
  })

  //console.log(dependencies);
  const id = ID++

  //抽象语法树进行转义处理，ES6 转码为 ES5
  const {code} = babel.transformFromAst(ast, null, {
    presets: ['env'],
  });

  return {
    id,
    filename,
    dependencies,
    code,
  }
}

//test
console.log( createAsset('./src/index.js') )

//对处理好的文件进行解析，并打包到一个文件中
function createGraph(entry) {
  const mainAsset = createAsset(entry);
  const queue = [mainAsset];

  //构造模块对象的数组
  for(const asset of queue) {
    const dirname = path.dirname(asset.filename)

    asset.mapping = {}

    asset.dependencies.forEach(relativePath => {
      const absolutePath = path.join(dirname, relativePath);

      const child = createAsset(absolutePath);

      asset.mapping[relativePath] = child.id

      queue.push(child)
    })
  }

  return queue;
}

function bundle(graph) {
  let modules = '';

  graph.forEach(mod => {
    modules += `${mod.id}: [
      function(require, module, exports) { ${mod.code} },
      ${JSON.stringify(mod.mapping)}
    ],`;
  });

  const result = `
    (function(modules){
      function require(id) {
        const [fn, mapping] = modules[id];

        function locateRequire(relativePath) {
          return require(mapping[relativePath])
        }

        const module = { exports: {} };
        fn(locateRequire, module, module.exports);
        return module.exports;
      }
      require(0);
    })({${modules}})
  `;


  fs.writeFileSync('./dist/bundle.js', result)
}

const graph = createGraph('./src/index.js');
bundle(graph);
```

测试：处理好的文件

运行`node main.js`,输出如下结果，code 转为 ES5 的语法

```
{ id: 0,
  filename: './src/index.js',
  dependencies: [ './message.js' ],
  code:
   '"use strict";\n\nvar _message = require("./message.js");\n\nvar _message2 = _interopRequireDefault(_message);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }
; }\n\nconsole.log(_message2.default);' }
```

测试：最终效果

运行`node main.js`，生成`./dist/bundle.js`，进入到`dist`下，`node bundle.js`，输出结果`xiaoming is making webpack-es6`。

**要点**
代码转化成语法树

AST 在线转换工具：https://astexplorer.net/

```
import {name} from './name.js'
console.log(name)

export default `hello ${name}`
```
```
import {name} from './name.js'
```
转化后，通过`source.value`拿到依赖的模块路径





























