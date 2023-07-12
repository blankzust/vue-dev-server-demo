const path = require('path');
const esbuild = require('esbuild');
const fs = require('fs');
const { BARE_IMPORT_RE } = require('../prebundle/constants');
const { isBuiltIn, dynamicImport } = require('./utils');
const { pathToFileURL } = require('url')
// const import = require('module');

function bundleConfigFile(filePath) {
  esbuild.build({
    entryPoints: [filePath],
  })
}

async function resolveConfig() {
  const config = loadConfigFromFile()
}

async function loadConfigFromFile(configEnv, configRoot = process.cwd()) {
    const configFile = path.resolve(configRoot, 'mvite.config.js');

    let isESM = false;

    const packagePath = path.resolve(configRoot, 'package.json');

    const packageJson = JSON.parse(fs.readFileSync(packagePath));

    isESM = packageJson.type === 'module';

    const res = await bundleConfigFile(configFile, isESM, configRoot)

    const configTimestamp = `mvite.config.js.timestamp:${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
    return (await import('data:text/javascript;base64,' +
      Buffer.from(`${res.code}\n//${configTimestamp}`).toString(
        'base64',
      )
    )).default
}

async function bundleConfigFile(fileName, isESM, configRoot = process.cwd()) {
  const dirnameVarName = '__vite_injected_original_dirname'
  const filenameVarName = '__vite_injected_original_filename'
  const importMetaUrlVarName = '__vite_injected_original_import_meta_url'

  const res = await esbuild.build({
    absWorkingDir: process.cwd(),
    entryPoints: [fileName],
    outfile: 'out.js',
    write: false,
    target: ['node14.18', 'node16'],
    platform: 'node',
    bundle: true,
    format: 'esm',
    mainFields: ['main'],
    sourcemap: 'inline',
    metafile: true,
    define: {
      __dirname: dirnameVarName,
      __filename: filenameVarName,
      'import.meta.url': importMetaUrlVarName,
    },
    plugins: [
      {
        name: 'externalize-deps',
        setup(build) {
          // 过滤bare import
          build.onResolve({
            filter: BARE_IMPORT_RE,
          }, ({ path: id, importer, kind }) => {

            if (!isBuiltIn(id)) {
              const modulePath = path.resolve(configRoot, `./node_modules/${id}`);
              const modulePkgPath = path.resolve(modulePath, `./package.json`);
              const pkgData = JSON.parse(fs.readFileSync(modulePkgPath).toString('utf-8'));
              const exports = pkgData.exports;
              Object.keys(exports).forEach(exportKey => {
                if (path.resolve(modulePath, exportKey) === modulePath) {
                  id = pathToFileURL(path.resolve(modulePath, exports[exportKey].import)).href;
                }
              })
            }
            return {
              path: id,
              external: true
            }
          })
        }
      },
      {
        name: 'inject-global-variables',
        setup(build) {
          build.onLoad({ filter: /\.[cm]?[jt]s$/ }, (args) => {
            const contents = fs.readFileSync(args.path, { encoding: 'utf8' });
            const injectValues =
              `const ${dirnameVarName} = ${JSON.stringify(
                path.dirname(args.path),
              )};` +
              `const ${filenameVarName} = ${JSON.stringify(args.path)};` +
              `const ${importMetaUrlVarName} = ${JSON.stringify(
                pathToFileURL(args.path).href,
              )};`

              return {
                loader: args.path.endsWith('ts') ? 'ts' : 'js',
                contents: injectValues + contents,
              }
          })
        }
      }
    ]
  })
  return {
    code: res.outputFiles[0].text,
  }
}

// 读取配置
module.exports = {
  loadConfigFromFile
}