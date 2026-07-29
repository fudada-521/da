/**
 * da-if / da-else-if / da-else 指令
 *
 * 条件渲染。根据表达式真假增删 DOM 节点。
 * 使用注释节点作为占位，切换时复用已有节点。
 */

import { evaluateExpression } from '../shared/utils.js'

const directive = {
  name: 'if',

  mount(el, binding) {
    const { instance } = binding
    if (!instance) return

    // 标记这是 da-if 链的起始节点
    el._daIfType = 'if'
    el._daIfCondition = binding.expression
    el._daIfInstance = instance
    el._daIfParent = el.parentNode

    // 初始化状态
    const result = evaluateExpression(binding.expression, instance)
    applyCondition(el, result)
    el._daIfVisible = !!result
  },

  update(el, binding) {
    const { instance, expression } = binding
    if (!instance) return

    // 评估当前条件
    const result = evaluateExpression(expression, instance)
    if (result === el._daIfVisible) return

    el._daIfVisible = !!result
    applyCondition(el, result)
  },

  unmount(el) {
    // 恢复占位符为真实节点
    if (el._daIfPlaceholder && el._daIfPlaceholder.parentNode) {
      el._daIfPlaceholder.parentNode.replaceChild(el, el._daIfPlaceholder)
    }
    delete el._daIfPlaceholder
    delete el._daIfVisible
  },
}

function applyCondition(el, condition) {
  const parent = el.parentNode
  if (!parent) return

  if (condition) {
    // 显示：将占位符替换为真实节点
    if (el._daIfPlaceholder && el._daIfPlaceholder.parentNode) {
      parent.replaceChild(el, el._daIfPlaceholder)
    }
    // 处理 da-else-if / da-else 链
    hideSiblings(el)
  } else {
    // 隐藏：将真实节点替换为注释占位符
    if (el.parentNode) {
      const placeholder = document.createComment(`da-if: ${el._daIfCondition || ''}`)
      el._daIfPlaceholder = placeholder
      parent.replaceChild(placeholder, el)
    }
    // 尝试显示兄弟节点（da-else-if / da-else）
    showNextSibling(el)
  }
}

/** 隐藏后续的 da-else-if / da-else 兄弟节点 */
function hideSiblings(el) {
  let sibling = el.nextElementSibling
  while (sibling) {
    if (sibling._daIfType && ['else-if', 'else'].includes(sibling._daIfType)) {
      sibling._daIfVisible = false
      if (sibling.parentNode) {
        const placeholder = document.createComment(`da-${sibling._daIfType}`)
        sibling._daIfPlaceholder = placeholder
        sibling.parentNode.replaceChild(placeholder, sibling)
      }
      sibling = sibling.nextElementSibling
    } else {
      break
    }
  }
}

/** da-if 隐藏时，尝试显示最近的 da-else-if 或 da-else */
function showNextSibling(el) {
  let sibling = el.nextElementSibling
  while (sibling) {
    if (sibling._daIfType === 'else-if') {
      // 检查 else-if 的条件
      const result = evaluateExpression(sibling._daIfCondition, sibling._daIfInstance)
      if (result) {
        sibling._daIfVisible = true
        if (sibling._daIfPlaceholder && sibling._daIfPlaceholder.parentNode) {
          sibling._daIfPlaceholder.parentNode.replaceChild(sibling, sibling._daIfPlaceholder)
        } else if (!sibling.parentNode) {
          el.parentNode.appendChild(sibling)
        }
        hideSiblings(sibling)
        return
      }
      sibling = sibling.nextElementSibling
    } else if (sibling._daIfType === 'else') {
      // da-else 直接显示
      sibling._daIfVisible = true
      if (sibling._daIfPlaceholder && sibling._daIfPlaceholder.parentNode) {
        sibling._daIfPlaceholder.parentNode.replaceChild(sibling, sibling._daIfPlaceholder)
      } else if (!sibling.parentNode) {
        el.parentNode.appendChild(sibling)
      }
      return
    } else {
      break
    }
  }
}

export default directive
