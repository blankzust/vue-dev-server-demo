const path = require('path');
const rollup = require('rollup');
const util = require('util');
const typescript = require('@rollup/plugin-typescript');
async function build() {
  const bundle = await rollup.rollup({
    input: [path.resolve(__dirname, './index.js')],
    plugins: [
      typescript()
    ]
  });
  console.log(util.inspect(bundle));
  const res = await bundle.generate({
    format: 'es',
  });
  console.log(res.output[0].code)
}
build();