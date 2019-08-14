//Step-1
//对文件进行机构化处理，得到一个对象 {id:xx, filename:xx, dependencies:xxx, code:xxx} 

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
//console.log( createAsset('./src/index.js') )

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

