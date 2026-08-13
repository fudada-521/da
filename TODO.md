# Da 框架开发 TODO

## Phase 1：骨架搭建  ✅ 已完成

- [x] 创建 `dada/` 目录结构
  - [x] `src/core/`、`src/directives/`、`src/shared/`、`examples/`
- [x] 创建 `package.json`（name、version、type: module）
- [x] 创建 `src/index.js` 入口（暴露 Da 命名空间）
- [x] 创建 `src/shared/utils.js`（工具函数：kebab-case、类型检测、JSON 解析等）

## Phase 2：响应式系统  ✅ 已完成

- [x] `reactive(target)` — Proxy 深度代理
- [x] `ref(value)` — .value 包装，对象自动转 reactive
- [x] `computed(fn)` — 惰性求值 + 脏标记缓存
- [x] `effect(fn)` — 依赖追踪 + 自动收集
- [x] `watch(source, cb, options?)` — 监听 ref/reactive/function
- [x] `toRef` / `toRefs` — 解构工具
- [x] 依赖收集器：`targetMap(WeakMap) → key → Set<effect>`
- [x] 测试文件：`examples/test-reactive.html`

## Phase 3：Component 基类  ✅ 已完成

- [x] `static props` 声明与类型转换
- [x] 自动生成 `observedAttributes`
- [x] `attributeChangedCallback` → props 更新
- [x] Shadow DOM 创建（mode: 'open'）
- [x] `<style>` 提取与注入 Shadow DOM
- [x] 生命周期：onInit / onMounted / onUpdated / onUnmounted
- [x] 自动注册（`customElements.define`）
- [x] Class 字段自动响应式（`this.xxx` 代理到 `$data`）
- [x] 默认插槽 + 命名插槽

## Phase 4：模板编译与调度  ✅ 已完成

- [x] 模板字符串 → DOM 树遍历
- [x] 识别 `{{ expression }}` 插值
- [x] 识别指令 attribute（`v-*`、`:attr`、`@event`）
- [x] 解析指令参数与修饰符（`v-on:click.prevent`）
- [x] 建立指令绑定列表 + 依赖映射
- [x] 微任务队列（Promise.then 调度）
- [x] 同一 tick 内合并多次触发 + 组件更新去重

## Phase 5：指令实现  ✅ 已完成

- [x] `v-bind` — attribute/property 绑定，`:class`/`:style` 特殊处理
- [x] `v-on` — 事件绑定，`.prevent` `.stop` `.once` 修饰符，`@` 缩写
- [x] `v-if` — 条件渲染，`v-else-if` / `v-else` 链
- [x] `v-for` — 列表渲染，`(item, index) in items` 语法
- [x] `v-model` — 表单双向绑定，`.lazy` `.trim` `.number` 修饰符
- [x] `v-show` — display 切换，保留初始 display 值
- [x] `v-text` / `v-html` — 文本与 HTML 插入

## Phase 6：指令注册表与集成  ✅ 已完成

- [x] `src/directives/index.js` 注册所有指令
- [x] Component 基类集成编译器 + 指令系统
- [x] 首次渲染流程打通：模板 → 编译 → 指令 mount
- [x] 响应式更新流程：数据变更 → effect → scheduler → 指令 update

## Phase 7：示例与文档  ✅ 已完成

- [x] `examples/counter.html` — 计数器（v-on + v-bind + v-show + props）
- [x] `examples/todo.html` — 待办列表（v-for + v-model + v-if + :class）
- [x] `examples/slots.html` — 插槽使用演示（默认 + 命名）
- [x] README.md — 框架简介、API 速览、快速开始

---

## 第二期计划

### Phase 2-1：指令增强  ✅ 已完成

- [x] 作用域插槽 `v-slot` 完善
  - [x] 子组件通过 `<slot :item="data">` 传递数据到插槽
  - [x] 父组件通过 `v-slot:default="{ item }"` 接收数据
  - [x] 简写 `#default="{ item }"`
  - [x] 命名 + 作用域结合：`v-slot:content="{ data, meta }"`
  - [x] 作用域数据的响应式绑定（数据变化时插槽内容自动更新）
  - [x] 普通插槽与作用域插槽共存
  - [ ] ~~`v-for` 内部作用域插槽~~（需 v-for 作用域追踪支持，后续处理）
- [x] `v-on` 键盘修饰符
  - [x] `.enter` `.tab` `.delete` `.esc` `.space` `.up` `.down` `.left` `.right`
  - [x] 系统修饰键：`.ctrl` `.alt` `.shift` `.meta` `.exact`
  - [x] 鼠标修饰符：`.left` `.middle` `.right`
- [x] `v-on` 增强
  - [x] 支持 `$event` 在表达式中使用：`@click="handle($event, arg)"`
  - [x] 支持绑定多个事件：`@click="fn1(); fn2()"`
- [x] `v-model` 增强
  - [x] 组件上的 `v-model`（语法糖，默认绑定 `modelValue` + `@update:modelValue`）
  - [x] 多个 `v-model`：`v-model:title="pageTitle"`
  - [ ] 自定义修饰符
  - ⚠️ 内置 `da-input` 用 `value`/`update:value`，与 da-model 的 `modelValue` 约定不匹配 → `da-input da-model="x"` 失效，见第三期 P0-3

### Phase 2-2：过渡与动画系统  ✅ 基本完成（有缺陷）

- [x] `<DaTransition>` 组件（进入/离开过渡）
  - [x] CSS transition class 注入（`.da-enter-active` `.da-leave-active` 等）
  - [x] 支持 `name` prop 自定义 class 前缀
  - [x] 支持 `mode="out-in"` / `mode="in-out"` 过渡模式
  - [x] 支持 `appear` 初始渲染过渡
  - [x] 过渡钩子（`@before-enter` `@enter` `@after-enter` `@before-leave` 等）
- [x] `<DaTransitionGroup>` 组件（列表过渡）
  - [x] 列表增删的过渡动画
  - [x] 移动过渡（FLIP 动画）
  - ⚠️ `da-for` 全量重建节点（非 keyed diff）→ 删除无 leave 动画、排序无 FLIP 移动，见第三期 P1-2
- [ ] 指令级过渡：`v-enter` / `v-leave`（简化版本）

### Phase 2-3：框架能力拓展  ✅ 大部分完成

- [x] 自定义指令 API
  - [x] `Da.register('my-dir', { mount, update, unmount })` 完整支持
  - [x] 指令参数与修饰符透传
  - [x] 指令内获取组件实例（`binding.instance`）
- [ ] 内置组件
  - [ ] `<DaTeleport>` — 将内容渲染到指定 DOM 位置（未实现）
  - [ ] `<DaKeepAlive>` — 缓存动态组件状态（未实现）
- [x] 模板编译增强
  - [x] 动态指令参数：`da-bind:[attrName]="value"`
  - [x] 动态事件参数：`da-on:[eventName]="handler"`
  - [x] JavaScript 表达式完整支持（三元、方法调用、计算）
- [x] `v-once` — ⚠️ 空壳：仅打标记，编译器/更新循环未真正跳过，见第三期 P1-1
- [x] `v-cloak` — 已实现
- [x] `v-pre` — ⚠️ 空壳：未真正跳过子树编译，见第三期 P1-1
- [x] 全局 API
  - [x] `Da.nextTick()` — 已实现（⚠️ 语义是微任务，非"下一次 DOM 更新后"）
  - [x] `Da.version` — 版本号
  - [ ] `Da.errorHandler` — 全局错误处理（未实现）

### Phase 2-4：示例与集成  ✅ 基本完成

- [x] 新增示例
  - [x] `examples/transition.html` — 过渡动画演示（已改 mount 方式）
  - [x] `examples/custom-directive.html` — 自定义指令演示
  - [x] `examples/scoped-slots.html` — 作用域插槽演示（含框架修复）
  - [x] `examples/keyboard.html` — 键盘修饰符（含 @event 简写修复）
  - [x] `examples/transition-group.html` — 列表过渡（已改 mount 方式）
  - [x] `examples/counter.html` / `todo.html` — 已改为 mount 方式
  - [ ] `examples/teleport.html` — 依赖 Teleport，未实现
- [ ] 所有示例在新旧浏览器上的兼容性验证

---

## 第三期：框架加固（2026-07 体检新增）

> 来源：框架全量体检。第一期/第二期已完成大部分功能，但存在若干正确性缺陷与"文档写了但用不了"的特性。

### Phase 3-1：P0 — 正确性核心  ✅ 已完成

- [x] **数组响应式**（`reactive.js`）
  - [x] 拦截数组原生方法（`push`/`pop`/`shift`/`unshift`/`splice`/`sort`/`reverse`，Vue3 式 arrayInstrumentations），方法执行后显式触发 `length`/`iterate`
  - [x] 已验证：push/pop/splice/sort 均可靠触发；transition-group 恢复原生方法调用
- [x] **trigger 分发 `_scheduler`**（`reactive.js`）
  - [x] `trigger` 优先调用 `effect._scheduler`
  - [x] 已验证：`watch`/`computed` 恢复正常（test-reactive 中 watch/computed 断言全部通过）
- [x] **da-model 与内置组件约定统一**
  - [x] `da-input` 增加 `modelValue` prop + 派发 `update:modelValue`，`displayValue` getter 统一取值（modelValue 优先、value 兜底）
  - [x] 已验证：`da-input da-model="x"`、`da-model:value="x"`、静态 `value="42"` 预填全部可用

### Phase 3-2：P1 — 功能落地  ✅ 基本完成

- [x] `v-once` / `v-pre` 真正实现（编译器跳过子树 / 跳过更新，冻结绑定）
- [x] `da-for` 改 keyed diff（按 key 复用/移动/回收节点）
  - [x] 排序触发 FLIP 移动动画（transition-group 区分移动与增删）
  - [x] 添加/删除只渲染变化的项（不再全量重建）
  - ⚠️ 剩余：真正删除的节点仍无 leave 动画（da-for 同步移除，需 transition-group 接管渲染，见 P2）
- [x] getter 表达式解析（`canLogin`/`completedCount` 等经实例兜底生效）
  - ⚠️ 形式化依赖追踪（类字段计算属性化）并入 P2 细粒度依赖，暂不单独做

### Phase 3-3：P2 — 架构演进

- [x] 细粒度依赖追踪（替代 `_setupReactiveUpdate` 全量读 key）
  - 每绑定一个 effect（`src/core/bindingEffects.js` `createReactiveUpdater`），仅当其表达式读取的字段变化时更新自身
  - getter 表达式自动获得依赖追踪；作用域插槽按自身读取字段触发
  - `Da.unmount()` 停止全部绑定 effect；`stop()` 加固防"stop 后挂起 flush 重订阅"竞态
- [ ] 编译/求值缓存（缓存模板 parse 结果 + `evaluateExpression` 的 Function）
- [ ] 测试体系（vitest + happy-dom，覆盖响应式/组件/指令）
- [ ] 类型定义（`.d.ts`）
- [ ] DevTools / 错误边界 / `nextTick` 语义修正
- [ ] 补漏（2026-08 审计发现）：`da-else-if`/`da-else` 注册缺失不可用、`<da-transition>` `appear` 初始过渡未生效、`da-transition-group` `moveClass` 属性名（实现为 `move-class`）、`da-input` 文档 `model` prop 不存在、"开箱即用"需显式 import 组件

### Phase 3-4：文档一致性  ✅ 已完成

- [x] 修正 README 中"文档写了但用不了"的特性：`v-once`、`v-pre`、`da-input da-model`、`watch`/`computed`、FLIP 移动动画
  - b142cd0 完成：register API 契约统一、README/guide/示例 import 修正、version 0.2.0

### Phase 2-5：开发者体验（远期，粗略）

- [ ] 开发调试工具
  - [ ] 组件树查看器（Shadow DOM 层级）
  - [ ] 响应式数据面板（实时查看 $data 状态）
  - [ ] 指令状态调试
  - [ ] 性能面板（渲染次数、更新时间）
- [ ] TypeScript 类型定义
  - [ ] `Component` 基类类型
  - [ ] 响应式 API 类型
  - [ ] 指令接口类型
  - [ ] `.d.ts` 文件生成
- [ ] 错误处理与警告
  - [ ] 组件未注册时的友好提示
  - [ ] Props 类型校验失败警告
  - [ ] 模板编译错误定位
- [ ] 测试框架
  - [ ] 单元测试用例（响应式系统）
  - [ ] 组件渲染测试
  - [ ] 指令功能测试
