/**
 * da-html 指令
 *
 * 更新元素的 innerHTML。
 * ⚠ 注意：存在 XSS 风险，确保绑定的值是安全的。
 */

const directive = {
  name: 'html',

  mount(el, binding) {
    el.innerHTML = binding.value ?? ''
  },

  update(el, binding) {
    el.innerHTML = binding.value ?? ''
  },

  unmount() {
    // noop
  },
}

export default directive
