/**
 * da-on 指令
 *
 * 绑定 DOM 事件。支持 @event 缩写。
 *
 * 通用修饰符：
 *   .prevent — event.preventDefault()
 *   .stop    — event.stopPropagation()
 *   .self    — 仅当 event.target 等于当前元素时触发
 *   .once    — 事件只触发一次
 *   .capture — 使用捕获模式
 *   .passive — 使用被动模式（不调用 preventDefault）
 *
 * 键盘修饰符（仅对键盘事件生效）：
 *   .enter .tab .delete .esc .space .up .down .left .right
 *
 * 系统修饰符：
 *   .ctrl .alt .shift .meta
 *   .exact — 要求精确组合（不多不少）
 *
 * 鼠标修饰符：
 *   .left .middle .right
 */

// ============================================================
// 键码映射
// ============================================================

const KEY_MAP = {
  enter: 'Enter',
  tab: 'Tab',
  esc: 'Escape',
  space: ' ',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
}

/** .delete 匹配 Backspace 或 Delete */
const DELETE_KEYS = new Set(['Backspace', 'Delete'])

/** 系统修饰符键 */
const SYSTEM_MODIFIERS = ['ctrl', 'alt', 'shift', 'meta']

/** 鼠标按钮映射 */
const BUTTON_MAP = {
  left: 0,
  middle: 1,
  right: 2,
}

// ============================================================
// 指令定义
// ============================================================

const directive = {
  name: 'on',

  mount(el, binding) {
    bindEvent(el, binding)
  },

  update(el, binding) {
    // 只解绑本次绑定自己注册的监听器
    // （同一元素上多个 @keyup.up/.down/.left/.right 事件名相同，不能按事件名清空）
    if (binding._daHandler) {
      el.removeEventListener(binding._daEvent, binding._daHandler, binding._daOptions)
      if (el._daEvents) {
        el._daEvents = el._daEvents.filter(
          (it) => !(it.event === binding._daEvent && it.handler === binding._daHandler)
        )
      }
    }
    bindEvent(el, binding)
  },

  unmount(el) {
    if (el._daEvents) {
      el._daEvents.forEach(({ event, handler, options }) => {
        el.removeEventListener(event, handler, options)
      })
      el._daEvents = []
    }
  },
}

// ============================================================
// 事件绑定
// ============================================================

function bindEvent(el, binding) {
  const { arg, expression, modifiers, instance } = binding
  if (!arg) {
    console.warn('[Da da-on] missing event name, e.g. da-on:click')
    return
  }

  const eventName = arg
  const handler = createHandler(expression, instance, modifiers)


  if (!handler) return

  const options = {
    once: !!modifiers.once,
    passive: !!modifiers.passive,
    capture: !!modifiers.capture,
  }

  el.addEventListener(eventName, handler, options)

  // 记录本次绑定注册的监听器，供 update 精确解绑
  binding._daEvent = eventName
  binding._daHandler = handler
  binding._daOptions = options

  if (!el._daEvents) el._daEvents = []
  el._daEvents.push({ event: eventName, handler, options })
}

// ============================================================
// Handler 创建
// ============================================================

function createHandler(expression, instance, modifiers) {
  if (!expression) return null

  // 函数名（纯标识符）：从组件实例或其 $data 上查找
  const isSimpleFnName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(expression)
  if (instance && isSimpleFnName) {
    let fn = null
    if (typeof instance[expression] === 'function') {
      fn = instance[expression].bind(instance)
    } else if (instance.$data && typeof instance.$data[expression] === 'function') {
      fn = instance.$data[expression].bind(instance.$data)
    }
    if (fn) return buildWrapper(fn, modifiers)
  }

  // 内联语句
  try {
    const fn = new Function(
      '$event',
      '$data',
      '$props',
      '$emit',
      `with($data) { ${expression} }`
    )
    return buildWrapper((event) => {
      try {
        fn(event, instance.$data, instance.$props, (...args) => instance.$emit(...args))
      } catch (e) {
        console.error('[Da da-on] handler error:', e)
      }
    }, modifiers)
  } catch {
    console.warn(`[Da da-on] invalid handler: "${expression}"`)
    return null
  }
}

// ============================================================
// 修饰符处理
// ============================================================

/**
 * 构建事件处理函数，按顺序应用所有修饰符
 */
function buildWrapper(fn, modifiers) {
  const checks = []

  // 1. 通用修饰符
  if (modifiers.self) {
    checks.push((event) => event.target === event.currentTarget)
  }

  // 2. 鼠标按钮修饰符
  for (const [name, button] of Object.entries(BUTTON_MAP)) {
    if (modifiers[name]) {
      checks.push((event) => event.button === button)
    }
  }

  // 3. 键盘修饰符
  const keyModifier = getKeyModifier(modifiers)
  if (keyModifier) {
    checks.push(keyModifier)
  }

  // 4. 系统修饰符
  const sysMods = SYSTEM_MODIFIERS.filter((m) => modifiers[m])
  if (sysMods.length > 0) {
    if (modifiers.exact) {
      // 精确匹配：必须刚好按下指定的系统修饰符
      checks.push((event) => {
        for (const mod of SYSTEM_MODIFIERS) {
          const isDown = isSystemModDown(event, mod)
          if (sysMods.includes(mod) && !isDown) return false
          if (!sysMods.includes(mod) && isDown) return false
        }
        return true
      })
    } else {
      // 宽松匹配：指定的修饰符必须按下，额外的忽略
      checks.push((event) => {
        for (const mod of sysMods) {
          if (!isSystemModDown(event, mod)) return false
        }
        return true
      })
    }
  }

  return function (event) {
    // 前置检查
    for (const check of checks) {
      if (!check(event)) return
    }

    // 执行修饰操作
    if (modifiers.stop) event.stopPropagation()
    if (modifiers.prevent) event.preventDefault()

    // 调用实际处理函数
    fn(event)
  }
}

// ============================================================
// 键盘修饰符解析
// ============================================================

function getKeyModifier(modifiers) {
  // 按优先级顺序检查
  if (modifiers.delete) {
    return (event) => DELETE_KEYS.has(event.key)
  }

  for (const [name, key] of Object.entries(KEY_MAP)) {
    if (modifiers[name]) {
      return (event) => event.key === key
    }
  }

  return null
}

// ============================================================
// 系统修饰符检查
// ============================================================

function isSystemModDown(event, mod) {
  switch (mod) {
    case 'ctrl':  return event.ctrlKey
    case 'alt':   return event.altKey
    case 'shift': return event.shiftKey
    case 'meta':  return event.metaKey
    default:      return false
  }
}

export default directive
