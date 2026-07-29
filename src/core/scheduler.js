/**
 * 异步更新调度器
 *
 * 将同一 tick 内的多次数据变更合并为一次异步更新，
 * 基于微任务（Promise.resolve().then()）实现，
 * 避免重复渲染和抖动。
 *
 * 机制：
 * - effect 触发时，将组件的更新函数入队
 * - 同一组件的多次入队自动去重
 * - 当前同步代码执行完毕后，微任务统一执行
 */

// ============================================================
// 内部状态
// ============================================================

/** 待执行的更新队列（Set 天然去重） */
const queue = new Set()

/** 是否已有调度中的微任务 */
let isFlushing = false

/** 是否正在执行更新 */
let isFlushingQueue = false

// ============================================================
// 调度主流程
// ============================================================

/**
 * 将一个更新函数加入调度队列
 *
 * @param {Function} updateFn - 组件或指令的更新函数
 */
export function scheduleUpdate(updateFn) {
  queue.add(updateFn)

  if (!isFlushing) {
    isFlushing = true
    // 使用微任务调度
    Promise.resolve().then(flushQueue)
  }
}

/**
 * 立即清空队列（同步执行所有挂起的更新）
 */
export function flushQueue() {
  if (isFlushingQueue) return
  isFlushingQueue = true
  isFlushing = false

  try {
    // 遍历执行，每次可能新增
    queue.forEach((updateFn) => {
      try {
        updateFn()
      } catch (e) {
        console.error('[Da scheduler] update error:', e)
      }
    })
  } finally {
    queue.clear()
    isFlushing = false
    isFlushingQueue = false
  }
}

/**
 * 获取当前队列长度
 */
export function queueSize() {
  return queue.size
}

// ============================================================
// 组件更新包装
// ============================================================

/**
 * 创建一个组件的调度更新函数
 * 调用时自动去重，多次修改只触发一次更新
 *
 * @param {object} component - 组件实例
 * @param {Function} updateFn - 组件的具体更新逻辑
 * @returns {Function} 可调度调用的更新函数
 */
export function createComponentUpdater(component, updateFn) {
  let pending = false

  return function scheduledUpdate() {
    if (pending) return
    pending = true

    scheduleUpdate(() => {
      pending = false
      updateFn.call(component)
    })
  }
}
