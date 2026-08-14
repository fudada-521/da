/**
 * DaTransition — 进入/离开过渡组件
 *
 * 基于原生 HTMLElement，管理单元素的过渡动画。
 *
 * 用法：
 *   <da-transition :show="visible" name="fade">
 *     <div class="box">Hello</div>
 *   </da-transition>
 *
 * CSS 类名约定：
 *   .{name}-enter-from      进入起始（首帧）
 *   .{name}-enter-active    进入过渡期（持续到结束）
 *   .{name}-enter-to        进入结束（最后一帧）
 *   .{name}-leave-from      离开起始
 *   .{name}-leave-active    离开过渡期
 *   .{name}-leave-to        离开结束
 *
 * Props（通过 attribute 传入）：
 *   show    控制显示/隐藏，'true' | 'false'（字符串）
 *   name    CSS class 前缀，默认 'da'
 *   mode    'out-in'（默认）| 'in-out' | 'simultaneous'
 *   appear  初始渲染是否执行过渡，默认 false
 */

// ============================================================
// 过渡阶段
// ============================================================

const IDLE = 0
const ENTERING = 1
const LEAVING = 2

// ============================================================
// 过渡组件
// ============================================================

export class DaTransition extends HTMLElement {
  /** 需要在注册后手动调用 DaTransition.define()，或由框架自动注册 */

  constructor() {
    super()
    this._container = null        // Shadow DOM 容器
    this._phase = IDLE
    this._currentEl = null        // 当前显示的元素
    this._pending = null          // 'enter' | 'leave' | null
    this._timer = null
    this._mounted = false

    // 从 attribute 读取 props
    this._name = 'da'
    this._mode = 'out-in'
    this._appear = false
  }

  connectedCallback() {
    // 创建 Shadow DOM 容器
    this._container = document.createElement('div')
    this._container.style.cssText = 'display: contents;'
    this.attachShadow({ mode: 'open' }).appendChild(this._container)

    // 读取 attribute
    this._name = this.getAttribute('name') || 'da'
    this._mode = this.getAttribute('mode') || 'out-in'
    this._appear = this.hasAttribute('appear')

    // 延迟到微任务，确保 light DOM 子节点已解析
    Promise.resolve().then(() => {
      const show = this.getAttribute('show') !== 'false'

      if (show) {
        if (this._appear) {
          // appear：初始渲染也执行进入过渡
          this._performEnter()
        } else {
          this._enterImmediate()
        }
      }

      this._mounted = true
    })
  }

  static get observedAttributes() {
    return ['show', 'name', 'mode']
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._mounted) return

    if (name === 'show') {
      const show = newVal !== 'false' && newVal !== null
      if (show && !this._currentEl) {
        this.enter()
      } else if (!show && this._currentEl) {
        this.leave()
      }
    } else if (name === 'name') {
      this._name = newVal || 'da'
    } else if (name === 'mode') {
      this._mode = newVal || 'out-in'
    }
  }

  disconnectedCallback() {
    this._clearTimer()
    this._mounted = false
  }

  // ───── 公共方法 ─────

  /** 编程式触发进入过渡 */
  enter() {
    if (!this._mounted) return

    if (this._phase === LEAVING) {
      if (this._mode === 'out-in') {
        this._pending = 'enter'
        return
      }
    }
    this._performEnter()
  }

  /** 编程式触发离开过渡 */
  leave() {
    if (!this._currentEl) return

    if (this._phase === ENTERING) {
      if (this._mode === 'in-out') {
        this._pending = 'leave'
        return
      }
    }
    this._performLeave()
  }

  // ───── 内容管理 ─────

  /** 获取 light DOM 中第一个子节点的模板 */
  _getContentHTML() {
    // 优先取 <template> 内容
    const tpl = this.querySelector('template')
    if (tpl) return tpl.innerHTML

    // 否则取所有子节点的 outerHTML
    const children = Array.from(this.childNodes).filter(
      (n) => n.nodeType !== Node.COMMENT_NODE
    )
    return children.map((c) => c.outerHTML || c.textContent).join('')
  }

  /** 将 HTML 渲染为 DOM 片段 */
  _renderContent(html) {
    if (!html || !html.trim()) return document.createDocumentFragment()
    const temp = document.createElement('template')
    temp.innerHTML = html
    return temp.content
  }

  // ───── 无过渡进出 ─────

  _enterImmediate() {
    const html = this._getContentHTML()
    if (!html) return
    const fragment = this._renderContent(html)
    this._currentEl = fragment.firstElementChild || fragment.firstChild
    this._container.appendChild(fragment)
  }

  _leaveImmediate() {
    if (this._currentEl && this._currentEl.parentNode) {
      this._currentEl.parentNode.removeChild(this._currentEl)
    }
    this._currentEl = null
  }

  // ───── 进入过渡 ─────

  _performEnter() {
    this._phase = ENTERING
    const name = this._name || 'da'
    const html = this._getContentHTML()
    if (!html) { this._phase = IDLE; return }

    // 渲染新元素
    const fragment = this._renderContent(html)
    const el = fragment.firstElementChild || fragment.firstChild
    if (!el) { this._phase = IDLE; return }

    // 设为起始状态
    el.classList.add(`${name}-enter-from`)
    el.classList.add(`${name}-enter-active`)

    this._currentEl = el
    this._container.appendChild(el)
    this._dispatch('before-enter', el)

    // 下一帧切换到进行状态
    requestAnimationFrame(() => {
      el.classList.remove(`${name}-enter-from`)
      el.classList.add(`${name}-enter-to`)
      this._dispatch('enter', el)

      // 等待过渡结束
      this._waitTransition(el, () => {
        el.classList.remove(`${name}-enter-active`)
        el.classList.remove(`${name}-enter-to`)
        this._phase = IDLE
        this._dispatch('after-enter', el)
        this._checkPending()
      })
    })
  }

  // ───── 离开过渡 ─────

  _performLeave() {
    const el = this._currentEl
    if (!el) { this._phase = IDLE; return }

    this._phase = LEAVING
    const name = this._name || 'da'

    el.classList.add(`${name}-leave-from`)
    el.classList.add(`${name}-leave-active`)
    this._dispatch('before-leave', el)

    requestAnimationFrame(() => {
      el.classList.remove(`${name}-leave-from`)
      el.classList.add(`${name}-leave-to`)
      this._dispatch('leave', el)

      this._waitTransition(el, () => {
        el.classList.remove(`${name}-leave-active`)
        el.classList.remove(`${name}-leave-to`)

        if (el.parentNode) el.parentNode.removeChild(el)
        this._currentEl = null
        this._phase = IDLE
        this._dispatch('after-leave', el)
        this._checkPending()
      })
    })
  }

  // ───── 过渡检测 ─────

  _waitTransition(el, callback) {
    this._clearTimer()
    let done = false

    const finish = () => {
      if (done) return
      done = true
      el.removeEventListener('transitionend', onEnd)
      el.removeEventListener('animationend', onEnd)
      this._clearTimer()
      callback()
    }

    const onEnd = (e) => {
      if (e.target === el) finish()
    }

    el.addEventListener('transitionend', onEnd)
    el.addEventListener('animationend', onEnd)

    // 自动检测超时
    const style = getComputedStyle(el)
    const td = parseCSSDuration(style.transitionDuration)
    const ad = parseCSSDuration(style.animationDuration)
    const maxMs = Math.max(td, ad) * 1000 + 50

    this._timer = setTimeout(finish, maxMs || 300)
  }

  // ───── 辅助 ─────

  _checkPending() {
    if (this._pending === 'enter') {
      this._pending = null
      this._performEnter()
    } else if (this._pending === 'leave') {
      this._pending = null
      this._performLeave()
    }
  }

  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }
  }

  _dispatch(type, el) {
    this.dispatchEvent(new CustomEvent(type, {
      detail: el,
      bubbles: false,
    }))
  }
}

// ============================================================
// 工具
// ============================================================

function parseCSSDuration(str) {
  if (!str) return 0
  const m = String(str).match(/([\d.]+)(ms|s)?/)
  if (!m) return 0
  const v = parseFloat(m[1])
  return m[2] === 'ms' ? v / 1000 : v
}
