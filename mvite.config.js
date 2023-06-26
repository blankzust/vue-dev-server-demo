import * as path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: [
      { find: '/@', replacement: path.resolve(__dirname, 'dir') },
    ],
  },
  build: {
    minify: false,
  },
  plugins: [
    {
      name: 'test-plugin',
      resolveId() {
        console.log('resolveId钩子')
      }
    }
  ]
})

// export default {
//   resolve: {
//     alias: [
//       { find: '/@', replacement: path.resolve(__dirname, 'dir') },
//     ],
//   },
//   build: {
//     minify: false,
//   },
// }
