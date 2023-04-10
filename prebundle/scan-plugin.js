// 引入一个名为 `constants` 的模块，并解构赋值其中包含的两个常量
const { EXTERNAL_TYPES, BARE_IMPORT_RE } = require('./constants');
const fs = require('fs');
const { join, dirname } = require('path');

// 匹配<script type='module'>
const scriptModuleRE =
  /(<script\b[^>]+type\s*=\s*(?:"module"|'module')[^>]*>)(.*?)<\/script>/gis
// 匹配<script></script>标签
const scriptRE = /(<script(?:\s[^>]*>|>))(.*?)<\/script>/gis
// 匹配<!-- -->注释标签
const commentRE = /<!--.*?-->/gs
// 匹配类html文件格式
const htmlTypesRE = /.(html|vue|svelte|astro)$/;
// 匹配<script lang='xxx' />中的lang属性
const langRE = /\blang\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s'">]+))/i;
// 匹配<script type='xxx' />中的lang属性（vue）
const typeRE = /\btype\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s'">]+))/i;
// 匹配<script src='xxx' />中的src属性
const srcRE = /\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s'">]+))/i;

const scanPlugin = (deps) => {
  return {
    name: 'm-vite:scan-deps-plugin',
    setup(build) {
      // const scripts = {}
      build.onResolve(
        { filter: htmlTypesRE },
        (resolveInfo) => {
          const { path, importer } = resolveInfo;
          console.log(resolveInfo, 'path')
          // 判断路由是否为相对路径./或者../
          const isAbsolutePath = path.startsWith('./') || path.startsWith('../')
          return {
            path: isAbsolutePath ? join(dirname(importer), path) : path,
            namespace: 'html'
          }
        }
      )
      build.onLoad(
        { filter: htmlTypesRE, namespace: 'html' },
        async ({ path }) => {
          let raw = fs.readFileSync(path, 'utf-8')
          raw = raw.replace(commentRE, '<!---->')
          const isHtml = path.endsWith('.html')
          // html文件匹配<script type='module'
          // 非html文件匹配<script
          const regex = isHtml ? scriptModuleRE : scriptRE
          regex.lastIndex = 0
          let js = ''
          // let scriptId = 0
          let match;
          while ((match = regex.exec(raw))) {
            const [, openTag, content] = match
            const typeMatch = openTag.match(typeRE)
            const type =
              typeMatch && (typeMatch[1] || typeMatch[2] || typeMatch[3])
            const langMatch = openTag.match(langRE)
            const lang =
              langMatch && (langMatch[1] || langMatch[2] || langMatch[3])
            if (
              type &&
              !(
                type.includes('javascript') ||
                type.includes('ecmascript') ||
                type === 'module'
              )
            ) {
              continue
            }
            let loader = 'js'
            if (lang === 'ts' || lang === 'tsx' || lang === 'jsx') {
              loader = lang
            }
            const srcMatch = openTag.match(srcRE)
            if (srcMatch) {
              const src = srcMatch[1] || srcMatch[2] || srcMatch[3]
              js += `import ${JSON.stringify(src)}\n`
            } else if (content.trim()) {
              js += content + '\n'
              // const contents =
              //   content +
              //   (loader.startsWith('ts') ? extractImportPaths(content) : '')

              // const key = `${path}?id=${scriptId++}`
              // scripts[key] = {
              //   loader,
              //   contents,
              //   pluginData: {
              //     htmlType: { loader },
              //   },
              // }
            }
          }

          if (!path.endsWith('.vue') || !js.includes('export default')) {
            js += '\nexport default {}'
          }

          return {
            loader: 'js',
            contents: js,
            resolveDir: dirname(path)
          }
        },
      )
      
      // 忽略的文件类型（如图片、字体等资源）
      build.onResolve(
        { filter: new RegExp(`\\.(${EXTERNAL_TYPES.join('|')})$`) },
        (resolveInfo) => {
          return {
            path: resolveInfo.path,
            external: true
          }
        }
      )

      // 记录每一次 import
      build.onResolve(
        { filter: BARE_IMPORT_RE },
        (resolveInfo) => {
          const { path: id } = resolveInfo;
          // 依赖推入 deps 集合中
          deps.add(id);
          return {
            path: id,
            external: true
          }
        }
      )
    }
  }
}

module.exports = scanPlugin;
