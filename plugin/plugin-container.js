const { createPluginHookUtils } = require("./plugins");
const { VERSION } = require('rollup');
const acorn = require('acorn');
const { Parser } = acorn;
const path = require('path');

let parser;

let closed = false

async function createPluginContainer(config, moduleGraph, watcher) {
  const { plugins = [], root = process.cwd(), build: {
    rollupOptions = {}
  } = {} } = config;

  const { getSortedPluginHooks, getSortedPlugins } = createPluginHookUtils(plugins);


  // console.log(getSortedPlugins('resolveId'), 'plugins')
  // console.log(getSortedPluginHooks('resolveId'), 'hooks')

  const minimalContext = {
    meta: {
      rollupVersion: VERSION,
      watchMode: true,
    },
  };

  class Context {
    meta=minimalContext.meta
    ssr=false // 本服务不支持
    _scan=false
    _activePlugin=null
    _activeId=null
    _activeCode=null
    _resolveSkips=null
    _addedImports=null
    constructor(activePlugin) {
      if (activePlugin) {
        this._activePlugin= activePlugin;
      }
    }

    parse(code, opts = {}) {
      return Parser.parse(code, {
        sourceType: 'module',
        ecmaVersion: 'latest',
        locations: true,
        ...opts,
      })
    }

    async resolve(id, importer = path.join(root, './index.html'), options) {
      const { skipSelf } = options;

      let skip = undefined;
      if (skipSelf) {
        skip = new Set(this._resolveSkips)
        skip.add(this._activePlugin);
      }
      
      const res = await container.resolveId(id, importer, {
        ...options,
        skip,
        scan: this._scan,
      });
      return { code: res };
    }

    // async load(
    //   options
    // ) {
    //   await moduleGraph?.ensureEntryFromUrl(unwrapId(options.id), this.ssr)
    //   updateModuleInfo(options.id, options)
    //   await container.load(options.id, { ssr: this.ssr })
    //   const moduleInfo = this.getModuleInfo(options.id)
    //   if (!moduleInfo)
    //     throw Error(`Failed to load module with id ${options.id}`)
    //   return moduleInfo
    // }
  }

  class TransformContext extends Context {
    filename=''
    originalCode=''
    originalSourcemap=null
    sourcemapChain=[]
    combinedMap=null

    // 记录模块的文件名、代码和sourcemap
    constructor(filename, code, inMap) {
      super()
      this.filename = filename
      this.originalCode = code
      if (inMap) {
        this.sourcemapChain.push(inMap)
      }
    }
  }

  const processesing = new Set()
  // 这段代码用于跟踪钩子（hook）的 Promise，以便在关闭服务器时等待它们全部完成。
  function handleHookPromise(maybePromise) {
    if (!(maybePromise)?.then) {
      return maybePromise
    }
    const promise = maybePromise
    processesing.add(promise)
    return promise.finally(() => processesing.delete(promise))
  }


  // 并行执行钩子函数，直到所有钩子函数执行完成，才结束
  async function hookParallel(
    hookName,
    context,
    args,
  ) {
    const parallelPromises = []
    for (const plugin of getSortedPlugins(hookName)) {
      const hook = plugin[hookName]
      if (!hook) continue
      const handler = 'handler' in hook ? hook.handler : hook
      parallelPromises.push(handler.apply(context(plugin), args(plugin)))
    }
    await Promise.all(parallelPromises)
  }

  function throwClosedServerError() {
    const err = new Error(
      'The server is being restarted or closed. Request is outdated',
    )
    throw err
  }

  const container = {
    options: await (async () => {
      let options = rollupOptions;
      for (const optionsHook of getSortedPluginHooks('options')) {
        if (closed) throwClosedServerError()
        options =
          (await handleHookPromise(
            optionsHook.call(minimalContext, options),
          )) || options
      }
      if (options.acornInjectPlugins) {
        parser = acorn.Parser.extend(
          ...options.acornInjectPlugins,
        )
      }

      // console.log(options, 'finalOptions')
      return {
        acorn,
        acornInjectPlugins: [],
        ...options,
      }
    })(),
    async buildStart() {
      await handleHookPromise(
        hookParallel(
          'buildStart',
          (plugin) => new Context(plugin),
          () => [container.options],
        ),
      )
    },
    async configureServer(server) {
      const postHooks = []
      for (const hook of getSortedPluginHooks('configureServer')) {
        postHooks.push(await hook(server))
      }
      return postHooks;
    },
    async resolveId(rawId, importer, options) {
      const skip = options?.skip
      const ssr = options?.ssr
      const scan = !!options?.scan
      const ctx = new Context()
      ctx.ssr = !!ssr
      ctx._scan = scan
      ctx._resolveSkips = skip
      let id = null
      const partial = {}
      // console.log(rawId, 'rawId')
      for (const plugin of getSortedPlugins('resolveId')) {
        // console.log(plugin)
        if (closed) throwClosedServerError()
        if (!plugin.resolveId) continue
        if (skip?.has(plugin)) continue

        ctx._activePlugin = plugin
        const handler =
          'handler' in plugin.resolveId
            ? plugin.resolveId.handler
            : plugin.resolveId
        const result = await handleHookPromise(
          handler.call(ctx, rawId, importer, {
            assertions: options?.assertions ?? {},
            custom: options?.custom,
            isEntry: !!options?.isEntry,
            ssr,
            scan,
          }), 
        )
        // console.log(result, 'khjjh')
        if (!result) continue

        if (typeof result === 'string') {
          id = result
        } else {
          id = result.id
          Object.assign(partial, result)
        }

        // resolveId() is hookFirst - first non-null result is returned.
        break
      }

      return partial;
    },
    async close() {
      await Promise.allSettled(processesing);
      closed = true;
    }
  }

  // console.log(container.options, 'options');

  return container
}

module.exports = {
  createPluginContainer
}