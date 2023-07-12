
const {
  readSource,
  addPrefixBeforeImportInHtml,
  addPrefixBeforeImportInJs,
  loadPkg,
  loadVue
} = require('./source');

function send(res, source, mime) {
  res.setHeader('Content-Type', mime)
  res.end(source)
}

const vueMiddleware = (options, container) => {
  return async (req, res, next) => {
    let id = req.path;
    const resolve = container.resolveId(req.path);
    if (resolve.id) {
      id = resolve.id;
    }
    console.log(id, 'id')
    if (id.endsWith('.js')) {
      // js相关
      const { source } = await readSource(req.path);
      const newJsContent = addPrefixBeforeImportInJs(source);
      send(res, newJsContent, 'application/javascript');
    } else if (id === '/' || id.endsWith('.html')) {
      // html相关
      const { source } = await readSource(req.path === '/' ? 'index.html' : req.path);
      const newHtmlContent = addPrefixBeforeImportInHtml(source);
      send(res, newHtmlContent, 'text/html');
    } else if (id.startsWith('/__modules/')) {
       // 读取路径对应的node_modules对应的esm文件路径
      const pkgName = id.replace('/__modules/', '');
      // 加载依赖的browser-esm版本的代码
      const { source } = await loadPkg(pkgName);
      send(res, source, 'application/javascript')
    } else if (id.endsWith('.vue')) {
      const { source } = await loadVue(id)
      send(res, source, 'application/javascript')
    } else {
      next();
    }
  }
}

module.exports.vueMiddleware = vueMiddleware;