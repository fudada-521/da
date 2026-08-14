/**
 * da-if / da-else-if / da-else 指令
 *
 * 条件渲染。da-if / da-else-if / da-else 相邻兄弟组成一条条件链：
 * 从链头起，第一个条件为真的成员显示、其余隐藏；全部为假时显示 da-else（若有），
 * 否则整链隐藏。用注释节点做占位，切换时复用已有节点。
 *
 * 链以“链头”为起点整体解析（resolveIfChain）：
 * - mount 只记录每个成员的类型/条件/实例，不在 mount 时直接切换可见性，而是由
 *   挂载方（compile.mount() / Component._mountDirectives()）在所有成员挂载后对每个
 *   链头调用一次 resolveChain —— 避免“if 先挂载时 else-if/else 标记未就绪”的顺序问题。
 * - 首次解析时（所有成员都还在 DOM 中）收集整条链存入 head._daIfMembers，并为每个
 *   成员记录 _daIfHead 链头引用。之后成员被隐藏时会脱离 DOM（替换为注释占位），
 *   sibling 遍历会失效，因此 update 一律通过 _daIfHead 找到链头再整体重算。
 * - 任一成员的条件变化时，其 update 触发从链头整体重算，因此被隐藏成员的条件
 *   变化也能正确切换活动分支。
 */

import { evaluateExpression } from '../shared/utils.js'

const directive = {
  name: 'if',

  mount(el, binding) {
    const { instance } = binding
    if (!instance) return

    // 标记链类型（依据真实属性，而非固定 'if'）
    el._daIfType = el.hasAttribute('da-else-if') ? 'else-if'
      : el.hasAttribute('da-else') ? 'else'
      : 'if'
    el._daIfCondition = binding.expression
    el._daIfInstance = instance
  },

  update(el, binding) {
    const { instance, expression } = binding
    if (!instance) return

    el._daIfCondition = expression
    el._daIfInstance = instance

    // 任一成员条件变化 → 从链头整体重算可见性
    resolveIfChain(findChainHead(el))
  },

  unmount(el) {
    // 恢复占位符为真实节点
    if (el._daIfPlaceholder && el._daIfPlaceholder.parentNode) {
      el._daIfPlaceholder.parentNode.replaceChild(el, el._daIfPlaceholder)
    }
    delete el._daIfPlaceholder
    delete el._daIfVisible
    delete el._daIfType
    delete el._daIfCondition
    delete el._daIfInstance
    delete el._daIfHead
  },

  /**
   * 链头整体解析入口（compile.mount() / Component._mountDirectives() 在所有成员挂载后调用）
   */
  resolveChain(el) {
    resolveIfChain(findChainHead(el))
  },
}

/** 找到 el 所在条件链的链头（最左侧成员） */
function findChainHead(el) {
  if (!el || !el._daIfType) return el
  // 已记录链头引用时直接返回——成员可能因隐藏而脱离 DOM，sibling 遍历会失效
  if (el._daIfHead) return el._daIfHead
  let cur = el
  let prev = cur.previousElementSibling
  while (prev && prev._daIfType) {
    cur = prev
    prev = cur.previousElementSibling
  }
  return cur
}

/** 收集链成员（遇到另一个 da-if 视为新链，停止）。须在所有成员都还在 DOM 中时调用 */
function collectMembers(head) {
  const members = [head]
  let cur = head.nextElementSibling
  while (cur && cur._daIfType && cur._daIfType !== 'if') {
    members.push(cur)
    cur = cur.nextElementSibling
  }
  return members
}

/** 从链头解析整条链：第一个为真的成员显示，其余隐藏；全假则显示 da-else */
function resolveIfChain(head) {
  if (!head || !head._daIfType) return

  // 首次解析：此时所有成员都未隐藏、仍在 DOM 中，可安全收集整条链并记录链头引用。
  // 之后成员隐藏/脱离 DOM 也不再重新收集，统一走 _daIfHead。
  if (!head._daIfMembers) {
    head._daIfMembers = collectMembers(head)
    for (const m of head._daIfMembers) m._daIfHead = head
  }
  const members = head._daIfMembers

  // 找获胜成员：da-if / da-else-if 按序求值，da-else 兜底
  let show = null
  for (const m of members) {
    if (m._daIfType === 'else') {
      show = m
      break
    }
    if (evaluateExpression(m._daIfCondition, m._daIfInstance)) {
      show = m
      break
    }
  }

  // 应用可见性
  for (const m of members) {
    const shouldShow = m === show
    m._daIfVisible = shouldShow
    setElementVisibility(m, shouldShow)
  }
}

/** 显示或隐藏单个成员（隐藏时替换为注释占位） */
function setElementVisibility(el, show) {
  if (show) {
    if (el._daIfPlaceholder && el._daIfPlaceholder.parentNode) {
      el._daIfPlaceholder.parentNode.replaceChild(el, el._daIfPlaceholder)
      el._daIfPlaceholder = null
    }
  } else {
    if (el.parentNode) {
      const placeholder = document.createComment(`da-${el._daIfType}`)
      el._daIfPlaceholder = placeholder
      el.parentNode.replaceChild(placeholder, el)
    }
  }
}

export default directive
