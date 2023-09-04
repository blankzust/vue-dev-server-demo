const path = require('path');
const rollup = require('rollup');
const util = require('util');
const typescript = require('@rollup/plugin-typescript');
const alias = require('@rollup/plugin-alias');
const inject = require('@rollup/plugin-inject')
async function build() {
  const bundle = await rollup.rollup({
    input: [path.resolve(__dirname, './index.js')],
    plugins: [
      typescript(),
      alias({
        entries: [
          { find: '@', replacement: './src' }
        ]
      }),
      inject({
        '_': 'lodash'
      })
    ]
  });
  console.log(util.inspect(bundle));
  const res = await bundle.generate({
    format: 'es',
  });
  console.log(res.output[0].code)
}
build();