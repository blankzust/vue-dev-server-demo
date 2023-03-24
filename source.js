const path = require('path')
const fs = require('fs')
const readFile = require('util').promisify(fs.readFile)
const stat = require('util').promisify(fs.stat)
// const parseUrl = require('parseurl')
const root = path.join(process.cwd(), './demo')
const parse5 = require('parse5');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { default: MagicString } = require('magic-string');

const { assemble } = require('@vue/component-compiler');
const { compile } = require('vue-template-compiler')


async function readSource(reqFilePath) {
  const filepath = path.join(root, reqFilePath.replace(/^\//, ''))
  return {
    filepath,
    source: await readFile(filepath, 'utf-8'),
    updateTime: (await stat(filepath)).mtime.getTime()
  }
}

function findScriptTagsInHtml(node, scriptTags = []) {
  if (node.tagName === 'script') {
    scriptTags.push(node);
  } else if (node.childNodes) {
    for (const childNode of node.childNodes) {
      findScriptTagsInHtml(childNode, scriptTags);
    }
  }
}

function isDependency(str) {
  return !str.startsWith('.') && !str.startsWith('/') && !str.startsWith('http') && !str.startsWith('https');
}

function addPrefixBeforeImportInJs(jsSrc) {
  try {
    // 解析 JavaScript 代码
    const ast = parse(jsSrc, {
      sourceType: 'module',
    });
    const code = new MagicString(jsSrc);

    // 遍历 AST，找到所有 import 语句
    traverse(ast, {
      enter(path) {
        if (path.isImportDeclaration()) {
          // 使用 MagicString 来替换 import 语句中的 from 关键字后面的内容
          const source = path.node.source;
          const importStart = source.start + 1;
          const importEnd = source.end - 1 ;
          if (importEnd > importStart && isDependency(source.value)) {
            code.overwrite(importStart, importEnd, `/__modules/${source.value}`);
          }
        }
      },
    });
    return code.toString();
  } catch (error) {
    console.error(`Error parsing script content: ${error.message}`);
  }
}

function addPrefixBeforeImportInHtml(htmlSrc) {
  const document = parse5.parse(htmlSrc);
  const scriptTags = [];
  findScriptTagsInHtml(document, scriptTags);
  scriptTags.forEach(scriptTag => {
    if (scriptTag.childNodes && scriptTag.childNodes.length > 0) {
      const scriptContent = scriptTag.childNodes[0].value;
      const newScriptContent = addPrefixBeforeImportInJs(scriptContent);
      scriptTag.childNodes[0].value = newScriptContent;
    }
  });
  // 返回新的内容
  return parse5.serialize(document);
}

// 加载依赖的esm版本代码
async function loadPkg(pkgName) {
  if (pkgName === 'vue') {
    const res = await readSource('/../node_modules/vue/dist/vue.esm.browser.min.js');
    return res;
  } else {
  }
}

const vueCompiler = require('@vue/component-compiler');
const compiler = vueCompiler.createDefaultCompiler()

async function loadVue(reqFilePath) {
  const { filepath, source } = await readSource(reqFilePath)
  const descriptorResult = compiler.compileToDescriptor(filepath, source)
  const assembledResult = vueCompiler.assemble(compiler, filepath, {
    ...descriptorResult,
  })
  return { source: assembledResult.code }
}

async function bundleSFC(req) {
  const { filepath, source, updateTime } = await readSource(req)
  const descriptorResult = compiler.compileToDescriptor(filepath, source)
  const assembledResult = vueCompiler.assemble(compiler, filepath, {
    ...descriptorResult,
    script: injectSourceMapToScript(descriptorResult.script),
    styles: injectSourceMapsToStyles(descriptorResult.styles)
  })
  return { ...assembledResult, updateTime }
}

module.exports.readSource = readSource
module.exports.findScriptTagsInHtml = findScriptTagsInHtml;
module.exports.addPrefixBeforeImportInJs = addPrefixBeforeImportInJs;
module.exports.addPrefixBeforeImportInHtml = addPrefixBeforeImportInHtml;
module.exports.loadPkg = loadPkg;
module.exports.loadVue = loadVue;
