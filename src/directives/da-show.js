/**
 * da-show 指令
 *
 * 根据表达式值切换元素的 display CSS 属性。
 * 元素始终保留在 DOM 中（不同于 da-if）。
 * 记录元素初始 display 值，切换时恢复。
 */

import { evaluateExpression } from '../shared/utils.js'

const directive = {
  name: 'show',

  mount(el, binding) {
    const { instance, expression } = binding
    if (!instance) return

    // 保存元素的初始 display 值
    const computedDisplay = window.getComputedStyle(el).display
    el._daShowOriginalDisplay = el.style.display || computedDisplay

    // 应用初始状态
    const result = evaluateExpression(expression, instance)
    applyShow(el, !!result)
  },

  update(el, binding) {
    const { instance, expression } = binding
    if (!instance) return

    const result = evaluateExpression(expression, instance)
    applyShow(el, !!result)
  },

  unmount(el) {
    delete el._daShowOriginalDisplay
  },
}

function applyShow(el, show) {
  if (show) {
    // 恢复显示
    el.style.display = el._daShowOriginalDisplay || ''
  } else {
    // 隐藏
    el.style.display = 'none'
  }
}

export default directive
