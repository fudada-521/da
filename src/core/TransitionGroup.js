/**
 * DaTransitionGroup — 列表过渡组件
 *
 * 对列表的添加、移除、排序做过渡动画。
 * 使用 FLIP（First, Last, Invert, Play）技术实现移动过渡。
 *
 * 用法：
 *   <da-transition-group name="list" tag="ul">
 *     <li da-for="item in items" :key="item.id">{{ item.text }}</li>
 *   </da-transition-group>
 *
 * CSS 示例：
 *   .list-enter-active, .list-leave-active { transition: all 0.4s ease; }
 *   .list-enter-from { opacity: 0; transform: translateX(-30px); }
 *   .list-leave-to   { opacity: 0; transform: translateX(30px); }
 *   .list-move       { transition: transform 0.4s ease; }
 *   .list-leave-active { position: absolute; }
 *
 * Props（attribute）：
 *   name    — CSS class 前缀，默认 'da'
 *   tag     — 容器标签名，默认 'div'，设为 '' 则不包裹
 *   moveClass    — 自定义移动过渡 class，默认 '{name}-move'
 *   appear — 初始渲染是否执行过渡，默认 false
 */

// ============================================================
// 过渡阶段常量
// ============================================================

const ENTER_EVENTS = ['before-enter', 'enter', 'after-enter', 'enter-cancelled']
const LEAVE_EVENTS = ['before-leave', 'leave', 'after-leave', 'leave-cancelled']

/** 离开过渡的元素暂存 */
let leavingEls = new WeakMap()

// ============================================================
// TransitionGroup 组件
// ============================================================

export class DaTransitionGroup extends HTMLElement {
  constructor() {
    super()
    this._name = 'da'
    this._tag = 'div'
    this._moveClass = ''
    this._appear = false

    // FLIP 状态
    this._prevPositions = new Map()  // el → {x, y}
    this._mounted = false

    // 观察器
    this._observer = null

    // 首次渲染触发 appear
    this._firstRender = true
  }

  connectedCallback() {
    this._name = this.getAttribute('name') || 'da'
    this._tag = this.getAttribute('tag') || 'div'
    this._moveClass = this.getAttribute('move-class') || `${this._name}-move`
    this._appear = this.hasAttribute('appear')

    // 如果不包裹，直接在自身操作
    if (this._tag) {
      // 将自身作为容器（用 tag 属性决定角色）
      if (this._tag !== this.tagName.toLowerCase()) {
        // 创建包裹容器
        const wrapper = document.createElement(this._tag)
        while (this.firstChild) {
          wrapper.appendChild(this.firstChild)
        }
        this.appendChild(wrapper)
        this._wrapper = wrapper
      }
    }

    this._mounted = true

    // 设置 MutationObserver 监听子节点变化
    this._observer = new MutationObserver((mutations) => {
      this._handleMutations(mutations)
    })

    this._observer.observe(this._container || this, {
      childList: true,
      subtree: false,
    })

    // appear
    if (this._appear) {
      Array.from((this._container || this).children).forEach((child) => {
        this._animateEnter(child)
      })
    }
  }

  disconnectedCallback() {
    if (this._observer) {
      this._observer.disconnect()
      this._observer = null
    }
    this._mounted = false
  }

  get _container() {
    return this._wrapper || this
  }

  // ───── 属性变化 ─────

  static get observedAttributes() {
    return ['name', 'tag', 'move-class']
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._mounted) return
    if (name === 'name') this._name = newVal || 'da'
    if (name === 'tag') this._tag = newVal || 'div'
    if (name === 'move-class') this._moveClass = newVal || `${this._name}-move`
  }

  // ───── DOM 变化处理 ─────

  _handleMutations(mutations) {
    // 收集所有变动
    let added = []
    let removed = []

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // 记录删除前的状态（FLIP 需要位置信息）
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            removed.push(node)
          }
        })

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            added.push(node)
          }
        })
      }
    }

    // 区分「移动」与「新增/删除」：同一节点同时出现在 removed 与 added 视为移动。
    // 移动不应触发 leave 动画（否则节点会被 _animateLeave 移除），只参与 FLIP。
    const addedSet = new Set(added)
    const moved = removed.filter((node) => addedSet.has(node))
    const trulyRemoved = removed.filter((node) => !addedSet.has(node))
    const trulyAdded = added.filter((node) => !moved.includes(node))

    // 1. 真正删除的节点 → leave 动画
    trulyRemoved.forEach((el) => this._animateLeave(el))

    // 2. 移动 / 增删后 → FLIP 移动动画
    if (trulyRemoved.length > 0 || trulyAdded.length > 0 || moved.length > 0) {
      requestAnimationFrame(() => {
        this._animateMove()
      })
    }

    // 3. 真正新增的节点 → enter 动画
    trulyAdded.forEach((el) => this._animateEnter(el))
  }

  // ───── 进入过渡 ─────

  _animateEnter(el) {
    const name = this._name || 'da'

    el.classList.add(`${name}-enter-from`)
    el.classList.add(`${name}-enter-active`)
    this._dispatch('before-enter', el)

    requestAnimationFrame(() => {
      el.classList.remove(`${name}-enter-from`)
      el.classList.add(`${name}-enter-to`)
      this._dispatch('enter', el)

      this._waitTransition(el, () => {
        el.classList.remove(`${name}-enter-active`)
        el.classList.remove(`${name}-enter-to`)
        this._dispatch('after-enter', el)
      })
    })
  }

  // ───── 离开过渡 ─────

  _animateLeave(el) {
    const name = this._name || 'da'

    // 记录离开前的位置（用于 FLIP）
    const rect = el.getBoundingClientRect()
    leavingEls.set(el, { x: rect.left, y: rect.top, width: rect.width, height: rect.height })

    // 标记为离开状态
    el._daLeaving = true

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

        // 移除元素
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
        el._daLeaving = false
        this._dispatch('after-leave', el)
        leavingEls.delete(el)
      })
    })
  }

  // ───── 移动过渡（FLIP）─────

  _animateMove() {
    const container = this._container
    if (!container) return

    const name = this._name || 'da'
    const moveClass = this._moveClass || `${name}-move`

    // 获取当前所有子元素的位置
    const children = Array.from(container.children).filter((c) => !c._daLeaving)

    // FLIP: 对每个元素，如果之前有记录的位置且与当前位置不同，应用过渡
    children.forEach((el) => {
      const prev = this._prevPositions.get(el)
      if (!prev) return

      const rect = el.getBoundingClientRect()
      const dx = prev.x - rect.left
      const dy = prev.y - rect.top

      if (dx === 0 && dy === 0) return

      // Invert: 设置 transform 使其看起来在旧位置
      el.style.transform = `translate(${dx}px, ${dy}px)`
      el._daMoving = true

      // 强制回流
      el.offsetHeight

      // Play: 移除 transform，同时加上 move class 做过渡
      el.classList.add(moveClass)
      el.style.transform = ''

      this._waitTransition(el, () => {
        el.classList.remove(moveClass)
        el._daMoving = false
      })
    })

    // 更新记录的位置
    this._recordPositions(children)
  }

  /** 记录所有子元素的位置 */
  _recordPositions(children) {
    this._prevPositions.clear()
    children.forEach((el) => {
      if (el._daLeaving || el._daMoving) return
      const rect = el.getBoundingClientRect()
      this._prevPositions.set(el, { x: rect.left, y: rect.top, width: rect.width, height: rect.height })
    })
  }

  // ───── 过渡检测 ─────

  _waitTransition(el, callback) {
    let done = false

    const finish = () => {
      if (done) return
      done = true
      el.removeEventListener('transitionend', onEnd)
      el.removeEventListener('animationend', onEnd)
      callback()
    }

    const onEnd = (e) => {
      if (e.target === el) finish()
    }

    el.addEventListener('transitionend', onEnd)
    el.addEventListener('animationend', onEnd)

    // 超时降级
    const style = getComputedStyle(el)
    const td = parseCSSDuration(style.transitionDuration)
    const ad = parseCSSDuration(style.animationDuration)
    const maxMs = Math.max(td, ad) * 1000 + 50

    setTimeout(finish, maxMs || 400)
  }

  // ───── 辅助 ─────

  _dispatch(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: false }))
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
