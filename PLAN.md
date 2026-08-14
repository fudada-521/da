# Da 框架 — 架构与演进计划

> 当前版本：0.2.2 · 零依赖、纯原生 WebComponent + Proxy
> 详细任务追踪见 [TODO.md](TODO.md)

---

## 一、定位

Da（Dada Components）是一个基于原生 WebComponent 与 Proxy 的类 Vue3 轻量前端框架：

```
零构建、零依赖、纯原生
```

- 模板字符串 + 编译器，而非 `h()`/render 函数
- 指令系统以 `mount / update / unmount` 三段式扩展
- Shadow DOM 组件 + 原生 Custom Elements

---

## 二、当前架构

### 2.1 核心分层

```
┌──────────────────────────────────────────────┐
│  模板编译器 (compile.js)                      │
│  ├ 模板 DOM → 指令绑定树                     │
│  ├ {{ }} 插值 + da-* / :attr / @event 简写    │
├──────────────────────────────────────────────┤
│  指令系统 (directives/)                       │
│  ├ bind / on / if / for / model / show / ... │
│  ├ 每个指令 => mount() + update() + unmount() │
├──────────────────────────────────────────────┤
│  响应式系统 (reactive.js)                     │
│  ├ reactive / ref / computed / effect / watch│
│  ├ Proxy 深度代理 + 数组方法拦截              │
│  ├ track / trigger（含 scheduler 分发）       │
├──────────────────────────────────────────────┤
│  组件基类 (Component.js)                      │
│  ├ extends HTMLElement + Shadow DOM          │
│  ├ Props / 生命周期 / 自动注册               │
│  ├ 插槽系统（默认 / 命名 / 作用域）           │
└──────────────────────────────────────────────┘
```

### 2.2 源码结构

```
src/
├── da.js                     # 入口（Da 命名空间 + 自动注册内置组件）
├── core/
│   ├── Component.js          # 组件基类
│   ├── reactive.js           # 响应式系统（含数组拦截、scheduler 分发）
│   ├── compile.js            # 模板编译器 + 作用域插槽模板编译
│   ├── scheduler.js          # 微任务批量更新
│   ├── Transition.js         # 进入/离开过渡
│   └── TransitionGroup.js    # 列表过渡（FLIP）
├── directives/               # 指令实现（index.js 注册表）
└── components/               # 内置组件
    ├── Button.js             # <da-button>
    └── Input.js              # <da-input>（value / modelValue 双约定）
```

---

## 三、能力清单

### ✅ 已实现

| 能力 | 说明 |
|------|------|
| 组件系统 | Class 定义、Props 类型转换、生命周期、Shadow DOM、自动注册 |
| 响应式 | reactive/ref/computed/effect/watch、**数组方法拦截**、**scheduler 分发** |
| 指令 | bind（class/style 对象式）、on（键盘/系统/鼠标修饰符）、if/else、for、model、show、text、html、once、cloak、pre |
| 插槽 | 默认 / 命名 / 作用域（`da-slot` / `#` 简写，插槽内容支持全部指令） |
| 过渡 | `<da-transition>`（name/mode/appear/钩子）、`<da-transition-group>` |
| 内置组件 | `<da-button>`、`<da-input>`（`da-model` / `da-model:value` / 静态预填） |
| 挂载 | `mount()` 独立挂载任意 DOM 子树，无需自定义组件 |
| 全局 API | define / register / lookup / nextTick / version / toRef(s) |

### ⚠️ 已知限制（见 [TODO.md](TODO.md) 第三期）

- `da-for` keyed diff 已实现（增删/重排按 key 复用节点、触发 FLIP），**删除节点的 leave 动画**仍需 transition-group 接管渲染
- 更新已细粒度化（P2-A），但 `$props` 变化仍走组件级全量更新（props 未响应式化）
- `nextTick` 当前为微任务语义，非"下一次 DOM 更新后"（远期修正）

---

## 四、演进路线

### ✅ 第一期：骨架与核心
组件基类、响应式、编译器、基础指令、调度器、插槽、示例

### ✅ 第二期：能力拓展
作用域插槽、键盘/系统/鼠标修饰符、过渡动画、自定义指令、动态指令参数、独立挂载、内置 UI 组件

### 🔄 第三期：框架加固（进行中）

| 阶段 | 内容 | 状态 |
|------|------|------|
| **P0 正确性核心** | 数组响应式、trigger 分发 `_scheduler`、da-model 与内置组件约定统一 | ✅ 2026-07 完成 |
| **P1 功能落地** | `da-for` keyed diff、`da-once`/`da-pre` 真正实现、getter 表达式兜底 | ✅ 2026-07 完成 |
| **P2 架构演进** | P2-A 细粒度依赖追踪 ✅、补漏（2026-08 审计 5 项）✅、测试体系（vitest + happy-dom，81 用例）✅、编译/求值缓存、类型定义、DevTools | 🔄 P2-A + 补漏 + 测试体系完成（2026-08） |
| **P3 文档一致性** | 修正 README 中"文档写了但用不了"的特性说明与 register API 契约 | ✅ 2026-08 完成 |

### 🔭 远期
- `<DaTeleport>` / `<DaKeepAlive>` 内置组件
- 指令级过渡（`v-enter` / `v-leave`）
- 全局错误处理 `Da.errorHandler`、`nextTick` 语义修正
- 开发者工具（组件树 / 响应式面板 / 性能面板）

---

## 五、设计原则

1. **零依赖、浏览器原生** — 保持 ES Module + Custom Elements v1 即可运行
2. **模板字符串 + 编译器** — 类 Vue 的 `{{ }}` / 指令心智模型，无需 JSX
3. **指令三段式接口** — `mount / update / unmount`，便于扩展自定义指令
4. **文档承诺 = 实际行为** — 每个 README 声称的特性都必须真实可用，避免"写了但用不了"
