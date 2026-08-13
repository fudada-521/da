/**
 * Da.Component 基类
 *
 * 所有组件通过继承此类创建，自动获得：
 * - Shadow DOM 隔离
 * - 响应式数据代理
 * - Props 声明与类型转换
 * - 生命周期钩子
 * - 自动注册自定义元素
 * - 模板编译与指令绑定
 * - 异步批处理更新
 * - 插槽系统（默认 + 命名 + 作用域）
 */

import { reactive } from './reactive.js'
import { compile, compileSlotTemplate, updateTextBindings, updateBinding } from './compile.js'
import { createComponentUpdater, scheduleUpdate } from './scheduler.js'
import { createReactiveUpdater } from './bindingEffects.js'
import { lookup as lookupDirective } from '../directives/index.js'
import {
  kebabCase,
  isObject,
  isString,
  isFunction,
  convertAttribute,
  getDefaultValue,
  camelCase,
  evaluateExpression,
} from '../shared/utils.js'

// ============================================================
// 辅助
// ============================================================

const registeredTags = new Set()

function inferTagName(className) {
  return kebabCase(className)
}

export { evaluateExpression } from '../shared/utils.js'

/** 解析 da-slot 解构表达式如 "{ item, index }" */
const VSLOT_DESTRUCTURE_RE = /\{\s*([^}]+)\s*\}/

// ============================================================
// Component 基类
// ============================================================

export class Component extends HTMLElement {
  /** Props 声明：{ key: { type: Type, default: value } } */
  static props = {}

  /** 自定义标签名（留空则自动从类名推断） */
  static tagName = ''

  /**
   * 模板来源：CSS selector（'#my-tpl'）、HTML 字符串
   * 若为空，则使用 class 名自动查找 <template id="my-comp">
   */
  static template = ''

  constructor() {
    super()
    this._init()
  }

  // ───── 内部初始化 ─────

  _init() {
    // 1. 标签名
    this.$tag = this.constructor.tagName || inferTagName(this.constructor.name)

    // 2. Shadow DOM
    this.$el = this.attachShadow({ mode: 'open' })

    // 3. 插槽
    this.$slots = {}

    // 4. Props
    this.$props = {}
    this._initPropsDefinition()

    // 5. 响应式数据
    this._initData()

    // 6. 编译与调度状态
    this._compileResult = null
    this._textBindings = []
    this._mounted = false
    this._updating = false

    // 7. 作用域插槽
    this._scopedSlotRenderers = []
    this._scopedSlotWatcher = null

    // 8. 创建调度更新函数
    this._scheduledUpdate = createComponentUpdater(this, this._doUpdate)

    // 9. 细粒度绑定 effect 的 stop 引用（render 后填充）
    this._bindingStops = []

    // 10. 绑定 $emit
    this.$emit = this._emit.bind(this)

    // 11. onInit 生命周期
    this.onInit()
  }

  // ───── 响应式数据 ─────

  _initData() {
    // 在构造函数阶段先创建 $data 但不定义 getter/setter
    // 因为子类的 class field 初始器会在 super() 返回后执行，
    // 它们会覆盖 getter/setter（[[DefineOwnProperty]] 语义）。
    // 等 connectedCallback 的微任务中再定义。
    const fields = {}
    for (const key of Object.getOwnPropertyNames(this)) {
      if (key.startsWith('$') || key.startsWith('_')) continue
      fields[key] = this[key]
    }

    this.$data = reactive(fields)
  }

  /** 在 connectedCallback 的微任务中定义响应式 getter/setter（避开 class field 覆盖） */
  _setupReactiveGetters() {
    // 实时扫描 this 上的所有非私有属性
    // 此时子类的 class field 已经初始化完毕
    const keys = Object.getOwnPropertyNames(this).filter(
      (k) => !k.startsWith('$') && !k.startsWith('_')
    )

    if (keys.length === 0) return

    for (const key of keys) {
      const desc = Object.getOwnPropertyDescriptor(this, key)
      if (desc && desc.get) continue

      // 将字段的当前值同步到 $data
      this.$data[key] = this[key]
      // 定义 getter/setter
      this._defineReactiveProperty(key)
    }

  }

  _defineReactiveProperty(key) {
    Object.defineProperty(this, key, {
      get() {
        return this.$data[key]
      },
      set(value) {
        this.$data[key] = value
      },
      enumerable: true,
      configurable: true,
    })
  }

  /**
   * 细粒度依赖追踪：为每个指令绑定 / 文本绑定建立独立 effect，
   * 只在表达式实际读取的字段变化时更新自身。
   * （作用域插槽的 effect 在 _setupScopedSlot 中创建）
   */
  _setupReactiveBindings() {
    const result = this._compileResult
    if (!result) return

    const afterUpdate = () => this._scheduleOnUpdatedOnce()

    // 指令绑定：da-on 无响应式值、da-once 冻结，跳过
    for (const b of result.bindings || []) {
      if (b.name === 'on' || b.once) continue
      this._bindingStops.push(createReactiveUpdater(() => updateBinding(b, this), afterUpdate))
    }

    // 文本插值绑定：da-once 冻结，跳过
    for (const t of result.textBindings || []) {
      if (t.once) continue
      this._bindingStops.push(createReactiveUpdater(() => t.update(), afterUpdate))
    }
  }

  /** 每个响应式更新批次触发一次 onUpdated（同批次去重） */
  _scheduleOnUpdatedOnce() {
    if (this._onUpdatedQueued) return
    this._onUpdatedQueued = true
    scheduleUpdate(() => {
      this._onUpdatedQueued = false
      if (this._mounted) this.onUpdated()
    })
  }

  // ───── Props ─────

  _initPropsDefinition() {
    const propsDef = this.constructor.props || {}
    const keys = Object.keys(propsDef)

    this._propsKeys = keys
    if (keys.length === 0) return

    for (const key of keys) {
      const def = propsDef[key]
      const type = def.type || String
      const attrName = kebabCase(key)
      const attrValue = this.getAttribute(attrName)

      if (attrValue !== null) {
        this.$props[key] = convertAttribute(attrValue, type)
      } else {
        this.$props[key] = getDefaultValue(type, def.default)
      }
    }
  }

  static get observedAttributes() {
    const props = this.props || {}
    return Object.keys(props).map(kebabCase)
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return

    const propsDef = this.constructor.props || {}
    const key = camelCase(name)
    const def = propsDef[key]
    if (!def) return

    const type = def.type || String
    this.$props[key] = convertAttribute(newValue, type)

    if (this._mounted) {
      this._scheduledUpdate()
    }
  }

  // ───── 模板渲染 ─────

  _resolveTemplate() {
    const tpl = this.constructor.template

    if (!tpl) {
      const tplEl = document.querySelector(`template#${this.$tag}`)
      if (tplEl) return tplEl.innerHTML
      return ''
    }

    if (isString(tpl) && tpl.startsWith('#')) {
      const tplEl = document.querySelector(tpl)
      if (tplEl) return tplEl.innerHTML
      return ''
    }

    return tpl
  }

  _render() {
    const html = this._resolveTemplate()
    if (!html) return

    // 解析模板 HTML
    const temp = document.createElement('template')
    temp.innerHTML = html
    const content = temp.content

    // 提取并注入 <style>
    const styles = content.querySelectorAll('style')
    styles.forEach((style) => {
      this.$el.appendChild(style.cloneNode(true))
      style.remove()
    })

    // 克隆内容到 Shadow DOM
    const clone = document.importNode(content, true)
    this.$el.appendChild(clone)

    // 在 Shadow DOM 中处理插槽（需要真实的 DOM 节点）
    this._processSlots(this.$el)

    // 在 Shadow DOM 中编译模板（指令绑定指向真实 DOM 节点）
    this._compileResult = compile(this.$el, this)
    this._textBindings = this._compileResult.textBindings || []

    // 挂载指令
    this._mountDirectives()
  }

  // ───── 指令系统集成 ─────

  _mountDirectives() {
    const result = this._compileResult
    if (!result) return

    const { bindings = [] } = result

    // 为每个绑定查找对应的指令模块，执行 mount
    bindings.forEach((b) => {
      if (b.name === 'text') {
        // 文本插值：文本绑定由 compile 产出 update 函数
        return
      }

      const directive = lookupDirective(b.name)
      if (directive) {
        b.directive = directive

        // 预求值（da-on 的事件处理表达式不参与求值）
        if (b.name !== 'on') {
            const value = evaluateExpression(b.expression, this)
            b.binding.value = value
        }

        try {
          directive.mount(b.el, b.binding)

          // 如果指令返回了销毁函数，保存它
          if (directive.mount._cleanup) {
            b._cleanup = directive.mount._cleanup
          }
        } catch (e) {
          console.error(`[Da] directive "${b.name}" mount error:`, e)
        }
      }
    })

    // 初始渲染文本插值（da-once 冻结后不再更新，必须在此渲染）
    this._textBindings.forEach((b) => {
      b.update()
    })
  }

  // ───── 更新机制 ─────

  /**
   * 由调度器调用的实际更新函数
   */
  _doUpdate() {
    if (this._updating) return
    this._updating = true

    try {
      // 1. 更新文本插值
      updateTextBindings(this._textBindings)

      // 2. 更新指令绑定
      this._updateDirectives()

      // 3. 更新作用域插槽
      this._updateScopedSlots()
    } finally {
      this._updating = false
    }

    this.onUpdated()
  }

  _updateDirectives() {
    const result = this._compileResult
    if (!result) return

    for (const b of result.bindings || []) {
      updateBinding(b, this)
    }
  }

  _cleanupDirectives() {
    // 停止所有细粒度绑定 effect（指令 / 文本 / 作用域插槽）
    for (const stop of this._bindingStops) {
      try { stop() } catch (e) {}
    }
    this._bindingStops = []

    const result = this._compileResult
    if (!result) return

    const { bindings = [] } = result
    bindings.forEach((b) => {
      if (b.directive && isFunction(b.directive.unmount)) {
        try {
          b.directive.unmount(b.el)
        } catch (e) {
          console.error(`[Da] directive "${b.name}" unmount error:`, e)
        }
      }
    })

    // 清理作用域插槽
    this._cleanupScopedSlots()

    if (this._compileResult && isFunction(this._compileResult.unmount)) {
      this._compileResult.unmount()
    }

    this._compileResult = null
    this._textBindings = []
  }

  // ───── 插槽系统 ─────

  /** 从 <slot> element 的 attribute 中提取暴露的 prop */
  _extractSlotProps(slotEl) {
    const props = {}
    Array.from(slotEl.attributes || []).forEach((attr) => {
      const match = attr.name.match(/^:(.+)/)
      if (match) {
        // 属性名归一为 camelCase，与 da-slot 解构名（如 { isAdmin }）保持一致
        props[camelCase(match[1])] = attr.value.trim()
      }
    })
    return props
  }

  _processSlots(content) {
    const scopedTemplates = this._collectScopedSlotTemplates()
    const slots = content.querySelectorAll('slot')

    slots.forEach((slotEl) => {
      const name = slotEl.getAttribute('name') || 'default'
      const slotProps = this._extractSlotProps(slotEl)
      const scopedTemplate = scopedTemplates.find((s) => s.name === name)

      if (scopedTemplate && Object.keys(slotProps).length > 0) {
        // 作用域插槽：编译并渲染
        this._setupScopedSlot(slotEl, slotProps, scopedTemplate)
      } else {
        // 普通插槽：克隆 light DOM 内容
        this._renderNormalSlot(slotEl, name)
      }
    })
  }

  /** 从 light DOM 中收集 da-slot / # 模板 */
  _collectScopedSlotTemplates() {
    const result = []

    Array.from(this.children).forEach((child) => {
      const vslot = this._extractVSlotDirective(child)
      if (!vslot) return

      // 得到 prop 名列表
      const propNames = this._parseVSlotDestructuring(vslot.expr)
      result.push({
        name: vslot.name,
        templateHTML: child.innerHTML,
        propNames,
        el: child,
      })

      // 标记为已处理（在 DOM 中隐藏，不参与原生投影）
      child.style.display = 'none'
    })

    return result
  }

  /**
   * 从元素上提取 da-slot 指令
   * 支持：da-slot:default="{ item }" / #default="{ item }" / da-slot="{ item }"
   */
  _extractVSlotDirective(el) {
    if (!el.attributes) return null

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name

      // #default="{ item }" 或 #="{ item }"
      if (name === '#' || name.startsWith('#') && !name.startsWith('##')) {
        const slotName = name === '#' ? 'default' : name.slice(1)
        return { name: slotName || 'default', expr: attr.value.trim() }
      }

      // da-slot:default="{ item }" 或 da-slot="{ item }"
      if (name === 'da-slot' || name.startsWith('da-slot:')) {
        const slotName = name === 'da-slot' ? 'default' : name.slice('da-slot:'.length)
        return { name: slotName || 'default', expr: attr.value.trim() }
      }
    }

    return null
  }

  /**
   * 解析 da-slot 解构语法，提取 prop 名列表
   * "{ item, index }" → ['item', 'index']
   * "{ item: renamed }" → ['item']  （暂不处理重命名，直接用 key）
   */
  _parseVSlotDestructuring(expr) {
    if (!expr) return []
    const match = expr.match(VSLOT_DESTRUCTURE_RE)
    if (!match) return []

    return match[1]
      .split(',')
      .map((s) => {
        const trimmed = s.trim()
        // 处理重命名：item: renamedItem → 用 key: item
        const parts = trimmed.split(':')
        return parts[0].trim()
      })
      .filter(Boolean)
  }

  /** 设置作用域插槽渲染 */
  _setupScopedSlot(slotEl, slotProps, scopedTemplate) {
    const name = slotEl.getAttribute('name') || 'default'
    const props = slotProps
    const { templateHTML, propNames } = scopedTemplate

    // 编译模板为渲染函数（缓存模板 DOM，避免每次渲染重复解析）
    const renderFn = compileSlotTemplate(templateHTML, propNames, this)

    // 创建容器元素替换 <slot>（标记后，宿主组件的 compile 会跳过其子树，
    // 因为插槽内容已由 _renderScopedSlotContent 单独编译）
    const container = document.createElement('span')
    container._daSlotContainer = true
    container.style.display = 'contents'
    slotEl.parentNode.replaceChild(container, slotEl)

    // 存储渲染器信息
    const renderer = {
      name,
      renderFn,
      container,
      propExprs: props,   // { item: '表达式', index: '索引' }
      propNames,
      compiled: null,     // 当前编译结果（用于清理指令绑定）
    }

    this._scopedSlotRenderers.push(renderer)

    // 细粒度 effect：首次运行渲染初始并收集依赖，
    // 依赖变化时（插槽 prop 表达式或其内容引用的父数据）自动重渲该插槽
    this._bindingStops.push(
      createReactiveUpdater(() => this._renderScopedSlotContent(renderer), () => this._scheduleOnUpdatedOnce())
    )
  }

  /** 渲染某个作用域插槽的内容 */
  _renderScopedSlotContent(renderer) {
    const { renderFn, container, propExprs } = renderer

    // 清理上一次的指令绑定，避免事件泄漏 / 重复挂载
    if (renderer.compiled) {
      try { renderer.compiled.unmount() } catch (e) {}
      renderer.compiled = null
    }

    // 计算 slot props
    const slotData = {}
    for (const [propName, expression] of Object.entries(propExprs)) {
      slotData[propName] = evaluateExpression(expression, this)
    }

    // 渲染 + 编译
    const { fragment, compiled } = renderFn(slotData)

    // 先挂载到容器再挂载指令（da-if 等结构性指令依赖 parentNode）
    container.innerHTML = ''
    container.appendChild(fragment)

    if (compiled) {
      compiled.mount()
      compiled.update() // 渲染初始 {{ }} 文本插值
    }
    renderer.compiled = compiled
  }

  /** 更新所有作用域插槽（在响应式数据变化时调用） */
  _updateScopedSlots() {
    this._scopedSlotRenderers.forEach((renderer) => {
      this._renderScopedSlotContent(renderer)
    })
  }

  /** 常规插槽渲染（默认 + 命名） */
  _renderNormalSlot(slotEl, name) {
    if (name === 'default') {
      // 对于默认插槽，跳过带有 da-slot 的子元素
      const children = Array.from(this.childNodes)
      children.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE && this._extractVSlotDirective(child)) return
        slotEl.appendChild(child.cloneNode(true))
      })
    } else {
      const matched = Array.from(this.children).filter((child) => {
        if (this._extractVSlotDirective(child)) return false
        return child.getAttribute('slot') === name
      })
      matched.forEach((child) => {
        slotEl.appendChild(child.cloneNode(true))
      })
    }
  }

  // ───── 事件派发 ─────

  /**
   * 派发自定义事件（组合了 bubbles + composed，便于跨 Shadow DOM 通信）
   */
  _emit(event, detail) {
    this.dispatchEvent(new CustomEvent(event, {
      detail,
      bubbles: true,
      composed: true,
    }))
  }

  /** 清理作用域插槽 */
  _cleanupScopedSlots() {
    this._scopedSlotRenderers.forEach((r) => {
      if (r.compiled) {
        try { r.compiled.unmount() } catch (e) {}
      }
      if (r.container && r.container.parentNode) {
        r.container.parentNode.removeChild(r.container)
      }
    })
    this._scopedSlotRenderers = []
  }

  // ───── 生命周期 ─────

  /** 实例化时调用 */
  onInit() {}

  /** 挂载到 DOM 时调用 */
  onMounted() {}

  /** 响应式数据更新后调用 */
  onUpdated() {}

  /** 从 DOM 移除时调用 */
  onUnmounted() {}

  connectedCallback() {
    // 延迟到微任务，确保所有 class 字段初始化完毕
    Promise.resolve().then(() => {
      if (this._mounted) return

      this._initPropsDefinition()
      this._setupReactiveGetters()  // 创建 getter/setter，此时 class field 已初始化完成
      this._render()
      this._mounted = true
      this.onMounted()

      // 细粒度依赖追踪：每个绑定/插槽一个 effect，首次运行即渲染并收集依赖
      this._setupReactiveBindings()
    })
  }

  disconnectedCallback() {
    this._mounted = false
    this._cleanupDirectives()
    this.onUnmounted()
  }

  // ───── 静态：自动注册 ─────

  /**
   * 注册自定义元素
   * 在 class 定义后调用：MyComp.define() 或 Da.define('my-comp', MyComp)
   */
  static define(name) {
    const tagName = name || this.tagName || inferTagName(this.name)

    if (registeredTags.has(tagName)) return
    if (customElements.get(tagName)) {
      registeredTags.add(tagName)
      return
    }

    customElements.define(tagName, this)
    registeredTags.add(tagName)
  }

  /**
   * 获取已注册的标签名
   */
  static getTagName() {
    return this.tagName || inferTagName(this.name)
  }
}
