
const { builtinModules } = require('module');
// 判断模块是否为内置模块
function isBuiltIn(moduleName) {
  return builtinModules.indexOf(moduleName) >= 0
}

const dynamicImport = new Function('file', 'return import(file)')

module.exports = {
  isBuiltIn,
  dynamicImport
}