import * as path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'

console.log(import.meta.url);
// import.meta.url
// __dirname
// __filename

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
    vue(),
    {
      name: 'test-plugin3',
      resolveId: {
        handler: (id) => {
          if (id === 'test:module') {
            // console.log(id, 'resolveId钩子')
            return { id: 'react' }
          }
        }
      }
    },
    // {
    //   name: 'test-plugin1',
    //   resolveId: {
    //     order: 'pre',
    //     handler() {
    //       console.log('test-plugin1')
    //     }
    //   }
    // },
    // {
    //   name: 'test-plugin1',
    //   resolveId: {
    //     order: 'post',
    //     handler() {
          
    //     }
    //   },
    // },
    // {
    //   name: 'test-plugin2',
    //   resolveId() {
    //     console.log('resolveId2钩子')
    //   }
    // },
    // {
    //   name: 'configure-server-test',
    //   configureServer(server) {
    //     server.use(() => {
    //       console.log("jjhj")
    //     })
    //   }
    // },
    // {
    //   name: 'options-test',
    //   options(options) {
    //     return {
    //       ...options,
    //       test: '111',
    //     }
    //   }
    // }
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
