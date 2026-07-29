/**
 * da-cloak 指令
 *
 * 在组件挂载前隐藏元素，防止未编译的模板闪烁。
 * 配合 CSS 使用： [da-cloak] { display: none; }
 * 组件挂载后自动移除该 attribute。
 */

const directive = {
  name: 'cloak',

  mount(el) {
    el.removeAttribute('da-cloak')
  },

  update() {
    // noop
  },

  unmount() {
    // noop
  },
}

export default directive
