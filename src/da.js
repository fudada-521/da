/**
 * Da — 基于原生 WebComponent 的轻量前端框架
 *
 * 入口文件，导出 Da 命名空间
 */

import { Component } from './core/Component.js'
import { reactive, ref, computed, watch, effect, toRef, toRefs } from './core/reactive.js'
import { compile } from './core/compile.js'
import { scheduleUpdate, flushQueue } from './core/scheduler.js'
import { register, lookup, registeredDirectives } from './directives/index.js'
import { DaTransition } from './core/Transition.js'
import { DaTransitionGroup } from './core/TransitionGroup.js'

export { Component, reactive, ref, computed, watch, effect, toRef, toRefs }
export { compile, scheduleUpdate, flushQueue }
export { register, lookup, registeredDirectives }
export { DaTransition, DaTransitionGroup }

/**
 * 定义/注册组件
 *
 * @param {string} name - 自定义标签名
 * @param {typeof Component} componentClass - 继承 Da.Component 的类
 */
export function define(name, componentClass) {
  componentClass.define(name)
}

/** 当前版本 */
export const version = '0.2.0'

/**
 * 下一次 DOM 更新循环后执行回调
 * @param {Function} fn
 */
export function nextTick(fn) {
  return Promise.resolve().then(fn)
}

/**
 * 挂载响应式应用到指定 DOM 子树
 * 让该子树内的任意元素都能使用 da-model、@click、{{ }} 等指令
 *
 * @param {string|Element} selectorOrEl - CSS 选择器或 DOM 元素
 * @param {Object} data - 响应式数据对象
 * @returns {Object} 响应式数据（修改它会自动触发视图更新）
 *
 * 用法：
 *   <div id="app">
 *     <input da-model:value="msg" />
 *     <p>{{ msg }}</p>
 *     <button @click="msg = 'Hi'">点击</button>
 *   </div>
 *
 *   <script>
 *     import { mount } from 'da'
 *     const state = mount('#app', { msg: 'Hello' })
 *   </script>
 */
export function mount(selectorOrEl, data = {}) {
  const container = typeof selectorOrEl === 'string'
    ? document.querySelector(selectorOrEl)
    : selectorOrEl

  if (!container) {
    console.warn('[Da mount] container not found:', selectorOrEl)
    return data
  }

  // 创建响应式数据
  const $data = reactive(data)

  // 编译上下文（compile 需要的实例形状）
  const ctx = { $data, $props: {}, $slots: {} }

  // 编译容器子节点
  const result = compile(container, ctx)
  result.mount()

  // 响应式更新
  effect(() => {
    for (const key of Object.keys($data._raw || $data)) {
      void $data[key]
    }
    result.update()
  })

  return $data
}

const Da = {
  // 组件
  Component,
  DaTransition,
  DaTransitionGroup,
  define,

  // 响应式
  reactive,
  ref,
  computed,
  watch,
  effect,
  toRef,
  toRefs,

  // 编译器
  compile,

  // 调度器
  scheduleUpdate,
  flushQueue,

  // 全局 API
  version,
  nextTick,

  // 指令
  register,
  lookup,
  registeredDirectives,

  // 挂载
  mount,
}

export { Da }
export default Da

// 自动注册内置组件
if (!customElements.get('da-transition')) {
  customElements.define('da-transition', DaTransition)
}
if (!customElements.get('da-transition-group')) {
  customElements.define('da-transition-group', DaTransitionGroup)
}
