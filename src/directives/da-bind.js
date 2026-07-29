/**
 * da-bind 指令
 *
 * 绑定 HTML attribute 或 DOM property 到表达式值。
 * 支持 :attr 缩写。
 * 特殊处理 :class（对象/数组语法）和 :style（对象语法）。
 */

const directive = {
  name: 'bind',

  mount(el, binding) {
    applyBinding(el, binding)
  },

  update(el, binding) {
    applyBinding(el, binding)
  },

  unmount(el) {
    // 无需特殊清理
  },
}

function applyBinding(el, binding) {
  const { arg, value } = binding

  if (!arg) {
    console.warn('[Da da-bind] missing argument, e.g. da-bind:class')
    return
  }

  if (arg === 'class') {
    setClass(el, value)
  } else if (arg === 'style') {
    setStyle(el, value)
  } else {
    setAttrOrProp(el, arg, value)
  }
}

/**
 * 设置 class
 * 支持：字符串、对象（{ active: true }）、数组（['active', 'disabled']）
 */
function setClass(el, value) {
  if (typeof value === 'string') {
    el.className = value
  } else if (Array.isArray(value)) {
    el.className = value.filter(Boolean).join(' ')
  } else if (typeof value === 'object' && value !== null) {
    const classes = []
    for (const key in value) {
      if (value[key]) classes.push(key)
    }
    el.className = classes.join(' ')
  }
}

/**
 * 设置 style
 * 支持：对象（{ color: 'red', fontSize: '14px' }）
 */
function setStyle(el, value) {
  if (typeof value === 'string') {
    el.style.cssText = value
  } else if (typeof value === 'object' && value !== null) {
    for (const key in value) {
      el.style[key] = value[key]
    }
  }
}

/**
 * 设置 attribute 或 property
 * - 如果是布尔属性（如 disabled、checked），设置/移除 attribute
 * - 否则设置 property，并同步 attribute
 */
function setAttrOrProp(el, attr, value) {
  const booleanAttrs = [
    'disabled',
    'checked',
    'selected',
    'readonly',
    'required',
    'multiple',
    'hidden',
    'autofocus',
    'open',
  ]

  if (value === null || value === undefined || value === false) {
    el.removeAttribute(attr)
    if (attr in el) el[attr] = value
  } else if (booleanAttrs.includes(attr)) {
    el.setAttribute(attr, '')
    el[attr] = true
  } else {
    el.setAttribute(attr, String(value))
    if (attr in el && typeof el[attr] !== 'function') {
      el[attr] = value
    }
  }
}

export default directive
