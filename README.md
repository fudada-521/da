<!-- @format -->

# Da — 基于原生 WebComponent 的轻量前端框架

**Da**（出自 Dada Components）是一个纯 JavaScript、零依赖的前端框架，基于原生的 WebComponent 和 Proxy 实现，参考 Vue3 的组件系统、响应式系统和指令系统设计。

```
零构建、零依赖、纯原生
```

---

## 快速开始

### 1. 定义模板

```html
<template id="my-counter">
    <style>
        :host {
            display: block;
            text-align: center;
        }
        .count {
            font-size: 32px;
            color: #42b883;
        }
    </style>
    <div class="count">{{ count }}</div>
    <button @click="increment">+</button>
    <button @click="decrement">−</button>
</template>
```

### 2. 定义组件

```javascript
import { Component } from "./src/da.js";

class Counter extends Component {
    static tagName = "my-counter";
    static template = "#my-counter";

    count = 0;

    increment() {
        this.count++;
    }
    decrement() {
        this.count--;
    }
}

Counter.define();
```

### 3. 使用组件

```html
<my-counter></my-counter>
```

---

## 核心特性

### 📦 组件系统

- Class 风格定义，继承 `Da.Component`
- 自动注册自定义元素
- Shadow DOM 样式隔离
- Props 声明与类型转换
- 生命周期：`onInit` / `onMounted` / `onUpdated` / `onUnmounted`

```javascript
class MyComp extends Component {
    static tagName = "my-comp";
    static props = {
        name: { type: String, default: "World" },
        count: { type: Number, default: 0 },
        items: { type: Array, default: () => [] },
    };
}
```

### ⚡ 响应式系统

- `reactive()` — 对象深度响应式代理
- `ref()` — 单值响应式容器
- `computed()` — 计算属性（惰性求值 + 缓存）
- `watch()` — 监听响应式数据变化
- `effect()` — 自动追踪依赖的副作用
- `toRef()` / `toRefs()` — 响应式对象属性解构

Class 字段自动响应式：

```javascript
class Counter extends Component {
    count = 0; // 自动响应式
    // 等价于 this.$data.count
}
```

### 🧩 指令系统

| 指令                                      | 功能                    | 缩写               |
| ----------------------------------------- | ----------------------- | ------------------ |
| `da-bind`                                 | 绑定 attribute/property | `:attr`            |
| `da-on`                                   | 事件绑定                | `@event`           |
| `da-if` / `da-else-if` / `da-else`        | 条件渲染                | -                  |
| `da-for`                                  | 列表渲染                | -                  |
| `da-model`                                | 表单双向绑定            | -                  |
| `da-show`                                 | 条件显示                | -                  |
| `da-text`                                 | 文本插入                | -                  |
| `da-html`                                 | HTML 插入               | -                  |
| `da-once`                                 | 只渲染一次              | -                  |
| `da-pre`                                  | 跳过编译                | -                  |
| `da-cloak`                                | 防闪烁                  | -                  |

支持**动态指令参数**：`da-bind:[dynamicAttr]="value"` 或 `:[dynamicAttr]="value"`。

### 🎨 插槽系统

- 默认插槽 `<slot>`
- 命名插槽 `<slot name="header">`
- **作用域插槽**：子组件用 `:prop="表达式"` 暴露数据，父组件用 `da-slot` 或 `#` 简写接收

```html
<!-- 子组件：<slot :user="data" :is-admin="flag"></slot> -->

<!-- 父组件方式一：da-slot 语法 -->
<template da-slot:default="{ user, isAdmin }">
  <p>{{ user.name }}</p>
</template>

<!-- 父组件方式二：# 简写 -->
<template #default="{ user }">
  <p>{{ user.name }}</p>
</template>
```

### 🎬 过渡动画系统

内置 `<da-transition>` 和 `<da-transition-group>` 组件，纯 CSS 驱动，零 JS 动画依赖。

**`<da-transition>`** — 单元素进入/离开过渡：

```html
<da-transition :show="visible" name="fade">
    <div class="box">Hello</div>
</da-transition>
```

CSS 类名约定（`name` 默认为 `da`）：

```
.{name}-enter-from      /* 进入起始（首帧） */
.{name}-enter-active    /* 进入过渡期 */
.{name}-enter-to        /* 进入结束 */
.{name}-leave-from      /* 离开起始 */
.{name}-leave-active    /* 离开过渡期 */
.{name}-leave-to        /* 离开结束 */
```

Props：`show`（显示/隐藏）、`name`（类名前缀）、`mode`（`out-in` / `in-out` / `simultaneous`）、`appear`（初始渲染是否执行过渡）。

**`<da-transition-group>`** — 列表过渡，基于 FLIP 动画：

```html
<da-transition-group name="list" tag="div">
    <div da-for="item in items" :key="item.id">{{ item.text }}</div>
</da-transition-group>
```

Props：`name`、`tag`（包裹标签）、`moveClass`（移动动画类名）、`appear`。

### 🧰 内置 UI 组件

框架自带两个常用的基础组件，开箱即用：

| 组件           | 标签名                | 说明                                      |
| ------------ | ------------------ | --------------------------------------- |
| **DaButton** | `<da-button>`      | 按钮（type/size/disabled/loading/block）    |
| **DaInput**  | `<da-input>`       | 输入框（model/type/placeholder/clearable）   |

```html
<da-button type="primary" @click="submit">提交</da-button>
<da-button :loading="saving">保存中...</da-button>
<da-input da-model="name" placeholder="请输入姓名"></da-input>
<da-input da-model.number="age" type="number"></da-input>
```

### 🔄 异步更新调度

- 微任务批量更新
- 同一 tick 内多次数据变更合并为一次渲染
- 组件更新自动去重

### 🧩 自定义指令

用 `Da.register()` 注册自定义指令：

```javascript
import { register } from "dada";

register("my-directive", {
    mount(el, binding) {
        /* 首次绑定 */
    },
    update(el, binding) {
        /* 更新时 */
    },
    unmount(el) {
        /* 解绑时 */
    },
});
```

然后在模板中使用 `da-my-directive="value"`。

### 🌐 独立挂载（mount）

无需定义组件，直接在任意 HTML 子树中使用指令：

```html
<div id="app">
    <input da-model="msg" />
    <p>{{ msg }}</p>
    <button @click="msg = 'Hi'">点击</button>
</div>

<script type="module">
    import { mount } from "../src/da.js";
    const state = mount("#app", { msg: "Hello" });
</script>
```

---

## 示例

| 示例                                              | 说明                     | 涉及特性                                    |
| ------------------------------------------------- | ------------------------ | ------------------------------------------- |
| [计数器](examples/counter.html)                   | 简单的加减计数器         | `mount` `da-on` `da-bind` `da-show` `<da-button>` |
| [待办列表](examples/todo.html)                    | 增删待办、标记完成       | `da-for` `da-model` `da-if` `:class`        |
| [插槽](examples/slots.html)                       | 卡片布局组件             | 默认插槽、命名插槽                          |
| [作用域插槽](examples/scoped-slots.html)           | 子组件传递数据到插槽内容 | `da-slot` `#` 简写                          |
| [过渡动画](examples/transition.html)               | 进入/离开过渡           | `<da-transition>` CSS 过渡动画              |
| [列表过渡](examples/transition-group.html)          | 列表增删移动动画         | `<da-transition-group>` FLIP 动画           |
| [组件 da-model](examples/component-model.html)      | 组件上使用 da-model      | `da-model` 组件双向绑定                     |
| [事件修饰符](examples/keyboard.html)               | 键盘事件修饰符           | `@keyup.enter` 等修饰符                     |
| [自定义指令](examples/custom-directive.html)        | 自定义指令注册和使用     | `Da.register()` mount/update/unmount         |
| [UI 组件](examples/ui-components.html)              | 内置按钮和输入框组件     | `<da-button>` `<da-input>`                  |

直接在浏览器中打开即可运行，无需任何构建工具。

---

## 项目结构

```
dada/
├── src/
│   ├── da.js                     # 入口（导出 Da 命名空间）
│   ├── core/
│   │   ├── Component.js          # 组件基类
│   │   ├── reactive.js           # 响应式系统
│   │   ├── compile.js            # 模板编译器
│   │   ├── scheduler.js          # 更新调度器
│   │   ├── Transition.js         # 过渡动画组件
│   │   └── TransitionGroup.js    # 列表过渡组件
│   ├── directives/
│   │   ├── index.js              # 指令注册表
│   │   ├── da-bind.js
│   │   ├── da-on.js
│   │   ├── da-if.js
│   │   ├── da-for.js
│   │   ├── da-model.js
│   │   ├── da-show.js
│   │   ├── da-text.js
│   │   ├── da-html.js
│   │   ├── da-pre.js
│   │   ├── da-cloak.js
│   │   └── da-once.js
│   ├── components/               # 内置 UI 组件
│   │   ├── index.js
│   │   ├── Button.js
│   │   └── Input.js
│   └── shared/
│       └── utils.js
├── examples/                     # 示例
├── PLAN.md                       # 实现计划
├── TODO.md                       # 任务追踪
└── README.md                     # 本文档
```

---

## API 一览

```javascript
import Da from "./src/da.js";

// 组件
Da.Component;           // 基类
Da.DaTransition;        // 过渡动画组件类
Da.DaTransitionGroup;   // 列表过渡组件类
Da.define("my-comp", MyComp); // 注册组件

// 响应式
Da.reactive(obj);       // 响应式对象
Da.ref(value);          // 响应式引用
Da.computed(fn);        // 计算属性（惰性求值 + 缓存）
Da.watch(src, cb);      // 监听变化
Da.effect(fn);          // 副作用
Da.toRef(obj, key);     // 响应式对象属性转 ref
Da.toRefs(obj);         // 响应式对象全部属性转 ref

// 调度
Da.scheduleUpdate(fn);  // 调度异步更新
Da.flushQueue();        // 立即清空更新队列
Da.nextTick(fn);        // 下一次 DOM 更新后执行

// 挂载
Da.mount(selector, data);  // 独立挂载（无需定义组件）

// 指令
Da.register({ name, mount, update, unmount }); // 注册自定义指令
Da.lookup("my-dir");    // 查找指令
Da.registeredDirectives(); // 获取已注册指令列表

// 编译器
Da.compile(root, instance); // 编译模板

// 版本
Da.version;
```

---

## 浏览器支持

所有现代浏览器（Chrome、Firefox、Safari、Edge），需支持 ES Module 和 Custom Elements v1。

---

## 许可证

MIT
