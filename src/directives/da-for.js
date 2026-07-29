/**
 * da-for 指令
 *
 * 列表渲染，支持 (item, index) in items 语法。
 * 基于 key 追踪元素变化，最小化 DOM 操作。
 *
 * 语法：da-for="(item, index) in items"  或  da-for="item in items"
 * 需配合 key 属性使用：:key="item.id"
 */

import { evaluateExpression } from '../shared/utils.js'

/** 解析 da-for 表达式 */
const forAliasRE = /(?:(.+?)\s+)?\s+in\s+(.+)/
const stripParenRE = /^\(|\)$/g

const directive = {
  name: 'for',

  mount(el, binding) {
    const { instance, expression } = binding
    if (!instance) return

    // 解析 da-for 表达式
    const parsed = parseForExpression(expression)
    if (!parsed) {
      console.warn(`[Da da-for] invalid expression: "${expression}"`)
      return
    }

    const { itemName, indexName, sourceExpr } = parsed
    const parent = el.parentNode
    if (!parent) return

    // 存储元数据到 el
    el._daFor = { itemName, indexName, sourceExpr, instance, parent }
    el._daForKey = getKey(el)

    // 用注释占位替换原始节点
    const anchor = document.createComment(`da-for: ${expression}`)
    el._daForAnchor = anchor
    parent.replaceChild(anchor, el)

    // 首次渲染
    renderList(el, anchor)
  },

  update(el, binding) {
    // 从更新中处理（实际在 renderList 中通过 effect 驱动）
  },

  unmount(el) {
    // 清理所有渲染的子节点
    if (el._daForAnchor && el._daForAnchor.parentNode) {
      let sibling = el._daForAnchor.nextSibling
      while (sibling && sibling._daForItem !== undefined) {
        const next = sibling.nextSibling
        if (sibling.parentNode) sibling.parentNode.removeChild(sibling)
        sibling = next
      }
    }
    delete el._daFor
    delete el._daForAnchor
  },
}

// ============================================================
// 解析
// ============================================================

function parseForExpression(expression) {
  const match = expression.match(forAliasRE)
  if (!match) return null

  let alias = (match[1] || '').trim()
  const sourceExpr = match[2].trim()

  if (!alias) return null

  // 去掉括号
  alias = alias.replace(stripParenRE, '').trim()
  const parts = alias.split(',').map((s) => s.trim())

  return {
    itemName: parts[0],
    indexName: parts[1] || null,
    sourceExpr,
  }
}

// ============================================================
// 渲染
// ============================================================

function getKey(el) {
  // 尝试从模板节点上获取 key attribute
  const keyAttr = el.getAttribute && el.getAttribute(':key')
  if (keyAttr) return keyAttr.trim()
  const vBindKey = Array.from(el.attributes || []).find(
    (a) => a.name === ':key' || a.name === 'da-bind:key'
  )
  return vBindKey ? vBindKey.value.trim() : null
}

function renderList(templateEl, anchor) {
  const { itemName, indexName, sourceExpr, instance, parent } = templateEl._daFor
  const keyExpr = templateEl._daForKey

  // 获取源数据
  const source = evaluateExpression(sourceExpr, instance)
  if (!Array.isArray(source)) return

  // 清除旧节点
  let sibling = anchor.nextSibling
  const oldItems = []
  while (sibling && sibling._daForItem !== undefined) {
    oldItems.push(sibling)
    sibling = sibling.nextSibling
  }
  oldItems.forEach((node) => {
    if (node.parentNode) node.parentNode.removeChild(node)
  })

  // 渲染新列表
  source.forEach((item, index) => {
    const clone = templateEl.cloneNode(true)
    delete clone._daFor
    delete clone._daForAnchor

    // 设置作用域数据
    clone._daForItem = item
    clone._daForIndex = index

    // 创建作用域上下文
    const scope = { [itemName]: item }
    if (indexName) scope[indexName] = index

    // 应用 key
    if (keyExpr) {
      const keyValue = evaluateExpressionInScope(keyExpr, instance, scope)
      clone._daForKeyValue = keyValue
    }

    // 处理克隆节点中的子表达式
    processScopedExpressions(clone, scope, instance)

    parent.insertBefore(clone, anchor.nextSibling)
  })
}

/** 在增强作用域中求值 */
function evaluateExpressionInScope(expr, instance, scope) {
  try {
    const keys = Object.keys(scope)
    const values = keys.map((k) => scope[k])
    const fn = new Function(
      '$data',
      '$props',
      ...keys,
      `with($data) { return (${expr}) }`
    )
    return fn(instance.$data, instance.$props, ...values)
  } catch {
    return undefined
  }
}

/** 处理子节点的文本插值和指令（简化版本，后面细化） */
function processScopedExpressions(root, scope, instance) {
  // 处理文本节点中的插值
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, null)
  while (walker.nextNode()) {
    const node = walker.currentNode

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent
      if (/\{\{(.+?)\}\}/.test(text)) {
        node.textContent = text.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
          const val = evaluateExpressionInScope(expr.trim(), instance, scope)
          return val !== undefined && val !== null ? String(val) : ''
        })
      }
    }

    // 处理 da-bind / da-on 等指令（简化为需要手动实现）
  }
}

export default directive
