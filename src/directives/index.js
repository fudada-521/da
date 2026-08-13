/**
 * 指令注册表
 *
 * 管理和查找所有已注册的指令模块。
 * 每个指令导出的格式：{ name, mount(el, binding), update(el, binding), unmount(el) }
 */

import vBind from './da-bind.js'
import vOn from './da-on.js'
import vIf from './da-if.js'
import vFor from './da-for.js'
import vModel from './da-model.js'
import vShow from './da-show.js'
import vText from './da-text.js'
import vHtml from './da-html.js'
import vOnce from './da-once.js'
import vCloak from './da-cloak.js'
import vPre from './da-pre.js'

/** 指令注册表 */
const registry = {}

/**
 * 注册一个指令
 *
 * 支持两种调用形式：
 *   register('my-dir', { mount, update, unmount })   // 名称 + 定义
 *   register({ name: 'my-dir', mount, update, unmount })  // 单个对象（内置指令用）
 */
export function register(name, definition) {
  // 兼容对象形式：register({ name, mount, update, unmount })
  if (name && typeof name === 'object') {
    definition = name
    name = definition.name
  }

  if (!name || !definition) {
    console.warn('[Da] invalid directive:', name || definition)
    return
  }
  registry[name] = definition
}

/**
 * 根据名称查找指令
 */
export function lookup(name) {
  return registry[name] || null
}

/**
 * 获取所有已注册的指令名
 */
export function registeredDirectives() {
  return Object.keys(registry)
}

// 注册内置指令
register(vBind)
register(vOn)
register(vIf)
register(vFor)
register(vModel)
register(vShow)
register(vText)
register(vHtml)
register(vOnce)
register(vCloak)
register(vPre)

export {
  vBind,
  vOn,
  vIf,
  vFor,
  vModel,
  vShow,
  vText,
  vHtml,
  vOnce,
  vCloak,
  vPre,
}
