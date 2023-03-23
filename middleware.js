
const { readSource, addPrefixBeforeImportInHtml, addPrefixBeforeImportInJs, getBrowerEsmFilePath } = require('./source');

function send(res, source, mime) {
  res.setHeader('Content-Type', mime)
  res.end(source)
}

const vueMiddleware = (options) => {
  return async (req, res, next) => {
    // console.log(req.path)
    if (req.path.endsWith('.js')) {
      // js相关
      const { source } = await readSource(req.path);
      const newJsContent = addPrefixBeforeImportInJs(source);
      send(res, newJsContent, 'application/javascript');
      // console.log(jsContent)
    } else if (req.path === '/' || req.path.endsWith('.html')) {
      // html相关
      const { source } = await readSource(req.path === '/' ? 'index.html' : req.path);
      const newHtmlContent = addPrefixBeforeImportInHtml(source);
      send(res, newHtmlContent, 'text/html');
    } else if (req.path.startsWith('/__modules/')) {
       // 读取路径对应的node_modules对应的esm文件路径
       const pkgName = req.path.replace('/__modules/', '');
       // 加载依赖的browser-esm版本的代码
       const { source } = loadkg(pkgName);
       send(res, source, 'application/javascript')
    } else {
      next();
    }
  }
}

module.exports.vueMiddleware = vueMiddleware;