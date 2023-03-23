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
const isPkg = require('validate-npm-package-name')


async function readSource(reqFilePath) {
  const filepath = path.join(root, reqFilePath.replace(/^\//, ''))
  // console.log(await readFile(filepath, 'utf-8'), 'filepath')
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
          console.log(source.value);
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

module.exports.readSource = readSource
module.exports.findScriptTagsInHtml = findScriptTagsInHtml;
module.exports.addPrefixBeforeImportInJs = addPrefixBeforeImportInJs;
module.exports.addPrefixBeforeImportInHtml = addPrefixBeforeImportInHtml;
