
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
      {
      0: [
        function(require, exports, module) { 
        let action = require('./action.js').action;
let name = require('./name.js').name;

let message = `${name} is ${action}`;
console.log( message )
    },
        {"./action.js":1,"./name.js":2}
      ],
    
      1: [
        function(require, exports, module) { 
        let action = 'making webpack-es5'

exports.action = action
    },
        {}
      ],
    
      2: [
        function(require, exports, module) { 
        let familyName = require('./family-name.js').name

exports.name = `${familyName} ming`
    },
        {"./family-name.js":3}
      ],
    
      3: [
        function(require, exports, module) { 
        exports.name = 'xiao'
    },
        {}
      ],
    }
    )
  