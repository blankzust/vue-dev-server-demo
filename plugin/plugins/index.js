function createPluginHookUtils(plugins) {
  // 存储hookName和对应的plugins已排序数组
  const sortedPluginsCache = new Map();

  function getSortedPlugins(hookName) {
    // 执行定义了hookName对应钩子函数的插件
    if (sortedPluginsCache.get(hookName)) return sortedPluginsCache.get(hookName);
    const sorted = getSortedPluginsByHook(hookName, plugins);
    sortedPluginsCache.set(hookName, sorted);

    return sorted;
  }

  function getSortedPluginHooks(hookName) {
    const plugins = getSortedPlugins(hookName)

    return plugins.map(plugin => {
      const hook = plugin[hookName];
      return typeof hook === 'object' && 'handler' in hook
        ? hook.handler
        : hook
    }).filter(plugin => !!plugin)
  }

  return {
    getSortedPlugins,
    getSortedPluginHooks,
  }
}

function getSortedPluginsByHook(
  hookName,
  plugins
) {
  const pre = [];
  const normal = [];
  const post = [];

  // console.log('getSortedPluginsByHook')

  for (let i = 0; i < plugins.length; i ++) {
    const plugin = plugins[i];
    const hook = plugin[hookName];
    if (hook) {
      if (typeof hook === 'object') {
        if (hook.order === 'pre') {
          pre.push(plugin);
          continue
        } else if (hook.order === 'post') {
          post.push(plugin);
          continue
        }
      }
      normal.push(plugin)
    }
  }

  return [...pre, ...normal, ...post];
}

module.exports = {
  createPluginHookUtils
}