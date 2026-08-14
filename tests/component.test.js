/**
 * 组件基类测试
 *
 * 覆盖：自动注册、props 类型转换、生命周期、Shadow DOM 模板渲染、
 * 响应式字段更新、插槽（默认 / 命名 / 作用域）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Da, Component } from '../src/da.js'

/** 清空微任务队列（组件渲染与调度更新都基于微任务） */
const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('组件注册', () => {
  it('Da.define 注册自定义元素', () => {
    class Foo extends Component {
      static template = `<p>foo</p>`
    }
    Da.define('t-define-foo', Foo)

    expect(customElements.get('t-define-foo')).toBe(Foo)
  })

  it('Component.define 注册自定义元素', () => {
    class Bar extends Component {
      static template = `<p>bar</p>`
    }
    Bar.define('t-define-bar')

    expect(customElements.get('t-define-bar')).toBe(Bar)
  })

  it('实例是 HTMLElement 且拥有 Shadow DOM', () => {
    class Baz extends Component {
      static template = `<p>hello</p>`
    }
    Baz.define('t-shadow-baz')
    const el = document.createElement('t-shadow-baz')
    document.body.appendChild(el)

    expect(el).toBeInstanceOf(HTMLElement)
    expect(el.shadowRoot).toBeTruthy()
    expect(el.shadowRoot.mode).toBe('open')
  })
})

describe('props', () => {
  it('Number 类型从 attribute 转换', async () => {
    class NumComp extends Component {
      static props = { count: { type: Number, default: 0 } }
      static template = `<p>{{ count }}</p>`
    }
    NumComp.define('t-props-num')

    document.body.innerHTML = '<t-props-num count="42"></t-props-num>'
    await flush()

    const el = document.querySelector('t-props-num')
    expect(el.$props.count).toBe(42)
    expect(el.shadowRoot.textContent).toContain('42')
  })

  it('缺少 attribute 时用 default', async () => {
    class DefComp extends Component {
      static props = { count: { type: Number, default: 7 } }
      static template = `<p>{{ count }}</p>`
    }
    DefComp.define('t-props-default')

    document.body.innerHTML = '<t-props-default></t-props-default>'
    await flush()

    const el = document.querySelector('t-props-default')
    expect(el.$props.count).toBe(7)
    expect(el.shadowRoot.textContent).toContain('7')
  })

  it('Boolean 类型转换', async () => {
    class BoolComp extends Component {
      static props = { on: { type: Boolean, default: false } }
      static template = `<p>{{ on }}</p>`
    }
    BoolComp.define('t-props-bool')

    document.body.innerHTML = '<t-props-bool on="true"></t-props-bool>'
    await flush()

    const el = document.querySelector('t-props-bool')
    expect(el.$props.on).toBe(true)
  })

  it('attribute 变化更新 $props 并触发重新渲染', async () => {
    class AttrComp extends Component {
      static props = { title: { type: String, default: '' } }
      static template = `<p>{{ title }}</p>`
    }
    AttrComp.define('t-props-change')

    document.body.innerHTML = '<t-props-change title="a"></t-props-change>'
    await flush()
    const el = document.querySelector('t-props-change')
    expect(el.shadowRoot.textContent).toContain('a')

    el.setAttribute('title', 'b')
    await flush()
    expect(el.$props.title).toBe('b')
    expect(el.shadowRoot.textContent).toContain('b')
  })
})

describe('生命周期', () => {
  it('onInit 在构造时调用', () => {
    const init = vi.fn()
    class LifeInit extends Component {
      static template = `<p></p>`
      onInit() { init() }
    }
    LifeInit.define('t-life-init')

    document.body.innerHTML = '<t-life-init></t-life-init>'
    expect(init).toHaveBeenCalledTimes(1)
  })

  it('onMounted 在挂载后调用', async () => {
    const mounted = vi.fn()
    class LifeMounted extends Component {
      static template = `<p></p>`
      onMounted() { mounted() }
    }
    LifeMounted.define('t-life-mounted')

    document.body.innerHTML = '<t-life-mounted></t-life-mounted>'
    expect(mounted).not.toHaveBeenCalled()

    await flush()
    expect(mounted).toHaveBeenCalledTimes(1)
  })

  it('onUpdated 在数据变化后调用', async () => {
    const updated = vi.fn()
    class LifeUpdated extends Component {
      static template = `<p>{{ n }}</p>`
      n = 0
      onUpdated() { updated() }
    }
    LifeUpdated.define('t-life-updated')

    document.body.innerHTML = '<t-life-updated></t-life-updated>'
    await flush()
    expect(updated).not.toHaveBeenCalled()

    const el = document.querySelector('t-life-updated')
    el.n = 1
    await flush()
    expect(updated).toHaveBeenCalled()
  })

  it('onUnmounted 在移除后调用', async () => {
    const unmounted = vi.fn()
    class LifeUnmounted extends Component {
      static template = `<p></p>`
      onUnmounted() { unmounted() }
    }
    LifeUnmounted.define('t-life-unmounted')

    document.body.innerHTML = '<t-life-unmounted></t-life-unmounted>'
    await flush()
    expect(unmounted).not.toHaveBeenCalled()

    document.body.innerHTML = ''
    await flush()
    expect(unmounted).toHaveBeenCalledTimes(1)
  })
})

describe('模板渲染与响应式字段', () => {
  it('{{ }} 插值渲染响应式字段', async () => {
    class Interp extends Component {
      static template = `<p>{{ message }}</p>`
      message = 'hello'
    }
    Interp.define('t-interp')

    document.body.innerHTML = '<t-interp></t-interp>'
    await flush()

    const el = document.querySelector('t-interp')
    expect(el.shadowRoot.textContent).toContain('hello')
  })

  it('字段变化自动更新 DOM（细粒度绑定）', async () => {
    class AutoUpd extends Component {
      static template = `<p class="val">{{ count }}</p>`
      count = 0
    }
    AutoUpd.define('t-autoupd')

    document.body.innerHTML = '<t-autoupd></t-autoupd>'
    await flush()

    const el = document.querySelector('t-autoupd')
    const p = el.shadowRoot.querySelector('.val')
    expect(p.textContent).toBe('0')

    el.count = 5
    await flush()
    expect(p.textContent).toBe('5')

    el.count = 10
    await flush()
    expect(p.textContent).toBe('10')
  })

  it('多表达式插值', async () => {
    class Multi extends Component {
      static template = `<p>{{ a }} + {{ b }} = {{ a + b }}</p>`
      a = 1
      b = 2
    }
    Multi.define('t-multi')

    document.body.innerHTML = '<t-multi></t-multi>'
    await flush()

    const el = document.querySelector('t-multi')
    expect(el.shadowRoot.textContent.replace(/\s+/g, '')).toBe('1+2=3')
  })

  it('style 标签注入 Shadow DOM', async () => {
    class Styled extends Component {
      static template = `<style>.red { color: red; }</style><p class="red">x</p>`
    }
    Styled.define('t-styled')

    document.body.innerHTML = '<t-styled></t-styled>'
    await flush()

    const el = document.querySelector('t-styled')
    expect(el.shadowRoot.querySelector('style')).toBeTruthy()
    expect(el.shadowRoot.querySelector('style').textContent).toContain('color: red')
  })
})

describe('插槽', () => {
  it('默认插槽克隆 light DOM 内容', async () => {
    class SlotDefault extends Component {
      static template = `<div class="box"><slot></slot></div>`
    }
    SlotDefault.define('t-slot-default')

    document.body.innerHTML = '<t-slot-default><span class="inner">hi</span></t-slot-default>'
    await flush()

    const el = document.querySelector('t-slot-default')
    expect(el.shadowRoot.querySelector('.box').textContent).toContain('hi')
  })

  it('命名插槽', async () => {
    class SlotNamed extends Component {
      static template = `<div><slot name="title"></slot><slot name="body"></slot></div>`
    }
    SlotNamed.define('t-slot-named')

    document.body.innerHTML =
      '<t-slot-named><p slot="title">T</p><p slot="body">B</p></t-slot-named>'
    await flush()

    const el = document.querySelector('t-slot-named')
    const text = el.shadowRoot.textContent
    expect(text).toContain('T')
    expect(text).toContain('B')
  })

  it('作用域插槽：父级经 da-slot 接收子级数据并决定渲染', async () => {
    class SlotScoped extends Component {
      static template = `<slot :user="user"><p>{{ user.name }}</p></slot>`
      user = { name: 'Ada', role: 'admin' }
    }
    SlotScoped.define('t-slot-scoped')

    // 注：happy-dom 解析器会把 #default 属性名剥成 default，
    // 此处用 da-slot:default 等价写法（真实浏览器中两者均可）
    document.body.innerHTML = `
      <t-slot-scoped>
        <template da-slot:default="{ user }"><b>[{{ user.name }} · {{ user.role }}]</b></template>
      </t-slot-scoped>`
    await flush()

    const el = document.querySelector('t-slot-scoped')
    const text = el.shadowRoot.textContent
    expect(text).toContain('[Ada · admin]')

    // 子组件响应式字段变化 → 插槽内容自动更新
    el.user = { name: 'Grace', role: 'user' }
    await flush()
    expect(el.shadowRoot.textContent).toContain('[Grace · user]')
  })

  it('作用域插槽内容支持指令（da-if / da-else）', async () => {
    class SlotScopedIf extends Component {
      static props = { ok: { type: Boolean, default: true } }
      static template = `<slot :ok="ok"><p>fallback</p></slot>`
    }
    SlotScopedIf.define('t-slot-scoped-if')

    document.body.innerHTML = `
      <t-slot-scoped-if>
        <template da-slot:default="{ ok }">
          <b da-if="ok">YES</b><i da-else>NO</i>
        </template>
      </t-slot-scoped-if>`
    await flush()

    const el = document.querySelector('t-slot-scoped-if')
    expect(el.shadowRoot.textContent).toContain('YES')
    expect(el.shadowRoot.textContent).not.toContain('NO')

    // props 未响应式化，直接改 $props 不触发；用 attribute 变更触发全量更新
    el.setAttribute('ok', 'false')
    await flush()
    expect(el.shadowRoot.textContent).not.toContain('YES')
    expect(el.shadowRoot.textContent).toContain('NO')
  })
})

describe('Da.mount 独立挂载', () => {
  it('挂载任意 DOM 子树并响应式更新', async () => {
    const container = document.createElement('div')
    container.innerHTML = `<p class="out">{{ msg }}</p><button @click="msg = 'Hi'">go</button>`
    document.body.appendChild(container)

    const state = Da.mount(container, { msg: 'Hello' })
    await flush()

    const out = container.querySelector('.out')
    expect(out.textContent).toBe('Hello')

    state.msg = 'World'
    await flush()
    expect(out.textContent).toBe('World')

    const btn = container.querySelector('button')
    btn.click()
    await flush()
    expect(out.textContent).toBe('Hi')
  })

  it('Da.unmount 停止响应式更新', async () => {
    const container = document.createElement('div')
    container.innerHTML = `<p class="out">{{ msg }}</p>`
    document.body.appendChild(container)

    const state = Da.mount(container, { msg: 'x' })
    await flush()
    expect(container.querySelector('.out').textContent).toBe('x')

    Da.unmount(container)
    state.msg = 'y'
    await flush()
    expect(container.querySelector('.out').textContent).toBe('x')
  })
})
