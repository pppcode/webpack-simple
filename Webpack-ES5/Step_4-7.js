//需要一个工具，可以对源码进行处理，生成一个文件，文件中包含了一堆字符串，也就是step_1-3的内容 即可

/*
//Step-4
//执行函数不变，变化的是 modules，所以工具的核心是如何解析 JS 文件，分析他们之间的依赖，然后生成 modules
//解析 js 文件的依赖

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
*/


/*
//Step-5
//对文件进行解析，得到一个对象 {id:xx, filename:xx, dependecies:xxx, code:xxx} 便于后续的处理（之前是一坨字符串）

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
*/


/*
//Step-6
//实现 Step-3 中的 modules 
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
*/

//Step-7
//实现 Step-3,并打包到一个文件中
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





