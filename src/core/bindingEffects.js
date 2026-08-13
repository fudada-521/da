/**
 * 细粒度响应式更新器
 *
 * 为每个指令绑定 / 文本绑定 / 作用域插槽创建一个独立 effect：
 * - effect 首次同步执行 updateFn：渲染初始 + 收集依赖
 * - 依赖变化时经调度器去重后重跑 effect（清理旧依赖 → updateFn 收集新依赖 + 更新视图）
 * - 返回 stop() 停止响应，供组件/挂载卸载时清理
 *
 * @format
 */

import { effect, stop } from './reactive.js'
import { scheduleUpdate } from './scheduler.js'

/**
 * 将 updateFn 包装为细粒度响应式更新器
 *
 * @param {Function} updateFn - 更新函数（在 effect 内执行，读取的响应式字段会被收集为依赖）
 * @param {Function} [afterUpdate] - 每次实际更新后调用（可选）
 * @returns {Function} stop() - 停止该绑定对响应式数据的订阅
 */
export function createReactiveUpdater(updateFn, afterUpdate) {
  let pending = false

  const _effect = effect(updateFn, {
    scheduler: () => {
      // 依赖变化：同一 tick 内去重，经调度器批量执行
      if (pending) return
      pending = true
      scheduleUpdate(() => {
        pending = false
        // 重跑 effect：cleanup 旧依赖 → updateFn（收集新依赖 + 更新视图）
        _effect()
        if (afterUpdate) afterUpdate()
      })
    },
  })

  return function stopBinding() {
    stop(_effect)
  }
}
