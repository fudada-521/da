# Da 框架 — 组件 da-model 使用指引

> 对应示例：[component-model.html](../examples/component-model.html)

## 概述

本文围绕 `component-model.html` 这个示例，说明 Da 框架中几个核心能力的使用方式：

- `mount()` — 快速挂载响应式应用
- `da-model` — 组件上的双向绑定
- `@click` — 声明式事件绑定
- `{{ }}` — 文本插值
- 内置组件（`da-input`）
- 响应式数据与方法

---

## 1. `mount()` — 快速挂载

`mount()` 是 Da 框架的轻量入口，适合**无需自定义组件**的场景——直接给一段 HTML 注入响应式数据。

```js
import { mount } from "../src/da.js";

const state = mount("#app", {
    msg: "",
    setMsg(val) { state.msg = val; },
});
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `selectorOrEl` | `string \| Element` | CSS 选择器或 DOM 元素 |
| `data` | `object` | 响应式数据对象，可包含方法 |

**返回值：** 响应式 Proxy 对象，修改它会自动触发视图更新。

### 与 Component 模式的区别

| | `mount()` | Component |
|--|-----------|-----------|
| 适用场景 | 简单页面、小部件 | 复杂组件、复用 |
| 数据定义 | `mount("#app", { data })` | class 字段 |
| 方法定义 | 放在 data 对象中 | class 方法 |
| 模板 | 直接在 HTML 中 | `static template` 字符串 |
| Shadow DOM | 不使用 | 使用 |

---

## 2. `da-model` — 组件双向绑定

`da-model` 指令用于自定义组件（标签名含连字符）时，自动建立 props + events 的双向绑定机制。

### 基本用法

```html
<da-input da-model:value="msg" placeholder="输入点什么..."></da-input>
```

等价于：

```html
<da-input :value="msg" @update:value="msg = $event"></da-input>
```

### 原理

组件 da-model 默认规则：

| 写法 | 绑定的 prop | 监听的事件 |
|------|------------|-----------|
| `da-model="val"` | `modelValue` | `update:modelValue` |
| `da-model:title="val"` | `title` | `update:title` |
| `da-model:content="val"` | `content` | `update:content` |

组件内部通过 `$emit` 派发更新：

```js
// da-input 组件内部
onInput(event) {
    this.$emit('update:value', event.target.value);
}
```

### 多个 da-model

一个组件可以绑定多个 da-model：

```html
<da-full-name da-model:first="firstName" da-model:last="lastName"></da-full-name>
```

### 修饰符

| 修饰符 | 作用 |
|--------|------|
| `.number` | 自动转数字（`parseFloat`） |
| `.trim` | 自动去首尾空格 |

```html
<da-input da-model.number="age"></da-input>
```

---

## 3. `@click` — 声明式事件绑定

`@click` 是 `da-on:click` 的简写。

### 三种写法

| 写法 | 说明 | 示例 |
|------|------|------|
| **内联表达式** | 直接修改数据，适合简单操作 | `@click="msg = 'Hello'"` |
| **方法调用** | 调 data 中的方法，适合逻辑复用 | `@click="setMsg('Hello')"` |
| **函数名** | 绑定组件实例方法，仅 Component 模式 | `@click="handleSubmit"` |

### 方法定义（mount 模式）

在 `mount()` 的数据对象中定义方法：

```js
const state = mount("#app", {
    msg: "",
    setMsg(val) { state.msg = val; },
    clearMsg()  { state.msg = ""; },
});
```

模板中直接调用：

```html
<button @click="setMsg('Hello Da!')">设为 Hello</button>
<button @click="clearMsg()">清空</button>
```

方法通过 `with($data)` 作用域可访问，`state.msg` 是对响应式 Proxy 的直接操作。

### 其他事件

| 简写 | 完整形式 |
|------|---------|
| `@click` | `da-on:click` |
| `@input` | `da-on:input` |
| `@keyup.enter` | `da-on:keyup.enter` |
| `@submit.prevent` | `da-on:submit.prevent` |

事件修饰符参见键盘示例 [`keyboard.html`](../examples/keyboard.html)。

---

## 4. `{{ }}` — 文本插值

双花括号语法将响应式数据渲染为文本：

```html
<div class="output">{{ msg || '等待输入...' }}</div>
```

- 支持任意 JavaScript 表达式：`{{ msg.toUpperCase() }}`、`{{ count + 1 }}`
- 数据变化时自动更新（通过响应式系统的 `effect` 驱动）
- 内容自动转义为文本（防止 XSS）

---

## 5. 内置组件 `da-input`

`da-input` 是 Da 框架提供的基础输入框组件。

### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | String | `""` | 输入值（支持 `da-model`） |
| `type` | String | `"text"` | 输入类型：text / password / email / number |
| `placeholder` | String | `""` | 占位文本 |
| `disabled` | Boolean | `false` | 禁用 |
| `readonly` | Boolean | `false` | 只读 |
| `size` | String | `"medium"` | 尺寸：small / medium / large |
| `clearable` | Boolean | `false` | 显示清空按钮 |

### 使用

```html
<da-input da-model:value="name" placeholder="请输入姓名"></da-input>
<da-input da-model.number="age" type="number"></da-input>
<da-input :value="val" @update:value="val = $event"></da-input>
```

---

## 6. 完整示例代码

```html
<div id="app">
    <div class="row">
        <da-input da-model:value="msg" placeholder="输入点什么..."></da-input>
    </div>
    <div class="row">
        <button @click="setMsg('Hello Da!')">设为 Hello</button>
        <button @click="clearMsg()">清空</button>
    </div>
    <div class="row">{{ msg || '等待输入...' }}</div>
</div>

<script type="module">
    import { mount } from "../src/da.js";
    import "../src/components/Input.js";

    const state = mount("#app", {
        msg: "",
        setMsg(val) { state.msg = val; },
        clearMsg()  { state.msg = ""; },
    });
</script>
```

---

## 7. 相关资源

- [完整示例：component-model.html](../examples/component-model.html)
- [da-model 指令源码](../src/directives/da-model.js)
- [da-input 组件源码](../src/components/Input.js)
- [da-on 指令源码](../src/directives/da-on.js)（`@click` 的实现）
- [mount() 源码](../src/da.js)
- [表单组件示例：FormComponents.js](../examples/components/FormComponents.js)（多 da-model、.number 修饰符）
