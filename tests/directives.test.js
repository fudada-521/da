/**
 * 指令测试
 *
 * 覆盖：da-bind / da-on / da-if(链) / da-for / da-model / da-show /
 * da-text / da-html / da-once / da-cloak / da-pre
 * 通过 Da.mount 走完整 编译 → 挂载 → 响应式更新 管线
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Da } from '../src/da.js'

const flush = () => new Promise((r) => setTimeout(r, 0))

/** 创建容器 + 挂载，返回 { container, state } */
function mountHTML(html, data) {
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  const state = Da.mount(container, data)
  return { container, state }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('da-bind', () => {
  it(':attr 绑定并随数据更新', async () => {
    const { container, state } = mountHTML(`<p :title="msg">x</p>`, { msg: 'hello' })
    let p = container.querySelector('p')
    expect(p.getAttribute('title')).toBe('hello')

    state.msg = 'world'
    await flush()
    p = container.querySelector('p')
    expect(p.getAttribute('title')).toBe('world')
  })

  it(':class 对象语法', async () => {
    const { container, state } = mountHTML(
      `<p :class="{ active: isActive, dark: isDark }">x</p>`,
      { isActive: true, isDark: false }
    )
    let p = container.querySelector('p')
    expect(p.className).toBe('active')

    state.isActive = false
    state.isDark = true
    await flush()
    p = container.querySelector('p')
    expect(p.className).toBe('dark')
  })

  it(':style 对象语法', async () => {
    const { container, state } = mountHTML(
      `<p :style="{ color: c, fontSize: '14px' }">x</p>`,
      { c: 'red' }
    )
    let p = container.querySelector('p')
    expect(p.style.color).toBe('red')
    expect(p.style.fontSize).toBe('14px')

    state.c = 'blue'
    await flush()
    p = container.querySelector('p')
    expect(p.style.color).toBe('blue')
  })

  it('布尔属性 disabled', async () => {
    const { container, state } = mountHTML(`<button :disabled="off">go</button>`, { off: false })
    let btn = container.querySelector('button')
    expect(btn.hasAttribute('disabled')).toBe(false)

    state.off = true
    await flush()
    btn = container.querySelector('button')
    expect(btn.hasAttribute('disabled')).toBe(true)

    state.off = false
    await flush()
    btn = container.querySelector('button')
    expect(btn.hasAttribute('disabled')).toBe(false)
  })

  it('动态参数 :[attr]', () => {
    const { container } = mountHTML(`<p :[a]="val">x</p>`, { a: 'title', val: 'hi' })
    const p = container.querySelector('p')
    expect(p.getAttribute('title')).toBe('hi')
  })
})

describe('da-on', () => {
  it('@click 内联表达式更新数据', async () => {
    const { container, state } = mountHTML(`<button @click="count++">+</button>`, { count: 0 })
    container.querySelector('button').click()
    expect(state.count).toBe(1)
  })

  it('@click 调用 $data 中的方法', async () => {
    const { container, state } = mountHTML(`<button @click="bump">+</button>`, {
      count: 0,
      bump() { this.count += 1 },
    })
    container.querySelector('button').click()
    expect(state.count).toBe(1)
  })

  it('@click 使用 $event', () => {
    const { container, state } = mountHTML(
      `<button @click="last = $event.type">x</button>`,
      { last: '' }
    )
    container.querySelector('button').click()
    expect(state.last).toBe('click')
  })

  it('@click.prevent 阻止默认行为', () => {
    const { container } = mountHTML(`<a href="#" @click.prevent="x = 1">link</a>`, { x: 0 })
    const a = container.querySelector('a')
    const event = new MouseEvent('click', { cancelable: true })
    a.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('@keyup.enter 键盘修饰符', () => {
    const { container, state } = mountHTML(`<input @keyup.enter="pressed = true" />`, {
      pressed: false,
    })
    const input = container.querySelector('input')

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }))
    expect(state.pressed).toBe(false)

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }))
    expect(state.pressed).toBe(true)
  })
})

describe('da-if 条件链', () => {
  it('da-if 基本切换', async () => {
    const { container, state } = mountHTML(
      `<div><p da-if="ok">shown</p></div>`,
      { ok: true }
    )
    expect(container.textContent).toContain('shown')

    state.ok = false
    await flush()
    expect(container.textContent).not.toContain('shown')

    state.ok = true
    await flush()
    expect(container.textContent).toContain('shown')
  })

  it('da-if / da-else-if / da-else 链', async () => {
    const { container, state } = mountHTML(
      `<div>
        <b da-if="x === 1">one</b>
        <i da-else-if="x === 2">two</i>
        <u da-else>other</u>
      </div>`,
      { x: 1 }
    )

    const text = () => container.textContent
    expect(text()).toContain('one')
    expect(text()).not.toContain('two')
    expect(text()).not.toContain('other')

    state.x = 2
    await flush()
    expect(text()).not.toContain('one')
    expect(text()).toContain('two')

    state.x = 3
    await flush()
    expect(text()).not.toContain('one')
    expect(text()).not.toContain('two')
    expect(text()).toContain('other')
  })
})

describe('da-for', () => {
  it('渲染列表', async () => {
    const { container } = mountHTML(
      `<ul><li :key="item.id" da-for="item in list">{{ item.name }}</li></ul>`,
      { list: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] }
    )
    const lis = container.querySelectorAll('li')
    expect(lis.length).toBe(2)
    expect(lis[0].textContent).toBe('a')
    expect(lis[1].textContent).toBe('b')
  })

  it('新增项（keyed diff）', async () => {
    const { container, state } = mountHTML(
      `<ul><li :key="item.id" da-for="item in list">{{ item.name }}</li></ul>`,
      { list: [{ id: 1, name: 'a' }] }
    )
    expect(container.querySelectorAll('li').length).toBe(1)

    state.list.push({ id: 2, name: 'b' })
    await flush()
    const lis = container.querySelectorAll('li')
    expect(lis.length).toBe(2)
    expect(lis[1].textContent).toBe('b')
  })

  it('删除项', async () => {
    const { container, state } = mountHTML(
      `<ul><li :key="item.id" da-for="item in list">{{ item.name }}</li></ul>`,
      { list: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c' }] }
    )
    expect(container.querySelectorAll('li').length).toBe(3)

    state.list.splice(1, 1)
    await flush()
    const lis = container.querySelectorAll('li')
    expect(lis.length).toBe(2)
    expect(lis[0].textContent).toBe('a')
    expect(lis[1].textContent).toBe('c')
  })

  it('支持 (item, index) 语法', async () => {
    const { container } = mountHTML(
      `<ul><li da-for="(item, index) in list">{{ index }}:{{ item }}</li></ul>`,
      { list: ['a', 'b'] }
    )
    const lis = container.querySelectorAll('li')
    expect(lis[0].textContent).toBe('0:a')
    expect(lis[1].textContent).toBe('1:b')
  })
})

describe('da-model', () => {
  it('输入框双向绑定：输入 → 数据更新', () => {
    const { container, state } = mountHTML(`<input da-model="msg" />`, { msg: 'hi' })
    const input = container.querySelector('input')
    expect(input.value).toBe('hi')

    input.value = 'hello'
    input.dispatchEvent(new Event('input'))
    expect(state.msg).toBe('hello')
  })

  it('数据更新 → 输入框更新', async () => {
    const { container, state } = mountHTML(`<input da-model="msg" />`, { msg: 'hi' })
    const input = container.querySelector('input')

    state.msg = 'changed'
    await flush()
    expect(input.value).toBe('changed')
  })

  it('.number 修饰符', () => {
    const { container, state } = mountHTML(`<input da-model.number="n" />`, { n: 0 })
    const input = container.querySelector('input')

    input.value = '42'
    input.dispatchEvent(new Event('input'))
    expect(state.n).toBe(42)
  })

  it('.lazy 修饰符：change 事件才更新', () => {
    const { container, state } = mountHTML(`<input da-model.lazy="msg" />`, { msg: '' })
    const input = container.querySelector('input')

    input.value = 'x'
    input.dispatchEvent(new Event('input'))
    expect(state.msg).toBe('')

    input.dispatchEvent(new Event('change'))
    expect(state.msg).toBe('x')
  })

  it('checkbox 双向绑定', () => {
    const { container, state } = mountHTML(`<input type="checkbox" da-model="on" />`, { on: false })
    const cb = container.querySelector('input')
    expect(cb.checked).toBe(false)

    cb.checked = true
    cb.dispatchEvent(new Event('change'))
    expect(state.on).toBe(true)
  })
})

describe('da-show', () => {
  it('切换 display', async () => {
    const { container, state } = mountHTML(`<p da-show="visible">x</p>`, { visible: false })
    let p = container.querySelector('p')
    expect(p.style.display).toBe('none')

    state.visible = true
    await flush()
    p = container.querySelector('p')
    expect(p.style.display).not.toBe('none')

    state.visible = false
    await flush()
    p = container.querySelector('p')
    expect(p.style.display).toBe('none')
  })
})

describe('da-text / da-html', () => {
  it('da-text 渲染文本并更新', async () => {
    const { container, state } = mountHTML(`<p da-text="msg"></p>`, { msg: 'a' })
    let p = container.querySelector('p')
    expect(p.textContent).toBe('a')

    state.msg = 'b'
    await flush()
    p = container.querySelector('p')
    expect(p.textContent).toBe('b')
  })

  it('da-html 渲染 HTML 并更新', async () => {
    const { container, state } = mountHTML(`<p da-html="html"></p>`, { html: '<b>x</b>' })
    let p = container.querySelector('p')
    expect(p.querySelector('b')).toBeTruthy()
    expect(p.textContent).toBe('x')

    state.html = '<i>y</i>'
    await flush()
    p = container.querySelector('p')
    expect(p.querySelector('i')).toBeTruthy()
    expect(p.textContent).toBe('y')
  })
})

describe('da-once', () => {
  it('只渲染一次，数据变化不更新', async () => {
    const { container, state } = mountHTML(`<p da-once>{{ msg }}</p>`, { msg: 'first' })
    let p = container.querySelector('p')
    expect(p.textContent).toBe('first')

    state.msg = 'second'
    await flush()
    p = container.querySelector('p')
    expect(p.textContent).toBe('first')
  })
})

describe('da-cloak', () => {
  it('挂载后移除 da-cloak 属性', () => {
    const { container } = mountHTML(`<p da-cloak>{{ msg }}</p>`, { msg: 'x' })
    const p = container.querySelector('p')
    expect(p.hasAttribute('da-cloak')).toBe(false)
    expect(p.textContent).toBe('x')
  })
})

describe('da-pre', () => {
  it('跳过子树编译，保留原始 {{ }}', () => {
    const { container } = mountHTML(`<pre da-pre>{{ raw }}</pre>`, { raw: 'no' })
    const pre = container.querySelector('pre')
    expect(pre.textContent).toBe('{{ raw }}')
  })
})

describe('自定义指令', () => {
  it('Da.register + mount/update/unmount', async () => {
    Da.register('test-highlight', {
      mount(el, binding) {
        el.dataset.mounted = binding.value
      },
      update(el, binding) {
        el.dataset.updated = binding.value
      },
      unmount() {},
    })

    const { container, state } = mountHTML(`<p da-test-highlight="v">{{ msg }}</p>`, {
      v: 'm1',
      msg: 'x',
    })
    let p = container.querySelector('p')
    expect(p.dataset.mounted).toBe('m1')

    state.v = 'u1'
    await flush()
    p = container.querySelector('p')
    expect(p.dataset.updated).toBe('u1')
  })
})
