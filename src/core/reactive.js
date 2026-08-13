/**
 * 响应式系统
 *
 * 核心机制：
 * - reactive() 使用 Proxy 实现对象深度响应式
 * - ref() 通过 getter/setter 包装单值
 * - 运行中的 effect 触发时自动收集依赖（track）
 * - 数据变更时触发所有依赖的 effect（trigger）
 *
 * 数据结构：
 *   targetMap(WeakMap) ─▶ target
 *                            └─▶ depsMap(Map) ─▶ key
 *                                                    └─▶ deps(Set) ─▶ effectFn
 */

import { isObject, isPlainObject, isFunction } from '../shared/utils.js'

// ============================================================
// 全局状态
// ============================================================

/** 全局依赖收集映射 */
const targetMap = new WeakMap()

/** 当前正在运行的 effect 栈 */
const effectStack = []

/** 当前激活的 effect */
let activeEffect = null
let effectId = 0

// ============================================================
// 依赖收集与触发
// ============================================================

/**
 * 收集依赖：将当前 activeEffect 添加到 target[key] 的依赖集合中
 */
function track(target, key) {
  if (!activeEffect) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let deps = depsMap.get(key)
  if (!deps) {
    deps = new Set()
    depsMap.set(key, deps)
  }

  deps.add(activeEffect)
  activeEffect._deps.push(deps)
}

/**
 * 触发更新：执行 target[key] 的所有依赖 effect
 */
function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const deps = depsMap.get(key)
  if (!deps) return

  // 拷贝一份执行，避免死循环
  const effectsToRun = new Set(deps)
  effectsToRun.forEach((effect) => {
    if (effect !== activeEffect) {
      // 有 scheduler 的 effect（如 watch/computed）交给 scheduler 调度
      if (effect._scheduler) {
        effect._scheduler()
      } else {
        effect()
      }
    }
  })
}

// ============================================================
// reactive
// ============================================================

const reactiveMap = new WeakMap()

/** 迭代操作的依赖键（for...in / 数组整体变更） */
const ITERATE_KEY = Symbol.for('iterate')

/**
 * 数组变更方法的拦截器
 *
 * Proxy 不会可靠拦截原生数组方法（如 push 只触发 index set、不触发 length），
 * 这里统一包裹：在原生方法执行后显式触发 length 与 iterate 依赖，
 * 保证 da-for 等监听整个数组的 effect 能被可靠唤醒。
 */
const arrayInstrumentations = {}
const ARRAY_MUTATION_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
for (const method of ARRAY_MUTATION_METHODS) {
  arrayInstrumentations[method] = function (...args) {
    const raw = this._raw
    const res = Reflect.apply(Array.prototype[method], raw, args)
    if (raw) {
      trigger(raw, 'length')
      trigger(raw, ITERATE_KEY)
    }
    return res
  }
}

/**
 * 创建对象的深度响应式代理
 */
export function reactive(target) {
  if (!isObject(target)) return target

  // 防止重复代理
  if (reactiveMap.has(target)) return reactiveMap.get(target)

  // 已经是代理则不再代理
  if (target._isReactive) return target

  const proxy = new Proxy(target, reactiveHandler)
  reactiveMap.set(target, proxy)
  return proxy
}

const reactiveHandler = {
  get(target, key, receiver) {
    if (key === '_isReactive') return true
    if (key === '_raw') return target

    // 数组变更方法：返回包裹版本，保证触发 length/iterate 依赖
    if (Array.isArray(target) && key in arrayInstrumentations) {
      return arrayInstrumentations[key]
    }

    const result = Reflect.get(target, key, receiver)

    // 收集依赖
    track(target, key)

    // 深度响应式：对象嵌套时自动转为 reactive
    if (isObject(result) && !result._isReactive && !result._isRef) {
      return reactive(result)
    }

    return result
  },

  set(target, key, value, receiver) {
    const oldValue = target[key]
    const result = Reflect.set(target, key, value, receiver)

    if (oldValue !== value && !Number.isNaN(oldValue) && !Number.isNaN(value)) {
      trigger(target, key)
    }

    return result
  },

  deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    const result = Reflect.deleteProperty(target, key)
    if (hadKey) {
      trigger(target, key)
    }
    return result
  },

  has(target, key) {
    track(target, key)
    return Reflect.has(target, key)
  },

  ownKeys(target) {
    track(target, Symbol.for('iterate'))
    return Reflect.ownKeys(target)
  },
}

// ============================================================
// ref
// ============================================================

/**
 * 创建响应式引用
 * - 基本类型用 getter/setter 包装
 * - 对象类型自动转为 reactive
 */
export function ref(value) {
  // 如果是 ref 本身，直接返回
  if (value && value._isRef) return value

  return createRef(value)
}

function createRef(rawValue) {
  let _value = isObject(rawValue) ? reactive(rawValue) : rawValue
  const refObj = {
    _isRef: true,
    _raw: rawValue,

    get value() {
      // 读取时收集依赖
      track(refObj, 'value')
      return _value
    },

    set value(newVal) {
      if (newVal !== _value && !Number.isNaN(newVal) && !Number.isNaN(_value)) {
        refObj._raw = newVal
        _value = isObject(newVal) ? reactive(newVal) : newVal
        trigger(refObj, 'value')
      }
    },
  }

  return refObj
}

// ============================================================
// computed
// ============================================================

/**
 * 创建计算属性
 * - 惰性求值：只有读取 .value 时才计算
 * - 缓存：依赖未变时返回缓存值
 * - 脏标记：依赖变化时标记为脏，下次读取重新计算
 */
export function computed(getterOrOptions) {
  const isFn = isFunction(getterOrOptions)
  const getter = isFn ? getterOrOptions : getterOrOptions.get
  const setter = isFn ? null : getterOrOptions.set

  let _value
  let _dirty = true

  const _effect = effect(getter, {
    lazy: true,
    scheduler: () => {
      if (!_dirty) {
        _dirty = true
        trigger(computedObj, 'value')
      }
    },
  })

  const computedObj = {
    _isRef: true,
    _isComputed: true,

    get value() {
      track(computedObj, 'value')
      if (_dirty) {
        _value = _effect()
        _dirty = false
      }
      return _value
    },

    set value(val) {
      if (setter) {
        setter(val)
      }
    },
  }

  return computedObj
}

// ============================================================
// effect
// ============================================================

/**
 * 创建副作用，自动追踪依赖
 *
 * @param {Function} fn - 副作用函数
 * @param {Object} options
 * @param {boolean} options.lazy - 是否惰性执行（首次不自动执行）
 * @param {Function} options.scheduler - 自定义调度器
 * @returns {Function} 包装后的 effect 函数
 */
export function effect(fn, options = {}) {
  const { lazy = false, scheduler = null } = options

  const _effect = function () {
    if (_effect._stopped) return
    try {
      // 清理旧依赖
      cleanup(_effect)

      // 入栈
      effectStack.push(_effect)
      activeEffect = _effect

      // 执行 fn，返回值给 computed 用
      return fn()
    } finally {
      // 出栈
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1] || null
    }
  }

  _effect._deps = []
  _effect._scheduler = scheduler
  _effect._uid = ++effectId

  if (!lazy) {
    _effect()
  }

  return _effect
}

/** 清理 effect 的所有依赖 */
function cleanup(effectFn) {
  const { _deps } = effectFn
  for (let i = 0; i < _deps.length; i++) {
    _deps[i].delete(effectFn)
  }
  _deps.length = 0
}

/**
 * 停止 effect：清空其全部依赖，使其不再被任何数据变化触发。
 * 用于组件/绑定卸载时清理细粒度 effect。
 *
 * 同时置 _stopped 标记，防止"stop 后仍有挂起的调度任务"重新执行并重订阅依赖。
 */
export function stop(effectFn) {
  cleanup(effectFn)
  effectFn._stopped = true
}

// ============================================================
// watch
// ============================================================

/**
 * 监听响应式数据变化
 *
 * @param {Function|ref|reactive} source - 监听源
 * @param {Function} cb - 回调 (newValue, oldValue)
 * @param {Object} options
 * @param {boolean} options.immediate - 是否立即执行回调
 */
export function watch(source, cb, options = {}) {
  let getter
  let oldValue

  // 统一转为 getter 函数
  if (isFunction(source)) {
    getter = source
  } else if (source._isRef) {
    // ref
    getter = () => source.value
  } else if (isObject(source)) {
    // reactive 对象
    getter = () => {
      // 深度遍历以收集所有属性依赖
      deepTraverse(source)
      return source
    }
  } else {
    getter = () => {}
  }

  const { immediate = false } = options

  const _effect = effect(() => getter(), {
    lazy: true,
    scheduler: () => {
      const newValue = _effect()
      cb(newValue, oldValue)
      oldValue = newValue
    },
  })

  if (immediate) {
    oldValue = _effect()
    cb(oldValue, undefined)
  } else {
    oldValue = _effect()
  }
}

/** 深度遍历触发 getter，用于 watch reactive 对象时收集所有属性依赖 */
function deepTraverse(obj, seen = new Set()) {
  if (!isObject(obj) || seen.has(obj) || obj._isRef) return
  seen.add(obj)

  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (isObject(val)) {
      deepTraverse(val, seen)
    }
  }
}

// ============================================================
// 额外工具：toRef / toRefs（方便解构）
// ============================================================

/**
 * 为 reactive 对象的某个 key 创建 ref 引用
 */
export function toRef(obj, key) {
  const wrapper = {
    _isRef: true,
    get value() {
      return obj[key]
    },
    set value(val) {
      obj[key] = val
    },
  }
  return wrapper
}

/**
 * 将 reactive 对象的所有 key 转为 ref
 */
export function toRefs(obj) {
  const result = {}
  for (const key of Object.keys(obj)) {
    result[key] = toRef(obj, key)
  }
  return result
}
