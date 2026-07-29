/**
 * da-pre 指令
 *
 * 跳过该元素及其所有子元素的编译。
 * 用于显示原始 Mustache 标签或提升大段静态内容的性能。
 * 标记后，编译器和指令系统会跳过该子树。
 */

const directive = {
  name: 'pre',

  mount(el) {
    el._daPre = true
    el.setAttribute('data-da-pre', '')
  },

  update() {
    // noop
  },

  unmount() {
    // noop
  },
}

export default directive
