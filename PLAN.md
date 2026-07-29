# Da 框架 — 第一期实现计划

## 一、项目概况

**名称**：Da（出自 Dada Components）
**语言**：JavaScript
**目标**：基于 WebComponent 原生实现一套类 Vue3 的前端框架

---

## 二、目录结构

```
dada/
├── src/
│   ├── core/
│   │   ├── index.js            # 核心导出
│   │   ├── Component.js        # Da.Component 基类
│   │   ├── reactive.js         # 响应式系统 (ref, reactive, computed, watch, effect)
│   │   ├── compile.js          # 模板编译器 — 解析 template → 指令绑定树
│   │   └── scheduler.js        # 异步更新调度器（批量更新，防抖）
│   ├── directives/
│   │   ├── index.js            # 指令注册表
│   │   ├── v-bind.js           # :attr / v-bind
│   │   ├── v-on.js             # @event / v-on，含 .prevent .stop 修饰符
│   │   ├── v-if.js             # v-if / v-else-if / v-else
│   │   ├── v-for.js            # v-for 列表渲染
│   │   ├── v-model.js          # 双向绑定
│   │   └── v-show.js           # display 切换
│   ├── index.js                # 入口，暴露 Da 命名空间
│   └── shared/
│       └── utils.js            # 通用工具函数
├── examples/
│   ├── counter.html
│   ├── todo.html
│   └── slots.html
├── README.md
├── PLAN.md
└── package.json
```

---

## 三、架构设计

### 3.1 核心分层

```
┌─────────────────────────────────────────┐
│            Da 框架架构总览              │
├─────────────────────────────────────────┤
│  上层：模板编译器 (compile.js)          │
│  ┌ 解析 <template> 提取指令和插值      │
│  ┌ 建立 响应式变量 → DOM 更新函数 映射  │
├─────────────────────────────────────────┤
│  中层：指令系统 (directives/)           │
│  ┌ v-bind / v-on / v-if / v-for / ...  │
│  ┌ 每个指令 => mount() + update() 接口  │
├─────────────────────────────────────────┤
│  下层：响应式系统 (reactive.js)         │
│  ┌ reactive / ref / computed / watch    │
│  ┌ 依赖追踪 (track) + 触发更新 (trigger)│
├─────────────────────────────────────────┤
│  基座：Component 基类 (Component.js)    │
│  ┌ extends HTMLElement                  │
│  ┌ Shadow DOM + 生命周期                │
│  ┌ Props 声明与校验                     │
│  ┌ 插槽系统 (命名/作用域)               │
│  ┌ 自动注册组件                         │
└─────────────────────────────────────────┘
```

### 3.2 更新流程

```
template 字符串  →  compile() 编译
                       │
                       ▼
              指令绑定树 (数组)
         [v-bind, v-if, v-for, ...]
        每个绑定了依赖的响应式变量
                       │
          connectedCallback 时执行
                       │
                       ▼
               mount() 每个指令
             (首次渲染 DOM 节点)
                       │
          响应式数据变化 → trigger()
                       │
                       ▼
            scheduler 批处理队列
                       │
                       ▼
            update() 受影响指令
          (细粒度更新，只改相关 DOM)
```

---

## 四、组件系统设计

### 4.1 Component 基类核心结构

```javascript
class DaComponent extends HTMLElement {
  static props = {}          // props 声明
  static tagName = ''        // 自定义标签名（留空则自动生成 kebab-case）

  // 生命周期
  onInit() {}                // 实例化时
  onMounted() {}             // 挂载到 DOM
  onUpdated() {}             // 响应式更新后
  onUnmounted() {}           // 从 DOM 移除

  // 内部
  this.$props               // 解析后的 props
  this.$el                  // Shadow root
  this.$slots               // 插槽数据

  // 响应式（自动）
  this.xxx = value          // 字段自动变为响应式
  this.$data                // 内部响应式代理
}
```

### 4.2 生命周期映射到 WebComponent 标准

| WebComponent 原生        | Da 生命周期        | 说明                   |
|--------------------------|---------------------|------------------------|
| `constructor()`          | 内部调用 `onInit()` | 创建 Shadow DOM        |
| `connectedCallback()`    | 内部调用 `onMounted()` | 初始化渲染 + 指令绑定 |
| `attributeChangedCallback()` | 内部更新 `$props` | props 变化触发重渲染   |
| `disconnectedCallback()` | 内部调用 `onUnmounted()` | 清理指令和响应式依赖 |

### 4.3 Props 机制

```javascript
class MyComp extends Da.Component {
  static props = {
    name:    { type: String,  default: 'World' },
    count:   { type: Number,  default: 0 },
    items:   { type: Array,   default: () => [] },
    visible: { type: Boolean, default: true },
  }
}
```
- 从 HTML attribute 读取字符串
- 根据 `type` 做类型转换（字符串 → Number / Boolean / Array / Object）
- Array 和 Object 用 `JSON.parse` 解析
- 变更时通过 `observedAttributes` + `attributeChangedCallback` 自动响应

### 4.4 自动注册机制

```javascript
class MyComp extends Da.Component {
  static tagName = 'my-comp'   // 可选，显式指定标签名
  // 不指定则自动使用类名的 kebab-case: MyComp → 'my-comp'
}
// 模块加载后自动执行 customElements.define()
```

### 4.5 插槽系统 (命名 + 作用域)

- 默认插槽映射到 Shadow DOM 的 `<slot></slot>`
- 命名插槽：`<slot name="header">`、`<div slot="header">`
- 作用域插槽：在 render 函数或模板中通过自定义属性传递数据，插槽内通过 `data-*` 或指令获取

---

## 五、响应式系统设计

### 5.1 核心 API

| API | 用途 |
|------|------|
| `reactive(obj)` | 对象深度响应式代理 |
| `ref(value)` | 单一值响应式容器 |
| `computed(fn)` | 计算属性，惰性求值 + 缓存 |
| `effect(fn)` | 副作用自动追踪依赖 |
| `watch(source, cb)` | 监听响应式数据变化 |

### 5.2 原理

- 使用 `Proxy` 实现 `reactive`（对象深度代理）
- 使用 getter/setter 实现 `ref`（.value 访问）
- 运行时维护一个 `activeEffect` 栈，收集依赖（`target → key → Set<effect>` 的 Map 结构）
- 数据变化时遍历依赖的 effect，触发更新

### 5.3 与 Class 集成

```javascript
class Counter extends Da.Component {
  count = 0          // 自动被转换为响应式
  // 等价于内部执行 this.$data = reactive({ count: 0 })
  // this.count 的 getter/setter 委托给 this.$data.count
}
```

---

## 六、指令系统设计

### 6.1 指令接口规范

每个指令文件导出一个对象：

```javascript
{
  name: 'bind',              // 指令名（不含 v- 前缀）
  mount(el, binding, vnode)  // 首次绑定
  update(el, binding, vnode) // 更新时
  unmount(el)                // 解绑时清理
}
```

`binding` 对象结构类似 Vue：

```javascript
{
  value: ...,        // 指令绑定的值
  oldValue: ...,     // 旧值
  arg: 'click',      // 参数（如 v-on:click 的 click）
  modifiers: { prevent: true },  // 修饰符
  instance: ...      // 组件实例引用
}
```

### 6.2 第一期指令清单

| 指令 | 功能 | 特殊说明 |
|------|------|---------|
| `v-bind` | 绑定 attribute/property | 支持 `:attr` 缩写；支持 class/style 特殊处理 |
| `v-on` | 事件绑定 | 支持 `.prevent` `.stop` `.once` 修饰符；支持 `@click` 缩写 |
| `v-if` | 条件渲染（增删节点） | 配合 `v-else-if` `v-else`；使用注释节点占位 |
| `v-for` | 列表渲染 | 支持 `(item, index) in items` 语法；配合 key 优化 |
| `v-model` | 表单双向绑定 | 支持 input/textarea/select；支持 `.lazy` `.trim` `.number` |
| `v-show` | 条件显示 | 切换 `display` CSS 属性 |

### 6.3 模板编译器核心逻辑

1. 将模板字符串解析为 DOM 树（`DOMParser` 或 `innerHTML`）
2. 遍历 DOM 节点，识别指令 attribute 和 `{{ }}` 插值
3. 建立指令绑定列表，提取依赖的响应式变量名
4. 返回编译产物：绑定树 + 清理函数

---

## 七、第一期实现范围总结

### ✅ 第一期包含

| 模块 | 内容 |
|------|------|
| **响应式系统** | `reactive`、`ref`、`computed`、`effect`、`watch` |
| **Component 基类** | Shadow DOM、生命周期、Props 声明与校验、自动注册 |
| **模板编译器** | 解析 `<template>`、指令绑定、插值编译 |
| **指令** | `v-bind` `v-on` `v-if/else` `v-for` `v-model` `v-show` |
| **插槽** | 命名插槽 + 作用域插槽 |
| **更新调度** | 异步批量更新（Microtask 调度） |
| **示例** | 至少 3 个示例页面 |

### ❌ 第一期不包含（后续考虑）

- `v-cloak`、`v-pre`、`v-once` — 实用性较低
- 自定义指令 — 短期内内部够用
- `Teleport`、`Suspense` 等高级内置组件 — 超过第一期范围
- 开发工具（DevTools 插件、热更新等）
- TypeScript 类型定义

---

## 八、实施步骤

| 步骤 | 内容 | 产出 |
|------|------|------|
| 1 | 搭建项目骨架：目录、`package.json`、入口文件 | 目录结构 |
| 2 | 实现响应式系统：`reactive.js` | `ref`、`reactive`、`computed`、`effect`、`watch` |
| 3 | 实现 `Component.js` 基类：生命周期、Shadow DOM、props、自动注册 | 组件基类 |
| 4 | 实现模板编译器 `compile.js` | 模板 → 指令绑定树 |
| 5 | 实现更新调度器 `scheduler.js` | 批量异步更新 |
| 6 | 逐个实现指令：v-bind → v-on → v-if → v-for → v-model → v-show | 6 个指令 |
| 7 | 实现插槽系统（命名 + 作用域） | 插槽支持 |
| 8 | 集成测试：编写 `src/index.js` 导出 `Da` 命名空间 | 框架入口 |
| 9 | 编写示例页面 + README | 示例 + 文档 |
