const path = require('path');
const esbuild = require('esbuild');
const scanPlugin = require('./scan-plugin');

module.exports = async (root) => {
  // 1.确定入口
  // 这里暂时约定为/demo/index.html
  const entryHtml = path.resolve(root, './index.html');

  const js = `import "${entryHtml}"`
  
  // 2.从入口处扫描依赖
  const deps = new Set();
  await esbuild.build({
    absWorkingDir: root,
    stdin: {
      contents: js,
      loader: 'js'
    },
    bundle: true,
    format: 'esm',
    write: false, // 不用输出文件，只做扫描
    plugins: [scanPlugin(deps)],
    preserveSymlinks: false
  })
  console.log(
    `"需要构建的依赖":\n${
      [...deps].map(item => '  ' + item).join('\n')}`
  )

  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [...deps],
    format: 'esm',
    bundle: true,
    splitting: true,
    outdir: path.resolve(process.cwd(), './node_modules/__m-vite')
  })
}