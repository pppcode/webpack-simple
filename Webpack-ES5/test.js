

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




// [{ id: 0,
//   filename: './src/index.js',
//   dependencies: [ './action.js', './name' ],
//   mapping: {'./action.js': 1, './name': 2 }
//   code:
//    'function(require, exports, module) { \n        let action = require(\'./action.js\').action;\nlet name = require(\'./name\').name;\n\nlet message = `${name} is ${action}`;\nconsole.log( message );\n    }' 
//   },
//   { id: 1,
//     xxx
//   }
// ] 
 

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
      console.log(queue)
    });

  }


  return queue;
}

let result = createGraph('./src/index.js');
console.log(result)
