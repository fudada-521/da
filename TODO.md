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
- [ ] `v-on` 键盘修饰符
  - [ ] `.enter` `.tab` `.delete` `.esc` `.space` `.up` `.down` `.left` `.right`
  - [ ] 系统修饰键：`.ctrl` `.alt` `.shift` `.meta` `.exact`
  - [ ] 鼠标修饰符：`.left` `.middle` `.right`
- [ ] `v-on` 增强
  - [ ] 支持 `$event` 在表达式中使用：`@click="handle($event, arg)"`
  - [ ] 支持绑定多个事件：`@click="fn1; fn2"` 或 `@click="fn1(), fn2()"`
- [ ] `v-model` 增强
  - [ ] 组件上的 `v-model`（语法糖，默认绑定 `modelValue` + `@update:modelValue`）
  - [ ] 多个 `v-model`：`v-model:title="pageTitle"`
  - [ ] 自定义修饰符

### Phase 2-2：过渡与动画系统

- [ ] `<DaTransition>` 组件（进入/离开过渡）
  - [ ] CSS transition class 注入（`.da-enter-active` `.da-leave-active` 等）
  - [ ] 利用 `Web Animation API` 或 CSS `@keyframes`
  - [ ] 支持 `name` prop 自定义 class 前缀
  - [ ] 支持 `mode="out-in"` / `mode="in-out"` 过渡模式
  - [ ] 支持 `appear` 初始渲染过渡
  - [ ] 过渡钩子（`@before-enter` `@enter` `@after-enter` `@before-leave` 等）
- [ ] `<DaTransitionGroup>` 组件（列表过渡）
  - [ ] 列表增删的过渡动画
  - [ ] 移动过渡（FLIP 动画）
- [ ] 指令级过渡：`v-enter` / `v-leave`（简化版本）

### Phase 2-3：框架能力拓展

- [ ] 自定义指令 API
  - [ ] `Da.register('my-dir', { mount, update, unmount })` 完整支持
  - [ ] 指令参数与修饰符透传
  - [ ] 指令内获取组件实例（`binding.instance`）
- [ ] 内置组件
  - [ ] `<DaTeleport>` — 将内容渲染到指定 DOM 位置
  - [ ] `<DaKeepAlive>` — 缓存动态组件状态
- [ ] 模板编译增强
  - [ ] 动态指令参数：`v-bind:[attrName]="value"`
  - [ ] 动态事件参数：`v-on:[eventName]="handler"`
  - [ ] JavaScript 表达式完整支持（三元、方法调用、计算）
- [ ] `v-once` — 一次性插值（只渲染一次，不追踪变化）
- [ ] `v-cloak` — 未编译完成时隐藏模板
- [ ] `v-pre` — 跳过该元素及其子元素的编译
- [ ] 全局 API
  - [ ] `Da.nextTick()` — 下一 tick 回调
  - [ ] `Da.version` — 版本号
  - [ ] `Da.errorHandler` — 全局错误处理

### Phase 2-4：示例与集成

- [ ] 新增示例
  - [ ] `examples/transition.html` — 过渡动画演示
  - [ ] `examples/teleport.html` — Teleport 使用演示
  - [ ] `examples/custom-directive.html` — 自定义指令演示
  - [ ] `examples/scoped-slots.html` — 作用域插槽演示
- [ ] 所有示例在新旧浏览器上的兼容性验证

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
