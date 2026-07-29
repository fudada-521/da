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
    :host { display: block; text-align: center; }
    .count { font-size: 32px; color: #42b883; }
  </style>
  <div class="count">{{ count }}</div>
  <button @click="increment">+</button>
  <button @click="decrement">−</button>
</template>
```

### 2. 定义组件

```javascript
import { Component } from '../src/core/index.js'

class Counter extends Component {
  static tagName = 'my-counter'
  static template = '#my-counter'

  count = 0

  increment() { this.count++ }
  decrement() { this.count-- }
}

Counter.define()
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
  static tagName = 'my-comp'
  static props = {
    name:  { type: String, default: 'World' },
    count: { type: Number, default: 0 },
    items: { type: Array,  default: () => [] },
  }
}
```

### ⚡ 响应式系统

- `reactive()` — 对象深度响应式代理
- `ref()` — 单值响应式容器
- `computed()` — 计算属性（惰性求值 + 缓存）
- `watch()` — 监听响应式数据变化
- `effect()` — 自动追踪依赖的副作用

Class 字段自动响应式：

```javascript
class Counter extends Component {
  count = 0       // 自动响应式
  // 等价于 this.$data.count
}
```

### 🧩 指令系统

| 指令 | 功能 | 缩写 |
|------|------|------|
| `v-bind` | 绑定 attribute/property | `:attr` |
| `v-on` | 事件绑定 | `@event` |
| `v-if` / `v-else-if` / `v-else` | 条件渲染 | - |
| `v-for` | 列表渲染 | - |
| `v-model` | 表单双向绑定 | - |
| `v-show` | 条件显示 | - |
| `v-text` | 文本插入 | - |
| `v-html` | HTML 插入 | - |

### 🎨 插槽系统

- 默认插槽 `<slot>`
- 命名插槽 `<slot name="header">`
- 作用域插槽（数据从子组件传递到插槽内容）

### 🔄 异步更新调度

- 微任务批量更新
- 同一 tick 内多次数据变更合并为一次渲染
- 组件更新自动去重

---

## 示例

| 示例 | 说明 | 涉及特性 |
|------|------|---------|
| [计数器](examples/counter.html) | 简单的加减计数器 | `v-on` `v-bind` `v-show` `props` |
| [待办列表](examples/todo.html) | 增删待办、标记完成 | `v-for` `v-model` `v-if` `:class` |
| [插槽](examples/slots.html) | 卡片布局组件 | 默认插槽、命名插槽 |

直接在浏览器中打开即可运行，无需任何构建工具。

---

## 项目结构

```
dada/
├── src/
│   ├── index.js              # 入口
│   ├── core/
│   │   ├── Component.js      # 组件基类
│   │   ├── reactive.js       # 响应式系统
│   │   ├── compile.js        # 模板编译器
│   │   └── scheduler.js      # 更新调度器
│   ├── directives/
│   │   ├── index.js          # 指令注册表
│   │   ├── v-bind.js
│   │   ├── v-on.js
│   │   ├── v-if.js
│   │   ├── v-for.js
│   │   ├── v-model.js
│   │   ├── v-show.js
│   │   ├── v-text.js
│   │   └── v-html.js
│   └── shared/
│       └── utils.js
├── examples/                 # 示例
├── PLAN.md                   # 实现计划
├── TODO.md                   # 任务追踪
└── README.md                 # 本文档
```

---

## API 一览

```javascript
import Da from '../src/index.js'

// 组件
Da.Component          // 基类
Da.define('my-comp', MyComp)   // 注册组件

// 响应式
Da.reactive(obj)      // 响应式对象
Da.ref(value)         // 响应式引用
Da.computed(fn)       // 计算属性
Da.watch(src, cb)     // 监听变化
Da.effect(fn)         // 副作用

// 调度
Da.scheduleUpdate(fn) // 调度异步更新

// 指令（注册自定义指令）
Da.register({ name: 'my-dir', mount, update, unmount })
Da.lookup('my-dir')   // 查找指令
```

---

## 许可证

MIT
