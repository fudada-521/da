/**
 * 响应式系统测试
 *
 * 覆盖：reactive / ref / computed / effect / watch / toRef(s)
 * 数组方法拦截（push/pop/splice 等触发 length/iterate）、trigger 的 _scheduler 分发
 */
import { describe, it, expect, vi } from 'vitest'
import {
  reactive,
  ref,
  computed,
  effect,
  watch,
  stop,
  toRef,
  toRefs,
} from '../src/core/reactive.js'

describe('reactive', () => {
  it('effect 追踪基本属性，数据变化时重新执行', () => {
    const state = reactive({ count: 0 })
    const fn = vi.fn(() => state.count)
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    state.count = 1
    expect(fn).toHaveBeenCalledTimes(2)
    expect(state.count).toBe(1)
  })

  it('未读取的属性变化不触发 effect', () => {
    const state = reactive({ a: 1, b: 2 })
    const fn = vi.fn(() => state.a)
    effect(fn)

    state.b = 99
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('嵌套对象深度响应式', () => {
    const state = reactive({ a: { b: 1 } })
    const fn = vi.fn(() => state.a.b)
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    state.a.b = 42
    expect(fn).toHaveBeenCalledTimes(2)
    expect(state.a.b).toBe(42)
  })

  it('新增属性是响应式的（Proxy 拦截 set）', () => {
    const state = reactive({})
    const fn = vi.fn(() => state.name)
    effect(fn)

    state.name = 'Da'
    expect(fn).toHaveBeenCalledTimes(2)
    expect(state.name).toBe('Da')
  })

  it('deleteProperty 触发依赖', () => {
    const state = reactive({ a: 1 })
    const fn = vi.fn(() => 'a' in state)
    effect(fn)

    delete state.a
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('reactive 防止重复代理', () => {
    const raw = { a: 1 }
    const p1 = reactive(raw)
    const p2 = reactive(raw)
    expect(p1).toBe(p2)
  })

  it('对已有代理再次 reactive 返回同一对象', () => {
    const p = reactive({ a: 1 })
    expect(reactive(p)).toBe(p)
  })

  it('非对象原样返回', () => {
    expect(reactive(42)).toBe(42)
    expect(reactive('str')).toBe('str')
    expect(reactive(null)).toBe(null)
  })
})

describe('reactive 数组方法拦截', () => {
  it('push 触发 length 与 iterate 依赖', () => {
    const arr = reactive([1, 2])
    const lenFn = vi.fn(() => arr.length)
    const iterFn = vi.fn(() => arr.map((x) => x))
    effect(lenFn)
    effect(iterFn)
    expect(lenFn).toHaveBeenCalledTimes(1)

    arr.push(3)
    expect(lenFn).toHaveBeenCalledTimes(2)
    expect(iterFn).toHaveBeenCalledTimes(2)
    expect(arr).toEqual([1, 2, 3])
  })

  it('pop 触发 length 依赖', () => {
    const arr = reactive([1, 2, 3])
    const fn = vi.fn(() => arr.length)
    effect(fn)

    const popped = arr.pop()
    expect(popped).toBe(3)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('splice 触发 iterate 依赖', () => {
    const arr = reactive([1, 2, 3])
    const fn = vi.fn(() => arr.map((x) => x * 2))
    effect(fn)

    arr.splice(1, 1)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(arr).toEqual([1, 3])
  })

  it('索引赋值（arr[0] = x）触发依赖', () => {
    const arr = reactive([1, 2])
    const fn = vi.fn(() => arr[0])
    effect(fn)

    arr[0] = 10
    expect(fn).toHaveBeenCalledTimes(2)
    expect(arr[0]).toBe(10)
  })

  it('sort / reverse 触发 iterate', () => {
    const arr = reactive([3, 1, 2])
    const fn = vi.fn(() => arr.join(','))
    effect(fn)

    arr.sort()
    expect(fn).toHaveBeenCalledTimes(2)
    expect(arr).toEqual([1, 2, 3])
  })
})

describe('ref', () => {
  it('value 读写被 effect 追踪', () => {
    const count = ref(0)
    const fn = vi.fn(() => count.value)
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    count.value = 5
    expect(fn).toHaveBeenCalledTimes(2)
    expect(count.value).toBe(5)
  })

  it('相同值赋值不触发', () => {
    const count = ref(1)
    const fn = vi.fn(() => count.value)
    effect(fn)

    count.value = 1
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('对象 ref 内部是响应式的', () => {
    const obj = ref({ a: 1 })
    const fn = vi.fn(() => obj.value.a)
    effect(fn)

    obj.value.a = 2
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('ref 传入 ref 返回原对象', () => {
    const a = ref(1)
    expect(ref(a)).toBe(a)
  })

  it('替换整个对象后新对象响应式', () => {
    const obj = ref({ a: 1 })
    const fn = vi.fn(() => obj.value.a)
    effect(fn)

    obj.value = { a: 99 }
    expect(fn).toHaveBeenCalledTimes(2)
    expect(obj.value.a).toBe(99)

    obj.value.a = 100
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

describe('computed', () => {
  it('惰性求值：不读取 .value 不算', () => {
    const state = reactive({ count: 1 })
    const getter = vi.fn(() => state.count * 2)
    const double = computed(getter)

    expect(getter).not.toHaveBeenCalled()
    expect(double.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(1)
  })

  it('依赖未变时读取返回缓存值', () => {
    const state = reactive({ count: 1 })
    const getter = vi.fn(() => state.count * 2)
    const double = computed(getter)

    double.value
    double.value
    double.value
    expect(getter).toHaveBeenCalledTimes(1)
  })

  it('依赖变化后重新计算', () => {
    const state = reactive({ count: 1 })
    const double = computed(() => state.count * 2)
    expect(double.value).toBe(2)

    state.count = 5
    expect(double.value).toBe(10)
  })

  it('computed 依赖的 effect 随依赖变化触发', () => {
    const state = reactive({ count: 1 })
    const double = computed(() => state.count * 2)
    const fn = vi.fn(() => double.value)
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    state.count = 10
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('可写 computed（setter）', () => {
    const state = reactive({ count: 1 })
    const plusOne = computed({
      get: () => state.count + 1,
      set: (v) => { state.count = v - 1 },
    })

    plusOne.value = 10
    expect(state.count).toBe(9)
  })
})

describe('effect', () => {
  it('依赖切换后清理旧依赖', () => {
    const state = reactive({ a: 1, b: 2, ok: true })
    const fn = vi.fn(() => (state.ok ? state.a : state.b))
    effect(fn)

    state.a = 10
    expect(fn).toHaveBeenCalledTimes(2)

    state.ok = false
    expect(fn).toHaveBeenCalledTimes(3)

    // ok=false 后不再依赖 a，修改 a 不应触发
    state.a = 100
    expect(fn).toHaveBeenCalledTimes(3)

    // 现在依赖 b
    state.b = 20
    expect(fn).toHaveBeenCalledTimes(4)
  })

  it('scheduler 优先于直接执行', () => {
    const state = reactive({ count: 0 })
    const run = vi.fn()
    const schedule = vi.fn(() => run())
    effect(() => state.count, { scheduler: schedule })

    state.count = 1
    expect(schedule).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('stop 后不再触发', () => {
    const state = reactive({ count: 0 })
    const fn = vi.fn(() => state.count)
    const runner = effect(fn)

    state.count = 1
    expect(fn).toHaveBeenCalledTimes(2)

    stop(runner)
    state.count = 2
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('watch', () => {
  it('监听 getter 函数，返回新旧值', () => {
    const state = reactive({ count: 0 })
    const cb = vi.fn()
    watch(() => state.count, cb)

    state.count = 1
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenLastCalledWith(1, 0)

    state.count = 2
    expect(cb).toHaveBeenLastCalledWith(2, 1)
  })

  it('监听 ref', () => {
    const count = ref(0)
    const cb = vi.fn()
    watch(count, cb)

    count.value = 5
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenLastCalledWith(5, 0)
  })

  it('监听 reactive 对象深度变化', () => {
    const state = reactive({ a: { b: 1 } })
    const cb = vi.fn()
    watch(state, cb)

    state.a.b = 2
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('immediate 立即执行一次', () => {
    const state = reactive({ count: 0 })
    const cb = vi.fn()
    watch(() => state.count, cb, { immediate: true })

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenLastCalledWith(0, undefined)

    state.count = 1
    expect(cb).toHaveBeenCalledTimes(2)
  })
})

describe('toRef / toRefs', () => {
  it('toRef 与源对象保持双向同步', () => {
    const state = reactive({ count: 0 })
    const countRef = toRef(state, 'count')

    countRef.value = 10
    expect(state.count).toBe(10)

    state.count = 20
    expect(countRef.value).toBe(20)
  })

  it('toRefs 解构后仍响应式', () => {
    const state = reactive({ count: 0, name: 'Da' })
    const { count, name } = toRefs(state)

    const fn = vi.fn(() => count.value + name.value)
    effect(fn)

    count.value = 5
    expect(fn).toHaveBeenCalledTimes(2)
    expect(state.count).toBe(5)
  })
})
